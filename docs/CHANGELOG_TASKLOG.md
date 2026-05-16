# 文档修改变更日志 (Tasklog)

> **用途**: 记录所有对项目文档的修改内容，以便在上传新版本文档后重新应用修改
> **创建日期**: 2026-03-11
> **涵盖修改**: Task 4 (IDR框架), Task 5 (D19 PDB预选), Task 6 (依赖审计)

---

## 修改概览

| 批次 | 修改来源 | 涉及文件数 | 主要内容 |
|------|---------|-----------|---------|
| 1 | IDR双层评估框架 (D16/D17/D18) | 5 | quality_score + grey_zone_penalty + IDR评分 + w=0.5 |
| 2 | D19 PDB自动预选 | 5 | 选择题而非填空题，M-CSA→PDB链路，确认卡片 |
| 3 | 依赖审计修复 (C1-C3, W1-W9) | 12 | 循环导入、缺失API、导航链、前置依赖补全 |

---

## 批次1: IDR双层评估框架 (D16/D17/D18)

### 1.1 HANDBOOK.md

**修改1: 目录区新增第5项**
- 位置: Part 1 目录
- 新增: `5. [双层质量评估框架](#5-双层质量评估框架)`
- 原第5-9项顺延为6-10

**修改2: 新增 §5 双层质量评估框架 (在GAP摘要表和里程碑时间线之后，架构决策之前)**
- 新增完整章节，包含:
  - §5.1 质量评分 (Quality Score)
    - 定义: `quality_score = final_confidence × 100 × grey_zone_penalty`
    - 分量表: MF(0.25), EZ(0.50), Agent(0.15), Arbiter(0.10)
    - 权重重归一化规则
    - 设计约束: EZ=0时final_confidence不超过0.50
  - grey_zone_penalty表: 已验证(1.0)/灰色区间(0.85)/未验证(0.60)
  - 阈值确定: quality_score区间→置信度等级→建议行动
  - §5.2 信息衰减稳健性评分 (IDR)
    - 全称: Information Degradation Robustness Score
    - 计算方法: `IDR(A,B) = Kendall_τ(rank_A, rank_B)`
    - 学术定义文本(论文可用)
    - IDR降级曲线说明
    - 与CS评分的本质区别

**修改3: 架构决策表新增D16/D17/D18**
- 位置: §6 架构决策表 (D1-D15扩展为D1-D18)
- 新增行:
  - D16: 双层质量评估框架 | quality_score × grey_zone_penalty + IDR | ✅
  - D17: IDR命名而非CS | 信息衰减稳健性评分原创命名，避免抄袭CASSIA的CS | ✅
  - D18: 质量评分阈值w=0.5 | FN代价远高于FP，w=0.5而非w=2 | ✅

**修改4: Phase 7工期更新**
- Phase 7总工期: 10天→12.5天 (+1.5天IDR +1天阈值优化)
- 具体变更在daily-tasks文件中体现

---

### 1.2 phase-7-1.md

**修改1: 阻塞后续更新**
- 原文: `**阻塞后续**: phase-7-2`
- 改为: `**阻塞后续**: phase-7-2 (跨EC泛化需要留出验证结果), phase-7-4 (IDR需要验证数据)`

**修改2: 预计耗时更新**
- 原文: `**预计耗时**: 3天`
- 改为: `**预计耗时**: 4天`

**修改3: 新增7.1.3a 绘制quality_score分布分析**
- 内容: 按Scene分组绘制分布直方图，按"正确Top-1"vs"未进Top-5"分组绘制，计算分布重叠度

**修改4: 新增7.1.3b 基于分布选择候选阈值区间**
- 内容: 从分布图确定quality_score的合理阈值搜索区间

**修改5: 新增7.1.3c 加权成本优化确定最优质量评分阈值T_Q**
- 内容: 定义FP/FN，总成本=(w×FP)+FN，**w=0.5**(非CASSIA的w=2)，搜索候选区间使总成本最小

**修改6: 新增7.1.3d 独立验证集确认阈值泛化性**
- 内容: 训练集分出10%独立验证集，评估T_Q泛化性

**修改7: 7.1.4错误分析新增grey_zone_penalty维度**
- 新增分析项: grey_zone_penalty过度降权?

**修改8: 7.1.5验证报告新增内容**
- quality_score分布分析: 直方图数据+两组重叠度
- 最优阈值T_Q: 成本曲线+泛化性验证结果
- 阈值分级表

**修改9: 输出文件清单新增**
- `validation/quality_score_analysis.py`
- `data/reports/quality_score_distribution.json`
- `data/reports/quality_score_threshold.json`
- `data/reports/figures/quality_score_distribution.png`
- `data/reports/figures/threshold_cost_curve.png`

**修改10: 常见陷阱新增第6项**
- grey_zone_penalty影响: penalty会改变quality_score分布，需检查三个等级是否合理

---

### 1.3 phase-7-4.md (新建文件)

- Phase 7, 任务编号7.4
- 前置依赖: phase-7-1, phase-7-2
- 阻塞后续: phase-7-3
- 预计耗时: 1.5天
- 包含6个子任务:
  - 7.4.1 准备IDR验证数据集(50个entry)
  - 7.4.2 执行三场景对比实验
  - 7.4.3 计算IDR指标
  - 7.4.4 绘制IDR降级曲线(3张图)
  - 7.4.5 分析IDR结果
  - 7.4.6 生成IDR报告
- 含学术定义文本(论文Methods可用)
- 完成后导航: 打开phase-7-3.md

---

### 1.4 phase-7-3.md

**修改1: 任务编号更新**
- 原: `**任务编号**: 7.3`
- 改为: `**任务编号**: 7.5+7.6+7.7`

**修改2: 前置依赖更新**
- 原: `**前置依赖**: phase-7-2`
- 改为: `**前置依赖**: phase-7-2 (跨EC泛化+CGD约束对比), phase-7-4 (IDR验证)`

**修改3: 任务内部编号调整**
- 原7.3.x → 7.5.x, 7.4.x → 7.6.x, 7.5.x → 7.7.x
- 7.5: LLM消融实验 (原7.3)
- 7.6: 论文图表 (原7.4)
- 7.7: 论文章节 (原7.5)

**修改4: 7.6.2数据分布图新增quality_score分布**
- 新增: `quality_score: 分布直方图 + 阈值 T_Q 标注`

**修改5: 7.6.3结果对比图新增IDR降级曲线**
- 新增: `IDR 降级曲线: Scene A→B→C 的 IDR 变化趋势`
- 新增: `质量评分阈值: 成本曲线 + T_Q 标注`

**修改6: 7.7.1方法章节新增§3.4**
- 新增: `3.4 质量评估框架: quality_score + grey_zone_penalty + IDR 定义`

**修改7: 7.7.3结果章节新增§3.8**
- 新增: `3.8 质量评估: quality_score 阈值优化 + IDR 降级曲线`

---

### 1.5 phase-5-8.md

**修改1: 5.8.1置信度公式更新**
- 原公式: `0.25×MF + 0.50×EZ + 0.15×Agent + 0.10×Arbiter`
- 改为: `(0.25×MF + 0.50×EZ + 0.15×Agent + 0.10×Arbiter) × 100 × grey_zone_penalty`

**修改2: 新增grey_zone_penalty说明**
- 在5.8.1中新增完整的grey_zone_penalty三级表:
  - CGPS > θ_high → penalty = 1.0 (已验证)
  - θ_low < CGPS ≤ θ_high → penalty = 0.85 (灰色区间)
  - CGPS ≤ θ_low → penalty = 0.60 (未验证)

---

## 批次2: D19 PDB自动预选

### 2.1 HANDBOOK.md

**修改1: 版本行更新**
- 总工期: `~131天 / 26.2周` → `~134天 / 26.8周`

**修改2: Phase 6标题更新**
- 原: `18. [Phase 6: 系统集成](#phase-6-系统集成)`
- 改为: `18. [Phase 6: 系统集成](#phase-6-系统集成) (+1天 D19确认卡片)`

**修改3: 系统架构图修改**
- Step 0盒子新增: `每条路径含 similarity → M-CSA ID 链接`
- 新增完整盒子 "⭐ PDB自动预选 (D19: 选择题而非填空题)"，包含5步流程和降级路径
- 场景判定盒子改为: `场景判定 (基于PDB预选结果自动确定)`

**修改4: 架构决策表新增D19**
- D19: PDB自动预选(选择题而非填空题) | 利用MechFind similarity→M-CSA→EC→PDB链路自动预选PDB+残基 | ✅

**修改5: Phase 2.5验收标准新增**
- 新增: `⭐ PDB自动预选: 路径可按M-CSA分组+PDB自动搜索+残基兼容性检查+确认卡片生成`

**修改6: 新增 "⭐ PDB自动预选流程 (D19)" 完整小节**
- 包含:
  - 核心问题描述
  - 设计原则: "选择题而非填空题"
  - 关键洞察: MechFind自带M-CSA相似度链接
  - 5步流程图 (ASCII art)
  - 模块变更表 (pdb_locator +2函数, pipeline_orchestrator +3函数)
  - 确认卡片数据格式 (完整JSON示例)
  - 降级与回退表 (5种场景)

**修改7: Phase 2.5工期更新**
- 2.5.1: ? → 1.0天
- 2.5.2: 0.6天 → 1.0天
- 2.5.11: 2天 → 3.0天
- Phase 2.5总计: 10.25天 → 11.3天

**修改8: Phase 6工期更新**
- 6.2: 2天 → 2.5天
- 6.3: 3天 → 4天
- Phase 6总计: 10天 → 11.5天

**修改9: 目录映射新增types.py**
- 在目录映射中新增: `ez_validator/types.py` 的说明

**修改10: daily-tasks文件数更新**
- 75个 → 76个 (新增phase-7-4.md)

---

### 2.2 phase-2.5-1.md

**修改1: 预计耗时更新**
- 原: `**预计耗时**: 0.7天`
- 改为: `**预计耗时**: 1天`

**修改2: 2.5.1.1大幅扩展 — 新增types.py共享类型模块**
- 原2.5.1.1仅定义scene_resolver.py框架
- 新增 `ez_validator/types.py` 共享类型模块，包含:
  - `SceneResult` dataclass
  - `LocatedResidue` dataclass
  - `ResidueCompatibilityReport` dataclass
  - `ResidueEntry` dataclass
  - `ResidueInfo` dataclass
- 新增导入关系说明:
  - scene_resolver从types导入SceneResult和ResidueCompatibilityReport
  - pdb_locator从types导入ResidueCompatibilityReport和LocatedResidue
  - rule_mapper从types导入ResidueInfo和ResidueEntry
- 新增 `resolve_from_compatibility(compatibility_report: ResidueCompatibilityReport) → SceneResult` 定义
- 新增C1修复说明

**修改3: 新增2.5.1.6 resolve_from_compatibility实现**
- D19批量场景判定
- 映射逻辑: 全located+有配体→A, 无配体→B, 缺失残基→C
- 置信度映射: confidence = compatibility_score × (1.0/0.8/0.5)

**修改4: 测试用例扩展**
- 原5个→6个
- 新增测试6: 从兼容性报告推导场景

**修改5: 输出文件清单新增**
- `ez_validator/types.py` (C1修复: 共享类型定义)

**修改6: 常见陷阱新增第6项**
- D19双入口设计: resolve_scene()和resolve_from_compatibility()不要混用

---

### 2.3 phase-2.5-2.md

**修改1: 预计耗时更新**
- 原: `**预计耗时**: 0.6天`
- 改为: `**预计耗时**: 0.8天 (+0.2天 for D19扩展)`

**修改2: 新增2.5.2.7 locate_by_mcsa_id(mcsa_id)**
- D19 PDB自动预选核心函数
- 流程: mcsa_id → M-CSA缓存 → EC/UniProt → locate_pdb_and_residues()
- M-CSA缓存路径: `data/cache/mcsa_entries/entry_{mcsa_id}.json`
- 降级: 缓存缺失→用户EC/UniProt→Scene C

**修改3: 新增2.5.2.8 check_residue_compatibility(pdb_id, residue_info)**
- D19残基兼容性检查
- 输入: pdb_id + ResidueInfo (from types.py)
- 输出: ResidueCompatibilityReport (from types.py)
- C1修复说明: 类型从types.py导入避免循环依赖
- 兼容性判定逻辑: 全located→A, 无配体→B, 关键缺失→C
- 双候选消歧: Asp/Glu_pro → 3D距离检查

**修改4: 输出文件清单更新**
- `ez_validator/pdb_locator.py` (含 locate_by_mcsa_id + check_residue_compatibility)

**修改5: 常见陷阱新增6-8**
- 6: M-CSA缓存依赖
- 7: 双候选消歧时机
- 8: 同组共享PDB

---

### 2.4 phase-2.5-11.md

**修改1: 前置依赖扩展**
- 原: phase-2.5-1到2.5-10 (简要列出)
- 改为: phase-2.5-1到2.5-10 (完整列出每个模块的具体依赖)
  - 明确: phase-2.5-1 (场景判定), phase-2.5-2 (PDB定位+D19预选), ...

**修改2: 预计耗时更新**
- 原: `**预计耗时**: 2天`
- 改为: `**预计耗时**: 2.5天 (+0.5天 for D19扩展)`

**修改3: 2.5.11.1主入口修改**
- 新增: `⭐PDB预选` 在流程中
- 完整流程: 输入 → MechFind → ⭐PDB预选 → 场景判定 → Top-N候选评估 → 排序 → 输出

**修改4: 新增2.5.11.2 _group_paths_by_mcsa(paths)**
- D19路径分组
- 包含 `_extract_top_mcsa_id()` 辅助函数代码
- 分组结果: `Dict[Optional[int], List[int]]`

**修改5: 新增2.5.11.3 _auto_select_pdbs(path_groups)**
- D19 PDB自动预选
- 4步流程: locate_by_mcsa_id → query_rule_mapping → check_residue_compatibility → 综合结果
- 降级处理: mcsa_id缓存缺失/无mcsa_id

**修改6: 新增2.5.11.4 _build_confirmation_card(path_groups_with_pdbs)**
- D19确认卡片
- 包含5个dataclass定义:
  - ConfirmationCard
  - PDBGroupCard (mcsa_id, enzyme_name, ec_code, selected_pdb, candidate_pdbs, paths, unmatched_paths)
  - PDBInfo (pdb_id, resolution, has_ligand, ligand_name, ligand_type)
  - PathCard (path_idx, score, residue_info, recommended_scene, selected)
  - ResidueStatus (residue, site, status, resid)

**修改7: 2.5.11.5并行评估新增优化**
- 新增: ⭐ 同组路径共享PDB下载结果

**修改8: 2.5.11.6共享缓存新增M-CSA→PDB缓存**
- 新增: ⭐ M-CSA→PDB缓存: 同一mcsa_id的PDB搜索结果只查一次
- 缓存键新增: `(mcsa_id,)`

**修改9: 2.5.11.7降级逻辑新增D19集成**
- 新增: ⭐ 与D19集成: 降级逻辑与check_residue_compatibility的推荐场景一致

**修改10: 新增2.5.11.10 多路径PDB预选端到端测试**
- Mock MechFind返回5个候选
- 验证5个方面: 分组、PDB选定、确认卡片、共享缓存、批量验证

**修改11: 输出文件清单更新**
- `pipeline/pipeline_orchestrator.py` (含 D19 路径分组+PDB预选+确认卡片)

**修改12: 常见陷阱新增6-8**
- 6: M-CSA分组粒度(二级分组EC编号合并)
- 7: 确认卡片→前端桥接
- 8: 用户覆盖PDB后需重新运行兼容性检查

---

### 2.5 phase-6-3.md

**修改1: 预计耗时更新**
- 原: `**预计耗时**: 3天`
- 改为: `**预计耗时**: 4天 (+1天 for D19确认卡片)`

**修改2: 新增6.3.3 PDB预选确认页面**
- 完整UI布局(ASCII art)展示确认卡片设计
- 核心组件: PDBConfirmationCard — 每个路径组一个卡片
- 卡片布局包含:
  - PDB信息行(PDB ID, 酶名, EC, 分辨率, 配体, 场景)
  - 候选PDB下拉菜单
  - 路径勾选列表(每条: 评分, 残基状态✅/⚠️/❌, 推荐场景)
  - 无PDB匹配组(手动指定PDB输入框)
  - 底部验证按钮
- 交互功能5项: 默认选中、取消选择、切换PDB、手动指定PDB、场景标注
- 数据来源: API `/predict/confirmation-card`

**修改3: 6.3.4进度页面新增PDB预选阶段**
- 新增: `⏳ ⭐ PDB预选 + 用户确认 (D19新增阶段)`

**修改4: 输出文件清单新增3个组件**
- `PDBConfirmationCard.tsx` (D19新增)
- `PathSelector.tsx` (D19新增)
- `ResidueStatusBadge.tsx` (D19新增)

**修改5: 常见陷阱新增5-7**
- 5: 确认卡片→管线衔接
- 6: PDB切换刷新(需防抖和加载状态)
- 7: 手动PDB覆盖(需验证PDB存在性+重新运行兼容性检查)

---

## 批次3: 依赖审计修复

### 3.1 C1修复: 循环类型依赖

**影响文件: phase-2.5-1.md**
- 已在批次2中体现(types.py创建)
- 补充C1修复标记: `⭐ **C1修复**: 将跨模块共享的dataclass抽取到 ez_validator/types.py`

**影响文件: phase-2.5-2.md**
- 2.5.2.8新增: `⭐ **C1修复**: ResidueCompatibilityReport 和 LocatedResidue 定义在 ez_validator/types.py 中，本模块从 types 导入，避免循环依赖`

---

### 3.2 C2修复: 缺失API端点

**影响文件: phase-6-2.md**

**修改1: 预计耗时更新**
- 原: `**预计耗时**: 2天`
- 改为: `**预计耗时**: 2.5天 (+0.5天 for D19 confirmation-card + recheck API端点)`

**修改2: 新增6.2.7 /predict/confirmation-card端点**
- 输入: substrate_smiles, product_smiles, ec_code, pdb_id
- 4步流程: MechFind → _group_paths_by_mcsa → _auto_select_pdbs → _build_confirmation_card
- 输出: ConfirmationCard JSON
- 异步执行

**修改3: 新增6.2.8 /predict/confirmation-card/{task_id}/recheck端点**
- 输入: group_idx, new_pdb_id
- 流程: 重新运行check_residue_compatibility → 更新确认卡片

---

### 3.3 C3修复: Phase 7导航错误

**影响文件: phase-7-2.md**

**修改1: 阻塞后续更新**
- 原: `**阻塞后续**: phase-7-3`
- 改为: `**阻塞后续**: phase-7-4 (IDR验证需要本任务的3组数据), phase-7-3 (论文需要验证结果)`

**修改2: 完成后导航更新**
- 原: `打开 phase-7-3.md 继续`
- 改为: `打开 phase-7-4.md 继续`

**影响文件: phase-7-4.md**
- 完成后导航: 打开phase-7-3.md继续 (正确顺序: 7-1→7-2→7-4→7-3)

**影响文件: phase-7-3.md**
- 前置依赖: phase-7-2, phase-7-4 (正确)

---

### 3.4 W1修复: M-CSA缓存来源

**影响文件: phase-2.5-2.md**

**修改: 陷阱6更新**
- 明确: `locate_by_mcsa_id() 依赖 Phase 1-1 (M-CSA批量爬取, Phase 3-1补充扩展) 的缓存`

**影响文件: HANDBOOK.md**

**修改: SMARTS→残基映射路径2说明**
- 原: `前置: Phase 3-1 的 M-CSA 批量爬取缓存`
- 改为: `前置: Phase 1-1 的 M-CSA 批量爬取缓存 (Phase 3-1 补充扩展) 确保缓存完整`

---

### 3.5 W3修复: phase-2.5-5前置依赖补全

**影响文件: phase-2.5-5.md**

**修改: 前置依赖更新**
- 原: `**前置依赖**: phase-2.5-1 (场景判定), phase-2.5-2 (PDB定位), phase-2.5-3 (配体Mol构建)`
- 改为: `**前置依赖**: phase-2.5-1 (场景判定), phase-2.5-2 (PDB定位), phase-2.5-3 (配体Mol构建), phase-2.5-6 (统一验证结果格式)`

---

### 3.6 W4修复: phase-2.5-10前置依赖补全

**影响文件: phase-2.5-10.md**

**修改: 前置依赖更新**
- 原: `**前置依赖**: phase-2.5-5 (Scene A验证产出S_geo), phase-2.5-7 (S_geo运行时)`
- 改为: `**前置依赖**: phase-2.5-5 (Scene A验证产出S_geo), phase-2.5-6 (验证结果格式), phase-2.5-7 (S_geo运行时)`

---

### 3.7 W5修复: phase-5-5前置依赖补全

**影响文件: phase-5-5.md**

**修改: 前置依赖更新**
- 原: `**前置依赖**: Phase 4 完成 (CGPS评分可用), phase-5-2 (Agent①化学审查)`
- 改为: `**前置依赖**: Phase 4 完成 (CGPS评分可用, 灰色区间已定义), phase-5-2 (Agent①化学审查结果用于触发条件③)`

---

### 3.8 W6修复: phase-6-1管线步骤新增PDB预选

**影响文件: phase-6-1.md**

**修改: 6.1.1完整流程新增步骤3.5**
- 在步骤3和4之间新增: `3.5. ⭐ PDB预选 + 用户确认 (D19: 选择题而非填空题)`

---

### 3.9 W7修复: HANDBOOK Phase 2.5工期修正

**影响文件: HANDBOOK.md**

**修改: Phase 2.5任务表工期**
- 2.5.1: ? → 1.0天 (含types.py)
- 2.5.2: 0.6天 → 1.0天 (含D19)
- 2.5.11: 2天 → 3.0天 (含D19)
- Phase 2.5总计: 10.25天 → 11.3天

---

### 3.10 W8修复: Phase 3-3/3-4阻塞后续修正

**影响文件: phase-3-3.md**

**修改: 阻塞后续更新**
- 原: `**阻塞后续**: phase-3-4 (规则映射表衍生), Phase 2.5-4 (运行时查询), Phase 5 (Agent② 1:N映射)`
- 改为: `**阻塞后续**: phase-3-4 (规则映射表衍生), Phase 2.5-4 运行时查询 (开发期用mock数据，Phase 3完成后切换真实数据), Phase 5 (Agent② 1:N映射)`

**影响文件: phase-3-4.md**

**修改: 阻塞后续更新**
- 原: `**阻塞后续**: Phase 2.5-4 运行时查询, Phase 5 (Agent② 消歧)`
- 改为: `**阻塞后续**: Phase 2.5-4 运行时查询 (开发期用mock数据，Phase 3完成后切换真实数据), Phase 5 (Agent② 消歧)`

---

### 3.11 W9/W11修复: 总工期和文件数更新

**影响文件: HANDBOOK.md**

**修改1: Phase 6总工期**
- 原: 10天
- 改为: 11.5天 (6-2=2.5天, 6-3=4天, 6-1=2天, 6-4=3天)

**修改2: Phase 7文件数**
- 原: 3个
- 改为: 4个 (新增phase-7-4.md)

**修改3: 总文件数**
- 原: 75个
- 改为: 76个

**修改4: 总工期**
- 最终: ~134天 / 26.8周

---

## 完整文件修改清单

| 文件 | 批次 | 修改类型 | 关键修改 |
|------|------|---------|---------|
| `docs/HANDBOOK.md` | 1+2+3 | 大幅修改 | 新增§5双层框架+D16-D19+架构图改+PDB预选流程+工期更新 |
| `docs/daily-tasks/phase-2.5-1.md` | 2+3 | 大幅修改 | 新增types.py+resolve_from_compatibility+测试6+陷阱6 |
| `docs/daily-tasks/phase-2.5-2.md` | 2+3 | 大幅修改 | 新增2.5.2.7-8+dataclass+陷阱6-8+工期0.6→0.8→1.0 |
| `docs/daily-tasks/phase-2.5-5.md` | 3 | 小修改 | 前置依赖补全phase-2.5-6 |
| `docs/daily-tasks/phase-2.5-10.md` | 3 | 小修改 | 前置依赖补全phase-2.5-6+2.5-7 |
| `docs/daily-tasks/phase-2.5-11.md` | 2+3 | 大幅修改 | 新增2.5.11.2-4+2.5.11.10+5个dataclass+陷阱6-8+工期2→2.5→3.0 |
| `docs/daily-tasks/phase-3-3.md` | 3 | 小修改 | 阻塞后续加"开发期用mock数据"说明 |
| `docs/daily-tasks/phase-3-4.md` | 3 | 小修改 | 阻塞后续加"开发期用mock数据"说明 |
| `docs/daily-tasks/phase-5-5.md` | 3 | 小修改 | 前置依赖补充phase-5-2(Agent①) |
| `docs/daily-tasks/phase-5-8.md` | 1 | 中修改 | quality_score公式加grey_zone_penalty |
| `docs/daily-tasks/phase-6-1.md` | 3 | 小修改 | 管线步骤新增3.5 PDB预选 |
| `docs/daily-tasks/phase-6-2.md` | 2+3 | 中修改 | 新增6.2.7-8 API端点+工期2→2.5 |
| `docs/daily-tasks/phase-6-3.md` | 2 | 大幅修改 | 新增6.3.3确认页面+3组件+进度页面更新+陷阱5-7+工期3→4 |
| `docs/daily-tasks/phase-7-1.md` | 1 | 大幅修改 | 新增7.1.3a-d+阈值优化+工期3→4 |
| `docs/daily-tasks/phase-7-2.md` | 3 | 小修改 | 阻塞后续+完成后导航更新 |
| `docs/daily-tasks/phase-7-3.md` | 1+3 | 中修改 | 任务编号7.3→7.5+7.6+7.7+前置依赖+新增IDR内容 |
| `docs/daily-tasks/phase-7-4.md` | 1 | 新建 | IDR验证实验6个子任务 |

---

## 未写入文档的pending修改

以下修改已在讨论中确认但尚未写入任何文档文件:

### P1: IDR框架在phase-2.5-10的更新
- `confidence_calculator.py` 的quality_score公式应包含grey_zone_penalty
- 目前仅phase-5-8.md中有此公式，phase-2.5-10.md中仍为旧公式
- **需要在phase-2.5-10.md中更新**: 2.5.10.1的公式从`0.25×MF + 0.50×EZ + 0.15×Agent + 0.10×Arbiter`改为`(0.25×MF + 0.50×EZ + 0.15×Agent + 0.10×Arbiter) × 100 × grey_zone_penalty`

### P2: 4个文档修复 (H-1, H-2, M-1, M-2)
来自更早会话的修复，具体内容待确认:
- H-1: HANDBOOK中某个修正
- H-2: HANDBOOK中某个修正
- M-1: daily-tasks中某个修正
- M-2: daily-tasks中某个修正

---

## 使用说明

当你上传新版本文档后，请按以下顺序重新应用修改:

1. **先应用批次1** (IDR框架) — 基础概念层修改
2. **再应用批次2** (D19 PDB预选) — 功能层修改
3. **最后应用批次3** (依赖审计) — 一致性修复

每个文件的具体修改位置和内容已在上方详述。对于大幅修改的文件(HANDBOOK.md, phase-2.5-1/2/11, phase-6-3, phase-7-1)，建议逐条对照修改。对于小修改文件(phase-2.5-5/10, phase-3-3/4, phase-5-5, phase-6-1, phase-7-2)，可直接定位修改点。
