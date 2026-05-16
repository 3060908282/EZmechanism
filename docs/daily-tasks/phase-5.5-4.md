# Phase 5.5-4: 金属中心+扩展距离+氢原子

**Phase**: 5.5  
**任务编号**: 5.5.4+5.5.5+5.5.6  
**前置依赖**: phase-5.5-2 (电子转移验证), phase-5.5-3 (辅因子几何验证)  
**阻塞后续**: Phase 6 (系统集成需要完整的验证模块)  
**预计耗时**: 1.8天  

---

## 任务清单

### 5.5.4: 金属中心验证

- [ ] 5.5.4.1 编写 `ez_validator/redox/metal_center_validator.py`
  - 核心函数: `validate_metal_center(metal_atom, coordination_residues, pdb_structure) → MetalCenterResult`
  - `MetalCenterResult`: metal_type, coordination_number, geometry_type, distances, angles, passed
  - **验收**: 模块可导入运行

- [ ] 5.5.4.2 实现配位几何验证
  - 常见配位几何:
    - 四面体 (4配位): Zn²⁺, 典型距离 2.0-2.5Å
    - 八面体 (6配位): Fe²⁺/³⁺, Mg²⁺, 典型距离 2.0-2.3Å
    - 四方锥 (5配位): Cu²⁺, 过渡态
    - 平面四方 (4配位): Cu²⁺, Ni²⁺
  - 验证: 配位数 + 键角偏差 < 20° + 键长在合理范围
  - **验收**: Metal coordination validated

### 5.5.5: 氧化还原扩展距离类别 (D7-D10)

- [ ] 5.5.5.1 编写 `ez_validator/redox/redox_distance_categories.py`
  - 定义 D7-D10 距离类别:
    - D7: 电子供体→受体直接距离 (Å)
    - D8: 电子供体→金属→受体间接距离 (Å)
    - D9: 辅因子活性原子→底物反应原子距离 (Å)
    - D10: 辅因子→催化残基距离 (Å)
  - 每个类别: 定义 role, distance_type, P5/P95 阈值 (初始为经验值)
  - **验收**: D7-D10 defined with thresholds

- [ ] 5.5.5.2 将 D7-D10 融入 S_geo 计算
  - 氧化还原酶的 S_geo 包含 D1-D10 + A1-A3 = 13 维度
  - 非氧化还原酶仍为 D1-D6 + A1-A3 = 9 维度
  - `s_geo_runtime.py` 需根据 EC 类别动态选择维度集
  - **验收**: S_geo 正确处理扩展维度

### 5.5.6: 氢原子坐标生成

- [ ] 5.5.6.1 编写 `ez_validator/geometry/hydrogen_adder.py`
  - 核心函数: `add_hydrogen_coords(pdb_structure, mol) → MolWithH`
  - 方法:
    1. RDKit `Chem.AddHs(mol)` → 添加所有 H 原子
    2. `AllChem.EmbedMolecule()` → 生成 H 的 3D 坐标
    3. MMFF 优化 → 优化 H 位置 (固定重原子)
  - **验收**: H coords generated correctly

- [ ] 5.5.6.2 实现精确 A2 质子转移角度
  - 有了 H 坐标后，A2 可精确计算:
    - A2 = angle(donor-H, H, acceptor) 而非 MVP 的距离近似
  - 更新 `angle_calculator.py`: A2 计算使用 H 坐标
  - Fallback: 无 H 坐标时仍用距离近似
  - **验收**: A2 proton transfer angle uses precise H coords

- [ ] 5.5.6.3 ⭐ 回流: 更新 scene_a_validator 的 A2 计算路径
  - 更新 `ez_validator/scene_a_validator.py` 中的 A2 质子转移角度计算:
    - 优先使用 `hydrogen_adder.add_hydrogen_coords()` 获取精确 H 坐标 → 计算精确角度
    - Fallback: 无 H 坐标时仍用距离近似 (donor-acceptor < 3.5Å → ~180°)
  - 此步骤确保 hydrogen_adder 的产出实际流入管线，而非孤立模块
  - **验收**: Scene A 的 A2 角度计算优先使用 H 坐标，fallback 到距离近似

---

## 输出文件清单

- `ez_validator/redox/metal_center_validator.py`
- `ez_validator/redox/redox_distance_categories.py`
- `ez_validator/scoring/s_geo_runtime.py` (updated)
- `ez_validator/geometry/hydrogen_adder.py`
- `tests/test_metal_center_validator.py`
- `tests/test_redox_distance_categories.py`
- `tests/test_hydrogen_adder.py`

---

## 常见陷阱

1. **三任务合并**: 5.5.4+5.5.5+5.5.6 合并因它们紧密耦合且各自较短
2. **配位几何多样性**: 同一金属在不同酶中配位几何可能不同 (如 Zn²⁺ 可四面体或八面体)，需允许合理范围
3. **D7-D10 阈值**: 初始阈值为经验值，需在 Phase 7 用 M-CSA 数据校准
4. **H 坐标精度**: RDKit AddHs 的 H 位置是近似的，精确位置需量子化学计算，但对角度计算已足够
5. **MMFF 固定重原子**: 优化 H 位置时需固定重原子坐标，否则会扰动整个结构

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. Phase 5.5 全部完成！进入 Phase 6
