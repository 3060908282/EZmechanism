# MechFind + EzMechanism 实施手册 v2.0

> **版本**: v2.0 — 完整重写版
> **日期**: 2026-03-10
> **整合**: CGD_MASTER_PLAN v3.3 + IMPLEMENTATION_PLAN v3.5 + GAP_AUDIT_G1-G16 v2.0
> **架构**: 方案B — 交互式管线 + Step 2.5 规则映射层
> **总工期**: ~139天 / 27.8周 (1人全职, 顺序估算; 含Phase间并行约~25周; 审计修正Phase 7.4缩减0.5天)

---

## 目录

**Part 1: 快速背景**
1. [系统架构图](#1-系统架构图)
2. [三个场景](#2-三个场景)
3. [GAP 摘要表](#3-gap-摘要表)
4. [里程碑时间线](#4-里程碑时间线)
5. [双层质量评估框架](#5-双层质量评估框架)
6. [架构决策 D1-D22](#6-架构决策-d1-d22)
7. [项目目录映射](#7-项目目录映射)
8. [三文档依赖链](#8-三文档依赖链)
9. [前端复用策略](#9-前端复用策略)

**Part 2: 每日实施指南**
10. [Phase 0: 基础设施](#phase-0-基础设施)
11. [Phase 1: CGD核心数据](#phase-1-cgd核心数据)
12. [Phase 2: CGD配体数据](#phase-2-cgd配体数据)
13. [Phase 2.5: EZ验证运行时](#phase-25-ez验证运行时)
14. [Phase 3: CGD规则映射+优化](#phase-3-cgd规则映射优化)
15. [Phase 4: CGPS评分](#phase-4-cgps评分)
16. [Phase 5: LLM Agent管线](#phase-5-llm-agent管线)
17. [Phase 5.5: 氧化还原+氢原子](#phase-55-氧化还原氢原子)
18. [Phase 6: 系统集成](#phase-6-系统集成) (+1.5天 D19确认卡片)
19. [Phase 7: 验证与论文](#phase-7-验证与论文)

---

# Part 1: 快速背景

## 1. 系统架构图

```
用户输入 (SMILES + 可选PDB ID/EC)
│
▼
┌──────────────────────────────────────────────────┐
│ Step 0: MechFind (port 3002)                     │
│ SMILES → Top-N 候选机制 JSON                      │
│ 每条含 similarity → M-CSA ID 链接 (D19预选入口)   │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│ ⭐ PDB自动预选 (D19: 选择题而非填空题)            │
│ 1. 路径按M-CSA ID分组                             │
│ 2. 每组自动搜索PDB (locate_by_mcsa_id)            │
│ 3. 检查残基兼容性 (check_residue_compatibility)    │
│ 4. 生成确认卡片 → 用户确认/修正                    │
│ 5. 降级: 无M-CSA→用户EC/UniProt→Scene C           │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│ Step 2.5: 规则映射 + 化学描述 + 2D SVG            │
│ MechFind rule IDs → EZ SMARTS (DS5查表)           │
│ → 化学描述文字 → RDKit 2D机理SVG图               │
│ → 验证可行性预评估                                │
│ 映射降级：有映射→完整3D验证，无映射→仅距离检查     │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│ 场景判定 (基于PDB预选结果自动确定)                  │
└─────┬────────────┬────────────┬──────────────────┘
      │            │            │
      ▼            ▼            ▼
  Scene A      Scene B      Scene C
  PDB+配体     PDB+无配体    无PDB
  直接3D验证   PAP+3D验证   CGPS统计
      │            │            │
      └─────┬──────┴─────┬──────┘
            ▼            ▼
   ┌────────────────────────────────┐
   │ EZ SMARTS执行循环 + 中间体管理   │
   │ 置信度: 0.25×MF+0.50×EZ        │
   │        +0.15×Agent+0.10×Arbiter│
   └──────────────┬─────────────────┘
                  ▼
   排序候选 + 验证报告 + 置信度
```

## 2. 三个场景

| 场景 | PDB 状态 | 可用数据 | 评分方式 | CGPS公式 |
|------|----------|----------|----------|----------|
| A | 有PDB + 有配体 | 残基+配体坐标 | DS1+DS2+DS3+DS4+DS5 | w1·S_co + w2·S_geo + w3·S_path |
| B | 有PDB + 无配体 | 残基+锚定配体 | DS1+DS2(先验)+DS3(后验)+DS4+DS5 | w1·S_co + w2·S_geo + w3·S_path |
| C | 无PDB | 序列/同源模型 | DS1+DS4+DS5 (无几何) | w1·S_co + w3·S_path (S_geo=0) |

## 3. GAP 摘要表

| 缺口 | 严重度 | 模块路径 | 复用率 | 所在Phase | 复用后工期 |
|------|--------|---------|--------|----------|-----------|
| G6+G16 | 🔴高 | `ez_validator/scene_resolver.py` | 40% | 2.5 | 1天 |
| G8 | 🔴高 | `ez_validator/pdb_locator.py` | 68% | 2.5 | 0.6天 |
| G10 | 🔴高 | `ez_validator/ez_executor.py` | 60% | 2.5 | 1天 |
| G17 | 🔴高 | `cgd/statistics/` + `cgd/builders/` | — | 1+2 | +1天 |
| G1 | 🟡中 | `ez_validator/scene_a_validator.py` | 38% | 2.5 | 1.5天 |
| G2 | 🟡中 | `ez_validator/geometry/angle_calculator.py` | 15% | 2 | 1.5天 |
| G3 | 🟡中 | `agents/pap_ez_bridge.py` | 50% | 5 | 0.5天 |
| G7 | 🟡中 | `step25/rule_mapper.py` (含 parse_protonation_rule + 三路径残基识别) | 58% | 2.5 | 1天 |
| G9 | 🟡中 | `ez_validator/redox/` | 5% | 5.5 | 5天 |
| G12 | 🟡中 | `ez_validator/intermediate_conformer.py` | 60% | 2.5 | 1天 |
| G13 | 🟡中 | `ez_validator/ligand_builder.py` | 60% | 2.5 | 0.3天 |
| G14 | 🟡中 | `pipeline/pipeline_orchestrator.py` | 0% | 2.5 | 2天 |
| G4 | 🟢低 | `ez_validator/scoring/s_geo_runtime.py` | 0% | 2.5 | 0.5天 |
| G5 | 🟢低 | `ez_validator/scoring/verification_result.py` | 0% | 2.5 | 0.5天 |
| G11 | 🟢低 | `ez_validator/confidence_calculator.py` | 0% | 2.5 | 1天 |
| G15 | 🟢低 | `ez_validator/geometry/hydrogen_adder.py` | 20% | 5.5 | 0.3天 |

> **关键路径**: G6(1.0d)→G8(0.6d)→G13(0.3d)→G1(1.5d)→G10(1d)→G12(1d) = **5.4天** (原10.5天, 缩减49%)
>
> ⚠️ G17(+1天, `cgd/statistics/`+`cgd/builders/`) 已分摊至 Phase 1-13 和 Phase 2-3 任务估算中

## 4. 里程碑时间线

| 里程碑 | 周次 | 交付物 |
|--------|------|--------|
| M1 | Week 5 | DS1+DS2+3个辅助文件+距离阈值表+样本量缺口报告 |
| M2 | Week 10 | DS3+DS4+同源替代+PAP放置+角度A1-A3+配体Mol |
| M3 | Week 13 | EZ验证运行时端到端可运行(Scene A/B/C) |
| M4 | Week 14 | DS5 Layer 0(含residue_info)+统计消歧+CGD全就绪 |
| M5 | Week 16 | CGPS评分函数+阈值校准+灰色区间 |
| M6 | Week 20 | Agent①-⑥管线+氧化还原+氢原子+DS5 Layer 1 |
| M7 | Week 26 | 渐进降级交叉验证+M-CSA验证+论文 |

## 5. 双层质量评估框架

### 5.1 质量评分 (Quality Score)

**定义**:
```
quality_score = final_confidence × 100 × grey_zone_penalty
```

其中:
- `final_confidence = 0.25×MF + 0.50×EZ + 0.15×Agent + 0.10×Arbiter`
- 权重重归一化规则: 缺失分量按剩余分量原始比例分配
- 设计约束: EZ=0时final_confidence不超过0.50

**分量表**:

| 分量 | 权重 | 来源 | 说明 |
|------|------|------|------|
| MF | 0.25 | MechFind相似度 | 搜索阶段评分 |
| EZ | 0.50 | EZ验证评分 | Scene A: S_geo, Scene B: S_geo×降权, Scene C: CGPS |
| Agent | 0.15 | Agent③④⑤共识率 | n_accept / n_total |
| Arbiter | 0.10 | Agent⑥裁决 | accept=1.0, needs_revision=0.5, reject=0.0 |

**grey_zone_penalty**:

| CGPS范围 | 判定 | penalty | 含义 |
|----------|------|---------|------|
| > θ_high (≈0.72) | 已验证 | 1.0 | 3D验证充分，不降权 |
| θ_low ~ θ_high (≈0.28~0.72) | 灰色区间 | 0.85 | 3D验证不充分，轻微降权 |
| ≤ θ_low (≈0.28) | 未验证 | 0.60 | 3D验证失败，大幅降权 |

**阈值确定** (Phase 7.1):
- 总成本 = (w × FP) + FN，其中 **w=0.5** (非CASSIA的w=2)
- FP: 正确机制被标记为低质量（浪费计算但不影响最终正确性）
- FN: 错误机制被标记为高质量（可能导致实验资源浪费，代价极高）
- w=0.5的理由: 在酶机制预测中，FN代价远高于FP

**阈值分级表** (由7.1.3c确定，T_Q约75):

| quality_score区间 | 置信度等级 | 建议行动 |
|------------------|-----------|---------|
| 90-100 | 高 | 直接采纳 |
| [T_Q]-90 | 中 | 人工复核 |
| <[T_Q] | 低 | 触发Agent评审或放弃 |

### 5.2 信息衰减稳健性评分 (IDR)

**全称**: Information Degradation Robustness Score

**计算方法**:
```
IDR(A,B) = Kendall_τ(rank_A, rank_B)
```

**学术定义** (论文Methods可用):
> 为了量化我们的方法在结构信息缺失时的可靠性边界，我们设计了信息衰减稳健性评分（Information Degradation Robustness, IDR）。对于同一酶反应，我们分别在三种信息层次下运行验证管线——完整结构数据（场景A）、仅有蛋白质骨架（场景B）、无结构数据（场景C）——并计算各场景排名结果与最丰富信息场景（场景A）的排序相关性（Kendall τ）。IDR取值范围为-1到1，越高表示方法对信息缺失越不敏感。

**IDR降级曲线**:
- IDR(A,B) > IDR(A,C): 信息缺失越多，一致性越低(预期)
- 低IDR entry: 对信息缺失敏感，需关注
- 高IDR entry: 对信息缺失鲁棒，验证方法稳健性

**与CASSIA CS评分的本质区别**:
- CASSIA CS: 衡量同一输入多次运行的**可重复性** (repeatability)，不一致源于LLM随机性
- IDR: 衡量不同信息层次下输出的**稳健性** (robustness)，不一致源于输入信息系统性缺失
- 两者概念不同、成因不同、适用场景不同

---

## 6. 架构决策 D1-D22

| # | 决策 | 理由 | 状态 |
|---|------|------|------|
| D1 | MechFind黑盒(port 3002)，不改代码 | 外部服务，仅HTTP客户端调用 | ✅ |
| D2 | 场景判定在MechFind之后(交互式) | 方案B：用户驱动+系统辅助 | ✅ |
| D3 | EZ搜索功能被MechFind替代 | MechFind覆盖搜索，EZ只做验证执行 | ✅ |
| D4 | Step 2.5是关键新增模块 | 规则映射+化学描述+2D SVG+可行性预评估 | ✅ |
| D5 | Step 2.5映射降级策略 | 有映射→完整3D验证，无映射→仅距离检查 | ✅ |
| D6 | 2D机理SVG用RDKit生成 | 从SMARTS规则生成机理图，产品差异化亮点 | ✅ |
| D7 | 文档整合：HANDBOOK(人类)+daily-tasks(执行者) | 两层分离，手册精简+任务详细 | ✅ |
| D8 | 1A+4B策略：单服务+渐进迁移 | 新代码新目录，旧代码不碰 | ✅ |
| D9 | PAP方案替代bounds matrix | RDKit bounds matrix API不稳定，PAP更简洁 | ✅ |
| D10 | DS5分Layer 0/1交付 | Layer 0: 1:1映射(~40-50%), Layer 1: 1:N映射(Phase 5) | ✅ |
| D11 | EZ代码放入legacy/ | 旧代码不改，需改时顺便拆到shared/ | ✅ |
| D12 | DS5 schema 扩展: residue_info 字段 | 持久化三路径残基映射到 DS5，运行时查表免推断 | ✅ |
| D13 | 三路径残基识别策略 | 路径1(规则名解析)>路径2(M-CSA查询)>路径3(化学推断≤0.5) | ✅ |
| D14 | parse_protonation_rule() 归入 Phase 2.5 rule_mapper.py | 运行时残基识别核心函数，DS5构建时复用 | ✅ |
| D15 | M-CSA批量下载归入 Phase 3-1 | 为路径2和DS5 residue_info提供完整残基数据缓存 | ✅ |
| D16 | 渐进降级交叉验证: 内部一致性评估，非外部准确性基准 | Scene A是银标准(非金标准)，量化信息缺失→输出衰减程度；Scene C采用A的残基组合(隔离变量)；PAP RMSD直接验证 | ✅ |
| D17 | E1双阈值 + full-pool/limited_pool 分类 | E1不再用单一recall@5≥50%，改为双阈值: (1)MechFind搜索成功→进入候选池; (2)候选≥5条→full_pool(纳入量化), <5条→limited_pool(仅定性); E2-E5全部在full-pool子集上检查 | ✅ |
| D18 | 双层质量评估框架 | quality_score × grey_zone_penalty + IDR | ✅ |
| D19 | IDR命名而非CS | 信息衰减稳健性评分原创命名，避免抄袭CASSIA的CS；IDR衡量稳健性(robustness)而非可重复性(repeatability) | ✅ |
| D20 | 质量评分阈值w=0.5 | FN代价远高于FP(错误机制→实验灾难 vs 正确机制→浪费计算)，w=0.5而非w=2 | ✅ |
| D21 | PDB自动预选(选择题而非填空题) | 利用MechFind similarity→M-CSA→EC→PDB链路自动预选PDB+残基，用户仅确认 | ✅ |
| D22 | 氧化还原验证范围分级 | 辅因子氢负转移(NAD⁺/FAD/FMN)→完整3D验证(Scene A/B)；纯金属价态变化(Fe²⁺→Fe³⁺)→不可3D验证，自动降级Scene C+配位几何分析；RunReactants无法模拟金属价态变化 | ✅ |
| D23 | 4组精简消融实验 | full/compute_only/no_review/no_A6；计算管线缓存复用+仅变LLM调用；GPT-4o自然管线≈$30；分场景+分争议级别+Agent一致性作为后处理分析维度(零额外成本) | ✅ |

## 7. 项目目录映射

```
/home/z/my-project/
├── src/                                    ← Next.js 16 前端
│   ├── app/
│   │   ├── page.tsx                        ← ★ 主页面(需重构)
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── route.ts                    ← 通用API入口
│   │       └── mechfind/route.ts           ← MechFind API代理
│   ├── components/
│   │   ├── ui/                             ← shadcn/ui (40+组件)
│   │   ├── mechanism/                      ← 机制搜索组件(从EZ迁移)
│   │   │   ├── PdbWorkflowMode.tsx         ← 5步工作流编排器
│   │   │   ├── QuickPredictMode.tsx        ← 快速SMILES预测
│   │   │   ├── MechanismGraphPanel.tsx     ← Cytoscape图可视化
│   │   │   ├── MechanismPanel.tsx          ← 路径步骤展示
│   │   │   ├── PdbStructureViewer.tsx      ← PDB 3D查看器
│   │   │   └── ... (14个组件)
│   │   ├── verification/                   ← ★ 新增：验证组件
│   │   │   ├── SceneSelector.tsx           ← 交互式A/B/C选择
│   │   │   ├── Step25Panel.tsx             ← Step 2.5规则映射面板
│   │   │   ├── RuleMappingCard.tsx
│   │   │   ├── ChemicalDescription.tsx
│   │   │   ├── MechanismSVGViewer.tsx      ← 2D机理SVG查看
│   │   │   ├── FeasibilityAssessment.tsx
│   │   │   ├── VerificationResultCard.tsx
│   │   │   └── ConfidenceDisplay.tsx
│   │   └── viewer/                         ← 3D/结构查看器
│   │       ├── PdbViewer3D.tsx
│   │       ├── PdbViewerWebGL.tsx
│   │       └── PdbViewerIframe.tsx
│   ├── hooks/
│   │   ├── use-mechfind.ts
│   │   ├── use-verification.ts
│   │   └── use-pdb.ts
│   └── lib/
│       ├── api.ts, constants.ts, types.ts  ← 从EZ迁移
│       └── pdb-parser.ts, db.ts, utils.ts
│
├── mini-services/
│   ├── mechfind-service/                   ← MechFind (port 3002，已有)
│   └── prediction-service/                 ← ★ 核心后端 (port 3003)
│       ├── mechfind/                       ← MechFind客户端
│       │   └── client.py
│       ├── step25/                         ← ★ Step 2.5 规则映射层
│       │   ├── rule_mapper.py              ← MF规则ID→EZ SMARTS + 三路径残基识别
│       │   ├── protonation_residue_map.py  ← PROTONATION_RESIDUE_MAP 映射表
│       │   ├── chemical_descriptor.py      ← SMARTS→化学描述
│       │   ├── svg_generator.py            ← RDKit 2D SVG
│       │   ├── feasibility.py              ← 可行性预评估
│       │   └── mapping_table.py            ← DS5映射表加载
│       ├── ez_validator/                   ← EZ验证运行时
│       │   ├── scene_resolver.py           ← G6+G16 场景判定+降级
│       │   ├── pdb_locator.py              ← G8 PDB获取+残基定位
│       │   ├── types.py                    ← ⭐ 共享类型定义(C1修复)
│       │   ├── ligand_builder.py           ← G13 配体Mol构建
│       │   ├── scene_a_validator.py        ← G1 Scene A验证
│       │   ├── scene_b_validator.py        ← Scene B验证(PAP+验证)
│       │   ├── ez_executor.py              ← G10 SMARTS执行循环
│       │   ├── intermediate_conformer.py   ← G12 中间体3D构象
│       │   ├── confidence_calculator.py    ← G11 置信度分量
│       │   ├── geometry/
│       │   │   ├── angle_calculator.py     ← G2 A1-A3
│       │   │   ├── hydrogen_adder.py       ← G15 氢原子坐标
│       │   │   └── distance_calculator.py
│       │   ├── scoring/
│       │   │   ├── s_geo_runtime.py        ← G4 S_geo组合
│       │   │   └── verification_result.py  ← G5 统一结果格式
│       │   └── redox/                      ← G9 氧化还原(Phase 5.5)
│       │       ├── redox_center_identifier.py
│       │       ├── redox_step_classifier.py      ← ⭐ D22: 步骤分类(非electron_transfer_validator)
│       │       ├── cofactor_geometry_validator.py
│       │       ├── metal_coordination_analyzer.py ← ⭐ D22: 配位几何分析(非metal_center_validator)
│       │       └── redox_distance_categories.py
│       ├── cgd/                            ← CGD构建层(离线)
│       │   ├── builders/                   ← DS1-DS5构建器
│       │   ├── parsers/                    ← M-CSA/PDB/PDBe/RCSB客户端
│       │   ├── pap/                        ← 口袋锚定放置
│       │   ├── geometry/                   ← 角度计算(CGD版)
│       │   ├── homolog/                    ← 同源查找+保守性
│       │   ├── water/                      ← 催化水识别评分
│       │   ├── statistics/                 ← 统计聚合器+层级化
│       │   ├── quality/                    ← 质量过滤+覆盖度
│       │   └── utils/                      ← HTTP缓存+工具函数
│       ├── cgps/                           ← CGPS评分层
│       │   ├── s_co.py, s_geo.py, s_path.py
│       │   └── scorer.py                   ← 综合评分+权重
│       ├── agents/                         ← LLM Agent管线
│       │   ├── llm_client.py
│       │   ├── agent1_chemist.py ~ agent6_arbiter.py
│       │   ├── dispute_detector.py, confidence.py, fallback.py
│       │   └── pap_ez_bridge.py            ← G3 PAP→EZ回流
│       ├── pipeline/                       ← 集成层
│       │   ├── pipeline_orchestrator.py    ← G14 管线编排
│       │   └── main.py                     ← 主管线入口
│       ├── shared/                         ← ★ 共享模块(新旧桥梁)
│       │   ├── pdb/                        ← pdb_handler + rcsb_downloader
│       │   └── chemistry/                  ← overlay_substrate + ligand_compare + mol_svg + rule_loader + residue_info
│       ├── legacy/                         ← EZ旧代码(不可import新代码)
│       ├── data/                           ← 构建产出数据
│       │   ├── datasets/                   ← DS1-DS5 JSON
│       │   ├── auxiliary/                  ← 辅助文件
│       │   ├── derived/                    ← 阈值表+映射表
│       │   ├── cache/                      ← API缓存
│       │   └── reports/                    ← 审计报告
│       └── datasets/                       ← 外部数据源(rules_nat_met.xlsx)
│
├── docs/
│   ├── HANDBOOK.md                         ← ★ 本文档
│   ├── daily-tasks/                        ← 执行者任务清单(79个文件)
│   │   ├── phase-0-1.md ~ phase-0-5.md      ← Phase 0 (12个任务, 5个文件; 0.11/0.12合并于phase-0-5.md)
│   │   ├── phase-1-1.md ~ phase-1-13.md     ← Phase 1 (13个任务)
│   │   ├── phase-2-1.md ~ phase-2-14.md     ← Phase 2 (16个任务, 14个文件; 2.15/2.16合并于phase-2-14.md)
│   │   ├── phase-2.5-1.md ~ phase-2.5-13.md ← Phase 2.5 (13个任务)
│   │   ├── phase-3-1.md ~ phase-3-7.md      ← Phase 3 (7个任务)
│   │   ├── phase-4-1.md ~ phase-4-5.md      ← Phase 4 (5个任务)
│   │   ├── phase-5-1.md ~ phase-5-9.md      ← Phase 5 (12个任务, 9个文件)
│   │   ├── phase-5.5-1.md ~ phase-5.5-4.md  ← Phase 5.5 (6个任务, 4个文件)
│   │   ├── phase-6-1.md ~ phase-6-4.md      ← Phase 6 (5个任务, 4个文件)
│   │   ├── phase-7-1.md, phase-7-2.md, phase-7-2.5.md, phase-7-3.md, phase-7-4.md  ← Phase 7 (7个任务, 5个文件)
│   ├── CGD_MASTER_PLAN.md                  ← 源文档(参考)
│   ├── IMPLEMENTATION_PLAN.md              ← 源文档(参考)
│   └── GAP_AUDIT_G1-G16.md                ← 源文档(参考)
└── ...
```

## 8. 三文档依赖链

```
CGD_MASTER_PLAN (数据规范) ← 定义"做什么"
    │  DS1-DS5字段定义 + 8个核心问题方案
    ▼
IMPLEMENTATION_PLAN (行动计划) ← 定义"怎么做+何时做"
    │  分阶段任务 + 时间线 + 暴露运行时缺口
    ▼
GAP_AUDIT_G1-G16 (缺口审计) ← 定义"缺什么+复用什么"
    │  G1-G17缺口 + 代码复用率 → 反馈修正时间线
    └──→ 反馈到 IMPLEMENTATION_PLAN (v3.3→v3.5修正)
```

### 8个关键约束 (4个不可跳过 + 3个调度约束)

1. **不可跳过CGD做验证** — DS2/DS3统计分布是验证阈值来源
2. **不可跳过Phase 1做Phase 2** — 辅助文件(active_atom_definitions等)是DS3前置
3. **不可跳过Phase 2做Phase 2.5** — Scene A验证依赖DS3数据
4. **不可跳过Step 2.5做验证** — 映射表决定哪些步骤可完整验证
5. **Phase 3(DS5)可与Phase 2部分并行** — DS5 Layer 0不依赖DS3
6. **⚠️ Phase 2.5-4与Phase 3存在数据依赖循环** — rule_mapper.py路径2需要DS5映射表(Phase 3-4产出)，开发期用mock数据，Phase 3完成后需回归验证；路径1(parse_protonation_rule)和路径3(化学推断)不依赖DS5
7. **⚠️ Phase 2.5-13(Scene C)与Phase 4存在数据依赖** — Scene C验证器需CGPS评分函数(Phase 4产出)，开发期用mock scorer，Phase 4完成后需回归验证

## 9. 前端复用策略

**总策略**: 60%直接复制 + 25%适配修改 + 15%全新编写

| 复用级别 | 组件 | 来源 | 修改程度 |
|---------|------|------|---------|
| 直接复制(60%) | PdbViewer3D, PdbViewerWebGL, PdbViewerIframe, ChemicalEditor, MoleculeSVG, MoleculesPanel, StatsPanel, ZoomModal, StatCard, CopyButton, EmptyState, LoadingSkeleton, SmilesDisplay, MechanismGraphPanel(微调) | EZ | 低 |
| 适配修改(25%) | PdbWorkflowMode(重构为整合管线), MechanismPanel(+验证状态), PdbStructureViewer(+验证标注), EditMoleculeDialog(+新API), StepWizard(+Step 2.5), QuickPredictMode(+MechFind), DebugDialog(+新格式) | EZ | 中 |
| 全新编写(15%) | SceneSelector, Step25Panel, RuleMappingCard, ChemicalDescription, MechanismSVGViewer, FeasibilityAssessment, VerificationResultCard, ConfidenceDisplay, page.tsx(重写) | 新建 | 高 |

---

# Part 2: 每日实施指南

## Phase 0: 基础设施

> 📋 详细清单: `daily-tasks/phase-0-1.md` ~ `phase-0-5.md`

**目标**: 搭建项目骨架，验证所有外部API可达性

| 任务ID | 任务 | 产出 | 代码基础 | 天数 |
|--------|------|------|---------|------|
| 0.1 | 项目结构 | 目录结构 | ❌ | 0.5 |
| 0.2 | M-CSA API验证 | 测试脚本+JSON样本 | ❌ | 0.5 |
| 0.3 | PDB下载验证 | 测试脚本+PDB文件 | ✅ pdb_handler | 0.5 |
| 0.4 | PDBe API验证 | 测试脚本+JSON样本 | ❌ | 0.5 |
| 0.5 | RCSB Search验证 | 测试脚本+JSON样本 | ❌ | 0.5 |
| 0.6 | RDKit环境 | 环境就绪 | ✅ EzMech已有 | 0.5 |
| 0.7 | MechFind连通 | 连通测试 | ✅ 已运行 | 0.5 |
| 0.8 | 缓存模块 | 缓存模块 | ❌ | 1 |
| 0.9 | MechFind数据导出验证 | Unique_Rules_1.csv样本 | ✅ | 0.5 |
| 0.10 | Phase 0完整检查 | 全部验收标准确认 | — | 0.5 |
| 0.11 | **环境配置** | .env模板+依赖清单 | ❌ | 0.5 |
| 0.12 | **prediction-service骨架初始化** | FastAPI骨架+目录结构 | ❌ | 0.5 |

**关键上下文**: 本Phase任务逻辑上无代码依赖，但存在文件/数据层面的实践顺序(如0.2需0.1创建目录结构)。缓存模块(0.8)是后续Phase效率关键。

**验收标准**:
- [ ] M-CSA/PDB/PDBe/RCSB四API全部可达
- [ ] RDKit SMARTS匹配正常
- [ ] MechFind服务可达+数据可导出

**预计耗时**: 6.5天 (Week 1-2, 含缓冲) | **下一步**: 进入Phase 1

---

## Phase 1: CGD核心数据

> 📋 详细清单: `daily-tasks/phase-1-1.md` ~ `phase-1-13.md`

**目标**: 完成 DS1 + DS2 + 3个辅助文件 + 样本量缺口报告

| 任务ID | 任务 | 产出 | 代码基础 | 天数 |
|--------|------|------|---------|------|
| 1.1 | M-CSA批量爬取 | cache/mcsa_entries/ | ❌ | 2 |
| 1.2 | PDB批量下载 | cache/pdb_files/ | ✅ fetch_pdb_info | 1.5 |
| 1.3 | active_atom_definitions | ~45条映射JSON | ⚠️ ROLE_TO_RESIDUES参考 | 1 |
| 1.4 | ligand_reactive_atom_smarts | ~25个模式JSON | ❌ | 1 |
| 1.5 | PDB解析器扩展 | get_atom_coord封装 | ✅ parse_pdb_text已含atom_name | 1 |
| 1.6 | 主要角色提取 | get_primary_role() | ❌ | 0.5 |
| 1.7 | DS1构建 | DS1_residue_cooccurrence.json | ❌ 纯API聚合 | 2 |
| 1.8 | DS2构建 | DS2_residue_distance.json | ⚠️ 50%复用 | 4 |
| 1.9 | HET_to_ChEBI_mapping | ~200-300条映射JSON | ❌ | 2.5 |
| 1.10 | 质量过滤 | 过滤后entries清单 | ❌ | 1 |
| 1.11 | 覆盖度报告 | phase1_coverage.json | ❌ | 0.5 |
| 1.12 | DS2衍生: 距离阈值表 | distance_thresholds.json | ❌ | 0.5 |
| 1.13 | **样本量缺口报告** | sample_size_gap.json | ❌ | 0.5 |

**关键上下文**:
- DS2构建(1.8)是本Phase最长任务(4天)，需封装active_atom查表+坐标提取+百分位聚合
- 任务1.13样本量报告决定DS2/DS3层级化策略，直接影响Phase 2
- 层级化设计: Level 0(粗粒度=distance_category×role, n_obs≥30) → Level 1(细粒度=+residue_type)

**验收标准**:
- [ ] DS1: role_pair数>50, top频率合理
- [ ] DS2: n_obs≥20分组>30个, 1BTL验证距离正确
- [ ] 3个辅助文件完成(45+200+25条目)
- [ ] 距离阈值表每个role_pair有P90/P95
- [ ] 样本量缺口报告产出，层级化策略确定

**预计耗时**: 18天 (Week 2-5) | **下一步**: 进入Phase 2(最大风险区)

---

## Phase 2: CGD配体数据

> 📋 详细清单: `daily-tasks/phase-2-1.md` ~ `phase-2-14.md`

**目标**: 完成 DS3 + DS4，Scene A/B 全部打通 (⚠️ 最大风险区)

| 任务ID | 任务 | 产出 | 代码基础 | 天数 |
|--------|------|------|---------|------|
| 2.1 | 催化水识别(MVP) | 评分模块(3/5维) | ⚠️ 30% | 3 |
| 2.2 | 配体分类模块 | 5级权威源验证 | ❌ | 2 |
| 2.3 | **Scene A DS3** | DS3 Scene A(含层级化) | ⚠️ 25% | 5.5 |
| 2.4 | DS4构建 | DS4_cofactor_cooccurrence.json | ❌ 类似DS1 | 2 |
| 2.5 | 同源查找 | RCSB API查询模块 | ❌ | 2 |
| 2.6 | TM-align集成 | TM-score分层加权 | ❌ | 2 |
| 2.7 | 残基保守性验证 | 双层验证(序列+空间) | ❌ | 3 |
| 2.8 | 同源替代DS3 | DS3 Scene B(同源) | ⚠️ | 2 |
| 2.9 | 口袋锚定放置(MVP) | pocket_anchor.py | ⚠️ 部分复用 | 1.5 |
| 2.10 | **CGD筛选overlay** | overlay模块(DS3筛选版) | ⚠️ | 2.5 |
| 2.11 | 催化水识别(完整) | 5维评分 | ⚠️ | 2 |
| 2.12 | 置信度评估 | 4级置信度 | ❌ | 1 |
| 2.13 | 对比实验 | overlay_comparison.json | — | 2 |
| 2.14 | 覆盖度报告 | phase2_coverage.json | ❌ | 0.5 |
| 2.15 | 角度计算A1-A3 | angle_calculator.py (CGD版) | ❌ | 1.5 |
| 2.16 | 配体Mol构建(CGD版) | ligand_builder.py (CGD版) | ❌ | 1 |

**关键上下文**:
- **PAP方案**(2.9-2.10): 放弃bounds matrix，用"口袋锚定+生成→筛选"，代码量少~200行
- **DS2先验 vs DS3后验**: DS2验证活性位点合理性(overlay前)，DS3筛选配体放置(overlay后)
- **PAP特征**: D1距离退化为常数(锚点决定)，可接受(等权质心使D1天然在合理区间)
- **2.3层级化**: 同时构建Level 0+Level 1，增量~0.5天

**验收标准**:
- [ ] DS3 Scene A: n_obs≥10的D1类别>15个
- [ ] DS3 Scene B: 同源替代距离偏差<1.0Å
- [ ] PAP放置+DS3筛选: 比无约束误差降低≥20%
- [ ] 角度A1-A3完成, 配体Mol构建完成

**预计耗时**: 33.5天 (Week 5-11; 含2.4/2.5/2.6与2.3部分并行, 实际~7周) | **下一步**: 进入Phase 2.5(端到端关键!)

---

## Phase 2.5: EZ验证运行时

> 📋 详细清单: `daily-tasks/phase-2.5-1.md` ~ `phase-2.5-13.md`

**目标**: 实现从用户输入到验证输出的完整运行时管线，系统端到端可运行

| 任务ID | 任务 | 产出 | 缺口 | 复用率 | 天数 |
|--------|------|------|------|--------|------|
| 2.5.1 | 场景判定+降级 | scene_resolver.py | G6+G16 | 40% | 1.0 (含types.py) |
| 2.5.2 | PDB获取+残基定位 | pdb_locator.py | G8 | ⭐68% | 1.0 (含D19) |
| 2.5.3 | 配体Mol构建(运行时) | ligand_builder.py | G13 | ⭐MVP 0天 | 0.3 |
| 2.5.4 | **运行时规则映射+残基识别** | rule_mapper.py | G7 | 58% | 1.0 |
| 2.5.5 | **Scene A完整验证** | scene_a_validator.py | G1 | 38% | 1.5 |
| 2.5.6 | 统一验证结果格式 | verification_result.py | G5 | 0% | 0.5 |
| 2.5.7 | S_geo运行时组合 | s_geo_runtime.py | G4 | 0% | 0.5 |
| 2.5.8 | **EZ SMARTS执行循环** | ez_executor.py | G10 | ⭐60% | 1.0 |
| 2.5.9 | 中间体3D构象管理 | intermediate_conformer.py | G12 | ⭐60% | 1.0 |
| 2.5.10 | 置信度分量计算 | confidence_calculator.py | G11 | 0% | 1.0 |
| 2.5.11 | 管线编排 | pipeline_orchestrator.py | G14 | 0% | 3.0 (含D19) |
| 2.5.12 | **Scene B验证器骨架** | scene_b_validator.py | — | 0% | 0.5 |
| 2.5.13 | **Scene C验证器骨架** | scene_c_validator.py | — | 0% | 0.5 |

**关键上下文**:
- **最大结构性缺口**: CGD数据构建100%覆盖，但运行时管线仅5%→复用后~30%
- **高复用缺口**: G8(pdb_handler 68%), G10(mechanism_search 60%), G12(ETKDG+Kabsch 60%), G13(MVP 0天新写)
- **关键路径**: G6→G8→G13→G1→G10→G12 = 5.1天(原10.5天, 缩减51%)
- ⭐ **任务 2.5.4 扩展**: `rule_mapper.py` 包含 **三路径残基识别** (parse_protonation_rule + M-CSA查询 + 化学推断)，详见下方"SMARTS→残基映射"小节
- **运行时数据加载策略**: DS1-DS5在服务启动时全量加载到内存（总量<50MB），以dict形式提供O(1)查询；距离阈值表和映射表同理。不使用数据库查询。

### SMARTS→残基映射 (三路径策略)

MechFind 输出的规则 ID 本身是残基识别的关键入口，SMARTS 化学模式本身不含残基信息。`step25/rule_mapper.py` 通过三条路径实现 rule→residue 映射：

| 优先级 | 路径 | 规则格式 | 残基来源 | 置信度 | 示例 |
|--------|------|---------|---------|--------|------|
| 1 | 规则名直接解析 | `XXX_pro/depro` | `parse_protonation_rule()` 解析规则名 | 0.7-1.0 | `Ser_pro` → Ser(OG) |
| 2 | M-CSA数据库查询 | `j_i_s` | DS5查表→M-CSA条目残基数据 | 0.7-0.95 | `1_1_1` → M-CSA #1残基 |
| 3 | 化学推断(兜底) | 任意 | SMARTS原子环境推断 | ≤0.5 | `[OH]>>[O]` → 亲核试剂 |

**路径1: parse_protonation_rule()**
- MechFind ~96条质子化规则，名称直接编码残基类型: `Ser_pro`, `HisN3_depro`, `Cys_pro`, `Water_pro` 等
- 双候选处理: `Asp/Glu_pro` → 返回 `[Asp(OD1,0.8), Glu(OE1,0.8)]`，由3D距离检查消歧
- 底物标记: `Methylamide_depro` → `{residue: "Substrate", type: "substrate"}`，不强制归类为氨基酸
- 辅因子标记: `FAD_N3`, `PLP_N` → `{type: "cofactor"}`
- 每条结果含 `"type": "residue" | "cofactor" | "substrate" | "water" | "metal"` 字段供下游路由

**路径2: M-CSA查询 (依赖DS5构建)**
- 对 `j_i_s` 格式规则，从 DS5 查得 mcsa_id → 查 M-CSA 缓存 → 获取实验验证残基
- M-CSA API 返回 `residues[].residue_chains[]` 含 `{code, chain, resid}` 和 `residues[].roles[]`
- 精确通道: 数据来源为实验文献标注，权威性最高
- 前置: Phase 1-1 的 M-CSA 批量爬取缓存 (Phase 3-1 补充扩展) 确保缓存完整

**路径3: 化学推断 (仅兜底)**
- 基于 `residue_info.py` 的 `analyze_residue_roles()` 启发式推断
- 硬约束: confidence ≤ 0.5，仅推断常见角色(亲核试剂、酸/碱)
- **绝不覆盖** 路径1/2的结果

**多步约束求解器**:
- 催化三联体检测: Ser-His-Asp/Glu 组合识别 + 角色冲突解决
- 催化二联体检测: Cys-His 组合识别
- 空间验证: 3D距离检查消歧双候选 (如 Asp vs Glu)

### ⭐ PDB自动预选流程 (D19)

**核心问题**: MechFind返回多条路径时，用户不应手动逐条指定PDB和残基

**设计原则**: "选择题而非填空题" — 系统自动预选，用户仅确认/修正

**关键洞察**: MechFind输出自带M-CSA相似度链接，可直接链到PDB

**5步流程**:
```
MechFind输出N条路径
    │
    ▼
1. 路径按M-CSA ID分组 (同组共享PDB搜索)
    │
    ▼
2. 每组自动搜索PDB (locate_by_mcsa_id)
    │
    ▼
3. 检查残基兼容性 (check_residue_compatibility)
    │
    ▼
4. 生成确认卡片 → 用户确认/修正
    │
    ▼
5. 批量运行验证
```

**模块变更表**:

| 模块 | 新增函数 | 说明 |
|------|---------|------|
| pdb_locator.py | +locate_by_mcsa_id(mcsa_id) | 通过M-CSA条目直接获取EC→PDB |
| pdb_locator.py | +check_residue_compatibility(pdb_id, residue_info) | 检查残基是否可定位+推荐场景 |
| pipeline_orchestrator.py | +_group_paths_by_mcsa(paths) | 按M-CSA ID分组路径 |
| pipeline_orchestrator.py | +_auto_select_pdbs(path_groups) | 自动确定每组PDB |
| pipeline_orchestrator.py | +_build_confirmation_card(group) | 生成确认卡片数据 |

**确认卡片数据格式**:
```json
{
  "groups": [
    {
      "mcsa_id": 1,
      "enzyme_name": "Chymotrypsin",
      "ec_code": "3.4.21.1",
      "selected_pdb": {
        "pdb_id": "1CGH",
        "resolution": 1.67,
        "has_ligand": true,
        "ligand_name": "BZA",
        "ligand_type": "inhibitor"
      },
      "candidate_pdbs": ["1GCT", "4H4F"],
      "paths": [
        {"path_idx": 0, "score": 0.85, "residue_status": [{"residue": "Ser195", "status": "located"}, {"residue": "His57", "status": "located"}], "recommended_scene": "A"}
      ],
      "unmatched_paths": []
    }
  ]
}
```

**降级与回退**:

| 场景 | 处理 |
|------|------|
| M-CSA缓存缺失对应条目 | 降级到用户提供的EC/UniProt→pdb_locator |
| 无EC/UniProt | Scene C + 标记"需手动指定PDB" |
| PDB中残基缺失 | 标注⚠️，推荐Scene B |
| 用户手动覆盖PDB | 重新运行check_residue_compatibility |
| 残基编号M-CSA与PDB不一致 | 使用DBREF映射 |

**验收标准**:
- [ ] G6: 场景判定可自动区分A/B/C + A→B降级
- [ ] G8: PDB获取+催化残基定位正确
- [ ] G13: 配体Mol可从HETATM构建
- [ ] G1: Scene A端到端可运行(1BTL案例)
- [ ] G10: SMARTS执行循环可逐步验证
- [ ] G14: Top-N候选可并行评估+排序
- [ ] ⭐ parse_protonation_rule() 覆盖≥90%质子化规则名
- [ ] ⭐ PDB自动预选: 路径可按M-CSA分组+PDB自动搜索+残基兼容性检查+确认卡片生成

**预计耗时**: 12.8天 (Week 11-14; 含+1.4天D19 PDB预选) | **下一步**: Phase 3+4可并行启动

---

## Phase 3: CGD规则映射+优化

> 📋 详细清单: `daily-tasks/phase-3-1.md` ~ `phase-3-7.md`

**目标**: 完成 DS5 Layer 0 (含残基映射扩展) + 统计消歧

| 任务ID | 任务 | 产出 | 天数 |
|--------|------|------|------|
| 3.1 | MechFind规则解析 + **M-CSA批量下载** | 规则解析模块 + M-CSA残基数据缓存 | 2 |
| 3.2 | EZ SMARTS规则库 | EZ规则库 | 0.5 |
| 3.3 | **DS5 Layer 0** (含残基映射) | DS5_rule_crossmapping.json | 3.5 |
| 3.4 | 规则映射表衍生 (含residue_info) | rule_mapping_table.json | 0.5 |
| 3.5 | 统计消歧 | 消歧模块(DS3≥50样本) | 2 |
| 3.6 | DS3迭代优化 | 优化后DS3 | 1.5 |
| 3.7 | 全数据集审计 | full_audit.json | 1 |

**关键上下文**:
- DS5只做Layer 0(1:1映射)，覆盖率~40-50%即可；1:N映射延后到Phase 5与Agent②一起做
- S_path权重最低(w3≈0.1-0.15)，低覆盖率可接受
- ⭐ **DS5 schema 扩展**: 新增 `residue_info` 字段，持久化三路径残基映射结果到 DS5，使运行时无需重复推断

### DS5 Schema 扩展: residue_info 字段

DS5 每条记录新增 `residue_info` 对象，持久化 rule→residue 映射结果，供 Phase 2.5 运行时直接查表:

```json
{
  "rule_id_mf": "Ser_pro",
  "rule_id_ez": "R0042",
  "mapping_type": "1:1",
  "mcsa_id": null,
  "smarts_ez": "[OD1:1]>>[OD2:1]",
  "confidence": "exact",
  "match_method": "direct_smarts",

  "residue_info": {
    "source": "protonation_rule",
    "entries": [
      {
        "residue": "Ser",
        "site": "OG",
        "atom": "O",
        "type": "residue",
        "confidence": 1.0
      }
    ]
  }
}
```

**各路径 schema 示例**:

| 路径 | source值 | entries 结构 | 特殊处理 |
|------|---------|-------------|---------|
| 路径1: 质子化规则 | `"protonation_rule"` | `{residue, site, atom, type, confidence}` | `Asp/Glu_pro`→双候选; `Methylamide_depro`→`type:"substrate"` |
| 路径2: M-CSA查询 | `"mcsa_query"` | `{residue, site, atom, type, confidence, mcsa_residue_id}` | 含实验文献来源ID |
| 路径3: 化学推断 | `"chemical_inference"` | `{residue:null, role, atom, type:"unknown", confidence≤0.5}` | 仅推断角色，不指定残基 |
| 未映射 | `null` | `[]` | 无残基信息 |

**type 字段枚举**: `"residue"` | `"cofactor"` | `"substrate"` | `"water"` | `"metal"` | `"unknown"`

**双候选格式** (如 `Asp/Glu_pro`):
```json
"residue_info": {
  "source": "protonation_rule",
  "entries": [
    {"residue": "Asp", "site": "OD1", "atom": "O", "type": "residue", "confidence": 0.8},
    {"residue": "Glu", "site": "OE1", "atom": "O", "type": "residue", "confidence": 0.8}
  ]
}
```

**底物格式** (如 `Methylamide_depro`):
```json
"residue_info": {
  "source": "protonation_rule",
  "entries": [
    {"residue": "Substrate", "site": null, "atom": "N", "type": "substrate", "confidence": 1.0}
  ]
}
```

**辅因子格式** (如 `FAD_N3`):
```json
"residue_info": {
  "source": "protonation_rule",
  "entries": [
    {"residue": "FAD", "site": "N3", "atom": "N", "type": "cofactor", "confidence": 1.0}
  ]
}
```

**验收标准**:
- [ ] DS5 Layer 0: 1:1映射率>40%
- [ ] ⭐ DS5 residue_info: 质子化规则覆盖率>90%，M-CSA规则覆盖率>80%
- [ ] 统计消歧: 正确率提升>10%
- [ ] CGD全部就绪(5数据集+3辅助+2衍生)

**预计耗时**: 11天 (Week 11-13) | **下一步**: 进入Phase 4

---

## Phase 4: CGPS评分

> 📋 详细清单: `daily-tasks/phase-4-1.md` ~ `phase-4-5.md`

**目标**: 实现CGPS评分函数 + 阈值校准

| 任务ID | 任务 | 产出 | 天数 |
|--------|------|------|------|
| 4.1 | S_co实现 | cgps/s_co.py | 1 |
| 4.2 | S_geo实现 | cgps/s_geo.py | 2 |
| 4.3 | S_path实现 | cgps/s_path.py | 1.5 |
| 4.4 | CGPS综合 | cgps/scorer.py | 1 |
| 4.5 | 阈值校准 | calibrated_params.json | 2 |

**关键上下文**:
- CGPS = w1·S_co + w2·S_geo + w3·S_path
- Scene C: w2=0 (无PDB→无S_geo)
- 校准: M-CSA 80/20训练集，校准w1,w2,w3,θ_low,θ_high

**验收标准**:
- [ ] CGPS评分: 已知机制排名Top-3
- [ ] 权重w1,w2,w3确定
- [ ] 灰色区间θ_low,θ_high确定

**预计耗时**: 7.5天 (Week 13.5-15) | **下一步**: 进入Phase 5

---

## Phase 5: LLM Agent管线

> 📋 详细清单: `daily-tasks/phase-5-1.md` ~ `phase-5-9.md`

**目标**: Agent①② + 争议检测 + Agent③④⑤⑥ + DS5 Layer 1 + PAP回流

> ⚠️ **文件合并**: phase-5-8.md = 任务5.8+5.9+5.12, phase-5-9.md = 任务5.10+5.11

| 任务ID | 任务 | 产出 | 天数 |
|--------|------|------|------|
| 5.1 | LLM接口封装 | llm_client.py | 1.5 |
| 5.2 | Agent①化学审查 | agent1_chemist.py | 2 |
| 5.3 | Agent②规则翻译 | agent2_translator.py | 2.5 |
| 5.4 | RunReactants闭环 | 闭环验证模块 | 1 |
| 5.5 | 争议检测 | dispute_detector.py(5触发条件) | 2 |
| 5.6 | Agent③④⑤ | 3个Agent模块 | 3 |
| 5.7 | Agent⑥综合评审 | agent6_arbiter.py | 1.5 |
| 5.8 | 置信度综合计算 | agents/confidence.py | 1 |
| 5.9 | 降级策略 | agents/fallback.py | 1 |
| 5.10 | DS5 Layer 1 | 优化后DS5(1:N映射) | 1.5 |
| 5.11 | 端到端测试 | 测试报告(3场景各1案例) | 1.5 |
| 5.12 | PAP→EZ回流接口 | pap_ez_bridge.py (G3) | 0.5 |

**关键上下文**:
- **降级策略**: LLM不可用时→Agent①用硬编码规则，Agent②用首条匹配，Agent③-⑥不执行
- **系统不依赖LLM也能运行**，LLM是增强不是必需
- **争议检测5条件**: CGPS灰色区间/Agent分歧/几何矛盾/路径断裂/多候选评分接近

**验收标准**:
- [ ] Agent①②: 评分+翻译合理
- [ ] 争议检测: 5条件触发正确
- [ ] Agent⑥: 裁决一致率>70%
- [ ] 降级策略: LLM关闭后可运行
- [ ] DS5 Layer 1: 1:N映射补充完成

**预计耗时**: 19天 (Week 15-19) | **下一步**: Phase 5.5(可与Phase 5部分并行)

---

## Phase 5.5: 氧化还原+氢原子

> 📋 详细清单: `daily-tasks/phase-5.5-1.md` ~ `phase-5.5-4.md`

**目标**: 辅因子介导的氧化还原3D验证 + 金属配位几何分析 + 氢原子坐标生成

| 任务ID | 任务 | 产出 | 缺口 | 天数 |
|--------|------|------|------|------|
| 5.5.1 | 氧化还原中心识别 | redox_center_identifier.py | G9 | 1 |
| 5.5.2 | 氧化还原步骤分类 (⭐含cofactor_organic扩展) | redox_step_classifier.py | G9 | 1.5 |
| 5.5.3 | 辅因子几何验证 | cofactor_geometry_validator.py | G9 | 1.5 |
| 5.5.4 | 金属配位几何分析 | metal_coordination_analyzer.py | G9 | 1 |
| 5.5.5 | 氧化还原距离类别 | redox_distance_categories.py | G9 | 0.5 |
| 5.5.6 | 氢原子坐标生成 | hydrogen_adder.py | G15 | 0.3 |

**关键上下文**:
- 氧化还原酶占M-CSA ~25%，是最大酶类
- MVP策略: Phase 2.5用距离近似(A2用距离替代角度)，本Phase完善
- G9复用率极低(5%)，大部分需新写
- ⚠️ **D22 氧化还原验证范围分级**: 只有辅因子介导的氢负离子转移(NAD⁺/NADH、FAD/FADH₂、FMN等)能用Scene A/B做完整3D验证；纯金属价态变化(Fe²⁺→Fe³⁺)的步骤RunReactants无法模拟，不能获得完整3D验证，自动降级至Scene C

### 氧化还原验证范围分级 (D22)

**核心区分**: 氧化还原步骤分为两类，验证能力不同:

| 类别 | 反应类型 | 3D验证能力 | 场景归属 | 示例 |
|------|---------|-----------|---------|------|
| 辅因子氢负转移 | NAD⁺/NADH, FAD/FADH₂, FMN | ✅ 完整3D验证 (Scene A/B) | 按PDB+配体状态 | 乙醇脱氢酶(EC 1.1.1.1) |
| ⭐ 有机辅因子 (cofactor_organic) | PLP(Schiff碱), TPP, 生物素 | ✅ 完整3D验证 (Scene A/B) | 按PDB+配体状态 | 转氨酶(EC 2.6.1.1, PLP) |
| 金属价态变化 | Fe²⁺→Fe³⁺, Cu⁺→Cu²⁺ | ❌ 不可3D验证 | 自动降级Scene C | 铁氧还蛋白(EC 1.8.7) |

**设计原则**:
- 辅因子氢负转移: RunReactants可模拟完整反应(辅因子→产物+辅因子'状态)，因此可用Scene A/B验证距离/角度/构象
- 金属价态变化: RunReactants无法模拟金属离子价态变化(需要量子化学描述)，只能做结构分析(配位距离/键角/配位数)，与CGD统计分布对比给出"配位几何合理性评分"
- 不声称能验证金属价态变化步骤的化学正确性，只做结构合理性分析

**Phase 7验证影响**:
- 辅因子氧化还原案例: 纳入Scene A/B评估，计算Top-1命中率
- 金属氧化还原案例: 仅纳入Scene C评估，不期望3D验证通过
- 如果不做此区分，Phase 7的Scene A/B命中率会被金属案例拖低，导致数据失真

**验收标准**:
- [ ] 辅因子介导的氧化还原步骤(NAD⁺/FAD/FMN等)可获得完整3D验证(Scene A/B)
- [ ] ⭐ 有机辅因子步骤(PLP/TPP/生物素等)可获得完整3D验证(Scene A/B)，分类为cofactor_organic
- [ ] 金属配位几何分析(距离/角度/配位数，与CGD对比)可用，但不声称3D验证(Heme同此规则)
- [ ] 纯金属价态变化步骤自动降级至Scene C(CGPS统计评分)
- [ ] ⭐ redox_step_classifier可自动区分辅因子氢负转移/cofactor_organic/金属价态变化，分类标签供Phase 7使用
- [ ] ⭐ Heme使用coordination_rationality_score(分析)而非passed(验证)，与metal_coordination_analyzer一致
- [ ] A2质子转移角度可用精确H坐标计算

**预计耗时**: 5.8天 (Week 19-20) | **下一步**: 进入Phase 6

---

## Phase 6: 系统集成

> 📋 详细清单: `daily-tasks/phase-6-1.md` ~ `phase-6-4.md`

**目标**: 端到端管线 + Web UI

| 任务ID | 任务 | 产出 | 天数 |
|--------|------|------|------|
| 6.1 | 主管线编排 | pipeline/main.py | 2 |
| 6.2 | API服务 | FastAPI: /predict, /results, /step25, /verify, /scene, /cgd/stats | 2.5 |
| 6.3 | Web UI | Next.js前端+NGL Viewer | 4 |
| 6.4 | CGD管理界面 | 数据集浏览+覆盖度仪表盘 | 1.5 |
| 6.5 | 性能优化 | 缓存+并行+批量 | 1.5 |

**关键上下文**: 前端重构步骤 — ①迁移基础组件(Day 1) → ②迁移核心组件+适配(Day 2-3) → ③新写Step 2.5组件(Day 4-5) → ④新写验证组件(Day 6) → ⑤整合主页面(Day 7) → ⑥API层适配(Day 8)

**验收标准**:
- [ ] 完整管线: 输入SMILES→排序候选+验证报告
- [ ] Web UI: 3场景均可交互验证
- [ ] API: 所有端点可调通

**预计耗时**: 11.5天 (Week 19-22; 含+1.5天D19确认卡片) | **下一步**: 进入Phase 7

⭐ **D22管线集成要求**: 主管线(pipeline/main.py)必须在场景判定后、EZ验证前调用redox_step_classifier，将含金属价态变化步骤的路径自动降级至Scene C。EZ executor(2.5-8)必须区分"匹配失败"(eliminated)和"无SMARTS可匹配"(skip+S_path=0)。RunReactants验证器(5-4)必须返回inapplicable状态(非fail)对金属步骤。Phase 7 LOECO(7.2)和降级实验(7.2.5)必须按redox_subclass分层统计，避免金属案例拖低Scene A/B指标。详见DAILY_TASKS_AUDIT_REPORT.md。

### API 接口约定

> **目的**: 前后端分离架构下，API契约是唯一协作界面。Phase 6.2 必须产出 OpenAPI schema 文件作为契约的机器可读定义。

**核心端点**:

| 端点 | 方法 | 请求体 | 响应体 | 说明 |
|------|------|--------|--------|------|
| `/predict` | POST | `PredictRequest` | `PredictResponse` (含 task_id) | 异步预测，返回 task_id |
| `/results/{task_id}` | GET | — | `TaskResult` | 查询异步任务状态+结果 |
| `/step25` | POST | `Step25Request` | `VerificationResult` | Step 2.5 规则映射子管线 |
| `/verify` | POST | `VerifyRequest` | `VerificationResult` | 完整验证 (Scene A/B/C) |
| `/scene` | POST | `SceneRequest` | `SceneResult` | 场景判定 |
| `/cgd/stats` | GET | — | `CGDStatsResponse` | CGD 数据集统计 |
| `/health` | GET | — | `{"status": "ok"}` | 健康检查 |

**关键 Pydantic 模型**:

```python
class VerifyRequest(BaseModel):
    task_id: str
    scene: Literal["A", "B", "C"]
    pdb_id: Optional[str] = None
    ligand_mappings: Optional[List[Dict]] = None
    selected_paths: List[int]

class PredictRequest(BaseModel):
    substrate_smiles: str
    product_smiles: str
    ec_code: Optional[str] = None
    pdb_id: Optional[str] = None
    uniprot_id: Optional[str] = None  # UniProt ID, 用于同源查找
    top_n: int = 5
    use_llm: bool = True

class VerificationResult(BaseModel):
    scene: Literal["A", "B", "C"]
    mechanism_id: str
    s_co: float
    s_geo: Optional[float]  # None for Scene C
    s_path: float
    cgps_score: float
    confidence: float
    source_type: str  # "direct" | "overlay" | "statistical"
    distance_scores: List[Dict]
    passed: bool
    degradation_reason: Optional[str] = None
    # ⭐ Phase 2.5 运行时扩展字段
    residue_info: Optional[Dict] = None  # 三路径残基映射结果
    rule_mapping: Optional[Dict] = None  # 规则映射详情(路径+SMARTS)
    step25_outputs: Optional[Dict] = None  # Step 2.5 产出(2D SVG, 化学描述, 可行性评估)
    ligand_coords: Optional[List[Dict]] = None  # 真实配体坐标(Scene A)
    pap_substrate_coords: Optional[List[Dict]] = None  # PAP生成底物坐标(Scene B), 用于7.2.5 RMSD
```

**CGPS vs Confidence 关系说明**:
- **CGPS评分** (`cgps_score`): 纯数据驱动的结构一致性评分 = w1·S_co + w2·S_geo + w3·S_path，由 Phase 4 的 CGPS 模块计算
- **置信度** (`confidence`): 综合可信度 = 0.25×MF + 0.50×EZ + 0.15×Agent + 0.10×Arbiter，由 Phase 2.5-10 的 confidence_calculator.py 计算
- **关系**: confidence 包含 cgps_score 作为 EZ 分量的输入之一（Scene A: EZ=S_geo, Scene C: EZ=CGPS），但两者是不同维度的评估。CGPS 量化"结构与统计先验的一致性"，confidence 量化"整体结论的可信程度"
- **排序**: 最终排序使用 `confidence`（更全面），`cgps_score` 作为参考指标

**产出要求**: Phase 6.2 完成时必须输出 `docs/api_schema.json` (OpenAPI 3.0 格式)，由 FastAPI 自动生成 + 手动补充描述。前端开发以此文件为契约，无需阅读后端代码。

---

## Phase 7: 验证与论文

> 📋 详细清单: `daily-tasks/phase-7-1.md`, `phase-7-2.md`, `phase-7-2.5.md`, `phase-7-3.md`, `phase-7-4.md`

**目标**: M-CSA验证 + 渐进降级交叉验证 + 论文

| 任务ID | 任务 | 产出 | 天数 |
|--------|------|------|------|
| 7.1 | M-CSA留出验证 (⭐含D22 redox_subclass分离) | 验证报告(80/20) | 4 |
| 7.2 | 跨EC泛化 (⭐含D22 redox_subclass分层统计) | 泛化报告 | 2 |
| 7.2.5 | ⭐ **渐进降级交叉验证** (含D22 redox_subclass标注+分层统计) | 降级曲线+PAP RMSD验证 | 3 |
| 7.3 | CGD约束对比 | 无约束vs筛选overlay图表 | 1.5 |
| 7.4 | **IDR验证** (7.2.5后续处理，读取7.2.5产出) | IDR评分+降级曲线 | 1.0 | ← 不重复7.2.5的实验，读取progressive_degradation.json |
| 7.5 | ⭐ **LLM消融 (D23: 4组精简消融)** | 消融报告+分场景+Agent一致性 | 1.5 |
| 7.6 | 论文图表 | 架构+流程+分布+结果图 | 1 |
| 7.7 | 论文章节 | 方法+结果 3.1-3.9 | 1 |

### ⭐ 4组消融实验设计 (D23)

**设计原则**: 精简高效，覆盖审稿人核心关切，最小化LLM成本

**4组配置**:

| 配置 | 组件 | 量化问题 | LLM调用/样本 |
|------|------|---------|-------------|
| full | MF+EZ+CGPS+A1②③④⑤⑥ | 基线 | ~7 (自然管线) |
| compute_only | MF+EZ+CGPS | Agent整体价值 | 0 |
| no_review | MF+EZ+CGPS+A1② | 评审团③④⑤⑥价值 | ~2 |
| no_A6 | MF+EZ+CGPS+A1②③④⑤ | 仲裁者⑥价值 | ~6 |

**成本估算** (GPT-4o + 自然管线):
- 计算管线: 1次运行(结果缓存) ≈ 2-3h
- LLM总调用: ~2,940次 ≈ **$30**
- 开发+运行: 2-3天

**3个零成本分析维度** (后处理分组统计，无需额外运行):

| 维度 | 方法 | 论文位置 |
|------|------|---------|
| 分场景Agent贡献 | 按Scene A/B/C分组: Acc_full - Acc_compute_only | 主文图3 |
| 分争议级别仲裁效果 | 按dispute_level分组: 仲裁前后准确率差 | Supp Material |
| Agent一致性 | Agent③④⑤两两Cohen's κ + Pearson r | Supp Material |

**论文4张主文图**:
1. 消融柱状图 (4组 × Top-1/3/5)
2. Agent边际贡献瀑布图 (compute_only → full逐步加回)
3. 分场景Agent贡献分组柱状图 (Scene A/B/C)
4. IDR降级曲线 (Scene A→B→C + Agent on/off)

**关键叙事** (论文3.9消融分析):
> "我们通过消融实验量化了每个Agent组件的贡献。总体而言，Agent系统将Top-1准确率从X%(纯计算)提升至Y%(完整系统)，其中评审团(Agent③④⑤)贡献了Z%的提升。值得注意的是，Agent的贡献在不同信息层级下差异显著：在Scene A(完整3D数据)中Agent仅贡献a%，而在Scene C(无结构数据)中Agent贡献了b%——这表明LLM推理在信息缺失时发挥了不可替代的补偿作用。"

### 渐进降级交叉验证 (D16)

> **定位**: 这不是外部准确性基准，而是**内部一致性评估**。Scene A 是"银标准"（系统输入信息最丰富时的输出），不是"金标准"（非QM/MM或实验验证的绝对真理）。本实验量化"信息缺失时系统输出的衰减程度和一致性"，不能证明B/C的绝对准确性。

> ⚠️ **D22氧化还原分类影响**: Phase 7.1验证时必须将氧化还原案例分为两类:
> - **辅因子氧化还原**(NAD⁺/FAD/FMN介导): 纳入Scene A/B评估，计算Top-1命中率
> - **金属氧化还原**(Fe²⁺→Fe³⁺等): 仅纳入Scene C评估，不期望3D验证通过
>
> 如果不做此区分，Scene A/B命中率会被金属案例拖低，导致数据失真

**论文表述范式** (必须遵循):

> ❌ "We used Scene A as ground truth to validate Scene B and C accuracy."
>
> ✅ "To quantify the impact of information loss on our system's assessments, we performed a progressive degradation analysis. For {N} entries where full PDB + ligand data were available (Scene A) (N determined by E1 dual-threshold classification, estimated full_pool ~80-120), we artificially withheld the ligand or the entire PDB to simulate Scene B and C conditions. Scene A's output served as a reference baseline, allowing us to measure the consistency of our validation framework under diminishing structural information."

**实验设计**:

| 运行模式 | 输入 | 要验证的核心问题 | 关键指标 |
|---------|------|---------------|---------|
| Scene A | PDB + 配体 | 基线 | — (参考基线) |
| Scene B | PDB (不传配体) | PAP放置后3D评分与A的一致性如何？ | **PAP底物位置RMSD** (vs A真实配体) + A-B排名一致率 |
| Scene C | 仅SMILES + EC **(采用A的残基组合)** | 纯统计排序与3D评分的差异有多大？ | A-C排名一致率 + 置信度衰减曲线 + Kendall τ |

**关键实验控制**:

1. **Scene C 公平性控制**: CGPS评分需要残基组合，在无PDB时默认用路径3推断。为**隔离变量**（仅测试结构信息缺失的影响，而非残基识别误差），Scene C 的 CGPS 输入残基组合**直接采用 Scene A 已确认的残基组合**，而非路径3推断结果
2. **Scene B PAP RMSD 直接验证**: 在已知配体的A案例中，隐藏配体用PAP生成底物构象，计算 PAP 生成底物反应中心原子坐标与真实PDB配体坐标的 RMSD。预期值 1.5-3.0Å；>3.0Å 则PAP实用性受严重挑战
3. **候选集严格筛选**: 除分辨率≤2.5Å和配体B-factor≤50外，配体必须是真正底物/底物类似物（非抑制剂/缓冲液），依赖 `HET_to_ChEBI_mapping.json` 过滤

**核心指标**:

| 指标 | 公式/定义 | 含义 |
|------|---------|------|
| A-B 排名一致率 | rank_A == rank_B 的比例 | PAP放置对最终排名的影响 |
| A-C 排名一致率 | rank_A == rank_C 的比例 | 纯统计对最终排名的影响 |
| Top-k 重叠率 | top_k_A ∩ top_k_B / k | 两个场景的候选重叠度 |
| 置信度衰减曲线 | conf_A vs conf_B vs conf_C | 信息缺失→置信度下降程度 |
| **PAP底物RMSD** | PAP底物坐标 vs PDB真实配体坐标 | PAP放置精度最直接验证 |
| Kendall τ | 排名_A vs 排名_B/C 的排序相关性 | 候选机制排序一致性 |

**预期降级曲线** (论文核心图表):

```
排名一致率
  100% ┤
       │  A-B: ~70-80%
   80% ┤  ─────────────
       │
   60% ┤  A-C: ~50-60%
       │  ─────────────
       │
   40% ┤
       └──────────────────
         Scene A → B → C  (信息递减)
```

**验收标准** (⚠️ 两级标准):
- [ ] **硬性标准** (任务完成必要条件):
  - M-CSA验证: full_pool/limited_pool/mechfind_failure三分类完成, D22 redox_subclass标注完成
  - ⭐ 渐进降级: 三模式(ABC)均可正确运行, Scene C使用A的残基组合
  - CGD约束: 对比实验完成(无论统计显著性)
  - 论文: 方法部分完整，降级曲线图可发表
- [ ] **参考目标** (性能期望, 未达标不阻塞):
  - M-CSA Top-1命中率>60% (full_pool子集)
  - ⭐ 渐进降级: A-B排名一致率>65%, A-C排名一致率>45%
  - ⭐ PAP RMSD: 中位数≤3.0Å
  - CGD约束: 筛选overlay显著优于无约束(p<0.05)

### E1-E5 早期预警检查点

> **作用域约定**: E1 定义可评估样本池；E2-E5 全部在 **full-pool 子集**（候选路径 ≥ 5条）上检查，不包含 limited_pool 条目。

| 预警点 | 检查内容 | 作用域 | 失败处置 |
|--------|---------|--------|----------|
| **E1** | MechFind 搜索成功 + 候选池 ≥ 5条 | 全部条目 | 定义 full-pool / limited_pool / mechfind_failure 三分类 |
| **E2** | Scene A 1BTL案例，已知机制排名 Top-3 | **full-pool 子集上** | Step 2.5 规则映射问题 |
| **E3** | PAP放置精度，RMSD 中位数 ≤ 3.0Å | **full-pool 子集上** | PAP算法需改进 |
| **E4** | CGPS校准，训练集 Top-3 ≥ 50% | **full-pool 子集上** | 权重/阈值需重调 |
| **E5** | 留出验证，测试集 Top-1 ≥ 50% | **full-pool 子集上** | 系统性瓶颈，启动诊断树 |

**E1 双阈值详细逻辑**:

```
E1 双阈值检查:
├── 阈值1: MechFind 报告 "search success"
│   ├── ✅ 通过 → 该 entry 进入候选池
│   └── ❌ 未通过 → 标记为 "mechfind_failure"，排除（工具问题，非验证框架问题）
│
└── 阈值2: 候选路径数 ≥ 5
    ├── ✅ 通过 → 标记为 "full_pool"，纳入 E2-E5 量化评估
    └── ❌ 不通过 (<5) → 标记为 "limited_pool"
        ├── 仍执行完整管线并产出定性评估报告
        ├── 不纳入 Top-K / MRR / Kendall τ 等量化指标
        └── 保留用于案例分析: 证明验证管线在少量候选时也能正常工作
```

**三类条目的完整处理**:

| 条目标签 | 定义 | 管线执行 | 量化评估 | 定性分析 |
|---------|------|---------|---------|----------|
| `mechfind_failure` | MechFind 搜索失败/超时 | 不执行 | 不纳入 | 记录失败原因 |
| `limited_pool` | 搜索成功但 <5 候选 | **完整执行** | 不纳入 | **产出定性报告** |
| `full_pool` | 搜索成功且 ≥5 候选 | 完整执行 | **纳入 E2-E5** | 也产出报告 |

**E1 失败时的处置**:
- 阈值1 大面积失败 (>30% entries MechFind 搜索失败) → MechFind 工具链问题，需回到 Phase 0.7 排查
- 阈值2 大面积 limited_pool (>40% entries 候选 <5) → 规则库覆盖不足，Phase 3 DS5 Layer 1 和 Phase 5 Agent② 需加强
- 两者都正常 → full-pool 子集足够大，E2-E5 量化评估有意义

**预计耗时**: 14.5天 (Week 23-26; 含+1.5天IDR验证) | **下一步**: 项目完成

---

## 依赖关系总览

```
Phase 0 (基础设施)
  │
  ├──────────────────────────────────┐
  ▼                                  ▼
Phase 1 (DS1+DS2+辅助)          [Phase 5部分可启动: Agent①②]
  │                                  │
  ▼                                  │
Phase 2 (DS3+DS4+同源+PAP)          │
  │                                  │
  ▼                                  │
Phase 2.5 (EZ验证运行时) ← 端到端!    │
  │                                  │
  ├─────────┐                        │
  ▼         ▼                        │
Phase 3   Phase 4                    │
(DS5 L0)  (CGPS评分)                │
  │         │                        │
  └────┬────┘                        │
       ▼                             ▼
    Phase 5 (Agent管线 + DS5 L1 + 争议检测)
       │
       ▼
    Phase 5.5 (氧化还原 + 氢原子) ← ⚠️ 5.5.1-5.5.4可与Phase 5部分并行
       │
       ▼
    Phase 6 (系统集成 + Web UI)
       │
       ▼
    Phase 7 (验证 + 论文)
      ├── 7.1 → 7.2 → 7.2.5 → 7.4(7.2.5后续处理+阈值优化)
      ├── 7.3 (CGD对比)
      └── 7.5 → 7.6 → 7.7
```

**关键路径**: Phase 0→1→2→2.5→3→4→5→5.5→6→7 = ~140天 (含Phase 3/5.5并行，实际~28周)
**可并行**: Phase 3与Phase 2部分并行; Phase 5的Agent①②可在Phase 4期间启动; **Phase 5.5(5.5.1-5.5.4)可与Phase 5部分并行**(不依赖Agent③-⑥)
