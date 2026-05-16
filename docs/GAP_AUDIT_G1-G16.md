# CGD 端到端代码缺口审计 (G1-G16) — 含代码复用分析

> **版本**: v2.0 (整合版)  
> **日期**: 2026-03-09  
> **基于**: IMPLEMENTATION_PLAN v3.3 + CGD_MASTER_PLAN v3.2 + CODE_REUSE_AUDIT v1.0  
> **整合**: 合并 G1-G11 缺口描述 + G12-G16 新增缺口 + 逐缺口代码复用分析  
> **核心结论**: CGD 数据构建层 100% 覆盖，EZ 验证运行时层仅 7% 覆盖；代码复用可节省 30% 工作量，关键路径缩减近一半

---

## 目录

1. [审计方法：端到端运行时流程](#1-审计方法端到端运行时流程)
2. [现有代码可移植资产](#2-现有代码可移植资产)
3. [完整缺口清单 G1-G16（含代码复用分析）](#3-完整缺口清单-g1-g16含代码复用分析)
4. [代码复用收益汇总](#4-代码复用收益汇总)
5. [模块地图与覆盖率统计](#5-模块地图与覆盖率统计)
6. [缺口依赖关系与关键路径](#6-缺口依赖关系与关键路径)
7. [修正后 Phase 时间线（含复用调整）](#7-修正后-phase-时间线含复用调整)
8. [实施策略：代码移植方案](#8-实施策略代码移植方案)
9. [AI 完成时间估算](#9-ai-完成时间估算)
10. [实施优先级与 MVP 策略](#10-实施优先级与-mvp-策略)

---

## 1. 审计方法：端到端运行时流程

### 1.1 完整运行时流程 (从用户输入到最终输出)

```
用户输入: 底物SMILES + 产物SMILES + (可选)EC/PDB ID
│
▼
[R0] 场景判定 ← G6+G16 ❌
│   给定EC/序列/UniProt → PDB是否存在？有配体？→ Scene A/B/C
│   A→B降级: 配体质量差时自动降级
│
▼
[R1] MechFind MILP求解 ← 已有服务 (port 3002)
│
▼
[R2] MechFind输出→EZ规则映射 ← G7 ❌
│   候选机制的规则序列 → 查DS5 → 找到EZ SMARTS
│
▼
[R3] PDB结构获取+催化残基定位 ← G8 ❌
│   给定EC/序列 → 找PDB → 定位催化残基编号
│
▼
[R4] 配体Mol构建 ← G13 ❌
│   PDB HETATM → RDKit Mol (含键信息)
│   ⭐ 关键发现: parse_pdb_ligand_atoms() 已实现80%, MVP 0天新写!
│
▼
[R5] Scene A/B/C 验证执行
│   ├─ Scene A (PDB+配体) → G1+G2 ❌
│   │   距离计算→阈值查询→判定→评分→置信度
│   │
│   ├─ Scene B (PDB+无配体) → G1+G3 ❌
│   │   PAP放置 → DS3筛选 → 回流EZ验证
│   │
│   └─ Scene C (无PDB) → CGPS评分 ✅
│       = w1·S_co + w3·S_path (S_geo=0)
│
▼
[R6] 氧化还原专用验证 ← G9 ❌ (Phase 5.5)
│   金属中心/辅因子几何/电子转移验证
│
▼
[R7] EZ SMARTS执行+3D验证串联 ← G10 ❌
│   对每一步: SMARTS匹配→变换→3D几何验证
│   中间体3D构象管理 ← G12 ❌
│
▼
[R8] 管线编排 ← G14 ❌
│   Top-N候选: 共享缓存+并行评估+降级+排序
│
▼
[R9] 置信度综合计算 ← G4+G5+G11 ❌
│   0.25×MF + 0.50×EZ + 0.15×Agent + 0.10×Arbiter
│
▼
输出: 排序后的候选机制 + 评分 + 置信度 + 验证报告
```

### 1.2 缺口发现逻辑

| 运行时步骤 | 文档覆盖 | 缺口 | 原因 | 代码复用潜力 |
|-----------|---------|------|------|------------|
| R0 场景判定 | ❌ 无 | G6+G16 | 文档只定义了3个场景，未说如何自动判定 | 🟡中(40%) |
| R1 MechFind | ✅ 已有 | — | 已部署服务 | — |
| R2 规则映射 | 🟡 离线构建 | G7 | DS5是离线统计，运行时查询接口缺失 | 🟡中(58%) |
| R3 PDB定位 | 🟡 API可达性 | G8 | 产品级多条件筛选+残基定位未覆盖 | 🟢高(68%) |
| R4 配体构建 | 🟡 部分实现 | G13 | PDB HETATM→Mol转换 | 🟢高(60%, MVP 0天!) |
| R5 Scene A | 🟡 数据构建 | G1+G2 | DS2/DS3数据完整，验证执行管线缺失 | 🟡中(38%)/🟢低(15%) |
| R5 Scene B | 🟡 PAP模块 | G3 | PAP→EZ回流接口缺失 | 🟡中(50%) |
| R5 Scene C | ✅ CGPS | — | Phase 4 = 验证本身 | — |
| R6 氧化还原 | ❌ 无 | G9 | 完全未覆盖 | 🔴低(5%) |
| R7 EZ执行循环 | ❌ 无 | G10+G12 | SMARTS规则是数据，执行循环缺失 | 🟢高(60%)/🟢高(60%) |
| R8 管线编排 | ❌ 无 | G14 | 多候选编排完全缺失 | ⚪无(0%) |
| R9 置信度 | 🟡 公式 | G4+G5+G11 | 公式定义了，分量计算未明确 | ⚪无/⚪无/⚪无 |

---

## 2. 现有代码可移植资产

### 2.1 可移植代码来源文件

| 文件 | 行数 | 核心能力 | 与EZ验证的相关度 |
|------|------|---------|----------------|
| `overlay_substrate.py` | 674 | PDB配体提取、MCS映射、3D构象生成、Kabsch对齐 | ⭐⭐⭐⭐⭐ |
| `pdb_handler.py` | 1359 | PDB解析、RCSB下载、残基定位、活性位点预测 | ⭐⭐⭐⭐⭐ |
| `mechanism_search.py` | 3994 | SMARTS规则应用、3D坐标映射、键长验证、反应中心识别 | ⭐⭐⭐⭐⭐ |
| `ligand_compare.py` | 654 | PDBeChem API、SMILES查找、MCS计算 | ⭐⭐⭐⭐ |
| `arrow_transform.py` | 1287 | 电子推动箭头变换、多步反应模拟 | ⭐⭐⭐⭐ |
| `shared.py` | 662 | M-CSA规则加载、SMARTS预处理、键变化计算 | ⭐⭐⭐⭐ |
| `common/utils.py` | 566 | 箭头变换核心、分子工具 | ⭐⭐⭐ |
| `reaction_result.py` | 1080 | 反应结果评分、2D优化、立体检测 | ⭐⭐⭐ |
| `residue_info.py` | 686 | 残基角色分析 | ⭐⭐ |

### 2.2 核心可移植函数 TOP 10

| 排名 | 函数 | 来源 | 服务缺口 | 价值 | 移植方式 |
|------|------|------|---------|------|---------|
| 1 | `parse_pdb_ligand_atoms()` | overlay_substrate.py | G13 | HETATM→Mol完整实现 | ✅ 直接import |
| 2 | `_build_am_to_3d_coord()` | mechanism_search.py | G10, G12 | PDB→3D坐标映射核心 | 🔄 提取+封装 |
| 3 | `kabsch_align()` | overlay_substrate.py | G12 | 3D对齐算法 | ✅ 直接import |
| 4 | `generate_3d_conformer()` | overlay_substrate.py | G12 | ETKDGv3构象生成 | ✅ 直接import |
| 5 | `parse_pdb_text()` | pdb_handler.py | G6, G8 | 完整PDB解析 | ✅ 直接import |
| 6 | `fetch_pdb_info()` | pdb_handler.py | G6, G8 | RCSB下载 | ✅ 直接import |
| 7 | `_compute_bond_length_from_products()` | mechanism_search.py | G10 | 键长3D验证 | ✅ 直接import |
| 8 | `_lookup_pdbechem()` | ligand_compare.py | G13 | PDBe API客户端 | ✅ 直接import |
| 9 | `_mcs_align_and_mmff()` | mechanism_search.py | G10, G12 | MCS+MMFF优化 | ✅ 直接import |
| 10 | `_apply_single_arrow_safe()` | arrow_transform.py | G10 | 箭头变换核心 | ✅ 直接import |

### 2.3 完整可复用函数清单

| 函数 | 来源 | 行数 | 目标缺口 | 移植方式 |
|------|------|------|---------|---------|
| `parse_pdb_ligand_atoms()` | overlay_substrate.py:50 | ~170 | G13 | ✅ 直接移植 |
| `find_mcs_mapping()` | overlay_substrate.py:224 | ~50 | G10, G1 | ✅ 直接移植 |
| `generate_3d_conformer()` | overlay_substrate.py:276 | ~48 | G12 | ✅ 直接移植 |
| `kabsch_align()` | overlay_substrate.py:327 | ~61 | G12 | ✅ 直接移植 |
| `overlay_smiles_to_pdb()` | overlay_substrate.py:524 | ~115 | G3 | 🔄 需适配 |
| `parse_pdb_text()` | pdb_handler.py:384 | ~290 | G8 | ✅ 直接移植 |
| `fetch_pdb_info()` | pdb_handler.py:968 | ~65 | G8 | ✅ 直接移植 |
| `compute_ligand_distances()` | pdb_handler.py:770 | ~62 | G1 | 🔄 需适配(→活性原子) |
| `_predict_active_site_internal()` | pdb_handler.py:839 | ~120 | G8 | ✅ 直接移植 |
| `extract_pdb_residue_fragment()` | mechanism_search.py:452 | ~66 | G1, G8 | ✅ 直接移植 |
| `_build_am_to_3d_coord()` | mechanism_search.py:589 | ~340 | G10, G12 | 🔄 需提取+适配 |
| `_mcs_align_and_mmff()` | mechanism_search.py:647 | ~70 | G10, G12 | ✅ 直接移植 |
| `_compute_bond_length_from_products()` | mechanism_search.py:2156 | ~100 | G10 | ✅ 直接移植 |
| `identify_reaction_center_atom_maps()` | mechanism_search.py:1421 | ~100 | G10 | ✅ 直接移植 |
| `_lookup_pdbechem()` | ligand_compare.py:170 | ~32 | G13 | ✅ 直接移植 |
| `get_ligand_smiles_with_fallback()` | ligand_compare.py:217 | ~23 | G8, G13 | ✅ 直接移植 |
| `simulate_reaction_mechanism()` | arrow_transform.py:278 | ~115 | G10 | 🔄 需适配(→3D) |
| `_apply_single_arrow_safe()` | arrow_transform.py:38 | ~100 | G10 | ✅ 直接移植 |
| `parse_reaction_to_arrows()` | arrow_transform.py:472 | ~135 | G10 | ✅ 直接移植 |
| `load_rules()` | shared.py:435 | ~45 | G7 | ✅ 直接移植 |
| `_preparse_rules()` | shared.py:482 | ~100 | G7, G10 | ✅ 直接移植 |

---

## 3. 完整缺口清单 G1-G16（含代码复用分析）

### G1: Scene A 完整验证管线 — `scene_a_validator.py`

**问题**: Scene A (PDB+配体) 的完整验证执行管线缺失。DS2/DS3 数据构建完整，但"拿到数据后如何验证"的代码未分配任务。

**完整验证流程**:
```
1. 从 mechanism_search.py 获取候选机制的残基角色列表
2. 查 active_atom_definitions → 获取活性原子名
3. 从 PDB 提取残基活性原子坐标 + 配体反应原子坐标
4. 计算 residue-residue 距离 → 查 DS2 P5-P95 → 判定是否合理
5. 计算 residue-ligand 距离/角度 → 查 DS3 P5-P95 → 判定是否合理
6. 综合 → S_geo 评分 + 置信度
7. 与 S_co, S_path 加权 → 最终评分
```

**缺失的核心逻辑**:
- 步骤 4-5: 距离计算→阈值查询→pass/fail 判定→逐维度评分
- 步骤 6: 多维度评分如何组合为 S_geo
- 步骤 7: 与 CGPS 的加权逻辑

**代码复用分析**:

| 子功能 | 现有代码 | 移植方式 | 节省量 |
|--------|---------|---------|--------|
| 残基活性原子坐标提取 | `extract_pdb_residue_fragment()` | ✅ 直接调用 | ~60行 |
| 配体反应原子坐标提取 | `parse_pdb_ligand_atoms()` + SMARTS匹配 | ✅ 复用G13输出 | ~40行 |
| 距离计算 | `compute_ligand_distances()` | 🔄 改为活性原子距离 | ~30行 |
| DS2/DS3百分位查询 | 无 | ❌ 新写 | — |
| S_geo评分 | 无(公式有) | ❌ 新写(但简单) | — |
| 验证流程编排 | 无 | ❌ 新写 | — |

**关键适配**: `compute_ligand_distances()` 当前计算到几何中心距离，需改为计算到活性原子(如OG for SER)距离

| 指标 | 原估算 | 复用后 | 节省率 |
|------|--------|--------|--------|
| 代码量 | ~400行 | ~250行 | 38% |
| 工作量 | 2天 | 1.5天 | 25% |

**严重度**: 🟡中 | **依赖**: G2, G4, DS2/DS3, G8, G13

---

### G2: 角度计算模块 — `angle_calculator.py`

**问题**: DS3 定义了 3 个角度类别 (A1-A3)，但角度计算的实现代码未分配任务。

| 类别 | 角度定义 | 实现难点 |
|------|---------|---------|
| A1 | Bürgi-Dunitz: nucleophile→C=O碳→C=O氧 | 需识别配体中 C=O 基团 |
| A2 | 质子转移: donor-H→acceptor→活性原子 | 需添加氢原子坐标 (依赖G15) |
| A3 | 离去基团: C→leaving_group→leaving_atom | 需识别离去基团 |

**代码复用分析**:

| 子功能 | 现有代码 | 移植方式 | 节省量 |
|--------|---------|---------|--------|
| 3D坐标提取 | `mol_to_atom_coords()` | ✅ 直接调用 | ~20行 |
| 向量/角度计算 | `_euclidean_distance()` | ✅ 参考扩展 | ~10行 |
| A1 Bürgi-Dunitz | 无 | ❌ 新写 | — |
| A2 质子转移 | 无(依赖G15) | ❌ 新写 | — |
| A3 离去基团 | 无 | ❌ 新写 | — |

**说明**: 角度计算本身是数学公式，主要工作量在化学模式识别

| 指标 | 原估算 | 复用后 | 节省率 |
|------|--------|--------|--------|
| 代码量 | ~200行 | ~170行 | 15% |
| 工作量 | 1.5天 | 1.5天 | 0% (化学逻辑为主) |

**严重度**: 🟡中 | **依赖**: 无 (A2 MVP可先用距离近似)

---

### G3: PAP→EZ 回流接口 — `pap_ez_bridge.py`

**问题**: PAP 输出的"最优放置坐标"如何回流到 EzMechanism 做后续验证，接口不明确。

```
PAP 输出: (best_placement_coords, confidence, "OK")
    │
    ▼  ← 这一步缺失
EzMechanism 3D 验证管线:
    - 放置坐标 → 注入 mechanism_search.py 的验证流程
    - 虚拟配体坐标 → 视同真实配体 → 进入 Scene A 验证逻辑
    - 但置信度需要降权 (overlay 数据 vs 直接观测数据)
```

**代码复用分析**:

| 子功能 | 现有代码 | 移植方式 | 节省量 |
|--------|---------|---------|--------|
| 虚拟配体坐标→Mol | `overlay_smiles_to_pdb()` | 🔄 反向使用 | ~50行 |
| 坐标注入验证管线 | `_build_am_to_3d_coord()` | 🔄 提取逻辑 | ~30行 |
| 置信度降权 | 无 | ❌ 新写 | — |

**关键适配**: overlay_substrate 是"SMILES→PDB位置"，PAP→EZ是"PAP坐标→验证管线"，逻辑可逆用

| 指标 | 原估算 | 复用后 | 节省率 |
|------|--------|--------|--------|
| 代码量 | ~120行 | ~60行 | 50% |
| 工作量 | 1天 | 0.5天 | 50% |

**严重度**: 🟡中 | **依赖**: G1, PAP模块

---

### G4: S_geo 多维度组合 — `s_geo_runtime.py`

**问题**: S_geo = f(D1-D6, A1-A3) 的运行时组合策略未定义。

```
组合策略 (需确定):
  方案1: 等权平均   S_geo = mean(score_D1..D6, score_A1..A3)
  方案2: 加权平均   S_geo = Σ w_i × score_i (w_i 按类别重要性)
  方案3: 最小值    S_geo = min(score_D1..D6, score_A1..A3) ← 最保守
  方案4: 加权+最小值混合

  Scene A: 全部9个维度可用
  Scene B: D1退化为常数(PAP锚定), 实际8个维度
  Scene C: S_geo=0 (无PDB)
```

**代码复用分析**: 无现有代码可复用，纯数学公式实现（线性插值+加权平均）

| 指标 | 原估算 | 复用后 | 节省率 |
|------|--------|--------|--------|
| 代码量 | ~100行 | ~100行 | 0% |
| 工作量 | 0.5天 | 0.5天 | 0% |

**严重度**: 🟢低 | **依赖**: G1

---

### G5: 统一验证结果格式 — `verification_result.py`

**问题**: 三个场景的验证结果格式不统一，Scene A/B/C 的结果无法比较。

```python
@dataclass
class VerificationResult:
    scene: str                    # "A" / "B" / "C"
    mechanism_id: str             # 候选机制ID
    passed: bool                  # 是否通过验证
    confidence: float             # 0.0-1.0 综合置信度
    
    # 分项评分
    s_co: Optional[float]         # DS1 共现评分
    s_geo: Optional[float]        # DS2+DS3 几何评分 (Scene C=None)
    s_path: Optional[float]       # DS5 路径评分
    
    # 详细信息
    distance_scores: Dict[str, float]  # D1-D6, A1-A3 逐维度
    scene_specific: Dict[str, Any]     # Scene B: PAP详情; Scene A: 直接详情
    
    # 来源追溯
    pdb_id: Optional[str]
    source_type: str              # "direct" / "homolog" / "overlay" / "statistical"
```

**代码复用分析**: 纯数据结构定义，无复用

| 指标 | 原估算 | 复用后 | 节省率 |
|------|--------|--------|--------|
| 代码量 | ~80行 | ~80行 | 0% |
| 工作量 | 0.5天 | 0.5天 | 0% |

**严重度**: 🟢低 | **依赖**: 无 (可先行)

---

### G6: 场景判定模块 — `scene_resolver.py` 🔴 前置!

**问题**: 给定一个酶 (EC/序列/UniProt)，系统如何自动判定走 Scene A/B/C？这是整个验证管线的入口，缺失则系统无法启动。

```
判定逻辑:
  输入: (substrate_smiles, product_smiles, ec_code?, pdb_id?, uniprot_id?)
  
  Step 1: 用户提供了 PDB ID?
    ├─ 是 → 直接使用，跳到 Step 3
    └─ 否 → 继续 Step 2
  
  Step 2: 用 EC/序列 查 RCSB Search API → 找到 PDB ID 列表
    ├─ 无 PDB → Scene C (仅 CGPS 统计评分)
    └─ 有 PDB → 选择最优(分辨率最高+有配体) → 继续 Step 3
  
  Step 3: 下载 PDB → 检查 HETATM
    ├─ 有底物/辅因子配体 (查 HET_to_ChEBI → classification=substrate/cofactor)
    │   → Scene A (直接3D验证)
    └─ 无配体 或 仅有 excluded 配体
        → Scene B (PAP 放置 + 3D 验证)
  
  输出: SceneResult(scene, pdb_id, ligand_info, confidence)
```

**边界情况**:
- EC 查不到 PDB → Scene C
- PDB 存在但分辨率 > 3.0Å → 降级 Scene C
- PDB 有配体但全是 excluded → Scene B
- 多个 PDB 可用 → 选分辨率最优+有底物的
- M-CSA 不包含该酶 → 无催化残基标注，需序列预测

**代码复用分析**:

| 子功能 | 现有代码 | 移植方式 | 节省量 |
|--------|---------|---------|--------|
| PDB存在性检查 | `fetch_pdb_info()` | ✅ 直接调用 | ~30行 |
| PDB配体检查 | `parse_pdb_text()` → ligands | ✅ 直接调用 | ~20行 |
| HETATM分类(excluded/water) | `WATER_RESNAMES`, `EXCLUDED_HETATM` | ✅ 常量复用 | ~10行 |
| 场景判定逻辑 | 无 | ❌ 新写 | — |
| G16降级逻辑 | 无 | ❌ 新写 | — |

**关键**: 判定逻辑本身简单，主要是组合现有PDB解析能力

| 指标 | 原估算 | 复用后 | 节省率 |
|------|--------|--------|--------|
| 代码量 | ~150行 | ~90行 | 40% |
| 工作量 | 1天 | 0.7天 | 30% |

**严重度**: 🔴高 | **依赖**: 无 (前置!)

---

### G7: 运行时规则映射 — `rule_mapper.py`

**问题**: DS5 是离线统计映射，但运行时给定 MechFind 输出的规则 ID 序列，如何查询对应的 EZ SMARTS 规则？

```
运行时流程:
  MechFind 输出: rule_sequence = ["2_2_1", "5_1_3", "8_2_2"]
       │
       ▼
  查 DS5 映射表:
    "2_2_1" → ez_smarts="[OD1:1]>>[OD2:1]" (1:1, confidence=exact)
    "5_1_3" → ez_smarts=未映射 (DS5 Layer 0 未覆盖)
    "8_2_2" → ez_smarts="[NH2:1]>>[NH3+:1]" (1:1, confidence=exact)
       │
       ▼
  未映射规则的处理:
    ├─ 降级: S_path 对该步骤贡献=0
    ├─ LLM: 用 Agent② 尝试 1:N 映射 (Phase 5)
    └─ 标记: confidence=unmapped → 降低整体验证置信度
```

**代码复用分析**:

| 子功能 | 现有代码 | 移植方式 | 节省量 |
|--------|---------|---------|--------|
| M-CSA规则加载 | `load_rules()` | ✅ 直接调用 | ~30行 |
| 规则预处理 | `_preparse_rules()` | ✅ 直接调用 | ~40行 |
| MechFind→EZ映射 | 无(依赖DS5) | ❌ 新写 | — |

**说明**: 核心映射逻辑依赖DS5数据结构，需等DS5构建完成后确定

| 指标 | 原估算 | 复用后 | 节省率 |
|------|--------|--------|--------|
| 代码量 | ~120行 | ~50行 | 58% |
| 工作量 | 0.5天 | 0.25天 | 50% |

**严重度**: 🟡中 | **依赖**: DS5

---

### G8: 运行时 PDB 获取 + 催化残基定位 — `pdb_locator.py` 🔴 前置!

**问题**: Scene A/B 的前置步骤，比想象的复杂。Phase 0 只验证了 API 可达性，产品级的多条件筛选 + 残基定位未覆盖。

```
问题拆解:

  8a. 给定 EC/UniProt → 搜索 RCSB → 找到 PDB ID 列表
      - 分辨率优先
      - 有配体优先
      - 催化残基完整优先
      - 去重 (同一蛋白质多个 PDB)

  8b. 催化残基定位: MechFind 输出 "SER, GLU, HIS"
      → PDB 中可能有多个 SER，哪个是催化残基？
      → 需要 M-CSA API 的 residue_chains 字段来定位

  8c. 备选方案: M-CSA 不包含该酶时的催化残基推断
      → MVP: 仅支持 M-CSA 已收录酶 (1003种)
```

**代码复用分析**:

| 子功能 | 现有代码 | 移植方式 | 节省量 |
|--------|---------|---------|--------|
| RCSB PDB下载 | `fetch_pdb_info()` | ✅ 直接调用 | ~40行 |
| PDB文本解析 | `parse_pdb_text()` | ✅ 直接调用 | ~80行 |
| 活性位点预测 | `_predict_active_site_internal()` | ✅ 直接调用 | ~60行 |
| 配体SMILES查找 | `get_ligand_smiles_with_fallback()` | ✅ 直接调用 | ~15行 |
| DBREF→UniProt映射 | `_parse_dbref_records()` | ✅ 直接调用 | ~30行 |
| M-CSA催化残基定位 | 无 | ❌ 新写(M-CSA API) | — |
| 多PDB筛选 | 无 | ❌ 新写 | — |

**⭐ 这是复用收益最大的缺口**: pdb_handler.py 已有完整的PDB下载、解析、残基提取能力

| 指标 | 原估算 | 复用后 | 节省率 |
|------|--------|--------|--------|
| 代码量 | ~250行 | ~80行 | **68%** |
| 工作量 | 2天 | 0.6天 | **70%** |

**严重度**: 🔴高 | **依赖**: M-CSA API

---

### G9: 氧化还原 3D 验证 — 5 个子模块

**问题**: 氧化还原类酶 (EC 1.x.x.x, 占 M-CSA ~25%) 的 3D 验证有特殊性：涉及金属中心、辅因子几何、电子转移距离，现有 D1-D6/A1-A3 无法覆盖。

| 子模块 | 功能 | 代码量 | 工作量 |
|--------|------|--------|--------|
| `redox_center_identifier.py` | 识别氧化还原中心 (金属+配体+辅因子) | ~200行 | 1天 |
| `electron_transfer_validator.py` | 电子转移距离/角度验证 | ~250行 | 1.5天 |
| `cofactor_geometry_validator.py` | 辅因子几何验证 (PLP/NAD/FAD 等) | ~300行 | 1.5天 |
| `metal_center_validator.py` | 金属配位几何验证 | ~200行 | 1天 |
| `redox_distance_categories.py` | 扩展距离类别 (D7-D10: 电子转移相关) | ~150行 | 0.5天 |

**代码复用分析**:

| 子功能 | 现有代码 | 移植方式 | 节省量 |
|--------|---------|---------|--------|
| 金属配位距离 | `compute_ligand_distances()` | 🔄 适配 | ~20行 |
| PDB坐标提取 | `extract_pdb_residue_fragment()` | ✅ 直接调用 | ~30行 |
| 氧化还原中心识别 | 无 | ❌ 新写 | — |
| 电子转移验证 | 无 | ❌ 新写 | — |
| 辅因子几何 | 无 | ❌ 新写 | — |
| 金属配位验证 | 无 | ❌ 新写 | — |

**说明**: 氧化还原领域专业性很强，大部分需新写

| 指标 | 原估算 | 复用后 | 节省率 |
|------|--------|--------|--------|
| 代码量 | ~1100行 | ~1050行 | 5% |
| 工作量 | 5.5天 | 5天 | 9% |

**严重度**: 🟡中 | **依赖**: G1, G2 | **MVP策略**: 可延后至 Phase 5.5

---

### G10: EZ SMARTS 执行 + 3D 验证串联 — `ez_executor.py` 🔴 核心!

**问题**: EzMechanism 现有 6,083 条 SMARTS 规则，但"如何用它们验证 MechFind 输出的候选机制"这个核心执行循环未被任何任务覆盖。这是整个系统从"数据"变成"验证"的关键模块。

```python
def execute_ez_validation(candidate_mechanism, pdb_structure, cgd_datasets):
    """
    核心验证循环:
    对 MechFind 输出的每一步规则:
      1. 查 DS5 获取对应 EZ SMARTS 规则
      2. 在底物/中间体 Mol 上执行 SMARTS 匹配
      3. 若匹配成功 → 应用变换 → 验证 3D 几何
      4. 若 3D 验证失败 → 淘汰该候选
      5. 若所有步骤通过 → 候选机制通过验证
    """
```

**关键设计决策**:
- 中间体 3D 构象如何生成？每步变换后需要新的 3D 构象 → G12
- 多步反应的误差累积如何处理？ → G12 中的坐标系对齐
- SMARTS 匹配失败时的降级策略 → S_path=0 + 标记

**代码复用分析**:

| 子功能 | 现有代码 | 移植方式 | 节省量 |
|--------|---------|---------|--------|
| SMARTS规则应用 | `_apply_rule_to_configuration()` | 🔄 提取核心逻辑 | ~80行 |
| RunReactants包装 | `_get_products_for_reactants_and_rule()` | 🔄 简化版 | ~50行 |
| 3D坐标注入 | `_build_am_to_3d_coord()` | 🔄 提取+适配 | ~60行 |
| 键长验证 | `_compute_bond_length_from_products()` | ✅ 直接调用 | ~40行 |
| 反应中心识别 | `identify_reaction_center_atom_maps()` | ✅ 直接调用 | ~30行 |
| 箭头变换 | `_apply_single_arrow_safe()` | ✅ 直接调用 | ~20行 |
| 多步执行循环 | `simulate_reaction_mechanism()` | 🔄 参考架构 | ~20行 |
| 规则预处理 | `_preparse_rules()` → `_bond_changes_am` | ✅ 直接调用 | ~20行 |

**⭐ 这是复用收益第二大的缺口**: mechanism_search.py 已有完整的SMARTS应用+3D验证闭环

| 指标 | 原估算 | 复用后 | 节省率 |
|------|--------|--------|--------|
| 代码量 | ~300行 | ~120行 | **60%** |
| 工作量 | 2天 | 1天 | **50%** |

**严重度**: 🔴高 | **依赖**: G1, G6, G7, G12

---

### G11: 置信度分量计算 — `confidence_calculator.py`

**问题**: 置信度公式 `0.25×MF + 0.50×EZ + 0.15×Agent + 0.10×Arbiter` 在文档中定义了，但每个分量如何从验证结果中计算未明确。

```
分量计算方法:

  0.25 × mechfind_score:
    - MechFind MILP 目标函数值 → 归一化到 [0,1]
    - 多个候选时的相对排名
    - 无 MechFind 时 = 0

  0.50 × ez_score:
    - Scene A: S_geo 归一化 (距离偏差越小越高)
    - Scene B: S_geo × 置信度系数 (High=1.0, Medium=0.7, Low=0.4)
    - Scene C: CGPS 值
    - EZ 验证失败时 = 0

  0.15 × agent_consensus:
    - Agent③④⑤ 中 accept 的比例
    - 无 LLM 时: 此项 = 0

  0.10 × arbiter_adjustment:
    - Agent⑥ 的裁决分数
    - 无 LLM 时: 此项 = 0
  
  权重归一化:
    - 无 LLM 时: 0.25×MF + 0.50×EZ + 0.25×(重新分配)
    - 无 MechFind 时: 0.50×EZ + 0.15×Agent + 0.10×Arbiter + 0.25×(重新分配)
```

**代码复用分析**: 纯数学公式实现，无现有代码可复用

| 指标 | 原估算 | 复用后 | 节省率 |
|------|--------|--------|--------|
| 代码量 | ~150行 | ~150行 | 0% |
| 工作量 | 1天 | 1天 | 0% |

**严重度**: 🟢低 | **依赖**: G1, G5

---

### G12: 中间体 3D 构象管理 — `intermediate_conformer.py`

**问题**: 多步机制中 SMARTS 变换产生的中间体是 2D 的，需要：
1. 生成 3D 构象 (ETKDGv3)
2. 与前一步中间体对齐 (Kabsch)
3. 追踪原子映射 (SMARTS变换可能重排原子索引)
4. 处理误差累积

**代码复用分析**:

| 子功能 | 现有代码 | 移植方式 | 节省量 |
|--------|---------|---------|--------|
| 3D构象生成 | `generate_3d_conformer()` | ✅ 直接调用 | ~30行 |
| Kabsch对齐 | `kabsch_align()` | ✅ 直接调用 | ~40行 |
| MCS映射 | `find_mcs_mapping()` | ✅ 直接调用 | ~30行 |
| 原子映射追踪 | `_build_am_to_3d_coord()` (am_to_3d_coord逻辑) | 🔄 参考设计 | ~20行 |
| MMFF约束优化 | `_mcs_align_and_mmff()` | ✅ 直接调用 | ~40行 |
| 坐标系对齐+误差累积 | 无 | ❌ 新写 | — |

**关键**: overlay_substrate.py 已有 ETKDGv3 + Kabsch + MCS 三件套，这是中间体构象管理的核心

| 指标 | 原估算 | 复用后 | 节省率 |
|------|--------|--------|--------|
| 代码量 | ~250行 | ~100行 | **60%** |
| 工作量 | 2天 | 1天 | **50%** |

**严重度**: 🟡中 | **依赖**: G10 | **关键路径末端**

---

### G13: PDB HETATM→RDKit Mol 构建 — `ligand_builder.py`

**问题**: PDB HETATM 记录缺少键信息，构建完整 RDKit Mol 需要：
1. 提取 HETATM 原子坐标
2. 查 PDBe ChemComp Dictionary 获取键定义
3. 或用 RDKit MolFromPDBBlock 自动感知
4. 或用距离推断键 (fallback)
5. 处理多构象和缺失原子

**⭐ 关键发现: MVP 已有完整实现!**

`parse_pdb_ligand_atoms()` 已经实现了 HETATM→Mol 的基本流程：

```python
def parse_pdb_ligand_atoms(pdb_text, res_name, chain=None, res_num=None):
    """
    1. ✅ 按res_name/chain/res_num过滤HETATM行
    2. ✅ 跳过水分子
    3. ✅ 尝试MolFromPDBBlock (RDKit自动感知键)
    4. ✅ Fallback: 手动解析原子坐标
    5. ✅ Fallback: CONECT记录解析
    6. ✅ Fallback: 距离感知键推断(< 2.0Å)
    7. ✅ 返回带3D conformer的Mol对象
    """
```

**代码复用分析**:

| 子功能 | 现有代码 | 移植方式 | 节省量 |
|--------|---------|---------|--------|
| HETATM坐标提取 | `parse_pdb_ligand_atoms()` | ✅ 直接调用 | ~80行 |
| PDBe SMILES查找 | `_lookup_pdbechem()` | ✅ 直接调用 | ~20行 |
| MolFromPDBBlock构建 | `parse_pdb_ligand_atoms()` 内部 | ✅ 已实现 | ~30行 |
| CONECT记录解析 | `parse_pdb_ligand_atoms()` 内部 | ✅ 已实现 | ~20行 |
| 距离感知键推断 | `parse_pdb_ligand_atoms()` 内部 | ✅ 已实现 | ~15行 |
| PDBe ChemComp API键定义 | 无 | ❌ 新写 | — |
| 多构象/缺失原子处理 | 部分(`parse_pdb_ligand_atoms`有fallback) | 🔄 需增强 | — |

**G13 MVP策略调整**:

| 阶段 | 方案 | 覆盖率 | 工作量 |
|------|------|--------|--------|
| MVP | 直接用`parse_pdb_ligand_atoms()` | ~80% | **0天**(已有!) |
| 增强 | +PDBe ChemComp API键定义 | ~95% | +0.5天 |
| 完整 | +多构象/缺失原子特殊处理 | ~99% | +0.5天 |

| 指标 | 原估算 | 复用后(MVP) | 节省率 |
|------|--------|------------|--------|
| 代码量 | ~200行 | ~80行 | **60%** |
| 工作量 | 1.5天 | 0.3天(MVP) / 0.6天(增强) | **80%/60%** |

**严重度**: 🟡中 | **依赖**: G8 | **关键路径!**

---

### G14: 运行时管线编排 — `pipeline_orchestrator.py`

**问题**: MechFind 返回 Top-N 候选机制，需要：
1. 并行/串行评估每个候选
2. 共享缓存 (PDB下载、规则查询)
3. 部分失败处理 (某候选验证crash不影响其他)
4. 降级逻辑 (Scene A→B→C 自动降级)
5. 最终排序输出

**代码复用分析**: 纯架构胶水层，组合其他模块，无现有代码可复用

| 指标 | 原估算 | 复用后 | 节省率 |
|------|--------|--------|--------|
| 代码量 | ~300行 | ~300行 | 0% |
| 工作量 | 2天 | 2天 | 0% |

**严重度**: 🟡中 | **依赖**: G1, G6, G10, G14

---

### G15: PDB 氢原子坐标生成 — `hydrogen_adder.py`

**问题**: PDB 通常不含氢原子坐标，但 A2 质子转移角度需要 H 坐标。MVP 可用距离近似 (donor→acceptor < 3.5Å → 假设~180°)，完整版需精确 H 位置。

**代码复用分析**:

| 子功能 | 现有代码 | 移植方式 | 节省量 |
|--------|---------|---------|--------|
| RDKit AddHs | RDKit标准API | ✅ 直接调用 | ~10行 |
| 氢坐标位置推断 | 无 | ❌ 新写 | — |
| MVP近似(距离→角度) | 无 | ❌ 新写 | — |

| 指标 | 原估算(MVP) | 复用后 | 节省率 |
|------|------------|--------|--------|
| 代码量 | ~50行 | ~40行 | 20% |
| 工作量 | 0.5天(MVP) | 0.3天(MVP) | 40% |

**严重度**: 🟢低 | **依赖**: 无 | **MVP策略**: G2 的 A2 角度先用距离近似

---

### G16: Scene A→B 降级 — 融入 `scene_resolver.py`

**问题**: 当 Scene A 的配体质量检测发现问题 (B-factor>50, occupancy<1.0, 分辨率>2.5Å)，应自动降级到 Scene B 并降低置信度。

**代码复用分析**:

| 子功能 | 现有代码 | 移植方式 | 节省量 |
|--------|---------|---------|--------|
| 配体质量检查 | `parse_pdb_text()` 的B-factor/occupancy | 🔄 需提取 | ~20行 |
| 降级逻辑 | 无 | ❌ 新写 | — |

| 指标 | 原估算 | 复用后 | 节省率 |
|------|--------|--------|--------|
| 代码量 | ~80行 | ~60行 | 25% |
| 工作量 | 0.5天(含在G6) | 0.3天(含在G6) | 40% |

**严重度**: 🟢低 | **依赖**: G6 (融入 scene_resolver.py)

---

### G17: DS2/DS3 样本量缺口 — 数据构建层结构性风险 🔴!

**问题**: 方案定义了严格的样本量阈值(DS2 n_obs≥20, DS3 n_obs≥30)，但 M-CSA 实际数据量可能不足以让所有分组达标。Scene A PDB 经质量过滤后可能仅 250-350 个，按 (distance_category × role × residue_type) 分组后，大量组 n_obs<30，导致 S_geo 评分覆盖率极低。

**量化预估**:

```
DS2: ~100-200 有效三元组, 平均 2.5 obs/组 → n_obs≥20 的组可能仅 30-60 个
DS3: ~270 有效分组, 平均 8 obs/组 → n_obs≥30 的组可能仅 5-15 个 (D1类)
     D2-D6, A1-A3: 可能 0-5 个达 n_obs≥30
```

**推荐方案: 层级化设计 (详见 CGD_MASTER_PLAN §6.3)**

| 粒度层级 | DS2 分组键 | DS3 分组键 | 保证 n_obs | confidence |
|---------|-----------|-----------|-----------|------------|
| Level 0 (粗粒度) | role_pair | distance_category × role | ≥30 | "coarse" |
| Level 1 (细粒度) | + residue_type_pair | + residue_type | ≥10→"medium"; ≥30→"high" | "medium"/"high" |
| 运行时降级 | n_obs<10 → Level 0 | n_obs<10 → Level 0 | — | — |

**代码复用分析**:

| 子功能 | 现有代码 | 移植方式 | 节省量 |
|--------|---------|---------|--------|
| DS2/DS3统计聚合 | 已有(Phase 1-2) | 🔄 增加Level 0聚合逻辑 | ~30行 |
| 层级查询+降级 | 无 | ❌ 新写 | ~50行 |
| 置信度映射 | 无 | ❌ 新写 | ~20行 |

| 指标 | 原估算 | 含层级化 | 增量 |
|------|--------|---------|------|
| 代码量 | — | ~100行(新增) | +100行 |
| Phase 1 工作量 | — | +0.5天(任务1.13样本量缺口报告) | +0.5天 |
| Phase 2 工作量 | — | +0.5天(任务2.3层级化构建) | +0.5天 |
| **总工期增量** | | | **+1天** |

**关键依赖**: 任务1.13(样本量缺口报告) → 决定层级化实际参数 → 任务2.3(DS3构建)

**严重度**: 🔴高 (数据构建层结构性风险, 直接影响CGPS可用性) | **依赖**: 无 (前置!) | **所在Phase**: Phase 1+2

---

## 4. 代码复用收益汇总

### 4.1 按缺口统计

| 缺口 | 原估行数 | 实际新写 | 节省行数 | 节省率 | 复用等级 | 原估天数 | 复用后天数 |
|------|---------|---------|---------|--------|---------|---------|-----------|
| G1 Scene A验证 | 400 | 250 | 150 | 38% | 🟡中 | 2 | 1.5 |
| G2 角度计算 | 200 | 170 | 30 | 15% | 🟢低 | 1.5 | 1.5 |
| G3 PAP→EZ回流 | 120 | 60 | 60 | 50% | 🟡中 | 1 | 0.5 |
| G4 S_geo组合 | 100 | 100 | 0 | 0% | ⚪无 | 0.5 | 0.5 |
| G5 结果格式 | 80 | 80 | 0 | 0% | ⚪无 | 0.5 | 0.5 |
| G6 场景判定 | 150 | 90 | 60 | 40% | 🟡中 | 1 | 0.7 |
| G7 规则映射 | 120 | 50 | 70 | 58% | 🟡中 | 0.5 | 0.25 |
| **G8 PDB定位** | **250** | **80** | **170** | **68%** | **🟢高** | **2** | **0.6** |
| G9 氧化还原 | 1100 | 1050 | 50 | 5% | 🔴低 | 5.5 | 5 |
| **G10 EZ执行循环** | **300** | **120** | **180** | **60%** | **🟢高** | **2** | **1** |
| G11 置信度 | 150 | 150 | 0 | 0% | ⚪无 | 1 | 1 |
| **G12 中间体构象** | **250** | **100** | **150** | **60%** | **🟢高** | **2** | **1** |
| **G13 配体Mol构建** | **200** | **80** | **120** | **60%** | **🟢高** | **1.5** | **0.3** |
| G14 管线编排 | 300 | 300 | 0 | 0% | ⚪无 | 2 | 2 |
| G15 氢原子 | 50 | 40 | 10 | 20% | 🟢低 | 0.5 | 0.3 |
| G16 场景降级 | 80 | 60 | 20 | 25% | 🟢低 | (含G6) | (含G6) |
| **总计** | **3850** | **2680** | **1170** | **30%** | | **24天** | **~17天** |

### 4.2 按复用等级分布

| 复用等级 | 缺口 | 说明 |
|---------|------|------|
| 🟢 高(>50%) | G8, G10, G12, G13 | 已有完整实现可直接调用 |
| 🟡 中(20-50%) | G1, G3, G6, G7 | 有部分实现需适配 |
| 🟢 低(<20%) | G2, G9, G15, G16 | 少量复用，大部分新写 |
| ⚪ 无(0%) | G4, G5, G11, G14 | 纯新写(但多为简单模块) |

### 4.3 关键路径对比

```
原关键路径: G6(1d) → G8(2d) → G13(1.5d) → G1(2d) → G10(2d) → G12(2d) = 10.5天
复用后路径: G6(0.7d) → G8(0.6d) → G13(0.3d) → G1(1.5d) → G10(1d) → G12(1d) = 5.1天
```

**关键路径缩减 51%!** 因为：
- G8: pdb_handler.py已实现80%功能 → 2天→0.6天
- G10: mechanism_search.py已实现60%功能 → 2天→1天
- G13: parse_pdb_ligand_atoms()已实现MVP → 1.5天→0.3天
- G12: ETKDGv3+Kabsch已有 → 2天→1天

---

## 5. 模块地图与覆盖率统计

### 5.1 完整模块地图

```
cgd/                              ← CGD 构建层 (离线) ✅ 100%
├── builders/
│   ├── ds1_builder.py           ✅ Phase 1 任务 1.7
│   ├── ds2_builder.py           ✅ Phase 1 任务 1.8
│   ├── ds3_builder.py           ✅ Phase 2 任务 2.3+2.8+2.9
│   ├── ds4_builder.py           ✅ Phase 2 任务 2.4
│   └── ds5_builder.py           ✅ Phase 3 任务 3.3
├── parsers/
│   ├── mcsa_api_client.py       ✅ Phase 0+1
│   ├── pdb_handler_extended.py  ✅ Phase 1 任务 1.5
│   ├── pdbe_api_client.py       ✅ Phase 0+1
│   ├── rcsb_api_client.py       ✅ Phase 0+2 任务 2.5
│   └── ligand_builder.py        ✅ Phase 2 任务 2.16 (CGD版)
├── pap/
│   ├── pocket_anchor.py         ✅ Phase 2 任务 2.9
│   └── pap_runtime.py           🟡 Phase 2+6 (G3 部分覆盖)
├── geometry/
│   └── angle_calculator.py      ✅ Phase 2 任务 2.15
├── homolog/
│   ├── finder.py                ✅ Phase 2 任务 2.5
│   └── conservation.py          ✅ Phase 2 任务 2.7
├── water/
│   └── scorer.py                ✅ Phase 2 任务 2.1+2.11
├── statistics/
│   └── aggregator.py            ✅ Phase 1
└── quality/
    ├── filters.py               ✅ Phase 1 任务 1.10
    └── coverage_report.py       ✅ Phase 1 任务 1.11

ez_validator/                     ← EZ 验证运行时 ❌ 7% → 复用后约30%
├── scene_resolver.py             ❌ G6+G16 (🟡中复用 40%)
├── pdb_locator.py                ❌ G8 (🟢高复用 68%)
├── ligand_builder.py             ❌ G13 (🟢高复用 60%, MVP 0天)
├── rule_mapper.py                ❌ G7 (🟡中复用 58%)
├── scene_a_validator.py          ❌ G1 (🟡中复用 38%)
├── ez_executor.py                ❌ G10 (🟢高复用 60%)
├── intermediate_conformer.py     ❌ G12 (🟢高复用 60%)
├── geometry/
│   ├── angle_calculator.py       ❌ G2 (🟢低复用 15%)
│   ├── hydrogen_adder.py         ❌ G15 (🟢低复用 20%)
│   └── distance_calculator.py    🟡 从pdb_handler提取+增强
├── scoring/
│   ├── s_geo_runtime.py          ❌ G4 (⚪无复用)
│   └── verification_result.py    ❌ G5 (⚪无复用)
├── confidence_calculator.py      ❌ G11 (⚪无复用)
└── redox/                        ❌ G9 (🔴低复用 5%) Phase 5.5
    ├── redox_center_identifier.py
    ├── electron_transfer_validator.py
    ├── cofactor_geometry_validator.py
    ├── metal_center_validator.py
    └── redox_distance_categories.py

pipeline/                         ← 集成层
├── pipeline_orchestrator.py      ❌ G14 (⚪无复用)
├── main.py                       ✅ Phase 6 任务 6.1
├── api_service.py                ✅ Phase 6 任务 6.2
└── web/                          ✅ Phase 6 任务 6.3

cgps/                             ← CGPS 评分层 ✅ 100%
agents/                           ← Agent 层 🟡 90%
```

### 5.2 覆盖率统计

| 层 | 总模块数 | 已覆盖 | 缺失 | 覆盖率 | 含复用有效覆盖 |
|---|---------|--------|------|--------|--------------|
| CGD 构建 | 20 | 20 | 0 | **100%** | 100% |
| EZ 验证运行时 | 16 | 1 | 15 | **6%** | ~30% (含可移植代码) |
| CGPS 评分 | 5 | 5 | 0 | **100%** | 100% |
| Agent | 10 | 9 | 1 | **90%** | 90% |
| 集成 | 4 | 3 | 1 | **75%** | 75% |
| **总计** | **55** | **38** | **17** | **69%** | ~78% (含可移植) |

### 5.3 按严重度分布

| 严重度 | 缺口 | 数量 | 原估合计 | 复用后合计 |
|--------|------|------|---------|-----------|
| 🔴 高 (前置/核心) | G6, G8, G10, **G17** | **4** | 5天 | 2.3天(+1天G17) |
| 🟡 中 (重要) | G1, G2, G3, G7, G9, G12, G13, G14 | 8 | 17天 | 11.1天 |
| 🟢 低 (完善) | G4, G5, G11, G15, G16 | 5 | 2天(不含G16) | 1.6天(不含G16) |
| **合计** | | **17** | **24天** | **~18天** |

---

## 6. 缺口依赖关系与关键路径

### 6.1 依赖关系图

```
G5 (结果格式) ←── 无依赖, 可先行
     │
G2 (角度计算) ←── 无依赖, 可先行
     │
G6+G16 (场景判定+降级) ←── 无依赖, 🔴必须先行!
     │
     ├──→ G8 (PDB定位) ←── G6
     │        │
     │        ├──→ G13 (配体Mol构建) ←── G8
     │        │        │
     │        │        ├──→ G1 (Scene A 验证) ←── G2, G8, G13
     │        │        │        │
     │        │        │        ├──→ G4 (S_geo 组合) ←── G1
     │        │        │        │
     │        │        │        ├──→ G3 (PAP→EZ 回流) ←── G1, PAP
     │        │        │        │
     │        │        │        └──→ G11 (置信度) ←── G1, G5
     │        │        │
     │        │        └──→ G10 (EZ 执行循环) ←── G1, G6, G7
     │        │                     │
     │        │                     ├──→ G7 (规则映射) ←── DS5
     │        │                     │
     │        │                     └──→ G12 (中间体构象) ←── G10
     │        │
     │        └──→ G14 (管线编排) ←── G1, G6, G10
     │
     └──→ G9 (氧化还原) ←── G1, G2  [Phase 5.5]
              │
              └──→ G15 (氢原子) ←── G2  [Phase 5.5]
```

### 6.2 关键路径

```
🔴 原关键路径:  G6(1d) → G8(2d) → G13(1.5d) → G1(2d) → G10(2d) → G12(2d) = 10.5天
🟢 复用后路径:  G6(0.7d) → G8(0.6d) → G13(0.3d) → G1(1.5d) → G10(1d) → G12(1d) = 5.1天
```

**G13 插入关键路径**: 没有配体Mol, Scene A 验证无法开始 (配体反应原子坐标提取依赖G13)

---

## 7. 修正后 Phase 时间线（含复用调整）

### 7.1 与原 v3.3 对比

| Phase | v3.3 | 复用修正后 | 缩减 | 变更说明 |
|-------|------|----------|------|---------|
| Phase 0 | 5天 | 5天 | — | 不变 |
| Phase 1 | 17.5天 | 17.5天 | — | 不变 |
| Phase 2 | 33天 | 33天 | — | G2/G13复用少(化学逻辑为主) |
| **Phase 2.5** | **14.5天** | **10天** | **-4.5** | G8/G10/G12/G13高复用大幅缩减 |
| Phase 3 | 10天 | 10天 | — | 不变 |
| Phase 4 | 7天 | 7天 | — | 不变 |
| Phase 5 | 19.5天 | 19天 | -0.5 | G3复用节省 |
| **Phase 5.5** | **6天** | **5.5天** | **-0.5** | G9少量复用+G15 |
| Phase 6 | 10天 | 10天 | — | 不变 |
| Phase 7 | 10天 | 10天 | — | 不变 |
| **总计** | **132.5天** | **127天 / 25.4周** | **-5.5天** | |

### 7.2 Phase 2.5 详细修正

| 任务ID | 任务 | 缺口 | v3.3天数 | 复用后天数 | 缩减原因 |
|--------|------|------|---------|----------|---------|
| 2.5.1 | 场景判定+降级 | G6+G16 | 1.5 | 1.0 | 调用pdb_handler |
| 2.5.2 | PDB获取+残基定位 | G8 | 2 | **0.6** | pdb_handler 68%复用 |
| 2.5.3 | 配体Mol构建(运行时版) | G13 | 0.5 | **0.3** | MVP=0天, 薄封装 |
| 2.5.4 | 运行时规则映射 | G7 | 0.5 | **0.25** | load_rules直接调用 |
| 2.5.5 | Scene A完整验证 | G1 | 2 | 1.5 | extract_pdb_residue_fragment复用 |
| 2.5.6 | 统一验证结果格式 | G5 | 0.5 | 0.5 | 纯新写，无复用 |
| 2.5.7 | S_geo运行时组合 | G4 | 0.5 | 0.5 | 纯新写，无复用 |
| 2.5.8 | EZ SMARTS执行循环 | G10 | 2 | **1.0** | mechanism_search 60%复用 |
| 2.5.9 | 中间体3D构象管理 | G12 | 2 | **1.0** | ETKDGv3+Kabsch已有 |
| 2.5.10 | 置信度分量计算 | G11 | 1 | 1 | 纯新写，无复用 |
| 2.5.11 | 管线编排 | G14 | 2 | 2 | 纯架构，无复用 |
| | **Phase 2.5 总计** | | **14.5天** | **~10天** | **-31%** |

### 7.3 修正后完整时间线甘特图

```
Week 1       ████ Phase 0: 基础设施
Week 2-4     ████████████████████ Phase 1: DS1+DS2+辅助文件
Week 5-8     ████████████████████████████████ Phase 2: DS3+DS4+PAP+角度+配体Mol
Week 8.5-10  ██████████ Phase 2.5: EZ 验证运行时 (复用后~10天/2周)
Week 10-11   ██████████ Phase 3: DS5+消歧
Week 12      █████ Phase 4: CGPS评分
Week 13-15   ████████████████ Phase 5: LLM Agent + PAP回流
Week 15-16   ████████ Phase 5.5: 氧化还原+氢原子 (~5.5天)
Week 16-17   ██████████ Phase 6: 系统集成
Week 18-19   ██████████ Phase 7: 验证+论文

关键路径: Phase 0→1→2→2.5→4→6→7 = ~92天 (1人全职关键路径)
总工期: 127天 / 25.4周 (1人全职) / ~17周 (2人全职)
```

---

## 8. 实施策略：代码移植方案

### 8.1 新模块目录结构

```
mini-services/prediction-service/
├── ez_validator/                    ← 新建目录
│   ├── __init__.py
│   ├── scene_resolver.py            ← G6+G16
│   ├── pdb_locator.py               ← G8 (大量调用pdb_handler)
│   ├── ligand_builder.py            ← G13 (大量调用overlay_substrate)
│   ├── rule_mapper.py               ← G7 (调用shared.load_rules)
│   ├── scene_a_validator.py         ← G1
│   ├── ez_executor.py               ← G10 (核心，调用最多)
│   ├── intermediate_conformer.py    ← G12
│   ├── geometry/
│   │   ├── angle_calculator.py      ← G2
│   │   ├── hydrogen_adder.py        ← G15
│   │   └── distance_calculator.py   ← 从pdb_handler提取+增强
│   ├── scoring/
│   │   ├── s_geo_runtime.py         ← G4
│   │   └── verification_result.py   ← G5
│   ├── confidence_calculator.py     ← G11
│   └── redox/                       ← G9 (Phase 5.5)
│       ├── redox_center_identifier.py
│       ├── electron_transfer_validator.py
│       ├── cofactor_geometry_validator.py
│       ├── metal_center_validator.py
│       └── redox_distance_categories.py
├── pipeline/
│   └── pipeline_orchestrator.py     ← G14
```

### 8.2 移植方式分类

| 方式 | 说明 | 适用缺口 |
|------|------|---------|
| **import直接调用** | 在新模块中import现有函数 | G6, G7, G8, G13, G15 |
| **提取+封装** | 从大文件提取内部函数，封装为公开API | G10(从mechanism_search提取), G12(从overlay_substrate提取) |
| **适配+增强** | 复用现有函数但修改参数/逻辑 | G1(distance→active atom), G3(反向使用overlay) |
| **纯新写** | 无现有代码可复用 | G4, G5, G9, G11, G14 |

### 8.3 需要从 mechanism_search.py 提取的关键函数

mechanism_search.py 是3994行的巨大文件，内部函数很多带有`_`前缀。需要提取：

| 函数 | 当前位置 | 提取为 | 提取难度 |
|------|---------|--------|---------|
| `extract_pdb_residue_fragment()` | 公开函数 | 直接import | 低 |
| `_build_am_to_3d_coord()` | 内部函数 | 需提取+去掉run_state依赖 | 中 |
| `_mcs_align_and_mmff()` | 嵌套在_build_am_to_3d_coord内 | 需提取为独立函数 | 中 |
| `_compute_bond_length_from_products()` | 公开函数 | 直接import | 低 |
| `identify_reaction_center_atom_maps()` | 公开函数 | 直接import | 低 |
| `_euclidean_distance()` | 公开函数 | 直接import | 低 |
| `RESIDUE_SIDECHAIN_SMILES` | 模块常量 | 直接import | 低 |
| `parse_pdb_coords()` | 公开函数 | 直接import | 低 |
| `mol_to_atom_coords()` | 公开函数 | 直接import | 低 |

### 8.4 需要从 overlay_substrate.py 提取的函数

| 函数 | 当前位置 | 提取为 | 提取难度 |
|------|---------|--------|---------|
| `parse_pdb_ligand_atoms()` | 公开函数 | 直接import | 低 |
| `find_mcs_mapping()` | 公开函数 | 直接import | 低 |
| `generate_3d_conformer()` | 公开函数 | 直接import | 低 |
| `kabsch_align()` | 公开函数 | 直接import | 低 |
| `overlay_smiles_to_pdb()` | 公开函数 | 直接import | 低 |

### 8.5 立即可执行的代码移植清单

#### Day 1 无需修改直接import

```python
# ez_validator/ligand_builder.py (G13)
from overlay_substrate import parse_pdb_ligand_atoms, find_mcs_mapping

# ez_validator/pdb_locator.py (G8)
from pdb_handler import fetch_pdb_info, parse_pdb_text, _predict_active_site_internal

# ez_validator/rule_mapper.py (G7)
from shared import load_rules, _preparse_rules

# ez_validator/intermediate_conformer.py (G12)
from overlay_substrate import generate_3d_conformer, kabsch_align, find_mcs_mapping

# ez_validator/ez_executor.py (G10)
from mechanism_search import (
    extract_pdb_residue_fragment,
    _compute_bond_length_from_products,
    identify_reaction_center_atom_maps,
    mol_to_atom_coords,
    _euclidean_distance,
    RESIDUE_SIDECHAIN_SMILES,
)
from arrow_transform import _apply_single_arrow_safe, parse_reaction_to_arrows
```

#### Day 1-2 需要提取+封装

```python
# 从 mechanism_search.py 提取 _build_am_to_3d_coord 中的核心逻辑
# 去掉 PredictionRunState 依赖，改为函数式API
# 原: _build_am_to_3d_coord(run_state, coords_cache, ...)
# 新: build_3d_coords_from_pdb(mol_list, pdb_text, ligand_mappings, residues, ...)
#     → 返回 Dict[int, Point3D]  (am_to_3d_coord)

# 从 mechanism_search.py 提取 _mcs_align_and_mmff
# 原: 嵌套在 _build_am_to_3d_coord 内部
# 新: mcs_align_and_mmff_optimize(target_mol, frag_mol, min_mcs_atoms=1) → bool
```

#### Day 2-3 需要适配增强

```python
# G1: compute_ligand_distances() → compute_active_atom_distances()
# 原: 计算配体到残基几何中心距离
# 新: 计算配体反应原子到残基活性原子距离
#   - 活性原子: 用 SMARTS 匹配 (OG for SER, SG for CYS, NE2/ND1 for HIS)
#   - 反应原子: 用 ligand_reactive_atom_smarts 匹配

# G3: overlay_smiles_to_pdb() 反向使用
# 原: SMILES → PDB位置 (为3D显示)
# 新: PAP放置坐标 → 验证管线 (注入为"虚拟配体坐标")
```

### 8.6 推荐实施顺序 (考虑复用)

```
Day 1: 基础设施
  ├─ 创建 ez_validator/ 目录结构
  ├─ G5 验证结果格式 (80行, 无依赖, 纯数据结构)
  └─ G13 配体Mol构建 (0行新写! 直接import parse_pdb_ligand_atoms)
     → MVP: 薄封装 parse_pdb_ligand_atoms + _lookup_pdbechem

Day 2: 场景判定 + PDB定位
  ├─ G6+G16 场景判定+降级 (~90行, 大量调用pdb_handler)
  └─ G8 PDB定位 (~80行, 大量调用pdb_handler + ligand_compare)

Day 3: 规则映射 + 角度计算
  ├─ G7 规则映射 (~50行, 调用shared.load_rules)
  └─ G2 角度计算 (~170行, MVP用距离近似代替A2角度)

Day 4-5: Scene A 验证 + EZ执行
  ├─ G1 Scene A验证 (~250行, 组合多个模块)
  ├─ 提取 _build_am_to_3d_coord → build_3d_coords_from_pdb
  └─ G10 EZ执行循环 (~120行, 核心! 调用最多)

Day 6: 中间体构象 + PAP回流
  ├─ G12 中间体3D构象 (~100行, 调用generate_3d_conformer+kabsch_align)
  └─ G3 PAP→EZ回流 (~60行, 适配overlay逻辑)

Day 7-8: 评分 + 编排 + 置信度
  ├─ G4 S_geo组合 (~100行)
  ├─ G11 置信度 (~150行)
  └─ G14 管线编排 (~300行)
```

**总计: ~8天完成G1-G16 MVP (原估24天, 节省67%)**

---

## 9. AI 完成时间估算

### 9.1 逐 Phase AI 估算 (含复用修正)

| Phase | 人力估算 | 复用后人力 | AI 估算 | 压缩比 | 瓶颈 |
|-------|---------|----------|---------|--------|------|
| Phase 0 | 5天 | 5天 | 0.5-1天 | 5-10x | 网络等待 |
| Phase 1 | 17.5天 | 17.5天 | 3-5天 | 4-5x | M-CSA限速 |
| Phase 2 | 33天 | 33天 | 5-8天 | 4-6x | PAP验证迭代 |
| **Phase 2.5** | **14.5天** | **10天** | **2-3天** | **3-5x** | G10执行循环调试 |
| Phase 3 | 10天 | 10天 | 2-3天 | 3-5x | 规则映射逻辑 |
| Phase 4 | 7天 | 7天 | 1-2天 | 4-7x | 纯数学 |
| Phase 5 | 19.5天 | 19天 | 3-4天 | 5-6x | Prompt工程 |
| **Phase 5.5** | **6天** | **5.5天** | **1.5-2天** | **3x** | 氧化还原领域知识 |
| Phase 6 | 10天 | 10天 | 2-4天 | 3-5x | UI集成 |
| Phase 7 | 10天 | 10天 | 1-2天 | 5-10x | 实验运行 |
| **总计** | **132.5天** | **127天** | **21-34天** | **~4-6x** | |

### 9.2 场景化估算

| 场景 | AI 时间 | 包含内容 |
|------|---------|---------|
| **核心管线可运行** | 3-4周 | Phase 0→2→2.5→4 (DS1-5 + EZ验证 + CGPS) |
| **完整功能** | 5-6周 | +Phase 1辅助文件 + Phase 3 + Phase 5 Agent |
| **含氧化还原+UI** | 7-8周 | +Phase 5.5 + Phase 6 |
| **含验证+论文** | 9-10周 | +Phase 7 |
| **悲观 (调参+意外)** | 11-12周 | TM-align + PAP精度 + 氧化还原 |

---

## 10. 实施优先级与 MVP 策略

### 10.1 前置三件套 (必须最先解决)

```
优先级 1: G6+G16 场景判定+降级 (1天)
  没有它，系统不知道走 Scene A/B/C
  → 写完后立刻可做端到端测试 (哪怕只测 Scene C)

优先级 2: G8 PDB定位 (0.6天, 复用后!)
  没有它，Scene A/B 无法启动
  → pdb_handler.py 已实现80%，薄封装即可

优先级 3: G10 EZ执行循环 (1天, 复用后!)
  没有它，SMARTS规则只是数据，不能执行验证
  → mechanism_search.py 已有完整闭环，需提取+适配
```

### 10.2 MVP 三级递进策略 (含复用修正)

```
MVP v1: Scene C demo (2-3天, 原估3-4天)
  G6+G5+G11(Scene C部分)+Phase 4 CGPS
  → 用户输入→MechFind→CGPS评分→排序输出

MVP v2: Scene A 单候选 demo (5-6天, 原估7-8天)
  +G8(0.6d)+G13(0.3d)+G1(1.5d)+G2(1.5d MVP, A2近似)
  → 有PDB+配体的酶可以做3D验证

MVP v3: 端到端完整 demo (8-10天, 原估12-14天)
  +G10(1d)+G12(1d)+G7(0.25d)+G14(2d)+G4(0.5d)
  → Top-N候选完整验证+排序
```

### 10.3 建议执行顺序

```
第1周:  G6+G16 → G8 → G5 → G13(MVP)
        (前置+无依赖模块, 2.4天)

第2周:  G2 → G7 → G1
        (角度计算+规则映射+Scene A验证, 3.25天)

第3周:  G10 → G12 → G3
        (EZ执行循环+中间体构象+PAP回流, 2.5天)
        ← 此刻核心管线端到端可运行

第4-5周: G4 → G11 → G14
        (评分+置信度+编排, 3.5天)
        ← 完整 Phase 2.5

第5-8周: Phase 0-2 (CGD数据构建)
        (可与上面并行, 利用AI并发能力)

第8-9周: Phase 3-4 (DS5+CGPS)

第9-12周: Phase 5+5.5 (Agent+氧化还原)

第12-14周: Phase 6-7 (集成+验证)
```

---

*文档结束。本审计整合了 GAP_AUDIT_G1-G11(缺口描述) + CODE_REUSE_AUDIT(代码复用分析) + G12-G16(新增缺口) + G17(样本量缺口)，形成 G1-G17 统一视图。核心发现：(1) G13 MVP 已有完整实现，0天新写；(2) G8 和 G10 是复用收益最大的缺口，节省率68%和60%；(3) 关键路径从10.5天缩减至5.1天；(4) Phase 2.5 从14.5天缩减至10天；(5) **G17 样本量缺口为数据构建层结构性风险，推荐层级化设计(Level 0粗粒度+Level 1细粒度+运行时降级)，总工期增加1天**。*
