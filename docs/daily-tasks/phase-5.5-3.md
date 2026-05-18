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
  - `CofactorGeometryResult`: geometry_type, observed_angles, expected_angles, deviation, passed ⚠️ Heme不使用此字段, 使用coordination_rationality_score (D22修正)
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

- [ ] 5.5.3.5 实现 Heme 配位几何分析 (⭐ D22修正: 分析而非验证)
  - ⚠️ **D22定位修正**: Heme含Fe金属中心，根据D22决策，金属价态变化步骤不可3D验证。本节仅做配位几何**分析**(与CGD统计对比)，不声称**验证**通过/失败
  - Heme 的关键几何:
    - Fe-N(卟啉) 距离: ~2.0Å
    - Fe-轴向配体距离: ~2.1Å (近侧 His)
    - Fe-底物距离: 取决于反应类型
    - 卟啉环平面性
  - ⭐ **结果格式变更**: 不使用`passed` (bool), 改用`coordination_rationality_score` (float, 0-1, 与CGD统计分布对比的合理性评分) + `is_verifiable_3d = False`
  - ⭐ 与metal_coordination_analyzer(phase-5.5-4)一致的结果格式，避免同一Fe中心在不同模块中有矛盾语义
  - 分析: Fe 配位几何合理性 (八面体/四方锥, 与CGD同类统计对比)
  - **验收**: Heme配位几何分析产出合理性评分, is_verifiable_3d=False; 不返回passed/fail

- [ ] 5.5.3.6 编写测试用例
  - 测试1: 转氨酶 (PLP) → Schiff 碱键角合理
  - 测试2: 脱氢酶 (NAD) → 氢负转移面选择性正确
  - 测试3: 氧化酶 (FAD) → 异咯嗪环平坦
  - 测试4: 细胞色素 (heme) → Fe 配位几何合理性评分产出, is_verifiable_3d=False
  - **验收**: PLP/NAD/FAD geometry validated

---

## 输出文件清单

- `ez_validator/redox/cofactor_geometry_validator.py` ⚠️ 应考虑从 `redox/` 移至 `geometry/` 以覆盖非氧化还原辅因子(如PLP)，但MVP阶段保持当前位置
- `tests/test_cofactor_geometry_validator.py`

---

## 常见陷阱

1. **辅因子构象多样性**: 同一辅因子在不同酶中可能有不同构象 (如 NAD 的 anti/syn)，需允许合理范围
2. **PDB 辅因子质量**: 辅因子原子可能有缺失或 misassignment，需先做质量检查
3. **几何参考值**: 辅因子几何的期望值需从小分子晶体学数据获取，不能凭经验设定
4. **特殊辅因子**: 除 PLP/NAD/FAD/Heme 外还有许多辅因子 (硫胺素、生物素等)，MVP 只覆盖最常见的4种
5. **⭐ Heme分析≠验证(D22)**: Heme的Fe金属中心在metal_coordination_analyzer中给"合理性评分"(分析), 在本模块中也必须使用一致的结果格式。同一Fe中心不能在一个模块"验证通过"而在另一个模块"仅分析"。Heme几何检查属于结构分析，不声称化学验证

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5.5-4.md` 继续
