# EnzMech 完整实施计划与架构图

> **版本**: v3.4 (代码复用审计整合版)  
> **日期**: 2026-03-09  
> **前置文档**: `CGD_MASTER_PLAN.md` (数据集定义与8个问题方案) + `GAP_AUDIT_G1-G16.md` (缺口+复用统一审计)  
> **本文档目标**: 给出可执行的行动计划——每一步做什么、产出什么、怎么验证  
> **v2.0变更**: 整合代码库逐任务对照评估，修正时间线，增加风险缓解方案  
> **v3.0变更**: 整合用户代码审核结论(5缺口+2遗漏+2已解决)，修正时间线至101天/19.5周
> **v3.1变更**: 修正时间线算术错误(108.5天非101天)、PAP方案增加旋转自旋+碰撞检测+MVP等权、更新代码覆盖率数字、补充Phase 0数据导出任务、修正降级策略、同步主流程图和管线图
> **v3.2变更**: 修正总周数21.6→21.7、2人全职工期14.5→16周(关键路径对齐)、新增PAP D1距离退化设计特征注释  
> **v3.3变更**: 整合G1-G16端到端缺口审计结果，新增Phase 2.5(EZ验证运行时14.5天)和Phase 5.5(氧化还原+氢原子6天)，新增任务2.15/2.16/5.12，修正总工期132.5天/26.5周
> **v3.4变更**: 整合CODE_REUSE_AUDIT代码复用分析结果，Phase 2.5从14.5天缩减至10天(G8-68%/G10-60%/G12-60%/G13 MVP 0天新写)，总工期从132.5天缩减至127天/25.4周
> **v3.5变更**: 新增G17样本量缺口审计 + Phase1任务1.13样本量缺口报告 + DS2/DS3层级化设计策略；Phase1增加0.5天，总工期127→127.5天

---

## 一、完整系统架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│           CGD 催化几何统计数据库 (构建阶段产出)                          │
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │  DS1     │ │  DS2     │ │  DS3     │ │  DS4     │ │  DS5     │     │
│  │残基共现  │ │残基-残基 │ │残基-配体 │ │辅因子共现│ │规则交叉  │     │
│  │频率矩阵  │ │距离分布  │ │距离分布  │ │频率矩阵  │ │映射统计  │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│                                                                         │
│  衍生产物：                                                              │
│  ├─ 距离阈值表 (DS2→P90/P95 per role_pair)                             │
│  ├─ CGPS评分函数参数 (DS1+DS2+DS4→w1,w2,w3 + θ_low,θ_high)           │
│  ├─ 灰色区间定义 (CGPS在M-CSA验证集上的P10-P40)                        │
│  └─ 规则映射表 (DS5→1:1/1:N/无映射 分类)                               │
│                                                                         │
└───────┬──────────┬──────────┬──────────┬──────────┬────────────────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │场景A   │ │场景B   │ │场景C   │ │争议检测│ │Agent  │
   │距离阈值│ │放置约束│ │CGPS评分│ │触发条件│ │数据锚定│
   │        │ │+距离   │ │        │ │灰色区间│ │减少    │
   │DS2→P90 │ │DS2→P5  │ │DS1+DS4 │ │        │ │幻觉    │
   │DS3→验证│ │  ~P95  │ │+DS5    │ │        │ │        │
   └────────┘ │DS3→验证│ │(无DS2/ │ │        │ │        │
              └────────┘ │ DS3)   │ │        │ │        │
                         └────────┘ └────────┘ └────────┘
```

---

## 二、主流程图（修正版）

```
用户输入: 底物SMILES + 产物SMILES + (可选)PDB ID
│
▼
┌─────────────────────────────────────┐
│      Step 0: MechFind MILP 求解     │
│  输出：Top-N 候选路径               │
└─────────────────┬───────────────────┘
                  │
                  ▼
╔═══════════════════════════════════════════════════════╗
║  Stage 1: LLM 辅助规则映射与化学预审                    ║
║  Agent①化学审查 → Agent②规则翻译(DS5映射表)            ║
║  RunReactants闭环验证                                  ║
╚═════════════════════════════════════╪═════════════════╝
                                      │
                                      ▼
┌───────────────────────────────────────────────────────┐
│  Stage 2: EZ 计算验证层                                │
│                                                       │
│  ┌─ 运行时管线 (Phase 2.5) ─────────────────────────┐ │
│  │ G6 场景判定: EC/UniProt→Scene A/B/C + A→B降级    │ │
│  │ G8 PDB定位: RCSB搜索+M-CSA残基定位+产品级筛选     │ │
│  │ G13 配体Mol构建: HETATM→PDBe ChemComp键→Mol      │ │
│  │ G14 管线编排: Top-N候选共享缓存+并行+降级+排序    │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  场景A: PDB+配体 → 直接3D验证 (DS2阈值+DS3验证)       │
│  场景B: PDB+无配体 → PAP放置+3D验证                   │
│         (DS2先验→PAP放置→DS3初版筛选, 碰撞检测)        │
│  场景C: CGPS统计评分 (DS1+DS4+DS5, 无DS2/DS3)         │
│         CGPS = w1·S_co + w3·S_path (S_geo=0)          │
│                                                       │
│  ⚠️ 关键路径: G6→G8→G13→G1→G10→G12                   │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│  争议检测 → 无争议:直接输出 | 有争议:Agent③④⑤⑥评审    │
│  Agent⑥输出: accept | reject | needs_revision         │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│  置信度: 0.25×mechfind + 0.50×ez + 0.15×agent         │
│         + 0.10×arbiter, clamp[0,1]                    │
│  输出: 排序路径列表 + Top-1验证报告 + 成本摘要          │
└───────────────────────────────────────────────────────┘
```

---

## 三、CGD 构建管线流程图

```
┌───────────────────────────────────────────────────────────────────┐
│                    CGD 构建管线 (Phase 1-3)                        │
│                                                                   │
│  数据源: M-CSA API + PDB文件 + PDBe API + RCSB API + UniProt API │
│                                                                   │
│  预处理管线:                                                      │
│  ① API解析 → 残基列表+角色+步骤                                   │
│  ② PDB下载 → ATOM/HETATM坐标提取 (复用pdb_handler.py)            │
│  ③ 质量过滤 → 分辨率/B-factor/完整性                              │
│  ④ 辅助文件查表 → 活性原子/配体分类                               │
│                                                                   │
│  数据集构建:                                                      │
│  ├─ DS1: 残基共现 (纯API, 全自动) ← 现有代码: 0%                  │
│  ├─ DS2: 残基距离 (需PDB+辅助文件) ← 现有代码: 50%                │
│  │   ↓ 衍生: P90/P95 距离阈值表                                   │
│  ├─ DS3: 残基-配体距离 (最复杂) ← 现有代码: 25%                   │
│  │   ├─ Scene A: 直接计算                                         │
│  │   └─ Scene B: PAP口袋锚定放置+DS3初版筛选                       │
│  │   ↓ 衍生: 配体距离阈值表                                       │
│  ├─ DS4: 辅因子共现 (API+分类) ← 现有代码: 0% (类似DS1)          │
│  └─ DS5: 规则映射 ← 现有代码: 20% (可降优先级)                    │
│     ↓ 衍生: 规则映射表 (1:1/1:N/无)                               │
│                                                                   │
│  衍生产物推导:                                                    │
│  DS2各百分位 → 距离阈值表                                         │
│  DS1+DS2+DS4+M-CSA基准 → CGPS参数                                │
│  CGPS验证集分布 → 灰色区间[θl,θh]                                 │
│  DS5映射频率 → 规则映射表                                         │
└───────────────────────────────────────────────────────────────────┘
```

---

## 四、代码库对照评估 (v2.0新增)

### 现有代码覆盖率总览

| 数据集 | 现有代码覆盖 | 可复用模块 | 主要缺口 |
|--------|-------------|-----------|----------|
| DS1 | 0% | — | 纯新建，但简单(API聚合) |
| DS2 | **50%** | `pdb_handler.py`(PDB解析+坐标提取), `_calc_distance()` | `compute_ligand_distances()`计算到几何中心非活性原子对；需封装active_atom查表+坐标提取 |
| DS3 | **25%** | `overlay_substrate.py`(ETKDG+Kabsch), `pdb_handler.py` | Scene A完全无代码基础；PAP方案新增(~185行)；反应原子识别、角度计算 |
| DS4 | 0% | — | 纯新建，但类似DS1 |
| DS5 | **20%** | `find_matching_mols`, `match_smiles_with_smarts` | Unique_Rules_1.csv未就位；MechFind↔EZ规则映射逻辑 |
| EZ运行时 | **5%** | `mechanism_search.py`(部分距离计算) | Scene A/B验证管线、场景判定、PDB定位、配体构建、EZ执行循环、中间体构象、管线编排、角度计算、置信度计算、氧化还原验证、氢原子 — **G1-G16 全部缺口** |
| EZ运行时(含复用) | **~30%** | overlay_substrate/pdb_handler/mechanism_search/arrow_transform/shared可大量移植 | G8(68%复用)、G10(60%复用)、G12(60%复用)、G13(MVP 0天新写)为高复用缺口；G4/G5/G11/G14纯新写但简单 |

> **v3.1 覆盖率修正说明**: DS2 从60%降至50%（`compute_ligand_distances()`计算的是到配体几何中心，非活性原子对）；DS3 从35%降至25%（Scene A管线完全无代码基础，PAP方案为新增）；DS5 从30%降至20%（Unique_Rules_1.csv需从MechFind导出，未就位）
>
> **v3.3 新增说明**: EZ验证运行时层是最大结构性缺口。CGD数据构建100%覆盖，但"数据→验证→输出"的运行时管线几乎为空白。Phase 2.5 专门填补此缺口。

### 关键发现：pdb_handler.py 已支持原子名提取

```python
# parse_pdb_text() 返回的 chain_residues 结构:
# chain_residues[chain][residue_key] = [{atom_name, x, y, z, element}, ...]
#
# 提取 Ser70 的 OG 原子坐标:
for atom in chain_residues["A"]["70 "]:
    if atom["atom_name"] == "OG":
        og_coord = (atom["x"], atom["y"], atom["z"])
```

**结论**: DS2的"指定原子名提取坐标"只需封装一个函数，不需要新写解析逻辑。

### 任务可行性分类

| 分类 | 任务数 | 占比 |
|------|--------|------|
| ✅ 完全能做 | 13 | 62% |
| ⚠️ 能做有难度 | 6 | 29% |
| ❌ 有重大风险 | 2 | 9% |
| **不可能** | **0** | **0%** |

---

## 五、重大技术风险与缓解方案 (v2.0新增)

### 风险1: CGD约束overlay — RDKit bounds matrix API

**风险等级**: ❌ 重大  
**原因**: `AllChem.ETKDGv3()` 的 `SetBoundsMat()` 需要手动构建 N×N 距离约束矩阵，API文档极少，且配体原子索引在构象生成前不确定

**缓解方案: 放弃 bounds matrix，改用"生成→筛选→重排序"**

```
原方案 (高风险, 已放弃):
  ETKDGv3(bounds matrix约束) → 生成20个约束构象 → 选最优

替代方案 (低风险, 等价效果, 口袋锚定放置):
  Step 0: [前置] 用DS2验证活性位点几何合理性 (残基间距离在P5-P95内)
  Step 1: 计算口袋锚点 (催化残基活性原子等权质心, MVP阶段; 加权质心为后续优化项)
  Step 2: ETKDGv3(无约束) → 生成100个底物构象
  Step 3: 识别底物反应原子 → 平移使反应原子对齐口袋锚点
  Step 4: 以反应原子为固定点，双自由度旋转采样:
          ├─ 旋转自由度1 (θ,φ): Fibonacci球面采样 50-100个方向
          └─ 旋转自由度2 (ψ): 绕反应原子-锚点轴自旋，等间隔8-12个
          → 总候选: n_conformers × n_θφ × n_ψ = 100 × 50 × 10 = 50,000
  Step 5: 按CGD阈值(DS3 Scene A初版 P5-P95)筛选: 保留残基-配体距离在合理范围内的候选
  Step 5.5: 空间碰撞过滤: 底物重原子与蛋白质骨架原子距离<1.5Å → 淘汰
  Step 6: 若通过筛选的候选<5个 → 增加旋转采样到200重试
  Step 7: 从通过筛选的候选中选Score最高的作为最优放置
  Step 8: 若仍无通过 → confidence=Rejected
```

**为什么等价且更优**:
- bounds matrix 本质上是引导构象生成时满足距离约束
- "口袋锚定+生成→筛选"达到同样效果，且物理意义更明确
- 计算成本略高(100×50×10=50,000个候选 vs 20构象)，但每次只算几个距离+碰撞检查，极快
- **代码量比原方案少 ~200行**(不需要构建bounds matrix)
- **不依赖MCS+Kabsch** (Scene B无参照配体，MCS不可用)，改用口袋锚定放置
- **筛选标准用DS3(非DS2)**: DS2验证活性位点几何(先验)，DS3筛选配体放置(后验)
- **双自由度旋转采样**: Fibonacci球面(θ,φ) + 绕轴自旋(ψ)，覆盖全部3个旋转自由度
- **碰撞检测**: 排除与蛋白质骨架原子空间重叠的放置(~20行额外代码)

**权重方案说明**: MVP阶段使用等权质心(w=1.0 for all)，降低实现复杂度。加权质心(w_nucleophile=1.5等)作为Phase 2完成后的优化项，用Scene A数据做消融实验验证效果。

**⚠️ PAP 设计特征 — D1 距离退化为常数**: PAP 将底物反应原子固定在锚点(活性原子质心)，旋转不改变反应原子位置。因此 D1 距离(nucleophile→electrophilic_C)由锚点位置唯一确定，DS3筛选对D1无区分力。这可接受因为：(1)等权质心使D1天然在合理区间；(2)D1超范围会被DS2先验Reject；(3)旋转仍影响D2-D6和A1-A3；(4)加权质心会进一步改善D1。

**对Phase 2的影响**: 任务2.10从4-5天降为2.5天(不需要研究bounds matrix API + 口袋锚定逻辑简洁)

---

### 风险2: MechFind↔EZ规则映射 (DS5)

**风险等级**: ❌ 重大  
**原因**: MechFind的moiety变化向量如何与EZ的SMARTS规则对齐——这是开放性问题

**缓解方案: 降优先级 + 分层交付**

```
Layer 0 (Phase 3第一周, 必做): 只做1:1映射
  从 Unique_Rules_1.csv 的 M-CSA ID 关联出发
  对每条 MechFind 规则关联的 M-CSA 条目，提取其机制步骤
  尝试 SMARTS 直接匹配 → 命中即为 1:1
  预计覆盖率 ~40-50%（不需要解决 moiety↔SMARTS 对齐问题）

Layer 1 (Phase 5, 与Agent②一起做, 可选): 1:N映射
  对1:1未命中的规则，用LLM辅助消歧
  这部分延后到Phase 5(LLM Agent管线)一起做

Layer 2 (放弃/论文future work): moiety↔SMARTS自动对齐
  标注为"future work"，不影响系统核心功能
```

**为什么可以降优先级**:
- CGPS中 `S_path` 权重最低(w3 ≈ 0.1-0.15)
- 即使DS5只有40%覆盖率(1:1映射)，系统仍可工作
- Scene C的CGPS = w1·S_co + w3·S_path，当S_path不可用时退化为CGPS = w1·S_co(仍有效)
- DS5完成度不影响Phase 1-4的核心管线

**对Phase 3的影响**: DS5从5-6天降为3-4天(只做Layer 0)

---

## 六、降级策略

```
LLM服务可用                      LLM服务不可用
───────────────                  ──────────────
Agent①化学审查       →          residue_info.py硬编码规则
Agent②规则翻译       →          DS5映射表首条匹配(不消歧)
Agent③④⑤⑥评审      →          不执行，直接用EZ+CGPS输出

DS5规则映射不完整    →          S_path=0, CGPS退化为S_co+S_geo
PAP放置失败          →          PAP放置(Low confidence) 或 confidence=Rejected

系统不依赖LLM也能运行，LLM是增强不是必需
```

---

## 七、分阶段实施计划 (v2.0修正版)

### 总览

```
Phase 0   基础设施        Week 1       项目骨架、API连通性验证
Phase 1   CGD核心数据     Week 2-4     DS1+DS2+3个辅助文件
Phase 2   CGD配体数据     Week 5-8.5   DS3+DS4+同源替代+PAP+角度+配体Mol  ← 最大风险区
Phase 2.5 EZ验证运行时    Week 8.5-10   场景判定+PDB定位+配体构建+验证管线(代码复用后10天) ← 新增
Phase 3   CGD规则+优化    Week 11-12   DS5(Layer 0)+统计消歧
Phase 4   CGPS评分        Week 13      评分函数+阈值校准
Phase 5   LLM Agent管线   Week 14-16   Agent①②+争议检测+Agent③④⑤⑥+PAP回流
Phase 5.5 氧化还原+氢原子 Week 15-16   氧化还原3D验证+氢原子坐标  ← 新增
Phase 6   系统集成        Week 17-18   端到端管线+Web UI
Phase 7   验证与论文      Week 19-20   M-CSA验证+论文图表
```

> **关键路径**: Phase 0 → 1 → 2 → 2.5 → 4 → 6 → 7  
> **可并行**: Phase 3(DS5 Layer 0) 与 Phase 2 部分并行; Phase 5 的 Agent①② 可在 Phase 4 期间启动  
> **总工期**: 25.6周 (~6.4个月, 1人全职) 或 约17周 (~4.3个月, 2人全职，含依赖约束)
> **v3.4 复用节省**: Phase 2.5 从14.5天→10天，关键路径从10.5天→5.1天，总工期从132.5天→127天
> **v3.5 样本量缺口**: +1天(任务1.13+DS3层级化), 总工期127→128天/25.6周

### 时间线修正对照 (v2.0 → v3.1 → v3.3)

| Phase | v2.0 | v3.1修正 | v3.3修正 | v3.4修正(含复用) | 修正原因 |
|-------|------|---------|---------|-----------------|---------|
| Phase 0 | 4.5天 | 5天 | 5天 | **5天** | 不变 |
| Phase 1 | 16天 | 17.5天 | 17.5天 | **18天** | +0.5天(任务1.13样本量缺口报告) |
| Phase 2 | 30天 | 30.5天 | 33天 | **33.5天** | +0.5天(DS3层级化构建) |
| **Phase 2.5** | — | — | 14.5天 | **10天** | 复用缩减: G8-68%/G10-60%/G12-60%/G13 MVP 0天 |
| Phase 3 | 10天 | 10天 | 10天 | **10天** | 不变 |
| Phase 4 | 7天 | 7天 | 7天 | **7天** | 不变 |
| Phase 5 | 15天 | 18.5天 | 19.5天 | **19天** | G3复用节省0.5天 |
| **Phase 5.5** | — | — | 6天 | **5.5天** | G9少量复用+G15 |
| Phase 6 | 10天 | 10天 | 10天 | **10天** | 不变 |
| Phase 7 | 10天 | 10天 | 10天 | **10天** | 不变 |
| **总计** | **96天** | **108.5天** | **132.5天** | **128天/25.6周** | 样本量缺口+1天 |

---

### Phase 0: 基础设施 (Week 1)

**目标**: 搭建项目骨架，验证所有外部 API 可达性

| 任务ID | 任务 | 具体动作 | 产出 | 代码基础 | 天数 |
|--------|------|----------|------|---------|------|
| 0.1 | 项目结构 | 创建目录: `cgd/`, `agents/`, `ez_validator/`, `cgps/`, `web/` | 目录结构 | ❌ | 0.5 |
| 0.2 | M-CSA API验证 | 获取 entry #1 和 #2 的JSON | 测试脚本+JSON样本 | ❌ | 0.5 |
| 0.3 | PDB下载验证 | 下载1BTL.pdb | 测试脚本+PDB文件 | ✅ `pdb_handler.py` | 0.5 |
| 0.4 | PDBe API验证 | 调用HET映射API | 测试脚本+JSON样本 | ❌ | 0.5 |
| 0.5 | RCSB Search验证 | 查询1BTL同源结构 | 测试脚本+JSON样本 | ❌ | 0.5 |
| 0.6 | RDKit环境 | 测试SMILES→Mol→SMARTS | 环境就绪 | ✅ EzMech已有 | 0.5 |
| 0.7 | MechFind连通 | 确认port 3002可用 | 连通测试 | ✅ 已运行 | 0.5 |
| 0.8 | 缓存模块 | HTTP请求缓存避免重复下载 | 缓存模块 | ❌ | 1 |
| 0.9 | MechFind数据导出验证 | 从MechFind导出Unique_Rules_1.csv样本，确认列名格式{mcsa_id}_{mech_idx}_{step_idx} | 数据样本+格式确认 | ✅ 已运行 | 0.5 |

**Phase 0 里程碑**: 所有外部API可达，开发环境就绪，MechFind数据可导出 (5天)

---

### Phase 1: CGD 核心数据 (Week 2-4)

**目标**: 完成 DS1 + DS2 + 3个辅助文件

#### Week 2: 数据获取 + 辅助文件

| 任务ID | 任务 | 具体动作 | 产出 | 代码基础 | 天数 |
|--------|------|----------|------|---------|------|
| 1.1 | M-CSA批量爬取 | 分页获取1003 entries | `cache/mcsa_entries/` | ❌ 纯API | 2 |
| 1.2 | PDB批量下载 | 提取PDB ID列表, 批量下载 | `cache/pdb_files/` | ✅ `fetch_pdb_info()` | 1.5 |
| 1.3 | active_atom_definitions | 手写~45条映射 | `cgd/auxiliary/active_atom_definitions.json` | ⚠️ `ROLE_TO_RESIDUES`可参考 | 1 |
| 1.4 | ligand_reactive_atom_smarts | 手写~25个模式 | `cgd/auxiliary/ligand_reactive_atom_smarts.json` | ❌ | 1 |

#### Week 3: DS1 + DS2 构建

| 任务ID | 任务 | 具体动作 | 产出 | 代码基础 | 天数 |
|--------|------|----------|------|---------|------|
| 1.5 | PDB解析器扩展 | 在`pdb_handler.py`基础上封装 `get_atom_coord(pdb_id, chain, resid, atom_name)` | 解析模块 | ✅ `parse_pdb_text()`已含atom_name | 1 |
| 1.6 | 主要角色提取 | 实现 `get_primary_role()` | 角色提取模块 | ❌ | 0.5 |
| 1.7 | DS1构建 | 遍历entries提取残基对, 计数+频率 | `cgd/datasets/DS1_residue_cooccurrence.json` | ❌ 纯API聚合 | 2 |
| 1.8 | DS2构建 | 提取活性原子坐标, 计算残基对距离, 统计分布 | `cgd/datasets/DS2_residue_distance.json` | ⚠️ 50%复用 | **4** |

> **1.8 修正说明**: 原计划3天→4天。虽然`parse_pdb_text()`已含atom_name，但需要:  
> (1) 封装`get_atom_coord()` (2) 集成active_atom_definitions查表  
> (3) 百分位统计聚合 (4) 批量处理~800个PDB的调度逻辑

#### Week 4: HET映射 + 质量审计

| 任务ID | 任务 | 具体动作 | 产出 | 代码基础 | 天数 |
|--------|------|----------|------|---------|------|
| 1.9 | HET_to_ChEBI_mapping | 批量查PDBe API+白名单 | `cgd/auxiliary/HET_to_ChEBI_mapping.json` | ❌ | 2.5 |
| 1.10 | 质量过滤 | 分辨率/B-factor/完整性过滤 | 过滤后entries清单 | ❌ | 1 |
| 1.11 | 覆盖度报告 | 各数据集覆盖度+场景分布 | `cgd/reports/phase1_coverage.json` | ❌ | 0.5 |
| 1.13 | **样本量缺口报告** | 统计DS2/DS3各分组n_obs分布, 输出Level 0/Level 1达标率, 决定层级化策略 | `cgd/reports/sample_size_gap.json` | ❌ | 0.5 |
| 1.12 | DS2衍生: 距离阈值表 | P90/P95提取 | `cgd/derived/distance_thresholds.json` | ❌ | 0.5 |

**Phase 1 总计: 18天 (~3.6周)**

**Phase 1 里程碑**:
- ✅ DS1 可用于 S_co 评分
- ✅ DS2 可用于 S_geo 评分 + Scene B 活性位点先验验证
- ✅ 3个辅助文件完成
- ✅ 距离阈值表可用于争议检测
- ✅ 样本量缺口报告产出, DS2/DS3层级化策略确定

---

### Phase 2: CGD 配体数据 (Week 5-8) ← 最大风险区

**目标**: 完成 DS3 + DS4，Scene A/B 全部打通

#### Week 5: Scene A DS3 + DS4

| 任务ID | 任务 | 具体动作 | 产出 | 代码基础 | 天数 |
|--------|------|----------|------|---------|------|
| 2.1 | 催化水识别(MVP) | 距离+B-factor+金属排除(3/5维度) | 评分模块(部分) | ⚠️ 30% | **3** |
| 2.2 | 配体分类模块 | 5级权威数据源验证 | 分类模块 | ❌ | 2 |
| 2.3 | Scene A DS3 | 分类→SMARTS匹配反应原子→距离计算→**同时构建Level 0+Level 1** | DS3 Scene A部分(含层级化) | ⚠️ 25% | **5.5** |
| 2.4 | DS4构建 | 残基×辅因子三元组计数 | `cgd/datasets/DS4_cofactor_cooccurrence.json` | ❌ 类似DS1 | 2 |

> **2.3 修正说明**: 原计划3天→5.5天。缺口:  
> (1) 场景A专用pipeline(从HETATM构建配体Mol+注入键信息)  
> (2) 配体反应原子SMARTS匹配集成  
> (3) 角度计算(Bürgi-Dunitz等)  
> (4) 底物/辅因子过滤  
> (5) **层级化构建**: Level 0(粗粒度=distance_category×role) + Level 1(细粒度=+residue_type), 根据任务1.13报告决定实际策略；增量~0.5天

#### Week 6: 同源替代

| 任务ID | 任务 | 具体动作 | 产出 | 代码基础 | 天数 |
|--------|------|----------|------|---------|------|
| 2.5 | 同源查找 | RCSB API查询seq_identity≥70% | 同源查找模块 | ❌ | 2 |
| 2.6 | TM-align集成 | 调用TM-align+分层加权 | TM-score模块 | ❌ | 2 |
| 2.7 | 残基保守性验证 | 双层验证(序列+空间) | 保守性验证模块 | ❌ | **3** |

> **2.7 修正说明**: 原计划2天→3天。BioPython成对比对可能不够精确，RCSB API序列比对可能有限速

#### Week 7: Scene B DS3 + overlay

| 任务ID | 任务 | 具体动作 | 产出 | 代码基础 | 天数 |
|--------|------|----------|------|---------|------|
| 2.8 | 同源替代DS3 | 用通过验证的同源结构计算距离 | DS3 Scene B部分(同源) | ⚠️ | 2 |
| 2.9 | 口袋锚定放置(MVP) | 活性原子质心→锚定→旋转采样→距离评分 | pocket_anchor.py (新增) | ⚠️ 部分复用 | 1.5 |
| 2.10 | **CGD筛选overlay** | **生成100+构象→口袋锚定放置→DS3初版阈值筛选→选最优** | overlay模块(筛选版) | ⚠️ | **2.5** |

> **2.10 关键变更**: 采用"口袋锚定放置→DS3初版筛选→重排序"替代bounds matrix方案  
> 代码量更少，复用现有overlay代码，仅需增加DS3阈值筛选步骤  
> **注意**: 筛选用 DS3(Scene A初版) P5-P95，而非 DS2。DS2 仅用于overlay前的活性位点合理性检查

#### Week 8: 催化水(完整) + 置信度 + 验证

| 任务ID | 任务 | 具体动作 | 产出 | 代码基础 | 天数 |
|--------|------|----------|------|---------|------|
| 2.11 | 催化水识别(完整) | 补充同源保守性+化学上下文维度 | 完整5维评分 | ⚠️ | 2 |
| 2.12 | 置信度评估 | 4级置信度标准 | 置信度模块 | ❌ | 1 |
| 2.13 | 对比实验 | 10个Scene A案例: 无约束vs筛选overlay | `cgd/reports/overlay_comparison.json` | — | 2 |
| 2.14 | 覆盖度报告 | DS3/DS4覆盖度 | `cgd/reports/phase2_coverage.json` | ❌ | 0.5 |
| 2.15 | 角度计算模块 A1-A3 | Bürgi-Dunitz+质子转移+离去基团 | `cgd/geometry/angle_calculator.py` | ❌ | 1.5 |
| 2.16 | 配体Mol构建(CGD版) | HETATM→PDBe ChemComp键定义→Mol | `cgd/parsers/ligand_builder.py` | ❌ | 1 |

**Phase 2 总计: 33.5天 (~6.7周)**

**Phase 2 里程碑**:
- ✅ DS3 Scene A+B 完成 (含置信度标注)
- ✅ DS4 完成
- ✅ PAP放置+DS3筛选overlay 验证有效 (对比实验通过)
- ✅ 5个数据集中4个完成
- ✅ 角度计算 A1-A3 完成
- ✅ 配体Mol构建完成 (CGD构建阶段版)

---

### Phase 2.5: EZ 验证运行时核心 (Week 8.5-10) ← 端到端可运行的关键!

**目标**: 实现从用户输入到验证输出的完整运行时管线，系统端到端可运行

> **本Phase来源于 G1-G16 端到端缺口审计 + CODE_REUSE_AUDIT 代码复用审计**。CGD数据构建层覆盖率100%，但EZ验证运行时层仅5%。现有代码库可提供30%复用率，高复用缺口(G8-68%/G10-60%/G12-60%/G13 MVP 0天)大幅缩减工期。

| 任务ID | 任务 | 具体动作 | 产出 | 缺口 | v3.3天数 | **v3.4天数** | 复用来源 |
|--------|------|----------|------|------|---------|------------|----------|
| 2.5.1 | 场景判定+降级 | EC/UniProt→Scene A/B/C判定 + A→B降级 | `ez_validator/scene_resolver.py` | G6+G16 | 1.0 | **1.0** | pdb_handler 40%复用 |
| 2.5.2 | PDB获取+残基定位 | RCSB搜索+M-CSA残基定位+产品级筛选 | `ez_validator/pdb_locator.py` | G8 | 0.6 | **0.6** | ⭐pdb_handler 68%复用 |
| 2.5.3 | 配体Mol构建(运行时版) | HETATM→Mol运行时接口 | `ez_validator/ligand_builder.py` | G13 | 0.5 | **0.3** | ⭐parse_pdb_ligand_atoms MVP 0天新写 |
| 2.5.4 | 运行时规则映射 | MechFind规则ID→EZ SMARTS查询接口 | `ez_validator/rule_mapper.py` | G7 | 0.5 | **0.25** | shared.load_rules 58%复用 |
| 2.5.5 | Scene A完整验证 | 距离→阈值→判定→评分→置信度管线 | `ez_validator/scene_a_validator.py` | G1 | 2 | **1.5** | extract_pdb_residue_fragment 38%复用 |
| 2.5.6 | 统一验证结果格式 | VerificationResult dataclass | `ez_validator/scoring/verification_result.py` | G5 | 0.5 | **0.5** | 纯新写，无复用 |
| 2.5.7 | S_geo运行时组合 | f(D1-D6, A1-A3)→S_geo | `ez_validator/scoring/s_geo_runtime.py` | G4 | 0.5 | **0.5** | 纯新写，无复用 |
| 2.5.8 | EZ SMARTS执行循环 | 逐步SMARTS匹配→变换→3D验证 | `ez_validator/ez_executor.py` | G10 | 2 | **1.0** | ⭐mechanism_search 60%复用 |
| 2.5.9 | 中间体3D构象管理 | 原子映射追踪+Kabsch对齐+误差累积 | `ez_validator/intermediate_conformer.py` | G12 | 2 | **1.0** | ⭐ETKDGv3+Kabsch 60%复用 |
| 2.5.10 | 置信度分量计算 | 0.25×MF+0.50×EZ+0.15×Agent+0.10×Arbiter | `ez_validator/confidence_calculator.py` | G11 | 1 | **1.0** | 纯新写，无复用 |
| 2.5.11 | 管线编排 | Top-N候选共享缓存+并行+降级+排序 | `pipeline/pipeline_orchestrator.py` | G14 | 2 | **2.0** | 纯架构胶水层，无复用 |
| | **Phase 2.5 总计** | | | | **14.5天** | **~10天 (~2周)** | **复用节省31%** |

> **v3.4 关键发现**: G13 配体Mol构建的 MVP 已由 `parse_pdb_ligand_atoms()` 完整实现（HETATM提取+MolFromPDBBlock+CONECT解析+距离推断键），0天新写代码，仅需薄封装导入。G8 的 pdb_handler.py 已实现完整PDB下载+解析+残基提取能力，68%代码可直接调用。详见 `GAP_AUDIT_G1-G16.md` 第2-3节。

**Phase 2.5 里程碑**:
- ✅ 系统可从用户输入端到端运行验证管线 (Scene A/B/C)
- ✅ G6→G8→G13→G1 关键路径打通
- ✅ Top-N 候选机制可并行评估+排序输出
- ✅ 单候选Scene A验证+多步EZ执行循环可运行

**关键路径**: G6(场景判定) → G8(PDB定位) → G13(配体Mol构建) → G1(Scene A验证) → G10(EZ执行循环) → G12(中间体构象)

**关键路径时间**: 原估10.5天 → 复用后5.1天 (缩减51%)

---

### Phase 3: CGD 规则映射 + 优化 (Week 9-10)

**目标**: 完成 DS5 Layer 0 + 统计消歧

| 任务ID | 任务 | 具体动作 | 产出 | 代码基础 | 天数 |
|--------|------|----------|------|---------|------|
| 3.1 | MechFind规则解析 | Unique_Rules_1.csv提取规则ID+M-CSA关联 | 规则解析模块 | ⚠️ 30% | 1.5 |
| 3.2 | EZ SMARTS规则库 | 从EzMechanism提取SMARTS规则 | EZ规则库 | ⚠️ 已有 | 0.5 |
| 3.3 | DS5 Layer 0 | 只做1:1映射(M-CSA关联→SMARTS直接匹配) | `cgd/datasets/DS5_rule_crossmapping.json` | ⚠️ 30% | **3** |
| 3.4 | 规则映射表衍生 | 从DS5提取1:1/1:N/无映射列表 | `cgd/derived/rule_mapping_table.json` | ❌ | 0.5 |
| 3.5 | 统计消歧 | DS3≥50样本的P50几何先验消歧 | 消歧模块 | ❌ | 2 |
| 3.6 | DS3迭代优化 | 消歧结果反馈到DS3 | 优化后DS3 | ❌ | 1.5 |
| 3.7 | 全数据集审计 | 质量检查 | `cgd/reports/full_audit.json` | ❌ | 1 |

> **3.3 修正说明**: 只做Layer 0(1:1映射)，1:N映射延后到Phase 5与Agent②一起做

**Phase 3 总计: 10天 (~2周)**

**Phase 3 里程碑**:
- ✅ DS5 Layer 0 完成 (1:1映射覆盖率~40-50%)
- ✅ 规则映射表可供Agent②查询
- ✅ 统计消歧启用
- ✅ CGD 全部就绪

---

### Phase 4: CGPS 评分函数 (Week 11)

| 任务ID | 任务 | 具体动作 | 产出 | 天数 |
|--------|------|----------|------|------|
| 4.1 | S_co实现 | 基于DS1频率, f(role_pair)→[0,1] | `cgps/s_co.py` | 1 |
| 4.2 | S_geo实现 | 基于DS2+DS3, f(distances,thresholds)→[0,1] | `cgps/s_geo.py` | 2 |
| 4.3 | S_path实现 | 基于DS5, f(rule_sequence)→[0,1] | `cgps/s_path.py` | 1.5 |
| 4.4 | CGPS综合 | w1·S_co+w2·S_geo+w3·S_path (场景C: w2=0) | `cgps/scorer.py` | 1 |
| 4.5 | 阈值校准 | M-CSA 80/20训练, 校准w1,w2,w3,θ_low,θ_high | `cgps/calibrated_params.json` | 1.5 |

**Phase 4 总计: 7天 (~1.5周)**

---

### Phase 5: LLM Agent 管线 (Week 12-14)

**目标**: 实现 Agent ①② + 争议检测 + Agent ③④⑤⑥ + DS5 Layer 1

#### Week 12: Agent ①② + DS5 Layer 1

| 任务ID | 任务 | 具体动作 | 产出 | 天数 |
|--------|------|----------|------|------|
| 5.1 | LLM接口封装 | prompt模板+JSON解析+重试 | `agents/llm_client.py` | 1.5 |
| 5.2 | Agent①化学审查 | 基团变化向量→plausibility_score | `agents/agent1_chemist.py` | 2 |
| 5.3 | Agent②规则翻译 | DS5查表+LLM消歧(含1:N映射) | `agents/agent2_translator.py` | 2.5 |
| 5.4 | RunReactants闭环 | 验证产物匹配 | 闭环验证模块 | 1 |

#### Week 13: 争议检测 + Agent ③④⑤

| 任务ID | 任务 | 具体动作 | 产出 | 天数 |
|--------|------|----------|------|------|
| 5.5 | 争议检测 | 4触发条件 | `agents/dispute_detector.py` | 2 |
| 5.6 | Agent③④⑤ | 催化化学+结构生物+文献验证 | 3个Agent模块 | 3 |

#### Week 14: Agent⑥ + 置信度 + 降级

| 任务ID | 任务 | 具体动作 | 产出 | 天数 |
|--------|------|----------|------|------|
| 5.7 | Agent⑥综合评审 | 聚合→accept/reject/needs_revision | `agents/agent6_arbiter.py` | 1.5 |
| 5.8 | 置信度综合计算 | 0.25+0.50+0.15+0.10 | `agents/confidence.py` | 1 |
| 5.9 | 降级策略 | LLM不可用时的fallback | `agents/fallback.py` | 1 |
| 5.10 | DS5 Layer 1 | 用LLM辅助1:N映射消歧 | 优化后DS5 | 1.5 |
| 5.11 | 端到端测试 | 3个场景各1个案例 | 测试报告 | 1.5 |
| 5.12 | PAP→EZ回流接口 | PAP放置坐标→EZ验证管线+置信度降权 | `agents/pap_ez_bridge.py` | G3 | 0.5 |

**Phase 5 总计: 19天 (~3.8周)**

---

### Phase 5.5: 氧化还原验证 + 氢原子 (Week 16-17)

**目标**: EC 1.x.x.x 氧化还原酶的3D验证 + 氢原子坐标生成

| 任务ID | 任务 | 具体动作 | 产出 | 缺口 | 天数 |
|--------|------|----------|------|------|------|
| 5.5.1 | 氧化还原中心识别 | 金属+配体+辅因子→redox center | `ez_validator/geometry/redox_center_identifier.py` | G9 | 1 |
| 5.5.2 | 电子转移验证 | 电子转移距离/角度验证 | `ez_validator/geometry/electron_transfer_validator.py` | G9 | 1.5 |
| 5.5.3 | 辅因子几何验证 | PLP/NAD/FAD等辅因子几何 | `ez_validator/geometry/cofactor_geometry_validator.py` | G9 | 1.5 |
| 5.5.4 | 金属中心验证 | 金属配位几何验证 | `ez_validator/geometry/metal_center_validator.py` | G9 | 1 |
| 5.5.5 | 氧化还原距离类别 | D7-D10扩展距离类别 | `ez_validator/scoring/redox_distance_categories.py` | G9 | 0.5 |
| 5.5.6 | 氢原子坐标生成 | RDKit AddHs+PDB质子化 | `ez_validator/geometry/hydrogen_adder.py` | G15 | 0.3 |
| | **Phase 5.5 总计** | | | | **5.5天 (~1.1周)** |

**Phase 5.5 里程碑**:
- ✅ EC 1.x.x.x 氧化还原酶可获得完整3D验证
- ✅ A2质子转移角度可用精确H坐标计算(替代MVP近似)
- ✅ 金属中心配位几何验证可用

**MVP策略**: Phase 2.5 用近似方案(A2用距离替代角度)，Phase 5.5完善。

---

### Phase 6: 系统集成 (Week 15-16)

| 任务ID | 任务 | 具体动作 | 产出 | 天数 |
|--------|------|----------|------|------|
| 6.1 | 主管线编排 | 输入→MechFind→Agent→EZ→争议→输出 | `pipeline/main.py` | 2 |
| 6.2 | API服务 | FastAPI: /predict, /results, /cgd/stats | API服务 | 2 |
| 6.3 | Web UI | Next.js前端+NGL Viewer | Web应用 | 3 |
| 6.4 | CGD管理界面 | 数据集浏览+覆盖度仪表盘 | 管理页面 | 1.5 |
| 6.5 | 性能优化 | 缓存+并行+批量 | 性能报告 | 1.5 |

**Phase 6 总计: 10天 (~2周)**

---

### Phase 7: 验证与论文 (Week 17-18)

| 任务ID | 任务 | 具体动作 | 产出 | 天数 |
|--------|------|----------|------|------|
| 7.1 | M-CSA留出验证 | 80/20训练测试 | 验证报告 | 3 |
| 7.2 | 跨EC泛化 | 按EC分类交叉验证 | 泛化报告 | 2 |
| 7.3 | CGD约束对比 | 无约束vs筛选overlay | 对比图表 | 1.5 |
| 7.4 | LLM消融 | 有Agent vs 无Agent | 消融报告 | 1.5 |
| 7.5 | 论文图表 | 架构+流程+分布+结果图 | 论文材料 | 1 |
| 7.6 | 论文章节 | 3.1-3.7方法部分 | 论文草稿 | 1 |

**Phase 7 总计: 10天 (~2周)**

---

## 八、依赖关系图

```
Phase 0 (基础设施)
  │
  ├──────────────────────────────────────┐
  ▼                                      ▼
Phase 1 (DS1+DS2+辅助文件)          [Phase 5部分可启动: Agent①②]
  │                                      │
  ▼                                      │
Phase 2 (DS3+DS4+同源+PAP+角度+配体Mol)  │
  │                                      │
  ▼                                      │
Phase 2.5 (EZ验证运行时) ← 端到端关键!   │
  │                                      │
  ├─────────────┐                        │
  ▼             ▼                        │
Phase 3      Phase 4                    │
(DS5 L0+消歧) (CGPS评分)                │
  │             │                        │
  └──────┬──────┘                        │
         ▼                               ▼
      Phase 5 (Agent管线 + PAP回流 + DS5 L1 + 争议检测 + 置信度)
         │
         ▼
      Phase 5.5 (氧化还原验证 + 氢原子)
         │
         ▼
      Phase 6 (系统集成 + Web UI)
         │
         ▼
      Phase 7 (验证 + 论文)
```

**关键阻塞链**:
- G6(场景判定) → G8(PDB定位) → G13(配体Mol) → G1(Scene A验证) → G10(EZ执行循环) → G12(中间体构象) → 端到端可运行
- DS2 → 活性位点合理性验证(先验) → DS3(Scene A初版) → PAP筛选标准(后验) → DS3(Scene B) → CGPS(S_geo) → 灰色区间 → 争议检测
- DS5 Layer 0 → Agent②规则翻译 → RunReactants验证
- CGPS → 争议检测 → Agent评审

---

## 九、每个Phase结束时的检查清单

### Phase 0 ✅
- [ ] M-CSA API 可调通
- [ ] PDB 可下载解析
- [ ] PDBe API 可调通
- [ ] RDKit SMARTS 匹配正常
- [ ] MechFind 服务可达
- [ ] MechFind 数据可导出 (Unique_Rules_1.csv 列名格式确认)

### Phase 1 ✅
- [ ] DS1: role_pair数>50, top频率合理
- [ ] DS2: n_obs≥20分组>30个, 1BTL验证距离正确
- [ ] active_atom_definitions: 45条
- [ ] HET_to_ChEBI: >200条, 分类正确
- [ ] ligand_reactive_atom_smarts: >20个模式
- [ ] 距离阈值表: 每个role_pair有P90/P95

### Phase 2 ✅
- [ ] DS3 Scene A: n_obs≥10的D1类别>15个
- [ ] DS3 Scene B: 同源替代距离偏差<1.0Å
- [ ] DS4: 辅因子共现频率合理
- [ ] PAP放置+DS3筛选: 比无约束误差降低≥20% (p<0.05)
- [ ] PAP碰撞检测: 无骨架原子重叠(距离≥1.5Å)
- [ ] 置信度标注: 10个已知案例合理

### Phase 2.5 ✅
- [ ] G6: 场景判定可自动区分 Scene A/B/C
- [ ] G16: Scene A 质量差时降级到 Scene B
- [ ] G8: PDB获取+催化残基定位正确
- [ ] G13: 配体Mol可从HETATM构建
- [ ] G1: Scene A 验证管线端到端可运行
- [ ] G10: EZ SMARTS执行循环可逐步验证
- [ ] G12: 中间体3D构象管理误差累积<2Å
- [ ] G14: Top-N候选可并行评估+排序输出
- [ ] 单候选Scene A端到端测试通过 (1BTL案例)

### Phase 3 ✅
- [ ] DS5 Layer 0: 1:1映射率>40%
- [ ] 统计消歧: 正确率提升>10%
- [ ] 全数据集审计通过

### Phase 4 ✅
- [ ] CGPS评分: 已知机制排名Top-3
- [ ] 权重校准: w1,w2,w3确定
- [ ] 灰色区间: θ_low, θ_high确定

### Phase 5 ✅
- [ ] Agent①②: 评分+翻译合理
- [ ] 争议检测: 4条件触发正确
- [ ] Agent⑥: 裁决一致率>70%
- [ ] 降级策略: LLM关闭后可运行
- [ ] DS5 Layer 1: 1:N映射补充完成

### Phase 5.5 ✅
- [ ] G9: EC 1.x.x.x 氧化还原酶可3D验证
- [ ] G15: 氢原子坐标生成可替代MVP近似
- [ ] A2质子转移角度用精确H坐标计算
- [ ] 金属配位几何验证(Fe-S, heme等)可用

---

## 十、端到端缺口审计 G1-G16 (v3.4更新：含代码复用分析)

> **审计方法**: 从用户输入到最终输出的端到端运行时流程逐步排查 + 现有代码可移植性分析  
> **审计结论**: CGD数据构建层100%覆盖，EZ验证运行时层仅5%(含可移植代码~30%)  
> **代码复用结论**: G1-G16约30%代码可从现有代码库移植，高复用缺口(G8-68%/G10-60%/G12-60%/G13 MVP 0天)  
> **详细审计报告**: 参见 `docs/GAP_AUDIT_G1-G16.md`

### G1-G16 完整缺口汇总

| 严重度 | 缺口 | 模块 | 所在Phase | 原工作量 | 复用后 | 复用率 |
|--------|------|------|----------|---------|--------|--------|
| 🔴高 | G6 | `scene_resolver.py` 场景判定+降级 | 2.5 | 1天 | 0.7天 | 40% |
| 🔴高 | G8 | `pdb_locator.py` PDB获取+残基定位 | 2.5 | 2天 | **0.6天** | ⭐68% |
| 🔴高 | G10 | `ez_executor.py` SMARTS执行+3D验证 | 2.5 | 2天 | **1天** | ⭐60% |
| 🟡中 | G1 | `scene_a_validator.py` Scene A验证管线 | 2.5 | 2天 | 1.5天 | 38% |
| 🟡中 | G2 | `angle_calculator.py` A1-A3角度 | 2 | 1.5天 | 1.5天 | 15% |
| 🟡中 | G3 | `pap_ez_bridge.py` PAP→EZ回流 | 5 | 1天 | 0.5天 | 50% |
| 🟡中 | G7 | `rule_mapper.py` 运行时规则映射 | 2.5 | 0.5天 | 0.25天 | 58% |
| 🟡中 | G9 | `redox_*.py` 氧化还原验证(5子模块) | 5.5 | 5.5天 | 5天 | 5% |
| 🟡中 | G12 | `intermediate_conformer.py` 中间体3D构象 | 2.5 | 2天 | **1天** | ⭐60% |
| 🟡中 | G13 | `ligand_builder.py` 配体Mol构建 | 2+2.5 | 1.5天 | **0.3天** | ⭐MVP 0天 |
| 🟡中 | G14 | `pipeline_orchestrator.py` 管线编排 | 2.5 | 2天 | 2天 | 0% |
| 🟢低 | G4 | `s_geo_runtime.py` S_geo组合 | 2.5 | 0.5天 | 0.5天 | 0% |
| 🟢低 | G5 | `verification_result.py` 统一结果格式 | 2.5 | 0.5天 | 0.5天 | 0% |
| 🟢低 | G11 | `confidence_calculator.py` 置信度分量 | 2.5 | 1天 | 1天 | 0% |
| 🟢低 | G15 | `hydrogen_adder.py` 氢原子坐标 | 5.5 | 0.5天 | 0.3天 | 20% |
| 🟢低 | G16 | 融入`scene_resolver.py` Scene A→B降级 | 2.5 | (含G6) | (含G6) | 25% |
| | | | | **24天** | **~17天** | **节省29%** |

### 关键路径

```
G6(场景判定) → G8(PDB定位) → G13(配体Mol) → G1(Scene A验证) → G10(EZ执行循环) → G12(中间体构象)
                ↑ G13插入关键路径! 没有配体Mol, Scene A无法开始

关键路径时间: 原估10.5天 → 复用后5.1天 (缩减51%)
```

### MVP 三级递进策略 (含复用修正)

```
MVP v1: Scene C demo (2-3天)
  G6(0.7d)+G5(0.5d)+G11(Scene C部分,0.5d)+Phase 4 CGPS
  → 用户输入→MechFind→CGPS评分→排序输出

MVP v2: Scene A 单候选 demo (5-6天)
  +G8(0.6d)+G13(0.3d)+G1(1.5d)+G2(1.5d MVP, A2近似)
  → 有PDB+配体的酶可以做3D验证

MVP v3: 端到端完整 demo (8-10天)
  +G10(1d)+G12(1d)+G7(0.25d)+G14(2d)+G4(0.5d)
  → Top-N候选完整验证+排序

原估: v1=3-4天, v2=7-8天, v3=12-14天
复用后: v1=2-3天, v2=5-6天, v3=8-10天 (节省~30%)
```

---

## 十一、立即行动项 (本周可开始)

| 优先级 | 任务 | 预计耗时 | 立即可做? | 缺口 |
|--------|------|----------|----------|------|
| 🔴 P0 | 配体Mol构建(G13) — MVP 0天新写! 薄封装 | 0.3天 | ✅ | G13 |
| 🔴 P0 | 给parse_pdb_text加B-factor/occupancy | 0.5天 | ✅ | — |
| 🔴 P0 | M-CSA API客户端+爬取1003条 | 3天 | ✅ | — |
| 🔴 P0 | 统计聚合模块(percentile/mean/std) | 0.5天 | ✅ | — |
| 🟡 P1 | 场景判定+降级模块(G6+G16) | 0.7天 | ✅ | G6+G16 |
| 🟡 P1 | active_atom_definitions手写 | 1天 | ✅ | — |
| 🟡 P1 | ligand_reactive_atom_smarts手写 | 1天 | ✅ | — |
| 🟡 P1 | PDBe API客户端 | 1.5天 | ✅ | — |
| 🟡 P1 | BatchPDBDownloader | 1天 | ✅ | — |
| 🟢 P2 | 角度计算模块(G2) | 1.5天 | ✅ | G2 |
| 🟢 P2 | PDB获取+残基定位(G8) — 68%复用! | 0.6天 | ✅ | G8 |

**建议**: 今天就开始 P0 + P1 任务，并行推进。**G13 配体Mol构建**是新增的关键路径前置——没有它Scene A无法开始。
