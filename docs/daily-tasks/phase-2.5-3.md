# Phase 2.5-3: 配体Mol构建(运行时版)

**Phase**: 2.5  
**任务编号**: 2.5.3  
**前置依赖**: phase-2.5-2 (PDB定位)  
**阻塞后续**: phase-2.5-5 (Scene A验证需要配体Mol)  
**预计耗时**: 0.3天  

---

## 任务清单

- [ ] 2.5.3.1 编写 `ez_validator/ligand_builder.py` — 薄封装
  - ⭐ **MVP: 0天新写代码!** `parse_pdb_ligand_atoms()` 已完整实现
  - 创建薄封装: `build_ligand_mol(pdb_text, res_name, chain, res_num) → Optional[rdkit.Chem.Mol]`
  - 内部直接调用 `parse_pdb_ligand_atoms()` (从 overlay_substrate.py import)
  - **验收**: 函数可正确调用并返回 Mol 对象

- [ ] 2.5.3.2 验证 HETATM→Mol 构建流程
  - 已实现流程:
    1. ✅ 按 res_name/chain/res_num 过滤 HETATM 行
    2. ✅ 跳过水分子
    3. ✅ 尝试 MolFromPDBBlock (RDKit 自动感知键)
    4. ✅ Fallback: 手动解析原子坐标
    5. ✅ Fallback: CONECT 记录解析
    6. ✅ Fallback: 距离感知键推断 (< 2.0Å)
    7. ✅ 返回带 3D conformer 的 Mol 对象
  - **验收**: 上述 fallback 链路均可用

- [ ] 2.5.3.3 1BTL 配体构建测试
  - 从 1BTL 的 HETATM 记录构建配体 Mol
  - 检查: 原子数正确、键信息完整、3D 坐标有效
  - 检查: Mol 可用于 SMARTS 匹配
  - **验收**: Ligand Mol built from 1BTL HETATM records

- [ ] 2.5.3.4 处理常见失败情况
  - PDBe ChemComp API 不可用 → 依赖 RDKit 自动感知 + CONECT fallback
  - 无 CONECT 记录 → 距离推断键
  - 多构象 (alternate locations) → 取 occupancy 最高的
  - **验收**: 异常情况不 crash，返回 None 或降级 Mol

---

## 输出文件清单

- `ez_validator/ligand_builder.py`
- `tests/test_ligand_builder.py`

---

## 常见陷阱

1. **不要重写**: `parse_pdb_ligand_atoms()` 已有 ~170 行完整实现，本任务仅做薄封装 import，切勿重写
2. **与 CGD 版的区别**: CGD 构建阶段另有一个 `cgd/parsers/ligand_builder.py` (phase-2-14, 任务2.16)，使用 PDBe ChemComp API 获取键定义，适合批量构建；**本模块**是运行时版，薄封装 `parse_pdb_ligand_atoms()`，适合单次快速构建。两者路径不同、API不同，不可混用
3. **MolFromPDBBlock 限制**: RDKit 的 `MolFromPDBBlock` 对非标准残基的键感知可能不准确，这是预期行为，CONECT 和距离 fallback 会补偿
4. **距离推断阈值**: 当前硬编码 2.0Å，对某些长键 (如金属-配体) 可能不够，后续增强版可改为查共价半径表
5. **Mol 有效性**: 构建 Mol 后务必调用 `Chem.SanitizeMol()` 验证，无效 Mol 不应进入后续管线

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2.5-4.md` 继续
