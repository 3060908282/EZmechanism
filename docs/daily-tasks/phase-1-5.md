# Phase 1-5: PDB 解析器扩展

**Phase**: 1  
**任务编号**: 1.5  
**前置依赖**: phase-1-2 (需要 PDB 文件已下载), phase-1-3 (需要 active_atom_definitions)  
**阻塞后续**: phase-1-8 (DS2 构建依赖坐标提取)  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 1.5.1 封装 `get_atom_coord(pdb_id, chain, resid, atom_name)` 函数
  - 基于现有 `parse_pdb_text()` 的返回值构建
  - `parse_pdb_text()` 已返回 `chain_residues[chain][residue_key][{atom_name, x, y, z, element}]`
  - 函数逻辑: 加载 PDB → 解析 → 按 chain + resid + atom_name 查找 → 返回 `(x, y, z)` 元组
  - 找不到原子时返回 `None`，不抛异常
  - **验收**: 函数签名正确，输入输出类型明确

- [ ] 1.5.2 实现 `get_residue_atoms(pdb_id, chain, resid)` 函数
  - 返回指定残基的所有原子列表: `[{atom_name, x, y, z, element}, ...]`
  - 复用 `parse_pdb_text()` 的 `chain_residues` 结构
  - **验收**: 调用 `get_residue_atoms("1BTL", "A", "70")` 返回 SER70 的所有原子

- [ ] 1.5.3 实现 `get_active_atom_coord(pdb_id, chain, resid, residue_type, role, active_atom_defs)` 函数
  - 查询 `active_atom_defs` 获取 `atom_name`: `defs[f"{residue_type}+{role}"]["atom_name"]`
  - 调用 `get_atom_coord()` 获取该原子坐标
  - 若 active_atom_defs 中无映射，尝试用标准氨基酸原子名回退
  - **验收**: `get_active_atom_coord("1BTL", "A", "70", "SER", "nucleophile", defs)` 返回 OG 原子坐标

- [ ] 1.5.4 添加 PDB 解析结果缓存
  - 对已解析的 PDB 结构缓存 `chain_residues` 字典
  - 缓存机制: 内存字典 + 可选的 pickle 持久化
  - 避免同一个 PDB 文件被重复解析 (DS2 构建时会频繁访问同一 PDB)
  - **验收**: 同一 PDB 第二次调用 `get_atom_coord()` 时不重新解析文件

- [ ] 1.5.5 1BTL 端到端验证
  - 1BTL 是 Class A beta-lactamase，催化残基 SER70
  - 验证: `get_atom_coord("1BTL", "A", "70", "OG")` 返回正确的坐标
  - 与 PyMOL 或 RCSB 网页查看器中的坐标对比验证
  - **验收**: 1BTL SER70 OG 坐标与参考值一致 (误差 < 0.01Å)

---

## 输出文件清单

- `cgd/parsers/pdb_handler_extended.py` (或在现有 `pdb_handler.py` 中扩展)

---

## 常见陷阱

1. **residue_key 格式**: `parse_pdb_text()` 中的 `residue_key` 可能是 `"70 "` (右填充空格) 而非 `"70"`，查找时需注意格式对齐
2. **alternate conformations**: PDB 中部分原子有 A/B 交替构象 (altLoc)，`parse_pdb_text()` 可能只保留一个；需确认选择逻辑 (默认取 A 或 occupancy 最高的)
3. **chain ID 大小写**: 部分 PDB 使用小写 chain ID (如 "a", "b")，查找时需区分大小写
4. **插入码残基**: 部分残基有序号+插入码 (如 "70A")，residue_key 格式需兼容
5. **缓存失效**: 如果 PDB 文件被更新 (极少见)，需确保缓存机制有清理/失效逻辑

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-1-6.md` 继续
