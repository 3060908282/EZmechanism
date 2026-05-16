# Phase 2.5-9: 中间体3D构象管理

**Phase**: 2.5  
**任务编号**: 2.5.9  
**前置依赖**: phase-2.5-8 (EZ执行循环)  
**阻塞后续**: phase-2.5-11 (管线编排)  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 2.5.9.1 编写 `ez_validator/intermediate_conformer.py` 框架
  - 定义核心函数: `generate_intermediate_conformer(product_mol, prev_mol, prev_conf_id=0) → IntermediateResult`
  - `IntermediateResult`: mol (带3D conformer), conf_id, rmsd_to_prev, atom_mapping, error_accumulated
  - **验收**: 模块框架可导入运行

- [ ] 2.5.9.2 实现中间体 3D 构象生成 (ETKDGv3)
  - 对 SMARTS 变换产出的 2D Mol 生成 3D 构象
  - 调用 `AllChem.EmbedMolecule(mol, AllChem.ETKDGv3())`
  - 生成多个 conformer，选能量最低的
  - ⭐ 复用 `generate_3d_conformer()` (~30行节省) 从 overlay_substrate.py
  - **验收**: 2D SMILES → 3D Mol 构象生成成功

- [ ] 2.5.9.3 实现 Kabsch 对齐 — 与前一步中间体对齐
  - 找到当前中间体与前一步中间体的公共子结构 (MCS)
  - 基于公共原子对齐: Kabsch 算法最小化 RMSD
  - ⭐ 复用 `kabsch_align()` (~40行节省) 和 `find_mcs_mapping()` (~30行节省)
  - **验收**: 对齐后公共原子 RMSD < 0.5Å

- [ ] 2.5.9.4 实现原子映射追踪
  - SMARTS 变换可能重排原子索引，需追踪映射关系
  - 方法: 使用 `GetSubstructMatch()` 的原子映射 + MCS 映射
  - 追踪: 反应原子 (变换的) vs 非反应原子 (不变的)
  - 非反应原子: 直接继承前一步的 3D 坐标
  - 反应原子: 需要从键长/键角推断新坐标
  - ⭐ 复用 `_mcs_align_and_mmff()` (~40行节省) — MCS+MMFF 优化
  - **验收**: 原子映射正确，非反应原子坐标一致

- [ ] 2.5.9.5 实现误差累积处理
  - 每步对齐引入微小误差，多步后可能累积
  - 累积度量: 逐步 RMSD 之和
  - 阈值: 累积误差 > 2Å → 标记为 low confidence
  - 阈值: 累积误差 > 5Å → 标记为 rejected
  - **验收**: 误差累积计算正确，超阈值有标记

- [ ] 2.5.9.6 两步机制端到端测试
  - 测试用例: 2 步催化机制 (如丝氨酸蛋白酶的酰化+脱酰)
  - Step 1: 2D 产物 → 3D 构象 → 对齐到反应物
  - Step 2: 第二步产物 → 3D 构象 → 对齐到第一步中间体
  - 检查: 两步累积误差 < 2Å
  - **验收**: 2-step mechanism intermediate conformers aligned, error <2Å

---

## 输出文件清单

- `ez_validator/intermediate_conformer.py`
- `tests/test_intermediate_conformer.py`

---

## 常见陷阱

1. **60% 复用**: overlay_substrate.py 已有 ETKDGv3 + Kabsch + MCS 三件套，直接 import，不要重写对齐算法
2. **SMARTS 原子映射断裂**: 多步变换后原子索引可能完全不同，MCS 映射是桥接关键，需确保 MCS 匹配质量
3. **MMFF 优化失败**: 部分中间体 Mol 可能有奇数价态或无法 sanitize，MMFF 优化前需先 `Chem.SanitizeMol()`
4. **坐标继承精度**: 非反应原子理论上应与前一步坐标完全一致，但 ETKDGv3 重新生成+Kabsch 对齐会引入微小偏差
5. **构象数量权衡**: 生成更多 conformer 可提高质量但增加计算时间，MVP 建议 10-20 个

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2.5-10.md` 继续
