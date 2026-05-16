# Phase 5.5-3: 辅因子几何验证

**Phase**: 5.5  
**任务编号**: 5.5.3  
**前置依赖**: phase-5.5-1 (氧化还原中心识别)  
**阻塞后续**: phase-5.5-4 (金属中心+扩展距离+氢原子)  
**预计耗时**: 1.5天  

---

## 任务清单

- [ ] 5.5.3.1 编写 `ez_validator/redox/cofactor_geometry_validator.py` 框架
  - 核心函数: `validate_cofactor_geometry(cofactor_mol, cofactor_type, expected_geometry) → CofactorGeometryResult`
  - `CofactorGeometryResult`: geometry_type, observed_angles, expected_angles, deviation, passed
  - **验收**: 模块可导入运行

- [ ] 5.5.3.2 实现 PLP 几何验证
  - PLP (磷酸吡哆醛) 的关键几何:
    - Schiff 碱键角: C4'-N-ε-Lys (~120°)
    - C4'-Cα 键长: ~1.5Å
    - 磷酸基团取向: 需指向活性位点外
  - 验证: 键角在期望范围 ±15° 内
  - **验收**: PLP 键角验证正确

- [ ] 5.5.3.3 实现 NAD/NADP 几何验证
  - NAD/NADP 的关键几何:
    - 烟酰胺环取向: anti/syn 构象
    - C4 氢位置: pro-R / pro-S 面选择性
    - 核糖环皱褶: C2'-endo / C3'-endo
  - 验证: 氢负转移面选择性正确 (决定立体化学)
  - **验收**: NAD 几何验证正确

- [ ] 5.5.3.4 实现 FAD 几何验证
  - FAD 的关键几何:
    - 异咯嗪环平面性
    - N5 位置: 氢负受体位点
    - 黄素-蛋白质接触: π-π 堆积
  - 验证: 异咯嗪环平坦度 (RMSD < 0.1Å from planarity)
  - **验收**: FAD 几何验证正确

- [ ] 5.5.3.5 实现 Heme 几何验证
  - Heme 的关键几何:
    - Fe-N(卟啉) 距离: ~2.0Å
    - Fe-轴向配体距离: ~2.1Å (近侧 His)
    - Fe-底物距离: 取决于反应类型
    - 卟啉环平面性
  - 验证: Fe 配位几何正确 (八面体/四方锥)
  - **验收**: Heme 几何验证正确

- [ ] 5.5.3.6 编写测试用例
  - 测试1: 转氨酶 (PLP) → Schiff 碱键角合理
  - 测试2: 脱氢酶 (NAD) → 氢负转移面选择性正确
  - 测试3: 氧化酶 (FAD) → 异咯嗪环平坦
  - 测试4: 细胞色素 (heme) → Fe 配位几何正确
  - **验收**: PLP/NAD/FAD geometry validated

---

## 输出文件清单

- `ez_validator/redox/cofactor_geometry_validator.py`
- `tests/test_cofactor_geometry_validator.py`

---

## 常见陷阱

1. **辅因子构象多样性**: 同一辅因子在不同酶中可能有不同构象 (如 NAD 的 anti/syn)，需允许合理范围
2. **PDB 辅因子质量**: 辅因子原子可能有缺失或 misassignment，需先做质量检查
3. **几何参考值**: 辅因子几何的期望值需从小分子晶体学数据获取，不能凭经验设定
4. **特殊辅因子**: 除 PLP/NAD/FAD/Heme 外还有许多辅因子 (硫胺素、生物素等)，MVP 只覆盖最常见的4种

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5.5-4.md` 继续
