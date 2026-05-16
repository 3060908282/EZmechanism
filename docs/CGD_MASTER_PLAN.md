# CGD (Catalytic Geometry Database) 统计数据库建设完整方案

> **版本**: v3.3 (v3.2+代码复用审计版)  
> **日期**: 2026-03-09  
> **状态**: v3.2 审计后修正 + 代码复用审计整合 — 同步IMPLEMENTATION_PLAN v3.4的代码复用结论  

---

## 目录

1. [系统总体架构](#1-系统总体架构)
2. [五个数据集定义](#2-五个数据集定义)
3. [三个辅助文件](#3-三个辅助文件)
4. [八个核心问题的最终方案](#4-八个核心问题的最终方案)
5. [分阶段实施计划](#5-分阶段实施计划)
6. [工作量估算与时间线](#6-工作量估算与时间线)
7. [代码复用审计结论](#7-代码复用审计结论)
8. [验证策略](#8-验证策略)
9. [风险与应对](#9-风险与应对)
10. [附录](#10-附录)

---

## 1. 系统总体架构

### 1.1 双层验证管线

```
输入: 酶反应 (EC / SMILES / 序列)
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  MechFind (MILP 化学路径搜索)                        │
│  输出: 候选催化机制 (规则序列 + 涉及残基类型)          │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  EzMechanism (SMARTS 规则执行 + 3D 验证)             │
│                                                       │
│  Layer 1: EZ 3D 精确验证 (有 PDB 结构时)              │
│    ├─ 有配体 (Scene A): 直接计算残基-配体距离/角度     │
│    └─ 无配体 (Scene B): overlay 配体 → 计算距离/角度   │
│                                                       │
│  Layer 2: CGPS 统计评分 (无 PDB 结构时)               │
│    ├─ S_co  = 残基共现合理性 (← DS1)                  │
│    ├─ S_geo = 几何距离合理性 (← DS2 + DS3)            │
│    └─ S_path = 路径连贯性 (← DS5)                     │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
输出: 排序后的候选机制 + 评分 + 置信度
```

### 1.2 CGD 在系统中的角色

CGD 是 **Layer 2 (CGPS)** 的数据基础。当目标酶没有可用的 PDB 结构时，CGPS 通过统计先验评估 MechFind/EzMechanism 输出的催化机制是否"合理"——残基共现模式是否常见、残基间距是否符合统计分布、残基-配体距离是否在已知范围内、机制路径是否与已知机制匹配。

### 1.3 场景分类

| 场景 | PDB 状态 | 可用数据 | CGPS 评分方式 |
|------|----------|----------|---------------|
| Scene A | 有 PDB + 有配体 | 残基坐标 + 配体坐标 | DS1 + DS2 + DS3 + DS4 + DS5 |
| Scene B | 有 PDB + 无配体 | 残基坐标 + 口袋锚定配体 | DS1 + DS2(先验验证) + DS3(口袋锚定+初版筛选) + DS4 + DS5 |
| Scene C | 无 PDB | 仅序列/同源模型 | DS1 + DS4 + DS5 (无几何评分) |

---

## 2. 五个数据集定义

### 2.1 DS1: 残基共现频率矩阵

**目的**: 统计催化残基角色的共现模式，评估机制中残基组合的合理性。

| 字段 | 类型 | 说明 | 来源 |
|------|------|------|------|
| `role_pair` | string | 角色对 (如 "nucleophile-base") | M-CSA API: residues[].roles |
| `residue_type_pair` | string | 残基类型对 (如 "SER-GLU") | M-CSA API: residues[].residue_chains[].code |
| `ec_class` | string | EC 一级分类 (1-6) | M-CSA API: all_ecs |
| `count` | int | 共现次数 | 聚合计数 |
| `frequency` | float | 在该角色对中的频率 | count / role_pair_total |
| `n_entries` | int | 贡献的 M-CSA 条目数 | 去重计数 |

**聚合方式**: 以 M-CSA entry 为单位，对每对催化残基提取 (角色对, 残基类型对)，计数后计算频率。

**场景覆盖**: Scene A / B / C 均可统计（不依赖 PDB 坐标）。

**数据来源**: M-CSA API (1003 entries)，纯 API 解析，完全自动化。

---

### 2.2 DS2: 残基-残基距离分布

**目的**: 统计催化残基间的几何距离分布，为 S_geo 提供统计先验。

| 字段 | 类型 | 说明 | 来源 |
|------|------|------|------|
| `role_pair` | string | 角色对 (如 "nucleophile-base") | M-CSA API |
| `residue_type_pair` | string | 残基类型对 (如 "SER-GLU") | M-CSA API |
| `active_atom_pair` | string | 活性原子对 (如 "OG-OE2") | active_atom_definitions |
| `distance_values` | float[] | 所有观测距离 | PDB ATOM 解析 |
| `n_obs` | int | 观测数 | len(distance_values) |
| `p5` | float | 第5百分位 | 统计计算 |
| `p25` | float | 第25百分位 | 统计计算 |
| `p50` | float | 中位数 | 统计计算 |
| `p75` | float | 第75百分位 | 统计计算 |
| `p95` | float | 第95百分位 | 统计计算 |
| `mean` | float | 均值 | 统计计算 |
| `std` | float | 标准差 | 统计计算 |
| `source_type` | string | "direct" / "homolog" | 来源标注 |
| `pdb_ids` | string[] | 贡献的 PDB ID 列表 | 来源追踪 |

**聚合方式**: 
1. 从 M-CSA API 获取每个 entry 的催化残基列表及角色
2. 查 `active_atom_definitions` 获取每个 (残基类型, 角色) 对应的活性原子名
3. 从 PDB 文件中提取活性原子坐标
4. 计算所有残基对的活性原子间欧几里得距离
5. 按 (role_pair, residue_type_pair) 分组统计

**场景覆盖**: 
- Scene A: 直接从 PDB 计算 (source_type="direct")
- Scene B: 直接从 PDB 计算 (无配体不影响残基-残基距离) (source_type="direct")
- 同源替代: 仅当原 PDB 分辨率 > 2.5Å 或残基缺失时考虑 (source_type="homolog")

**关键约束**: 仅使用分辨率 ≤ 2.5Å 的 PDB 结构。

---

### 2.3 DS3: 残基-配体距离分布

**目的**: 统计催化残基到配体反应中心的距离分布，为 S_geo 的残基-配体维度提供统计先验。

#### 2.3.1 距离类别 (6 类)

| 类别 | 角色对 | 活性原子→配体原子 | 物理含义 |
|------|--------|-------------------|----------|
| D1 | nucleophile → electrophilic_C | 亲核原子 → 亲电碳 | 亲核进攻距离 |
| D2 | proton_donor → proton_acceptor | 供氢原子 → 受氢原子 | 质子转移距离 |
| D3 | electrostatic_stabiliser → charge_center | 带电原子 → 电荷中心 | 静电稳定化距离 |
| D4 | activator → activated_atom | 激活原子 → 被激活原子 | 激活距离 |
| D5 | general_base → proton_source | 碱性原子 → 质子供体 | 碱催化距离 |
| D6 | hydrogen_bond_donor/acceptor → H_bond_partner | 氢键原子 → 氢键伙伴 | 氢键距离 |

#### 2.3.2 角度类别 (3 类)

| 类别 | 角度定义 | 物理含义 |
|------|----------|----------|
| A1 | Bürgi-Dunitz: nucleophile → C=O 碳 → C=O 氧 | 亲核进攻角度 (~107°) |
| A2 | 质子转移: donor-H → acceptor → 活性原子 | 质子转移角度 (~180°) |
| A3 | 离去基团: C → leaving_group → leaving_atom | 离去基团角度 |

#### 2.3.3 数据字段

| 字段 | 类型 | 说明 | 来源 |
|------|------|------|------|
| `role` | string | 残基角色 | M-CSA API |
| `residue_type` | string | 残基类型 | M-CSA API |
| `active_atom` | string | 活性原子名 | active_atom_definitions |
| `distance_category` | string | D1-D6 / A1-A3 | 角色映射 |
| `distance_values` | float[] | 所有观测值 | PDB 计算 |
| `n_obs` | int | 观测数 | 计数 |
| `p5`~`p95`, `mean`, `std` | float | 统计量 | 统计计算 |
| `source_type` | string | "direct" / "homolog" / "overlay" | 来源标注 |
| `confidence` | string | "High" / "Medium" / "Low" | 置信度 |
| `ligand_het_code` | string | 配体 HET 代码 | PDB |
| `ligand_classification` | string | "substrate" / "cofactor" / "excluded" | PDBe API + M-CSA |

**聚合方式**:
- **Scene A** (PDB+配体): 直接从 PDB 提取残基活性原子和配体反应中心原子坐标，计算距离/角度
- **Scene B** (PDB无配体): 用同源替代 (详见问题3) 或 口袋锚定放置 (详见问题7) 获取配体坐标
- **同源替代**: 使用满足严格条件的同源结构

---

### 2.4 DS4: 辅因子共现频率矩阵

**目的**: 统计催化残基角色与辅因子的共现模式，评估机制中辅因子需求的合理性。

| 字段 | 类型 | 说明 | 来源 |
|------|------|------|------|
| `role` | string | 残基角色 | M-CSA API |
| `residue_type` | string | 残基类型 | M-CSA API |
| `cofactor_type` | string | 辅因子类型 | M-CSA API: cofactors |
| `cofactor_chebi` | string | 辅因子 ChEBI ID | M-CSA API |
| `count` | int | 共现次数 | 聚合计数 |
| `frequency` | float | 频率 | count / total |
| `ec_class` | string | EC 一级分类 | M-CSA API |

**聚合方式**: 以 M-CSA entry 为单位，对每个催化残基提取 (角色, 残基类型, 辅因子类型)，计数后计算频率。

**场景覆盖**: Scene A / B / C 均可统计（不依赖 PDB 坐标）。

**辅因子识别**: 通过 M-CSA API 的 cofactors 字段 + PDBe API 的 HET↔ChEBI 映射进行权威分类。

---

### 2.5 DS5: 规则交叉映射统计

**目的**: 建立 MechFind 规则与 EzMechanism SMARTS 规则的映射关系，评估路径连贯性。

| 字段 | 类型 | 说明 | 来源 |
|------|------|------|------|
| `mechfind_rule_id` | string | MechFind 规则 ID (如 "2_2_1") | Unique_Rules_1.csv |
| `ez_smarts_pattern` | string | EzMechanism 对应的 SMARTS | EzMechanism 规则库 |
| `mcsa_id` | string | M-CSA 条目 ID | 规则关联 |
| `reaction_type` | string | 反应类型分类 | MechFind 分类 |
| `mapped_frequency` | int | 该映射在 M-CSA 中出现的次数 | 统计 |
| `confidence` | string | "exact" / "partial" / "unmapped" | 映射质量 |

**聚合方式**: 
1. 从 MechFind 的 `Unique_Rules_1.csv` 提取所有规则及其关联的 M-CSA ID
2. 从 M-CSA API 获取对应条目的机制步骤
3. 尝试将 MechFind 规则与 EzMechanism SMARTS 规则匹配
4. 按 (mechfind_rule_id, ez_smarts_pattern) 统计映射频率

---

## 3. 三个辅助文件

### 3.1 active_atom_definitions.json

**目的**: 定义 (残基类型, 角色) → 活性原子名 的映射，是 DS2/DS3 计算的查询表。

**结构**:
```json
{
  "SER+nucleophile": {
    "atom_name": "OG",
    "atom_type": "O",
    "rationale": "Serine hydroxyl oxygen performs nucleophilic attack"
  },
  "SER+proton_donor": {
    "atom_name": "OG",
    "atom_type": "O",
    "rationale": "Serine hydroxyl donates proton"
  },
  "GLU+proton_acceptor": {
    "atom_name": "OE2",
    "atom_type": "O",
    "rationale": "Glutamate carboxylate accepts proton; OE2 is typically the accepting oxygen"
  },
  "GLU+general_base": {
    "atom_name": "OE2",
    "atom_type": "O",
    "rationale": "Glutamate acts as general base via carboxylate oxygen"
  },
  "LYS+proton_shuttle": {
    "atom_name": "NZ",
    "atom_type": "N",
    "rationale": "Lysine amino group shuttles protons"
  },
  "HIS+proton_acceptor": {
    "atom_name": "NE2",
    "atom_type": "N",
    "rationale": "Histidine imidazole NE2 accepts proton"
  },
  "HIS+proton_donor": {
    "atom_name": "ND1",
    "atom_type": "N",
    "rationale": "Histidine imidazole ND1 donates proton"
  },
  "ASP+proton_acceptor": {
    "atom_name": "OD2",
    "atom_type": "O",
    "rationale": "Aspartate carboxylate accepts proton"
  },
  "CYS+nucleophile": {
    "atom_name": "SG",
    "atom_type": "S",
    "rationale": "Cysteine thiolate performs nucleophilic attack"
  },
  "ALA+oxyanion_hole": {
    "atom_name": "N",
    "atom_type": "N",
    "rationale": "Main-chain nitrogen stabilizes oxyanion",
    "function_location": "main-N"
  },
  "GLY+oxyanion_hole": {
    "atom_name": "N",
    "atom_type": "N",
    "rationale": "Main-chain nitrogen stabilizes oxyanion",
    "function_location": "main-N"
  },
  "WAT+proton_shuttle": {
    "atom_name": "O",
    "atom_type": "O",
    "rationale": "Catalytic water shuttles protons"
  }
}
```

**规模**: 约 40-50 条规则 (20种残基 × 平均 2-3 种角色)

**function_location 处理**: M-CSA API 提供 `function_location_abv` 字段，当值为 "main-N" 或 "main-O" 时，活性原子为主链氮或主链氧，而非侧链原子。

**工作量**: 约 1 天 (手写 + 交叉验证 M-CSA 数据)

---

### 3.2 HET_to_ChEBI_mapping.json

**目的**: 建立 PDB HET 代码 → ChEBI ID → 分类 (substrate/cofactor/excluded) 的映射，用于 DS3/DS4 的配体分类。

**结构**:
```json
{
  "NAG": {
    "chebi_id": "50681",
    "chebi_name": "N-acetyl-D-glucosamine",
    "classification": "excluded",
    "classification_reason": "Glycosylation artifact"
  },
  "PLP": {
    "chebi_id": "18405",
    "chebi_name": "pyridoxal 5'-phosphate",
    "classification": "cofactor",
    "classification_reason": "M-CSA cofactor whitelist + PDBe annotation"
  },
  "BZG": {
    "chebi_id": "16716",
    "chebi_name": "benzylpenicillin",
    "classification": "substrate",
    "classification_reason": "M-CSA reactant ChEBI match"
  }
}
```

**分类策略 (三级权威来源)**:

| 优先级 | 来源 | 判定规则 |
|--------|------|----------|
| 1 | M-CSA API compounds | HET 的 ChEBI ID 匹配 M-CSA 条目的 reactant ChEBI → **substrate** |
| 2 | M-CSA API cofactors | HET 的 ChEBI ID 匹配 M-CSA 条目的 cofactor 字段 → **cofactor** |
| 3 | PDBe API 化合物注释 | 查询 PDBe API 获取 HET 的 ChEBI + 功能注释 → 辅助判定 |
| 4 | 辅因子白名单 | PLP, NAD, NADP, FAD, FMN, TPP, THF, SAM, CoA, biotin, heme → **cofactor** |
| 5 | 排除白名单 | NAG, MAN, BMA, ZN, MG, CA, CL 等非催化配体 → **excluded** |
| 6 | 默认 | 无法判定的 → **excluded** (宁可漏不可错) |

**规模**: 约 200-300 个 HET 代码 (M-CSA 涉及的 PDB 中的配体)

**工作量**: 约 2-3 天 (PDBe API 批量查询 + M-CSA 匹配 + 白名单整理)

---

### 3.3 ligand_reactive_atom_smarts.json

**目的**: 定义不同反应上下文中配体反应中心原子的 SMARTS 匹配模式，用于 DS3 中识别配体的反应原子。

**结构**:
```json
{
  "nucleophile→electrophilic_C": {
    "description": "Nucleophilic attack target atoms",
    "patterns": [
      {
        "id": "beta_lactam_C",
        "smarts": "[CX3;r4](=[OX1])",
        "context_keywords": ["beta-lactam", "penicillin", "cephalosporin"],
        "keyword_priority": 1,
        "comment": "4-membered ring carbonyl carbon"
      },
      {
        "id": "gamma_lactam_C",
        "smarts": "[CX3;r5](=[OX1])",
        "context_keywords": ["gamma-lactam", "pyrrolidinone"],
        "keyword_priority": 2,
        "comment": "5-membered ring carbonyl carbon"
      },
      {
        "id": "delta_lactam_C",
        "smarts": "[CX3;r6](=[OX1])",
        "context_keywords": ["delta-lactam", "caprolactam"],
        "keyword_priority": 3,
        "comment": "6-membered ring carbonyl carbon"
      },
      {
        "id": "phospho_P",
        "smarts": "[PX4](=[OX1])",
        "context_keywords": ["phospho", "phosphate", "kinase"],
        "keyword_priority": 1,
        "comment": "Phosphoryl phosphorus"
      },
      {
        "id": "glycosidic_C",
        "smarts": "[CX3;r5;r6]([OX2,NX3])[OX2,NX3]",
        "context_keywords": ["glycosidic", "glycoside", "glycosyl"],
        "keyword_priority": 1,
        "comment": "Glycosidic carbon"
      },
      {
        "id": "amide_C",
        "smarts": "[CX3](=[OX1])[NX3]",
        "context_keywords": ["amide", "peptide", "hydrolysis"],
        "keyword_priority": 5,
        "comment": "Amide carbonyl carbon"
      },
      {
        "id": "ester_C",
        "smarts": "[CX3](=[OX1])[OX2]",
        "context_keywords": ["ester", "esterase", "lipase"],
        "keyword_priority": 5,
        "comment": "Ester carbonyl carbon"
      },
      {
        "id": "thioester_C",
        "smarts": "[CX3](=[OX1])[SX2]",
        "context_keywords": ["thioester", "acyl-CoA"],
        "keyword_priority": 4,
        "comment": "Thioester carbonyl carbon"
      },
      {
        "id": "imine_C",
        "smarts": "[CX3]=[NX2]",
        "context_keywords": ["imine", "Schiff base", "aldimine"],
        "keyword_priority": 6,
        "comment": "Imine carbon"
      },
      {
        "id": "generic_carbonyl_C",
        "smarts": "[CX3](=[OX1])",
        "context_keywords": ["carbonyl"],
        "keyword_priority": 10,
        "comment": "Generic carbonyl carbon (lowest priority fallback)"
      }
    ]
  },
  "proton_donor→proton_acceptor": {
    "description": "Proton transfer target atoms",
    "patterns": [
      {
        "id": "alcohol_O",
        "smarts": "[OX2H]",
        "context_keywords": ["alcohol", "hydroxyl"],
        "keyword_priority": 5
      },
      {
        "id": "amine_N",
        "smarts": "[NX3H]",
        "context_keywords": ["amine", "amino"],
        "keyword_priority": 5
      },
      {
        "id": "thiol_S",
        "smarts": "[SX2H]",
        "context_keywords": ["thiol", "cysteine"],
        "keyword_priority": 5
      }
    ]
  },
  "electrostatic_stabiliser→charge_center": {
    "description": "Electrostatic stabilization target atoms",
    "patterns": [
      {
        "id": "carboxylate_O",
        "smarts": "[OX1-]",
        "context_keywords": ["carboxylate", "anion"],
        "keyword_priority": 5
      },
      {
        "id": "ammonium_N",
        "smarts": "[NX4+]",
        "context_keywords": ["ammonium", "cation"],
        "keyword_priority": 5
      }
    ]
  }
}
```

**解析流程 (三层策略)**:

```
Step 1: 关键词优先级匹配
  ├─ 解析 M-CSA steps[].description 文本
  ├─ 匹配 context_keywords
  ├─ 按最低 keyword_priority 选择最特异的 SMARTS
  └─ 预计覆盖率 ~85%

Step 2: 通用模式回退
  ├─ 无关键词匹配时使用 generic 模式
  └─ 如 nucleophile→electrophilic_C 回退到 [CX3](=[OX1])

Step 3: 统计消歧 (Phase 3 启动条件: ≥50 个同类型样本)
  ├─ 多个 SMARTS 匹配时，计算各匹配位点到残基活性原子的距离
  ├─ 与 DS3 历史数据的 P50 比较
  └─ 选择最接近 P50 的匹配位置
```

**规模**: 约 20-30 个模式 (覆盖 6 个距离类别 + 3 个角度类别)

**工作量**: 约 1-2 天 (手写 + 测试常见配体匹配)

---

## 4. 八个核心问题的最终方案

### 问题 1: 步骤级角色分配

**问题**: M-CSA API 返回每个残基的所有角色列表，但未明确标注每个角色属于哪个步骤。DS2/DS3 需要"步骤级"角色信息。

**最终方案: 取主要角色近似 (Primary Role Approximation)**

```
规则: 对每个残基，取其 roles 中 function_type="reactant" 的角色作为主要角色
      若无 reactant 类型，取 group_function 最具体的 spectator 角色
      若有多个 reactant 角色，按出现顺序取第一个
```

**评价**: 用户明确同意此方案。CGPS 使用统计分布，分布本身的宽度 (P5-P95) 足以吸收步骤级角色变化带来的误差。引入 LLM 解析步骤描述的 ROI 不高——增加复杂度但仅改善 <5% 的边缘案例。

**实施**:
```python
def get_primary_role(residue_entry):
    roles = residue_entry['roles']
    # 优先取 reactant 类型
    reactant_roles = [r for r in roles if r['function_type'] == 'reactant']
    if reactant_roles:
        return reactant_roles[0]['function']
    # 其次取 group_function 最具体的 spectator
    spectator_roles = [r for r in roles if r['function_type'] == 'spectator' and r['group_function']]
    if spectator_roles:
        return spectator_roles[0]['function']
    # 回退到第一个角色
    return roles[0]['function'] if roles else 'unknown'
```

---

### 问题 2: 催化水的识别

**问题**: M-CSA 中标注 "Water(1)" 等催化水，但 PDB 中水分子 (HOH) 数量众多，需要识别哪些是催化水。

**最终方案: 多证据评分系统**

| 维度 | 权重 | 评分标准 | 数据来源 |
|------|------|----------|----------|
| 距离合理性 | 0.25 | 水到残基活性原子距离在 2.5-3.5Å → 1.0; 3.5-4.5Å → 0.5; >4.5Å → 0 | PDB ATOM |
| 几何合理性 | 0.25 | donor-H...O 或 O...H-acceptor 角度 >150° → 1.0; 120-150° → 0.5; <120° → 0 | PDB ATOM (需添加 H) |
| B-factor/占有率 | 0.15 | B-factor < 30 且 occupancy = 1.0 → 1.0; B-factor 30-50 → 0.5; >50 → 0 | PDB ATOM |
| 同源保守性 | 0.20 | ≥3 个同源结构中同位置有水 → 1.0; 1-2 个 → 0.5; 0 个 → 0 | 同源结构叠加 |
| 化学上下文 | 0.15 | 不与金属配位 → 1.0; 与金属配位 → 0 | PDB 金属距离检查 |

**评分规则**:
```python
def score_catalytic_water(water_coord, catalytic_residues, metal_coords, homolog_waters):
    score = 0.0
    
    # 1. 距离合理性
    min_dist = min(distance(water_coord, res.active_atom_coord) for res in catalytic_residues)
    if 2.5 <= min_dist <= 3.5: score += 0.25 * 1.0
    elif 3.5 < min_dist <= 4.5: score += 0.25 * 0.5
    
    # 2. 几何合理性 (简化: 检查是否在 donor-acceptor 连线上)
    # ... angle calculation ...
    
    # 3. B-factor / occupancy
    if water.bfactor < 30 and water.occupancy == 1.0: score += 0.15 * 1.0
    elif water.bfactor < 50: score += 0.15 * 0.5
    
    # 4. 同源保守性
    n_conserved = count_conserved_waters(water_coord, homolog_waters, threshold=1.0)
    if n_conserved >= 3: score += 0.20 * 1.0
    elif n_conserved >= 1: score += 0.20 * 0.5
    
    # 5. 化学上下文 (排除金属配位水)
    min_metal_dist = min(distance(water_coord, m) for m in metal_coords) if metal_coords else 999
    if min_metal_dist > 2.5: score += 0.15 * 1.0
    
    return score

# 阈值: score ≥ 0.6 → 催化水; 0.3-0.6 → 待定; < 0.3 → 忽略
```

**工作量**: 约 2-3 天

---

### 问题 3: 同源替代 (Homolog Substitution)

**问题**: Scene B 的 PDB 没有配体，需要用同源结构 (Scene A) 的配体位置来估算残基-配体距离。

**最终方案: 严格筛选 + TM-score 分层加权**

#### 3.1 同源筛选条件 (必须全部满足)

| 条件 | 阈值 | 来源 | 理由 |
|------|------|------|------|
| 序列一致性 | ≥ 70% | RCSB Search API | 保证催化残基保守 |
| TM-score | ≥ 0.70 | TM-align 计算 | 保证拓扑等价 |
| 结构分辨率 | ≤ 2.5Å | PDB header | 保证坐标精度 |
| 配体存在 | 有底物/辅因子 | PDB + DS3分类 | 数据需求 |
| 催化残基保守 | 拓扑等价位点一致 | 序列比对 + 结构比对 | 核心前提 |

#### 3.2 TM-score 分层加权

| 层级 | TM-score | 权重 | 说明 |
|------|----------|------|------|
| High | ≥ 0.95 | w = 1.0 | 几乎相同的结构，直接使用 |
| Medium | 0.85 - 0.95 | w = TM-score | 线性衰减，质量随 TM-score 降低 |
| Low | < 0.85 | 丢弃 | 结构差异过大，不可靠 |

#### 3.3 加权聚合

```python
def weighted_aggregate(distance_observations):
    """
    distance_observations: [(distance, weight, pdb_id), ...]
    """
    weighted_values = []
    for dist, w, pdb_id in distance_observations:
        if w > 0:  # Low tier already discarded
            weighted_values.extend([dist] * round(w * 10))  # 离散化权重
    
    return compute_statistics(weighted_values)
```

**实施流程**:
```
1. 从 M-CSA 获取目标 PDB 的 UniProt ID
2. 通过 RCSB Search API 查询同源结构 (seq_identity ≥ 70%)
3. 下载候选 PDB，运行 TM-align 获取 TM-score
4. 筛选: TM-score ≥ 0.70 且 分辨率 ≤ 2.5Å 且 有配体
5. 验证催化残基保守性 (见问题6)
6. 叠加结构 (Kabsch 算法)，转换配体坐标到目标坐标系
7. 按 TM-score 分层加权聚合距离数据
```

**工作量**: 约 3-4 天 (含 RCSB API 集成 + TM-align 调用 + Kabsch 叠加)

---

### 问题 4: 配体反应原子识别

**问题**: 配体 (底物) 分子中可能有多个同类型原子 (如多个 C=O)，需要识别哪个是反应中心。

**最终方案: SMARTS + 关键词优先级 + 统计消歧 (三层策略)**

#### 第一层: SMARTS + 关键词优先级 (MVP)

```python
REACTION_CONTEXT_KEYWORDS = {
    "beta-lactam":    {"priority": 1, "smarts": "[CX3;r4](=[OX1])"},
    "gamma-lactam":   {"priority": 2, "smarts": "[CX3;r5](=[OX1])"},
    "delta-lactam":   {"priority": 3, "smarts": "[CX3;r6](=[OX1])"},
    "phospho":        {"priority": 1, "smarts": "[PX4](=[OX1])"},
    "glycosidic":     {"priority": 1, "smarts": "[CX3;r5;r6]([OX2,NX3])[OX2,NX3]"},
    "carbonyl":       {"priority": 10, "smarts": "[CX3](=[OX1])"},  # 通用，最低优先级
    "amide":          {"priority": 5, "smarts": "[CX3](=[OX1])[NX3]"},
    "ester":          {"priority": 5, "smarts": "[CX3](=[OX1])[OX2]"},
    "thioester":      {"priority": 4, "smarts": "[CX3](=[OX1])[SX2]"},
    "imine":          {"priority": 6, "smarts": "[CX3]=[NX2]"},
}

def match_reactive_atom(ligand_mol, step_description, distance_category):
    # Step 1: 从步骤描述提取关键词
    keywords = extract_keywords(step_description)
    
    # Step 2: 获取该距离类别的所有 SMARTS 模式
    patterns = ligand_reactive_atom_smarts[distance_category]["patterns"]
    
    # Step 3: 按关键词匹配和优先级排序
    matched = []
    for pattern in patterns:
        for kw in keywords:
            if kw in pattern["context_keywords"]:
                matches = ligand_mol.GetSubstructMatches(Chem.MolFromSmarts(pattern["smarts"]))
                if matches:
                    matched.append((pattern, matches, pattern["keyword_priority"]))
    
    if not matched:
        # 回退到通用模式
        generic = [p for p in patterns if p["keyword_priority"] >= 10]
        for pattern in generic:
            matches = ligand_mol.GetSubstructMatches(Chem.MolFromSmarts(pattern["smarts"]))
            if matches:
                matched.append((pattern, matches, pattern["keyword_priority"]))
    
    # Step 4: 按最低优先级 (最特异) 选择
    matched.sort(key=lambda x: x[2])
    return matched[0] if matched else None
```

**覆盖率预估**: ~85% 可通过关键词映射得到上下文相关的 SMARTS，剩余 15% 回退到通用模式。

**零额外成本**: 不增加 API 调用，实现代码约 100 行。

#### 第二层: 统计消歧 (Phase 3 启动)

当 DS3 累积 ≥50 个同类型反应样本后自动启用：
- 计算各候选匹配位点到残基活性原子的距离
- 与 DS3 历史数据的 P50 比较
- 选择最接近 P50 的匹配位置

#### 第三层: 结构推理 (可选，最低优先级)

当同源结构有配体时，通过结构叠加推断反应原子位置，作为最后的 fallback。

**工作量**: 第一层约 1-2 天；第二层在 Phase 3 实现，约 2-3 天

---

### 问题 5: 底物/辅因子/抑制剂分类

**问题**: PDB 中的配体可能是底物、辅因子或抑制剂，只有底物和辅因子的数据应纳入 DS3/DS4。

**最终方案: 权威数据源验证**

#### 分类流程

```
输入: PDB HET code + M-CSA entry ID
        │
        ▼
Step 1: 查 M-CSA API compounds
        ├─ HET 的 ChEBI 匹配 reactant → "substrate"
        └─ 不匹配 → 继续
        │
        ▼
Step 2: 查 M-CSA API cofactors
        ├─ HET 的 ChEBI 匹配 cofactor → "cofactor"
        └─ 不匹配 → 继续
        │
        ▼
Step 3: 查 PDBe API (https://www.ebi.ac.uk/pdbe/api/pdb/compound/MOLECULE/{pdb_id})
        ├─ 获取 HET 的 ChEBI + 功能注释
        └─ 辅助判定 → 继续
        │
        ▼
Step 4: 辅因子白名单
        ├─ PLP, NAD, NADP, FAD, FMN, TPP, THF, SAM, CoA, biotin, heme... → "cofactor"
        └─ 不在白名单 → 继续
        │
        ▼
Step 5: 排除白名单
        ├─ NAG, MAN, BMA, ZN, MG, CA, CL... → "excluded"
        └─ 不在白名单 → "excluded" (默认排除)
```

**核心原则**: 宁可漏 (excluded) 不可错 (把抑制剂当底物)。被排除的数据不进入 DS3/DS4，但记录在 `ligand_classification` 字段中备查。

**工作量**: 约 2-3 天 (含 PDBe API 集成 + 白名单整理)

---

### 问题 6: 同源残基保守性验证

**问题**: 同源替代中，需要确认目标结构的催化残基在同源结构中是否保守 (类型和位置)。

**最终方案: 双层验证 (序列 + 空间)**

#### Level 1: 多源序列比对验证

| 步骤 | 方法 | 容差 |
|------|------|------|
| 1a | RCSB Search API 获取序列比对 | 精确匹配 |
| 1b | PDB SEQRES 回退比对 | 精确匹配 |
| 1c | UniProt 序列锚定 + M-CSA 序列片段双重锚定 | 精确匹配 |
| 1d | 允许保守替换 (Asp↔Glu, Ser↔Thr, Ile↔Leu↔Val 等) | 保守替换组内允许 |

**保守替换组**:
```python
CONSERVATIVE_SUBSTITUTIONS = {
    'acidic': {'D', 'E'},
    'basic': {'K', 'R', 'H'},
    'hydroxyl': {'S', 'T'},
    'small_hydrophobic': {'A', 'G', 'V'},
    'medium_hydrophobic': {'I', 'L', 'V', 'M'},
    'aromatic': {'F', 'Y', 'W'},
    'thiol': {'C'},
    'amide': {'N', 'Q'},
}
```

**判定规则**: 同源结构中，对应位点的残基类型必须与目标相同，或在同一保守替换组内。否则该残基对该同源结构的贡献标记为 "unconserved"，不参与距离计算。

#### Level 2: 活性原子空间验证

```python
def verify_active_atom_spatial(ref_coord, homolog_coord, active_atom_name):
    """
    通过结构叠加后，检查活性原子在空间上是否保守
    """
    dist = euclidean_distance(ref_coord, homolog_coord)
    
    if dist < 1.0:
        return {'conserved': True, 'weight': 1.0, 'tier': 'High'}
    elif dist < 2.5:
        return {'conserved': True, 'weight': 0.75, 'tier': 'Medium'}
    else:
        return {'conserved': False, 'weight': 0.0, 'tier': 'Discard'}
```

**综合判定**: 残基必须同时通过 Level 1 和 Level 2 才纳入统计。Level 2 的权重与问题3的 TM-score 权重相乘得到最终权重。

**工作量**: 约 2-3 天 (含序列比对 + 结构叠加 + 空间验证)

---

### 问题 7: Overlay 不确定性处理

**问题**: Scene B 的 PDB 无配体，需将底物放置到活性位点中。由于没有参照配体，传统的 MCS+Kabsch 叠加不可用，需要新的放置策略和置信度评估。

**最终方案: 口袋锚定放置 (PAP) + DS3 初版筛选 + 结构化置信度 (分阶段)**

> **v2.0 重要修正**: 原方案使用 DS2 距离约束 + bounds matrix，存在两个问题：  
> (1) RDKit bounds matrix API 极其不稳定，代码风险高  
> (2) Scene B 无参照配体，MCS+Kabsch 不可用  
> 新方案改用"口袋锚定放置 + DS3初版筛选"，物理意义更明确，代码更简洁。

#### Phase 1: 无约束口袋锚定 (DS3 Scene A 完成前)

使用 ETKDGv3 生成底物构象，以催化残基活性原子几何中心为锚点放置，不做 DS3 阈值筛选。

```python
def pocket_anchored_overlay_v0(smiles, pdb_structure, catalytic_residues, 
                                active_atom_defs, ligand_reactive_smarts,
                                distance_category="nucleophile→electrophilic_C"):
    """
    Scene B 口袋锚定放置 (无DS3筛选版)
    策略: 活性原子质心 → 锚定反应原子 → 旋转采样 → 选最近残基的放置
    
    Args:
        distance_category: 距离类别 (D1-D6), 从 catalytic_residues 的角色推导，
                          如 nucleophile 残基 → "nucleophile→electrophilic_C"
    """
    mol = Chem.MolFromSmiles(smiles)
    mol = Chem.AddHs(mol)
    
    # Step 1: 计算口袋锚点 (催化残基活性原子加权质心)
    anchor, _ = calculate_pocket_anchor(pdb_structure, catalytic_residues, active_atom_defs)
    
    # Step 2: 生成底物构象
    conformers = AllChem.EmbedMultipleConfs(mol, numConfs=100, params=ETKDGv3())
    
    # Step 3: 识别底物反应原子
    reactive_atom_idx = identify_reactive_atom(mol, distance_category, ligand_reactive_smarts)
    
    # Step 4: 锚定 + 旋转采样
    candidates = []
    for conf_id in conformers:
        conf = mol.GetConformer(conf_id)
        reactive_coord = np.array(conf.GetAtomPosition(reactive_atom_idx))
        translation = anchor - reactive_coord  # 平移使反应原子对齐锚点
        
        for rotation in fibonacci_sphere_samples(n=50):
            placed_coords = apply_rigid_transform(conf, translation, rotation, anchor)
            score = distance_score(placed_coords, catalytic_residues)
            candidates.append((conf_id, rotation, score, placed_coords))
    
    # Step 5: 选得分最高 (距离最近残基活性原子的加权和最优)
    best = max(candidates, key=lambda x: x[2])
    return best
```

#### Phase 2: DS3 初版筛选 overlay (DS3 Scene A 完成后)

```python
def pocket_anchored_overlay(smiles, pdb_structure, catalytic_residues, 
                             active_atom_defs, ligand_reactive_smarts,
                             ds3_stats_scene_a, backbone_atoms,
                             distance_category="nucleophile→electrophilic_C"):
    """
    Scene B 口袋锚定放置 (DS3初版筛选)
    
    关键区别: 用 DS3 Scene A 的 P5-P95 筛选放置候选 (非 DS2)
    - DS2 验证活性位点几何合理性 (overlay 前置检查, 先验)
    - DS3 筛选配体放置位置合理性 (overlay 后验检查, 后验)
    
    Args:
        distance_category: 距离类别 (D1-D6), 从 catalytic_residues 的角色推导，
                          如 nucleophile 残基 → "nucleophile→electrophilic_C"
    """
    mol = Chem.MolFromSmiles(smiles)
    mol = Chem.AddHs(mol)
    
    # Step 0: [前置] 用 DS2 验证活性位点几何合理性
    if not validate_active_site_geometry(catalytic_residues, ds2_stats):
        return None, "Rejected", "Active site geometry implausible per DS2"
    
    # Step 1: 计算口袋锚点 (MVP: 等权质心; 后续优化: 加权质心)
    anchor, anchor_atoms = calculate_pocket_anchor(
        pdb_structure, catalytic_residues, active_atom_defs
    )
    # MVP: anchor = mean(coord_i)  (等权)
    # 优化: anchor = Σ(w_i × coord_i) / Σ(w_i), w需Scene A消融实验验证
    
    # Step 2: 生成底物构象
    conformers = AllChem.EmbedMultipleConfs(mol, numConfs=100, params=ETKDGv3())
    
    # Step 3: 识别底物反应原子
    reactive_atom_idx = identify_reactive_atom(mol, distance_category, ligand_reactive_smarts)
    
    # Step 4: 锚定 + 双自由度旋转采样
    candidates = []
    n_spin = 10  # 绕轴自旋采样数
    for conf_id in conformers:
        conf = mol.GetConformer(conf_id)
        reactive_coord = np.array(conf.GetAtomPosition(reactive_atom_idx))
        translation = anchor - reactive_coord
        
        for theta, phi in fibonacci_sphere_samples(n=50):  # 自由度1+2: 球面方向
            for psi in np.linspace(0, 2*np.pi, n_spin, endpoint=False):  # 自由度3: 绕轴自旋
                placed_coords = apply_rigid_transform(conf, translation, theta, phi, psi, anchor)
                
                # Step 5: DS3初版阈值筛选 (关键!)
                distances = compute_residue_ligand_distances(placed_coords, catalytic_residues)
                if not passes_ds3_filter(distances, ds3_stats_scene_a):
                    continue
                
                # Step 5.5: 空间碰撞过滤
                if has_clash(placed_coords, backbone_atoms, threshold=1.5):
                    continue
                
                score = ds3_score(distances, ds3_stats_scene_a)
                candidates.append((conf_id, (theta, phi, psi), score, placed_coords))
    
    # Step 6: 若通过<5个 → 增大采样
    if len(candidates) < 5:
        # 重试: 增加旋转采样至200
        candidates = retry_with_more_samples(...)
    
    if len(candidates) == 0:
        return None, "Rejected", "No placement passes DS3 filter"
    
    # Step 7: 选 Score 最高的最优放置
    best = max(candidates, key=lambda x: x[2])
    confidence = assess_confidence(candidates, ds3_stats_scene_a)
    
    return best, confidence, "OK"
```

#### 辅助函数

```python
def calculate_pocket_anchor(pdb_structure, catalytic_residues, active_atom_defs):
    """
    计算口袋锚点: 催化残基活性原子质心
    
    MVP阶段: 等权质心 (w=1.0 for all roles)
    后续优化: 加权质心 (w_nucleophile=1.5, w_base=1.2等)，需Scene A消融实验验证
    
    用活性原子(非全部侧链原子)的质心作为锚点:
    - 更精确: 直接指向催化功能位点
    - 更直接: active_atom_definitions.json 已定义活性原子
    - 物理意义: 化学反应发生位置的空间中心
    """
    coords = []
    for res in catalytic_residues:
        key = f"{res.type}+{res.primary_role}"
        atom_def = active_atom_defs.get(key)
        if atom_def:
            coord = get_atom_coord(pdb_structure, res.chain, res.resid, atom_def['atom_name'])
            coords.append(np.array(coord))
    
    anchor = sum(coords) / len(coords)  # MVP: 等权
    return anchor, coords

def fibonacci_sphere_samples(n=50):
    """Fibonacci球面均匀采样，生成n个旋转方向"""
    samples = []
    golden_ratio = (1 + 5**0.5) / 2
    for i in range(n):
        theta = np.arccos(1 - 2*(i + 0.5)/n)
        phi = 2 * np.pi * i / golden_ratio
        samples.append((theta, phi))
    return samples

def passes_ds3_filter(distances, ds3_stats):
    """
    DS3初版阈值筛选: 所有距离类别均在 P5-P95 内
    注意: 这里用 DS3 (残基-配体距离), 不是 DS2 (残基-残基距离)
    """
    for category, d in distances.items():
        stats = ds3_stats.get(category)
        if stats and (d < stats['p5'] or d > stats['p95']):
            return False
    return True

def ds3_score(distances, ds3_stats):
    """
    评分: 越接近 P50 得分越高
    Score = Σ w_d × (1 - |d_obs - d_P50| / (P95 - P5))
    
    注意: P95==P5 时 (所有观测值相同) 除零保护 → deviation=0
    """
    total = 0
    for category, d in distances.items():
        stats = ds3_stats.get(category)
        if stats:
            range_val = stats['p95'] - stats['p5']
            if range_val < 1e-6:  # 除零保护: 所有观测值相同
                deviation = 0.0
            else:
                deviation = abs(d - stats['p50']) / range_val
            total += max(0, 1 - deviation)
    return total

def validate_active_site_geometry(catalytic_residues, ds2_stats):
    """
    DS2 先验检查: 活性位点几何是否合理
    (这不是overlay筛选, 而是overlay前置验证)
    """
    for i, res_a in enumerate(catalytic_residues):
        for res_b in catalytic_residues[i+1:]:
            d = distance(res_a.active_atom_coord, res_b.active_atom_coord)
            # 规范排序 key: 确保与 DS2 存储格式一致
            key = "-".join(sorted([res_a.role, res_b.role]))
            stats = ds2_stats.get(key)
            if stats and (d < stats['p5'] or d > stats['p95']):
                return False
    return True

def has_clash(ligand_coords, backbone_atoms, threshold=1.5):
    """
    空间碰撞检测: 底物原子与蛋白质骨架原子是否重叠
    任何一对重原子距离 < threshold(Å) → 碰撞
    
    计算量: ~50个底物原子 × ~500个骨架原子 = 25,000次距离计算 (极快)
    """
    for lig_atom in ligand_coords:
        for bb_atom in backbone_atoms:
            if np.linalg.norm(lig_atom - bb_atom) < threshold:
                return True
    return False
```

#### DS2 vs DS3 在 Scene B 中的角色 (重要澄清)

| 数据集 | 物理含义 | Scene B 角色 | 使用时机 |
|--------|---------|-------------|---------|
| **DS2** | 残基-残基距离 | **先验验证**: 活性位点几何是否合理 | overlay **之前**检查 |
| **DS3** | 残基-配体距离 | **后验筛选**: 配体放置位置是否合理 | overlay **之后**筛选 |

> **常见误区**: 容易混淆为"用DS2筛选overlay构象"。实际上DS2衡量的是残基间距离，与配体放置无关。  
> DS3才是筛选配体放置的正确标准——"配体到每个催化残基的距离是否在统计范围内"。  
> DS2的作用是排除结构异常的PDB (如活性位点塌缩)，避免在不可靠结构上做overlay。

#### ⚠️ PAP 锚定导致 D1 距离退化为常数 (设计特征)

**现象**: PAP 将底物反应原子平移至口袋锚点（催化残基活性原子质心），然后绕锚点旋转。但旋转**不改变反应原子位置**（它固定在锚点），因此：

- D1 距离（nucleophile OG → substrate electrophilic C）= distance(active_atom_nucleophile, anchor)
- 此距离与构象、旋转角无关——**对 D1 维度，DS3 筛选无区分力**

**影响程度**: 中等。D1 通常是最重要的距离类别，但它在 PAP 中由锚点位置唯一确定。

**为何可以接受**:
1. 等权质心将反应原子放在催化位点"中央"，D1 距离天然在合理区间
2. 如果质心导致 D1 超出 P5-P95，说明该 PDB 的活性位点几何异常，DS2 先验检查会正确 Reject
3. 旋转采样仍然影响 D2-D6 和 A1-A3（涉及配体其他原子），有筛选价值
4. 加权质心优化（w_nucleophile=1.5）会进一步改善 D1 距离

**实现注意事项**: DS3 筛选对 D1 维度的评分应为常数 (deviation=0)，不影响候选排序。D1 的筛选功能由 DS2 先验检查和锚点计算质量保证。

#### 结构化置信度标准

| 置信度 | 判定标准 | 数据使用 |
|--------|----------|----------|
| **High** | 内部一致性高 (std < 0.5Å) **且** DS3匹配度高 (中位数在 DS3 P25-P75 内) | 直接纳入 DS3 |
| **Medium** | 内部一致性中等 (std < 1.0Å) **或** DS3匹配度中等 (中位数在 DS3 P10-P90 内) | 纳入 DS3 但标记 confidence |
| **Low** | 内部一致性差 (std ≥ 1.0Å) **且** DS3匹配度差 (中位数超出 P5-P95 但 < P99) | 纳入 DS3 但降权 |
| **Rejected** | 中位数超出 P1-P99 范围 **或** 采样失败次数 >50% | 不纳入 DS3 |

**关键依赖**: Phase 2 必须在 DS3 Scene A 完成后才能实施，因为需要 DS3 Scene A 的 P5-P95 作为筛选阈值。

**工作量**: Phase 1 约 1.5 天; Phase 2 约 3-4 天 (口袋锚定逻辑 + 双自由度旋转采样 + DS3筛选 + 碰撞检测 + 置信度评估)

---

### 问题 8: 数据质量与覆盖度

**问题**: M-CSA 数据并非完美——部分条目缺少 PDB 映射、部分 PDB 分辨率不足、部分步骤描述不完整。

**最终方案: 多维质量过滤 + 覆盖度追踪**

#### 8.1 质量过滤规则

| 维度 | 规则 | 影响 |
|------|------|------|
| PDB 分辨率 | ≤ 2.5Å → 保留; > 2.5Å → 降权; > 3.0Å → 排除 | 影响 DS2/DS3 |
| M-CSA 完整性 | 有 mechanism steps + residues + PDB 映射 → 保留; 缺失 → 排除 | 影响全部 |
| 角色标注 | 有 function_type="reactant" 角色 → 保留; 仅 interaction → 降权 | 影响 DS1/DS2/DS3 |
| 配体分类 | substrate/cofactor → 保留; excluded → 排除; 未分类 → 排除 | 影响 DS3/DS4 |
| B-factor | 原子 B-factor > 50 → 排除该原子 | 影响 DS2/DS3 |

#### 8.2 覆盖度追踪

对每个数据集，记录以下覆盖度指标：

```python
coverage_report = {
    "total_mcsa_entries": 1003,
    "entries_with_pdb": 850,      # ~85%
    "entries_with_ligand": 400,   # ~40% (Scene A)
    "entries_scene_b": 450,       # ~45% (Scene B, 可用 PAP放置 或 homolog)
    "entries_scene_c": 153,       # ~15% (仅 DS1/DS4/DS5)
    "ds1_coverage": 0.95,         # DS1 几乎覆盖所有条目
    "ds2_coverage": 0.85,         # DS2 需 PDB 坐标
    "ds3_coverage": 0.60,         # DS3 需配体，覆盖最低
    "ds4_coverage": 0.70,         # DS4 需辅因子标注
    "ds5_coverage": 0.50,         # DS5 取决于规则映射难度
}
```

#### 8.3 样本量阈值

| 数据集 | 最少样本量 | 说明 |
|--------|-----------|------|
| DS1 | 10 per role_pair | 共现频率需要至少 10 个观测才可靠 |
| DS2 | 20 per (role_pair, residue_type_pair) | 距离分布需要 20+ 观测 |
| DS3 | 30 per distance_category | 配体距离分布更分散，需要更多样本 |
| DS4 | 10 per (role, cofactor_type) | 辅因子共现 |
| DS5 | 5 per rule_mapping | 规则映射 |

低于阈值的分组标记为 "low_sample_size"，在 CGPS 评分时降权或标注低置信度。

**工作量**: 约 1-2 天 (质量过滤 + 覆盖度报告生成)

---

## 5. 分阶段实施计划

### Phase 1: 基础建设 (Week 1-3)

**目标**: 完成 DS1 + DS2 的全自动构建 + 3 个辅助文件

| 任务 | 工作量 | 依赖 | 产出 |
|------|--------|------|------|
| 1.1 M-CSA API 批量爬取 | 2 天 | 无 | 全部 1003 entries 的 JSON |
| 1.2 active_atom_definitions.json | 1 天 | 无 | ~45 条规则 |
| 1.3 DS1 构建 (残基共现) | 2 天 | 1.1, 1.2 | DS1 数据集 |
| 1.4 PDB 批量下载 + 解析 | 2 天 | 无 | PDB 解析管线 |
| 1.5 DS2 构建 (残基距离) | 3 天 | 1.1, 1.2, 1.4 | DS2 数据集 |
| 1.6 HET_to_ChEBI_mapping.json | 2 天 | 1.1 | ~250 条映射 |
| 1.7 ligand_reactive_atom_smarts.json | 1 天 | 无 | ~25 个模式 |
| 1.8 数据质量过滤 + 覆盖度报告 | 1 天 | 1.3, 1.5 | 质量报告 |

**Phase 1 里程碑**: DS1 + DS2 完整可用，DS2 的 P5-P95 统计量可用于 Phase 2 的活性位点先验验证。

---

### Phase 2: 配体数据构建 (Week 5-8)

**目标**: 完成 DS3 + DS4，引入 PAP 和同源替代

| 任务 | 工作量 | 依赖 | 产出 |
|------|--------|------|------|
| 2.1 催化水识别系统 | 2 天 | 1.5 | 评分模块 |
| 2.2 Scene A DS3 构建 (直接计算) | 3 天 | 1.2, 1.6, 1.7, 2.1 | Scene A DS3 |
| 2.3 同源替代管线 | 4 天 | 1.5, 问题3方案 | 同源查找+叠加模块 |
| 2.4 同源残基保守性验证 | 2 天 | 2.3 | 双层验证模块 |
| 2.5 底物/辅因子权威分类 | 2 天 | 1.6, PDBe API | 分类模块 |
| 2.6 Scene B DS3 构建 (同源替代) | 3 天 | 2.3, 2.4, 2.5 | Scene B DS3 |
| 2.7 PAP口袋锚定放置 | 2.5 天 | 1.2(DS2先验), 2.2(DS3初版) | PAP放置模块 |
| 2.8 DS3 置信度评估 | 1 天 | 2.7 | 置信度标注 |
| 2.9 DS4 构建 (辅因子共现) | 2 天 | 1.1, 1.6 | DS4 数据集 |

**Phase 2 里程碑**: DS3 + DS4 完整可用，PAP放置+DS3筛选效果可通过 10 个已知案例验证。

---

### Phase 3: 规则映射与优化 (Week 7-8)

**目标**: 完成 DS5 + 统计消歧 + 闭环优化

| 任务 | 工作量 | 依赖 | 产出 |
|------|--------|------|------|
| 3.1 DS5 构建 (规则交叉映射) | 5 天 | MechFind 规则库, M-CSA | DS5 数据集 |
| 3.2 配体反应原子统计消歧 | 2 天 | DS3 (≥50 samples) | 消歧模块 |
| 3.3 DS3 迭代优化 (闭环) | 2 天 | 3.2, DS2 | 优化后的 DS3 |
| 3.4 全数据集质量审计 | 1 天 | 全部 DS1-5 | 审计报告 |

**Phase 3 里程碑**: 五个数据集全部完成，统计消歧启用，数据质量审计通过。

---

### Phase 4: CGPS 评分函数 (Week 9-10)

**目标**: 基于 CGD 实现 CGPS 评分函数

| 任务 | 工作量 | 依赖 | 产出 |
|------|--------|------|------|
| 4.1 S_co (共现评分) | 1 天 | DS1 | S_co 模块 |
| 4.2 S_geo (几何评分) | 2 天 | DS2, DS3 | S_geo 模块 |
| 4.3 S_path (路径连贯性) | 2 天 | DS5 | S_path 模块 |
| 4.4 CGPS 综合评分 | 1 天 | 4.1-4.3 | CGPS 模块 |
| 4.5 阈值标定 | 1 天 | M-CSA benchmark | 最优阈值 |

**Phase 4 里程碑**: CGPS 评分函数可用，阈值标定完成。

---

### Phase 5: 验证与集成 (Week 11-12)

**目标**: M-CSA 基准验证 + 系统集成

| 任务 | 工作量 | 依赖 | 产出 |
|------|--------|------|------|
| 5.1 M-CSA 留出验证 | 3 天 | CGPS, DS1-5 | 验证报告 |
| 5.2 对比实验 (CGD约束 vs 无约束) | 2 天 | DS3 overlay 数据 | 对比报告 |
| 5.3 与 EzMechanism 集成 | 3 天 | EzMechanism 代码 | 集成管线 |
| 5.4 文档与论文材料 | 2 天 | 全部 | 论文图表 |

**Phase 5 里程碑**: 系统完整可用，验证结果达到发表标准。

---

## 6. 工作量估算与时间线

### 6.1 总体时间线

```
Week 1-3  ████████████████████  Phase 1: 基础建设 (DS1 + DS2 + 辅助文件)
Week 5-8  ████████████████████  Phase 2: 配体数据 (DS3 + DS4 + PAP放置)
Week 9-10 ██████████            Phase 3: 规则映射 (DS5) + 优化
Week 11   █████                 Phase 4: CGPS 评分函数
Week 12-19██████████████████    Phase 5-7: Agent管线 + 集成 + 验证
```

**总计**: 约 21.7 周 (~5.4个月, 1人全职) 或 约16周 (~4个月, 2人全职，含依赖约束)  
> 注：时间线已与 IMPLEMENTATION_PLAN v3.1 对齐，含算术修正；2人全职估算基于关键路径 Phase 0→1→2→4→6→7 = 80天 ≈ 16周

### 6.2 各问题工作量汇总

| 问题 | 方案 | 工作量 | 所在 Phase |
|------|------|--------|-----------|
| P1: 步骤级角色 | 主要角色近似 | 0.5 天 | Phase 1 |
| P2: 催化水识别 | 多证据评分 | 2-3 天 | Phase 2 |
| P3: 同源替代 | 严格筛选+分层加权 | 3-4 天 | Phase 2 |
| P4: 反应原子识别 | SMARTS+关键词+消歧 | 3-4 天 | Phase 1+3 |
| P5: 配体分类 | 权威数据源验证 | 2-3 天 | Phase 2 |
| P6: 残基保守性 | 双层验证 | 2-3 天 | Phase 2 |
| P7: PAP放置 | 口袋锚定+DS3筛选+碰撞检测 | 3-4 天 | Phase 2 |
| P8: 数据质量 | 多维过滤+覆盖度 | 1-2 天 | Phase 1 |

### 6.3 样本量缺口预案 (v3.4新增)

> **核心矛盾**: 方案定义了严格的样本量阈值(DS2≥20, DS3≥30)，但 M-CSA 的实际数据量可能不足以让所有分组达标。需在 Phase 1 结束后做"样本量缺口报告"，根据实际数据决定策略。

#### 6.3.1 问题量化

```
M-CSA 总 entries:               ~1003
质量过滤后 (resolution ≤2.5Å):   ~650-700  (≈65-70%)
有配体 (Scene A):                ~250-350  (≈25-35%) ← 关键瓶颈

DS2 分组预估:
  (role_pair × residue_type_pair × active_atom_pair)
  有效三元组:     ~100-200 个
  250 PDB ÷ 100组 ≈ 平均 2.5 obs/组
  → n_obs≥20 的组: 可能仅 30-60 个 (高频率组合如 SER-GLU, ASP-HIS)
  → n_obs≥10 的组: 可能 60-100 个

DS3 分组预估 (更严重):
  (distance_category × role × residue_type)
  D1-D6 共6类, A1-A3 共3类 → 9类
  D1 (nucleophile→electrophilic_C): ~30 组, 平均 8 obs/组
    → n_obs≥30 的组: 可能仅 5-15 个
    → n_obs≥10 的组: 可能 15-25 个
  D2-D6, A1-A3: 样本更少, 可能 0-5 个达 n_obs≥30
```

**结论**: 如果坚持 n_obs≥30，DS3 大部分分组将标注为"不可用"，S_geo 评分覆盖率极低。

#### 6.3.2 应对策略: 层级化设计 (推荐)

```
策略1: 降低阈值 (最简单, 不推荐单独使用)
  - DS2: n_obs≥20 → n_obs≥10 (百分位仍可计算, 但标注 confidence=Low)
  - DS3: n_obs≥30 → n_obs≥10 (同上)
  - 代价: 统计可靠性下降, P5-P95 区间更宽

策略2: 合并分组 (适度牺牲精度换覆盖率)
  - DS2: 忽略 residue_type_pair, 只按 role_pair 聚合
    → "nucleophile-base" 不再区分 SER-GLU 和 CYS-HIS
    → 组数从 ~200 降至 ~20, n_obs 平均从 2.5 升至 25
  - DS3: 忽略 residue_type, 只按 (distance_category × role) 聚合
    → 组数从 ~270 降至 ~60, n_obs 平均从 8 升至 40+
  - 代价: 丢失残基特异性 (SER-GLU 和 ASP-HIS 的距离分布不同)

策略3: 层级化设计 (推荐, 兼顾精度和覆盖率)
  ┌────────────────────────────────────────────────────┐
  │ Level 0 (粗粒度): 只按 role_pair / distance_category │
  │   - 保证 n_obs≥30, 统计可靠                         │
  │   - 覆盖率: ~100%                                   │
  │   - confidence: "coarse"                            │
  ├────────────────────────────────────────────────────┤
  │ Level 1 (细粒度): + residue_type_pair               │
  │   - n_obs≥30 → confidence="high"                    │
  │   - n_obs 10-29 → confidence="medium"               │
  │   - n_obs <10 → 不产出, 运行时降级到 Level 0         │
  │   - 覆盖率: ~30-50% (high+medium)                   │
  ├────────────────────────────────────────────────────┤
  │ 运行时查询: 优先 Level 1, n_obs<10 时降级到 Level 0  │
  └────────────────────────────────────────────────────┘

  数据结构示例 (DS3):
  {
    "level_0": {
      "D1+nucleophile": { "p5":3.2, "p50":3.8, "p95":4.5, "n_obs":250, "confidence":"coarse" }
    },
    "level_1": {
      "D1+nucleophile+SER": { "p5":3.0, "p50":3.5, "p95":4.2, "n_obs":85, "confidence":"high" },
      "D1+nucleophile+CYS": { "p5":3.1, "p50":3.6, "p95":4.3, "n_obs":42, "confidence":"high" },
      "D1+nucleophile+ASP": { "p5":3.3, "p50":3.9, "p95":4.6, "n_obs":15, "confidence":"medium" },
      "D1+nucleophile+LYS": { "p5":3.2, "p50":3.8, "p95":4.5, "n_obs":5,  "confidence":"low→use_level_0" }
    }
  }

  代码增量: ~50行 (查询逻辑 + 降级判断)
  数据增量: Level 0 约 20-60 条, Level 1 约 100-200 条, JSON 体积翻倍但仍可控 (~1MB)
```

#### 6.3.3 实施路径

```
Phase 1 完成后 (任务1.11 覆盖度报告):
  → 输出: 实际 n_obs 分布表 (每个分组的观测数)
  → 决策: Level 0/Level 1 各有多少组达标
  → 如果 Level 1 达标率 < 20% → 考虑策略2(合并) 或 降低阈值到 n_obs≥10
  → 如果 Level 1 达标率 ≥ 30% → 按策略3执行

Phase 2 (DS3 构建):
  → 任务2.3 同时构建 Level 0 和 Level 1
  → 增量工作量: ~0.5天 (聚合逻辑分组)

CGPS (Phase 4):
  → S_geo 查询: 先查 Level 1, n_obs<10 降级到 Level 0
  → S_geo 置信度: Level 1(high) > Level 1(medium) > Level 0(coarse)
    映射到评分权重: high→1.0, medium→0.7, coarse→0.4
```

### 6.4 人员分配建议

- **Phase 1**: 1 人全职 (API + 数据管线 + 辅助文件)
- **Phase 2**: 1-2 人 (同源替代 + overlay 并行)
- **Phase 3**: 1 人 (规则映射) + 1 人 (统计消歧)
- **Phase 4-5**: 1 人 (评分函数) + 1 人 (验证)

---

## 7. 代码复用审计结论 (v3.3新增)

> **数据来源**: `docs/GAP_AUDIT_G1-G16.md` (整合版缺口+复用审计)  
> **对齐文档**: `IMPLEMENTATION_PLAN.md` v3.4

### 7.1 核心结论

现有 EzMechanism2 代码库中，约 **30%** 的 G1-G16 缺口代码可从已有实现移植：

| 复用等级 | 缺口 | 核心可复用函数 |
|---------|------|--------------|
| 🟢 高(>50%) | G8, G10, G12, G13 | `parse_pdb_text()`, `_build_am_to_3d_coord()`, `kabsch_align()`, `parse_pdb_ligand_atoms()` |
| 🟡 中(20-50%) | G1, G3, G6, G7 | `extract_pdb_residue_fragment()`, `overlay_smiles_to_pdb()`, `fetch_pdb_info()`, `load_rules()` |
| 🟢 低(<20%) | G2, G9, G15, G16 | `mol_to_atom_coords()`, RDKit AddHs |
| ⚪ 无(0%) | G4, G5, G11, G14 | 纯新写（但多为简单模块） |

### 7.2 关键复用发现

1. **G13 MVP 0天新写**: `parse_pdb_ligand_atoms()` 已实现完整的 HETATM→Mol 流程（含CONECT解析、距离推断键、MolFromPDBBlock），覆盖率~80%
2. **G8 节省68%**: `pdb_handler.py` 已实现 PDB下载+解析+残基提取+活性位点预测，仅需薄封装
3. **G10 节省60%**: `mechanism_search.py` 已有完整的 SMARTS应用+3D验证闭环，需提取 `_build_am_to_3d_coord()` 为函数式API
4. **G12 节省60%**: `overlay_substrate.py` 已有 ETKDGv3+Kabsch+MCS 三件套

### 7.3 时间线影响

| 指标 | 原估(v3.3) | 复用后(v3.4) | 缩减 |
|------|----------|------------|------|
| G1-G16总工作量 | 24天 | ~17天 | -29% |
| 关键路径 | 10.5天 | 5.1天 | -51% |
| Phase 2.5 | 14.5天 | 10天 | -31% |
| 总工期 | 132.5天/26.5周 | 127天/25.4周 | -5.5天 |
| MVP v3(端到端) | 12-14天 | 8-10天 | -30% |

### 7.4 对CGD数据集构建的影响

CGD数据集构建层(Phase 0-2)的代码复用较少（化学领域逻辑为主），但以下方面受益：
- **任务2.16 配体Mol构建(CGD版)**: `parse_pdb_ligand_atoms()` 可作为基础，增加PDBe ChemComp API键定义
- **任务1.5 PDB解析器扩展**: `parse_pdb_text()` 已含atom_name提取，仅需封装`get_atom_coord()`
- **任务1.8 DS2构建**: `_predict_active_site_internal()` 可复用

---

## 8. 验证策略

### 8.1 Phase 1 验证: DS1 + DS2

| 验证项 | 方法 | 标准 |
|--------|------|------|
| DS1 频率分布 | 与 M-CSA 文献中的共现统计对比 | 频率偏差 < 10% |
| DS2 距离分布 | 抽样 10 个 PDB 手动验证距离 | 计算值与手动值偏差 < 0.1Å |
| active_atom_definitions | 交叉验证 M-CSA 3D 可视化 | 活性原子选择正确率 > 95% |

### 8.2 Phase 2 验证: DS3 + PAP

| 验证项 | 方法 | 标准 |
|--------|------|------|
| Scene A DS3 | 与文献中已知催化距离对比 | P50 偏差 < 0.5Å |
| 同源替代精度 | 用已知配体结构验证替代距离 | 替代距离 vs 真实距离偏差 < 1.0Å |
| PAP放置+DS3筛选 | 10 个已知 PDB+配体案例 | PAP vs 随机放置的距离误差改善 ≥ 30% |
| 碰撞检测有效性 | 检查PAP放置无骨架重叠 | 碰撞率 < 5% |
| 置信度校准 | High/Medium/Low 的实际准确率 | High ≥ 85%, Medium ≥ 65%, Low ≥ 40% |

**PAP 放置对比实验设计** (论文亮点):

```
1. 选取 10 个 Scene A PDB (有真实配体坐标)
2. 人工移除配体，模拟 Scene B
3. 分别用 PAP放置+DS3筛选 和 随机放置 重新叠加配体
4. 计算两种方法得到的残基-配体距离与真实距离的误差
5. 统计: PAP+DS3筛选是否显著降低误差 (paired t-test, p < 0.05)
6. 输出: 误差分布图 (PAP筛选 vs 随机放置)，证明 DS3 先验显著提升精度
```

### 8.3 Phase 3 验证: DS5 + 消歧

| 验证项 | 方法 | 标准 |
|--------|------|------|
| 规则映射准确率 | 人工验证 20 条映射 | exact 映射准确率 > 80% |
| 统计消歧效果 | 消歧前后匹配正确率对比 | 消歧提升 > 10% |

### 8.4 Phase 4-5 验证: CGPS 整体验证

| 验证项 | 方法 | 标准 |
|--------|------|------|
| M-CSA 留出验证 | 80% 训练, 20% 测试 | 正确机制 CGPS 排名 Top-3 |
| 跨 EC 分类泛化 | 按 EC 一级分类交叉验证 | 泛化性能下降 < 15% |
| 与 EzMechanism 3D 验证对比 | 同一酶的 CGPS vs EZ 3D 评分相关性 | Pearson r > 0.6 |

---

## 9. 风险与应对

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|----------|
| M-CSA API 限流/宕机 | 中 | 高 | 批量下载缓存 + 请求间隔控制 |
| DS3 样本量不足 (<30) | 中 | 中 | 放宽同源替代条件 (TM-score 0.80→0.70) |
| 关键词匹配覆盖率 < 85% | 低 | 中 | 扩充关键词表 + 增加通用模式 |
| PAP放置改善不显著 | 低 | 高 | 增大旋转采样; 调整DS3筛选范围 (P5-P95 → P10-P90) |
| 同源替代偏差 > 1Å | 中 | 高 | 降权或排除，仅用 Scene A 数据 |
| 规则映射 (DS5) 难度超预期 | 高 | 低 | Phase 3 可选，CGPS 仅用 S_co + S_geo |
| PDB 下载量过大 | 中 | 低 | 使用 RCSB 批量 API + 本地缓存 |

---

## 10. 附录

### 10.1 数据源汇总

| 数据源 | URL | 用途 | 调用频率 |
|--------|-----|------|----------|
| M-CSA API | `https://www.ebi.ac.uk/thornton-srv/m-csa/api/entries/` | 条目信息、残基角色、机制步骤 | 批量 ~1000 次 |
| PDB 下载 | `https://files.rcsb.org/download/{PDB_ID}.pdb` | 结构坐标 | 批量 ~800 次 |
| PDBe API | `https://www.ebi.ac.uk/pdbe/api/` | HET↔ChEBI 映射 | ~300 次 |
| RCSB Search API | `https://search.rcsb.org/rcsbsearch/v2/query` | 同源结构查找 | ~200 次 |
| UniProt API | `https://rest.uniprot.org/uniprotkb/` | 序列信息 | ~200 次 |
| ChEBI API | `https://www.ebi.ac.uk/chebi/api/` | 化合物分类 | ~300 次 |

### 10.2 技术栈

| 组件 | 技术 | 用途 |
|------|------|------|
| PDB 解析 | BioPython / 自写解析器 | 提取 ATOM/HETATM 坐标 |
| 化学信息学 | RDKit | SMARTS 匹配、构象生成、距离计算 |
| 结构叠加 | TM-align (外部) + Kabsch (自写) | 同源比对、坐标变换 |
| 统计计算 | NumPy / SciPy | 百分位、分布拟合、假设检验 |
| 数据存储 | JSON 文件 + SQLite (可选) | CGD 数据集持久化 |
| 管线编排 | Python scripts | 自动化数据收集 |

### 10.3 现有代码复用 (v3.1 修正，v3.3 更新)

**CGD 数据构建层复用** (Phase 0-2):

| 模块 | 来源 | 复用程度 | 需新增/修改 |
|------|------|----------|-------------|
| `pdb_handler.py` | EzMechanism | ~50% | 封装 `get_atom_coord()` + B-factor 过滤；`compute_ligand_distances()` 计算到几何中心非活性原子对，需重写 |
| `overlay_substrate.py` | EzMechanism | ~25% | PAP 方案为全新模块，仅复用 ETKDGv3 调用法；MCS+Kabsch 不可用于 Scene B |
| `mechanism_search.py` | EzMechanism | ~30% | 参考残基片段提取逻辑 |
| `residue_info.py` | EzMechanism | ~60% | 扩展角色映射 |

> **v3.1 修正说明**: 复用率从 v2.0 的 ~80%/~70% 下调，与 IMPLEMENTATION_PLAN v3.1 的覆盖率评估对齐。PAP 方案替代了原 bounds matrix + MCS+Kabsch 方案，`overlay_substrate.py` 的大部分代码不再适用于 Scene B。

**EZ 验证运行时层复用** (Phase 2.5, v3.3 新增):

| 缺口 | 模块 | 来源 | 复用程度 | 核心可复用函数 |
|------|------|------|----------|--------------|
| G8 | `pdb_locator.py` | pdb_handler.py | **68%** ⭐ | `parse_pdb_text()`, `fetch_pdb_info()`, `_predict_active_site_internal()` |
| G10 | `ez_executor.py` | mechanism_search.py | **60%** ⭐ | `_build_am_to_3d_coord()`, `_compute_bond_length_from_products()`, `identify_reaction_center_atom_maps()` |
| G12 | `intermediate_conformer.py` | overlay_substrate.py | **60%** ⭐ | `generate_3d_conformer()`, `kabsch_align()`, `find_mcs_mapping()`, `_mcs_align_and_mmff()` |
| G13 | `ligand_builder.py` | overlay_substrate.py | **60%** ⭐ | `parse_pdb_ligand_atoms()` (MVP 0天新写!) |
| G7 | `rule_mapper.py` | shared.py | **58%** | `load_rules()`, `_preparse_rules()` |
| G3 | `pap_ez_bridge.py` | overlay_substrate.py | **50%** | `overlay_smiles_to_pdb()` 反向使用 |
| G1 | `scene_a_validator.py` | mechanism_search.py | **38%** | `extract_pdb_residue_fragment()`, `compute_ligand_distances()` 需适配 |
| G6 | `scene_resolver.py` | pdb_handler.py | **40%** | `fetch_pdb_info()`, `parse_pdb_text()` |
| G2 | `angle_calculator.py` | mechanism_search.py | **15%** | `mol_to_atom_coords()` |

> **v3.3 更新说明**: 运行时层复用审计来自 CODE_REUSE_AUDIT。总计 21 个可复用函数，G1-G16 代码量从 3850 行降至 2680 行（节省 30%），Phase 2.5 从 14.5 天降至 10 天。详见 `docs/GAP_AUDIT_G1-G16.md`。

### 10.4 DS2 统计输出示例

```json
{
  "role_pair": "nucleophile-base",
  "residue_type_pair": "SER-GLU",
  "active_atom_pair": "OG-OE2",
  "n_obs": 47,
  "distance_values": [2.89, 3.12, 3.45, 2.98, "..."],
  "p5": 2.72,
  "p25": 3.05,
  "p50": 3.42,
  "p75": 3.88,
  "p95": 4.21,
  "mean": 3.48,
  "std": 0.52,
  "source_type": "direct",
  "pdb_ids": ["1BTL", "1TEM", "1SBP", "..."]
}
```

### 10.5 DS3 统计输出示例

```json
{
  "role": "nucleophile",
  "residue_type": "SER",
  "active_atom": "OG",
  "distance_category": "D1",
  "ligand_het_code": "BZG",
  "ligand_classification": "substrate",
  "n_obs": 23,
  "distance_values": [2.85, 3.10, 3.52, 2.92, "..."],
  "p5": 2.70,
  "p25": 2.95,
  "p50": 3.25,
  "p75": 3.65,
  "p95": 4.05,
  "mean": 3.30,
  "std": 0.45,
  "source_type": "direct",
  "confidence": "High"
}
```

### 10.6 方案决策总结

| 问题 | 原方案 | 最终方案 | 选择理由 |
|------|--------|----------|----------|
| P1 | LLM 解析步骤 | **主要角色近似** | CGPS 容忍不完美数据，LLM ROI 不高 |
| P2 | 简单距离推断 | **多证据评分 (5维)** | 显著降低误判，2-3天可行 |
| P3 | seq≥30%, 无加权 | **seq≥70%, TM≥0.70, 分层加权** | 严格筛选提升数据质量，加权保留合理样本 |
| P4 | 硬编码SMARTS | **SMARTS+关键词优先级+统计消歧** | 零成本上下文感知，85%覆盖，渐进增强 |
| P5 | 简单过滤 | **权威数据源验证 (PDBe+M-CSA)** | 杜绝抑制剂混入，宁可漏不可错 |
| P6 | 简单序列比对 | **双层验证 (序列+空间)** | 确保结构和空间保守，<1.0Å 权重=1.0 |
| P7 | 简单重采样 | **PAP口袋锚定+DS3筛选+碰撞检测+4级置信度** | PAP放置物理意义更明确，DS3后验筛选+碰撞检测提升精度，分阶段实施 |
| P8 | (新增) | **多维质量过滤+覆盖度追踪** | 全局数据质量保障 |

---

*文档结束。本方案为最终执行方案，所有专家评审意见已整合。*
