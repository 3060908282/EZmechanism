# Phase 2.5-8: EZ SMARTS执行循环

**Phase**: 2.5  
**任务编号**: 2.5.8  
**前置依赖**: phase-2.5-5 (Scene A验证), phase-2.5-4 (规则映射)  
**阻塞后续**: phase-2.5-9 (中间体构象管理), phase-2.5-11 (管线编排)  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 2.5.8.1 编写 `ez_validator/ez_executor.py` 框架
  - 定义核心函数: `execute_ez_validation(candidate_mechanism, pdb_structure, cgd_datasets) → List[StepResult]`
  - `StepResult`: step_idx, rule_id, smarts_matched, transform_applied, geometry_valid, products, skip_reason: Optional[str]  # "unmapped_rule" | "metal_redox_no_smarts" | None
  - **验收**: 模块框架可导入运行

- [ ] 2.5.8.2 实现核心验证循环
  - 对 MechFind 输出的每一步规则:
    1. 查 DS5 (通过 rule_mapper.py) → 获取 EZ SMARTS
    2. 在当前底物/中间体 Mol 上执行 SMARTS 匹配
    3. 匹配成功 → 应用变换 (GetSubstructMatch + RunReactants)
    4. 验证 3D 几何 (键长/键角是否合理)
    5. 区分两种失败: (a) SMARTS匹配成功但变换失败 → eliminated; (b) 无SMARTS可匹配(mapping_type="unmapped") → skip, S_path=0, 候选存活
  - ⭐ 60% 复用:
    - `_apply_rule_to_configuration()` → SMARTS 规则应用逻辑
    - `_get_products_for_reactants_and_rule()` → RunReactants 包装
    - `_build_am_to_3d_coord()` → PDB→3D 坐标映射核心
    - `_compute_bond_length_from_products()` → 键长 3D 验证
    - `identify_reaction_center_atom_maps()` → 反应中心识别
    - `_apply_single_arrow_safe()` → 箭头变换核心
    - `_preparse_rules()` → 规则预处理
  - **验收**: 验证循环可逐步执行

- [ ] 2.5.8.3 实现 SMARTS 匹配 + RunReactants
  - `Chem.MolFromSmiles()` → `Mol.GetSubstructMatch(smarts_pattern)` → 原子映射
  - `AllChem.ReactionFromSmarts(smarts)` → `reaction.RunReactants((mol,))` → 产物
  - 处理多产物: 取与期望产物 SMILES 匹配的
  - 处理无产物: SMARTS 匹配成功但变换失败 → 标记该步骤 fail
  - **验收**: 单步 SMARTS 匹配和变换可正确执行

- [ ] 2.5.8.4 实现 3D 几何验证 (⭐ M9修正: MVP仅2D验证，3D推迟到2.5-9)
  - 变换后产物需验证合理性:
    - ⭐ **M9修正**: RunReactants产出为2D Mol(无3D坐标)，MVP阶段仅做2D验证(产物SMILES匹配+键合理性)
    - 2D验证 (MVP): 产物SMILES是否与期望产物匹配、键级变化是否合理
    - 3D验证 (推迟至phase-2.5-9): 键长/键角/手性/原子坐标 → 需要intermediate_conformer.py构建3D坐标
  - ⭐ 复用 `_compute_bond_length_from_products()` (~40行节省, 仅3D验证时使用)
  - **验收**: MVP阶段2D产物匹配验证可判定 pass/fail; 3D验证标记为TODO待2.5-9集成

- [ ] 2.5.8.5 实现候选淘汰逻辑 (⭐ 区分"匹配失败"与"无SMARTS可匹配")
  - SMARTS匹配成功但变换失败 → `eliminated=True` (候选确实不可验证)
  - 3D验证失败 → `eliminated=True` (验证发现几何不合理)
  - ⭐ **无SMARTS可匹配** (mapping_type="unmapped", 如金属氧化还原步骤) → `skip=True, S_path=0, eliminated=False` (步骤超出验证能力，但不淘汰候选)
  - VerificationResult中增加`skipped_steps: List[SkippedStepInfo]`字段，记录被跳过的步骤及原因
  - ⭐ **D22集成**: 含金属价态变化步骤的候选机制不应被淘汰，而应降级至Scene C评分
  - 所有步骤通过或仅skip → `eliminated=False`, 候选存活
  - **验收**: 淘汰逻辑正确区分三种情况，不误杀含金属步骤的候选

- [ ] 2.5.8.6 单步 SMARTS 执行验证测试
  - 测试用例: 简单的水解步骤 (C=O → C-OH)
  - 验证: SMARTS 匹配 → 变换 → 产物 SMILES 正确
  - 验证: 3D 键长验证通过
  - 验证: 含unmapped步骤的候选不被淘汰，S_path=0
  - **验收**: Single-step SMARTS execution verified

---

## 输出文件清单

- `ez_validator/ez_executor.py`
- `tests/test_ez_executor.py`

---

## 常见陷阱

1. **60% 复用**: mechanism_search.py 已有完整的 SMARTS 应用+3D 验证闭环，核心函数可直接 import，切勿重写
2. **SMARTS 原子映射**: `_build_am_to_3d_coord()` 需要提取+适配，原始函数嵌在 mechanism_search 的类方法中，可能需要重构为独立函数
3. **RunReactants 多产物**: 单个 SMARTS 变换可能产生多个产物异构体，需根据产物 SMILES 匹配选择正确的
4. **SMARTS 匹配失败 ≠ 机制错误**: MechFind 规则与 EZ SMARTS 的粒度不同，匹配失败可能是映射问题而非机制错误
5. **3D 坐标传递**: 变换后产物是 2D 的，3D 坐标需要从反应物映射+推断，这是 G12 (中间体构象) 的核心问题
6. **⭐ 无SMARTS ≠ 验证失败**: mapping_type="unmapped"的步骤(如Metal_pro)意味着验证工具不适用，而非机制错误。淘汰此类候选等于错误声称"该机制不存在"，这与D22氧化还原范围分级决策矛盾。必须skip而非eliminate
7. **⭐ M9修正: 2D vs 3D验证边界**: RunReactants产出永远是2D的(无3D坐标)，2.5.8.4的MVP仅做2D验证(产物SMILES匹配)。3D几何验证(键长/键角/手性)需要intermediate_conformer.py(phase-2.5-9)构建3D构象后才能执行，切勿在2.5-8中尝试3D验证

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2.5-9.md` 继续
