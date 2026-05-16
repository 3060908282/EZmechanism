# Phase 2.5-4: 运行时规则映射 + 残基识别

**Phase**: 2.5  
**任务编号**: 2.5.4  
**前置依赖**: phase-2.5-1 (场景判定); ⚠️ DS5映射表查询(2.5.4.2)依赖Phase 3-4产出，开发期用mock数据，Phase 3完成后做集成验证  
**阻塞后续**: phase-2.5-5 (Scene A验证需要规则映射), phase-2.5-8 (EZ SMARTS执行循环需要规则映射)  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 2.5.4.1 编写 `step25/rule_mapper.py` 框架
  - 定义核心接口: `query_rule_mapping(mechfind_rule_id: str) → RuleMappingResult`
  - `RuleMappingResult`: rule_id, ez_smarts (Optional), mapping_type ("1:1"/"1:N"/"unmapped"), confidence, residue_info
  - 查询目标: `data/derived/rule_mapping_table.json` (Phase 3 产出)
  - `residue_info` 结构:
    ```python
    @dataclass
    class ResidueEntry:
        residue: str          # "Ser", "Asp", "Substrate", "FAD", null
        site: Optional[str]   # "OG", "OD1", "N3", null
        atom: Optional[str]   # "O", "N", "S"
        type: str             # "residue" | "cofactor" | "substrate" | "water" | "metal" | "unknown"
        confidence: float     # 0.0-1.0
        role: Optional[str]   # 仅路径3: "nucleophile", "acid/base"
        mcsa_residue_id: Optional[int]  # 仅路径2

    @dataclass
    class ResidueInfo:
        source: Optional[str]  # "protonation_rule" | "mcsa_query" | "chemical_inference" | null
        entries: List[ResidueEntry]
    ```
  - **验收**: 接口定义清晰，dataclass 可实例化

- [ ] 2.5.4.2 实现 DS5 映射表查询
  - 加载 `rule_mapping_table.json`
  - 按 MechFind rule_id 查找对应 EZ SMARTS + residue_info
  - ⭐ 复用 `load_rules()` (规则加载, ~30行节省) 和 `_preparse_rules()` (规则预处理, ~40行节省) — 58% 复用率
  - **验收**: 给定已知 rule_id → 返回正确的 SMARTS + residue_info

- [ ] 2.5.4.3 ⭐ 实现 `parse_protonation_rule()` — 路径1残基识别
  - 解析 MechFind 质子化规则名 → 残基映射
  - 核心逻辑: 规则名模式匹配 → 查 PROTONATION_RESIDUE_MAP → 返回 ResidueInfo
  - **规则名格式**:
    - 标准氨基酸: `Ser_pro` → `{residue:"Ser", site:"OG", atom:"O", type:"residue", confidence:1.0}`
    - 含位点标注: `HisN3_depro` → `{residue:"His", site:"NE2"→"ND1"(需N3→位点映射), atom:"N", type:"residue", confidence:1.0}`
    - 双候选: `Asp/Glu_pro` → 返回两个 entries, 各 confidence=0.8, 由3D距离检查消歧
    - 底物: `Methylamide_depro` → `{residue:"Substrate", site:null, atom:"N", type:"substrate", confidence:1.0}`
    - 辅因子: `FAD_N3` → `{residue:"FAD", site:"N3", atom:"N", type:"cofactor", confidence:1.0}`
    - 水: `Water_pro` → `{residue:"HOH", site:"O", atom:"O", type:"water", confidence:1.0}`
    - 金属: `Metal_pro` → `{residue:null, type:"metal", confidence:0.7}`
  - **PROTONATION_RESIDUE_MAP**: ~60+ 条映射表，覆盖全部~96条质子化规则
  - **验收**: parse_protonation_rule() 覆盖≥90%质子化规则名，双候选/底物/辅因子格式正确

- [ ] 2.5.4.4 实现 M-CSA 查询残基 — 路径2残基识别
  - 对 `j_i_s` 格式规则 (如 `1_1_1`): 解析 mcsa_id → 查 M-CSA 缓存 → 提取残基数据
  - M-CSA 缓存路径: `data/cache/mcsa_entries/entry_{mcsa_id}.json`
  - 提取字段: `residues[].residue_chains[].{code, chain, resid}` + `residues[].roles[]`
  - 构建 ResidueInfo: source="mcsa_query", confidence=0.7-0.95
  - **前置依赖**: Phase 3-1 的 M-CSA 批量下载确保缓存完整; 开发期可用 mock 数据
  - **验收**: 给定 `1_1_1` → 解析 mcsa_id=1 → 查缓存 → 返回对应残基信息

- [ ] 2.5.4.5 实现化学推断兜底 — 路径3残基识别
  - 基于 `residue_info.py` 的 `analyze_residue_roles()` 启发式推断
  - **硬约束**:
    - confidence ≤ 0.5 (绝不高于路径1/2)
    - 仅推断常见角色: "nucleophile", "acid/base"
    - 不指定具体残基 (residue=null, type="unknown")
  - **绝不覆盖**路径1/2的结果: 仅当 source=null 时使用
  - **验收**: 路径3返回的 confidence ≤ 0.5; 路径1/2有结果时不调用路径3

- [ ] 2.5.4.6 实现三路径调度逻辑
  - 调度优先级: 路径1 > 路径2 > 路径3
  - 规则名判断:
    - 匹配 `*_pro` / `*_depro` 模式 → 路径1 (parse_protonation_rule)
    - 匹配 `\d+_\d+_\d+` 模式 → 路径2 (M-CSA查询)
    - 其他 → 路径3 (化学推断)
  - 合并策略: 高优先级路径有结果时，跳过低优先级路径
  - **验收**: 三路径调度正确，优先级不冲突

- [ ] 2.5.4.7 实现未映射规则处理
  - 未映射规则 → `ez_smarts=None`, `mapping_type="unmapped"`, `confidence=0.0`, `residue_info={source:null, entries:[]}`
  - 调用方对 unmapped 规则的处理: S_path 对该步骤贡献 = 0
  - 标记为 unmapped → 降低整体验证置信度
  - **验收**: 未映射规则返回 confidence=0, 不 crash

- [ ] 2.5.4.8 编写单元测试
  - 测试1: 质子化规则 `Ser_pro` → 路径1 → `{residue:"Ser", site:"OG", confidence:1.0}`
  - 测试2: 双候选规则 `Asp/Glu_pro` → 路径1 → 两个 entries 各 confidence=0.8
  - 测试3: 底物规则 `Methylamide_depro` → 路径1 → `{type:"substrate"}`
  - 测试4: M-CSA规则 `1_1_1` → 路径2 → 残基数据来自缓存
  - 测试5: 未知规则 → 路径3 → confidence ≤ 0.5
  - 测试6: 优先级覆盖 → 路径1有结果时路径3不执行
  - 测试7: 未映射规则 → confidence=0, residue_info empty
  - **验收**: Rule mapping query returns correct SMARTS + residue_info for mapped rules

---

## 输出文件清单

- `step25/rule_mapper.py` (含 parse_protonation_rule + 三路径调度)
- `step25/protonation_residue_map.py` (PROTONATION_RESIDUE_MAP 映射表)
- `tests/test_rule_mapper.py`

---

## 常见陷阱

1. **⚠️ 循环依赖**: Phase 2.5-4 与 Phase 3 存在数据依赖循环 — 2.5.4路径2需要DS5映射表(Phase 3-4产出)，开发期用mock数据，Phase 3完成后需回归验证。HANDBOOK §7已标注“Phase 3(DS5)可与Phase 2部分并行”，本任务路径1(parse_protonation_rule)和路径3(化学推断)不依赖DS5，可独立开发
2. **rule_id 格式**: MechFind 输出的 rule_id 格式为 `{mcsa_id}_{mech_idx}_{step_idx}`，需确保与 DS5 键格式一致
3. **1:N 映射消歧**: 本任务仅提供查询接口，1:N 消歧逻辑在 Phase 5 (Agent②) 中实现
4. **缓存**: 规则映射表只需加载一次，后续查询走内存缓存，避免反复读 JSON
5. **路径1优先级绝对**: 即使路径2/3有"更好"的结果，路径1的规则名编码信息是权威来源，不能被覆盖
6. **Asp/Glu 消歧时机**: 双候选不在 rule_mapper 中消歧，留给3D距离检查阶段；rule_mapper 只负责返回所有候选
7. **M-CSA缓存缺失**: 若 mcsa_id 对应的缓存文件不存在(Phase 3-1未完成批量下载)，应降级到路径3并记录 warning

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2.5-5.md` 继续
