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
  - `StepResult`: step_idx, rule_id, smarts_matched, transform_applied, geometry_valid, products
  - **验收**: 模块框架可导入运行

- [ ] 2.5.8.2 实现核心验证循环
  - 对 MechFind 输出的每一步规则:
    1. 查 DS5 (通过 rule_mapper.py) → 获取 EZ SMARTS
    2. 在当前底物/中间体 Mol 上执行 SMARTS 匹配
    3. 匹配成功 → 应用变换 (GetSubstructMatch + RunReactants)
    4. 验证 3D 几何 (键长/键角是否合理)
    5. 失败 → 标记该候选为 eliminated
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

- [ ] 2.5.8.4 实现 3D 几何验证
  - 变换后产物需验证 3D 几何合理性:
    - 键长: 查 `bond_length_from_products()` → 比较 PDB 实际键长
    - 立体化学: 变换后手性中心是否与 PDB 一致
    - 原子坐标: 变换涉及的原子坐标是否在合理范围内
  - ⭐ 复用 `_compute_bond_length_from_products()` (~40行节省)
  - **验收**: 3D 几何验证可判定 pass/fail

- [ ] 2.5.8.5 实现候选淘汰逻辑
  - 任一步骤 SMARTS 不匹配 → `eliminated=True`
  - 任一步骤变换失败 → `eliminated=True`
  - 任一步骤 3D 验证失败 → `eliminated=True`
  - 所有步骤通过 → `eliminated=False`, 候选存活
  - **验收**: 淘汰逻辑正确，不误杀

- [ ] 2.5.8.6 单步 SMARTS 执行验证测试
  - 测试用例: 简单的水解步骤 (C=O → C-OH)
  - 验证: SMARTS 匹配 → 变换 → 产物 SMILES 正确
  - 验证: 3D 键长验证通过
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

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2.5-9.md` 继续
