# Phase 3-3: DS5 Layer 0 构建 (含残基映射)

**Phase**: 3  
**任务编号**: 3.3  
**前置依赖**: phase-3-1 (MechFind规则解析 + M-CSA批量下载), phase-3-2 (EZ SMARTS规则库)  
**阻塞后续**: phase-3-4 (规则映射表衍生), Phase 2.5-4 运行时查询 (开发期用mock数据，Phase 3完成后切换真实数据), Phase 5 (Agent② 1:N映射)  
**预计耗时**: 3.5天  

---

## 任务清单

- [ ] 3.3.1 编写 `cgd/builders/ds5_builder.py` 框架
  - 定义 DS5 数据结构 (含 residue_info 扩展):
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
          {"residue": "Ser", "site": "OG", "atom": "O", "type": "residue", "confidence": 1.0}
        ]
      }
    }
    ```
  - M-CSA格式规则示例:
    ```json
    {
      "rule_id_mf": "2_2_1",
      "rule_id_ez": "R0042",
      "mapping_type": "1:1",
      "mcsa_id": 2,
      "smarts_ez": "[OD1:1]>>[OD2:1]",
      "confidence": "exact",
      "match_method": "mcsa_crosswalk",
      "residue_info": {
        "source": "mcsa_query",
        "entries": [
          {"residue": "Ser", "site": "OG", "atom": "O", "type": "residue", "confidence": 0.95, "mcsa_residue_id": 12345}
        ]
      }
    }
    ```
  - 定义构建流程: MechFind规则 → 格式判断 → 三路径残基映射 → EZ规则库搜索 → SMARTS直接匹配
  - residue_info 的三路径构建逻辑:
    - 质子化规则 (`*_pro`/`*_depro`): 调用 `parse_protonation_rule()` → source="protonation_rule"
    - M-CSA格式 (`j_i_s`): 查 M-CSA 缓存提取残基 → source="mcsa_query"
    - 未识别: 化学推断 → source="chemical_inference", confidence≤0.5
  - **验收**: 模块框架可导入运行

- [ ] 3.3.2 实现 Layer 0 — 1:1 映射 via M-CSA 关联
  - 算法:
    1. 遍历 MechFind 规则索引
    2. 对每条规则的 mcsa_id，查 M-CSA 获取机制步骤
    3. 对机制步骤的基团变化描述，在 EZ 规则库中搜索 SMARTS 直接匹配
    4. 匹配成功 → mapping_type="1:1", confidence="exact"
    5. 匹配失败 → mapping_type="unmapped"
  - 匹配方法: 基团变化向量 → 生成候选 SMARTS → 在 EZ 库中搜索
  - **验收**: 1:1 映射逻辑可运行

- [ ] 3.3.3 ⭐ 实现 DS5 residue_info 构建 — 路径1: 质子化规则
  - 对 `protonation_format` 规则 (phase-3-1 已标注 rule_format):
    - 调用 `parse_protonation_rule(rule_name)` → 获取 ResidueInfo
    - 写入 DS5 记录的 `residue_info` 字段
  - 双候选处理: `Asp/Glu_pro` → entries 含两个候选，各 confidence=0.8
  - 底物处理: `Methylamide_depro` → entries 含 `{type:"substrate"}`
  - 辅因子处理: `FAD_N3`, `PLP_N` → entries 含 `{type:"cofactor"}`
  - 统计: 质子化规则覆盖率 = 已识别数 / 质子化规则总数
  - **验收**: 质子化规则 residue_info 覆盖率 >90%; 双候选/底物/辅因子格式正确

- [ ] 3.3.4 ⭐ 实现 DS5 residue_info 构建 — 路径2: M-CSA查询
  - 对 `mcsa_format` 规则 (`j_i_s`):
    - 从 phase-3-1 获取的 M-CSA 缓存提取残基数据
    - 提取 `residues[].residue_chains[].{code, chain, resid}`
    - 提取 `residues[].roles[].{function_type, function}`
    - 构建 ResidueInfo: source="mcsa_query", 含 mcsa_residue_id
    - confidence: 有具体残基+角色 → 0.95; 仅有残基 → 0.85; 残基信息不完整 → 0.7
  - 多残基处理: 一条规则可能涉及多个残基 (如催化三联体) → entries 含多个 entry
  - 统计: M-CSA 规则 residue_info 覆盖率
  - **验收**: M-CSA 规则 residue_info 覆盖率 >80%; 多残基场景 entries 正确

- [ ] 3.3.5 实现 DS5 residue_info 构建 — 路径3: 化学推断
  - 对路径1和路径2均无法识别的规则:
    - 使用 `residue_info.py` 的 `analyze_residue_roles()` 推断
    - 硬约束: confidence ≤ 0.5, residue=null, type="unknown"
    - 仅推断常见角色: "nucleophile", "acid/base"
    - entries 结构: `{residue: null, role: "nucleophile"|"acid/base", atom: "O"|"N"|..., type: "unknown", confidence: ≤0.5}`
  - **验收**: 路径3的 confidence 全部 ≤ 0.5; 路径1/2有结果时不触发路径3; entries 含 role 字段

- [ ] 3.3.6 实现 SMARTS 直接匹配 (⭐ M12补充: 详细算法规格)
  - **输入**: MechFind规则的moiety_changes字段 (如 `["OH", "O-"]`, `["C=O", "C-OH"]`)
  - **输出**: 候选EZ SMARTS列表, 按匹配度排序
  - **算法5步流程**:
    1. **解析moiety_changes向量**:
       - MechFind的moiety_changes格式: `{"before": ["OH", "H"], "after": ["O-", "H+"]}`
       - 提取变化类型: 键断裂(`C-OH → C=O`), 键形成(`C=O → C-OH`), 质子转移(`OH → O-`), 电子转移
       - 映射到反应模式: `proton_transfer` | `nucleophilic_attack` | `elimination` | `redox` | `isomerization`
    2. **生成候选SMARTS模板** (每类反应模式1-3个模板):
       - `proton_transfer`: `[OD1:1]>>[OD2:1]` (酸去质子), `[ND1:1]>>[ND2:1]` (碱去质子)
       - `nucleophilic_attack`: `[C:1]=[O:2]>>[C:1]-[O:2]` (亲核加成), `[C:1](-[OD1:2])>>[C:1](-[OD2:2])` (酰基转移)
       - `elimination`: `[C:1]-[OD2:2]>>[C:1]=[OD1:2]` (β消除)
       - `redox`: `[C:1]-[OH:2]>>[C:1]=[O:2]` (氧化), `[C:1]=[O:2]>>[C:1]-[OH:2]` (还原)
       - `isomerization`: `[C:1](-[H:2])(-[H:3])>>[C:1](-[H:3])(-[H:2])` (立体异构)
    3. **在EZ规则库中搜索匹配**:
       - 对每个候选SMARTS模板, 在6083条EZ规则中搜索:
         - 精确匹配: 候选SMARTS与EZ规则的ReactionSMARTS完全匹配 → confidence="exact"
         - 子结构匹配: 候选SMARTS的产物/反应物模式是EZ规则的子集 → confidence="partial"
         - 语义匹配: moiety变化语义等价但SMARTS形式不同(如互变异构体) → confidence="semantic"
       - 搜索策略: 先精确→再子结构→最后语义, 找到即停止
    4. **消歧** (多候选时):
       - 优先选择: 精确匹配 > 子结构匹配 > 语义匹配
       - 同级别: 选择覆盖原子映射标签最多的SMARTS
       - 记录所有候选, Layer 0仅保留最佳匹配
    5. **处理匹配失败**:
       - 无任何候选 → mapping_type="unmapped", 记录moiety_changes原始值
       - 记录失败原因: "no_template_match" | "no_ez_rule_match" | "ambiguous_moiety"
  - **示例**:
    - 输入: `moiety_changes = {"before": ["Ser_OH"], "after": ["Ser_O-"]}` → 反应模式: `proton_transfer`
    - 候选模板: `[OD1:1]>>[OD2:1]`
    - 搜索结果: EZ规则R0042 `[OD1:1]>>[OD2:1]` → 精确匹配 → mapping_type="1:1"
  - ⭐ 30% 复用: `find_matching_mols()` 和 `match_smiles_with_smarts()` 可提供匹配基础
  - **验收**: moiety→SMARTS匹配算法可运行, 至少3种反应模式可正确生成候选; 匹配率≥40%

- [ ] 3.3.7 统计映射覆盖率
  - 计算 1:1 映射率 = (1:1 映射数) / (总规则数)
  - 预期: 40-50%
  - 按分析: 按残基角色分类统计映射率
  - ⭐ 新增: residue_info 覆盖率统计:
    - 质子化规则覆盖率 (路径1, 目标>90%)
    - M-CSA规则覆盖率 (路径2, 目标>80%)
    - 化学推断使用率 (路径3, 目标<15%)
  - 未映射规则列表: 输出到 `data/cache/ds5_unmapped_rules.json`
  - **验收**: 1:1 mapping rate >40%; residue_info 质子化>90%, M-CSA>80%

- [ ] 3.3.8 输出 DS5 数据集
  - 路径: `data/datasets/DS5_rule_crossmapping.json`
  - 包含全部映射记录 (1:1 + unmapped) + residue_info
  - 每条记录含: rule_id_mf, rule_id_ez (Optional), mapping_type, mcsa_id, smarts_ez (Optional), confidence, match_method, residue_info
  - 统计摘要: total, mapped_1to1, mapped_1toN, unmapped, coverage_rate, residue_info_stats
  - **验收**: DS5 JSON 格式与 HANDBOOK DS5 Schema 扩展定义一致

- [ ] 3.3.9 质量检查
  - 抽样 20 条 1:1 映射: 人工验证 SMARTS 匹配合理性
  - 抽样 10 条 unmapped: 分析无法映射的原因
  - ⭐ 抽样 15 条 residue_info: 验证三路径残基映射正确性
    - 5 条质子化规则 (含1条双候选)
    - 5 条 M-CSA规则 (含1条多残基)
    - 5 条化学推断 (验证 confidence≤0.5)
  - 记录: 映射质量和限制
  - **验收**: 抽样验证映射质量可接受

---

## 输出文件清单

- `cgd/builders/ds5_builder.py`
- `data/datasets/DS5_rule_crossmapping.json` (含 residue_info)
- `data/cache/ds5_unmapped_rules.json`
- `tests/test_ds5_builder.py`

---

## 常见陷阱

1. **1:1 映射覆盖率**: 40-50% 是保守估计，实际覆盖率取决于 moiety_changes 与 SMARTS 的对齐质量
2. **moiety→SMARTS 语义鸿沟**: MechFind 的基团变化向量与 EZ 的 SMARTS 规则表达方式不同，直接匹配可能遗漏语义等价的规则
3. **M-CSA 机制步骤匹配**: 同一 M-CSA 条目可能有多个机制版本，需确保 MechFind 规则与正确的机制步骤对应
4. **不追求高覆盖率**: Layer 0 只做 1:1，1:N 映射留给 Phase 5 Agent②，不要在此任务尝试复杂消歧
5. **residue_info 的 parse_protonation_rule() 复用**: 该函数在 `step25/rule_mapper.py` 中定义；DS5 构建是离线任务，可 import 或复制核心逻辑；推荐 import 以避免版本分叉
6. **M-CSA缓存缺失兜底**: 若某 mcsa_id 的缓存文件不存在，residue_info.source 降级为 "chemical_inference"，并记录到未覆盖报告
7. **双候选的3D消歧不在本任务**: DS5 中持久化双候选 entries，消歧留给运行时3D距离检查

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-3-4.md` 继续
