# Phase 1-3: active_atom_definitions.json

**Phase**: 1  
**任务编号**: 1.3  
**前置依赖**: phase-1-1 (需要 role + residue 类型信息确定映射范围)  
**阻塞后续**: phase-1-5, phase-1-8  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 1.3.1 统计 M-CSA 中所有 (residue_type, role) 组合
  - 遍历 1003 条 entries 的 residues，收集所有 (code, function) 对
  - 统计每个组合的出现频率
  - 确定需要覆盖的高频组合 (覆盖 ≥ 95% 的残基-角色对)
  - **验收**: 得到完整的 (residue_type, role) 频率分布表

- [ ] 1.3.2 手写 ~45 条活性原子映射
  - 输出路径: `data/auxiliary/active_atom_definitions.json`
  - 每条映射格式: `{residue_type}+{role}` → `{atom_name, atom_type, rationale}`
  - 参考 CGD_MASTER_PLAN §3.1 中的结构和示例
  - 关键条目 (必须正确):
    - `SER+nucleophile` → `{atom_name: "OG", atom_type: "O"}`
    - `GLU+proton_acceptor` → `{atom_name: "OE2", atom_type: "O"}`
    - `HIS+proton_acceptor` → `{atom_name: "NE2", atom_type: "N"}`
    - `CYS+nucleophile` → `{atom_name: "SG", atom_type: "S"}`
    - `ASP+proton_acceptor` → `{atom_name: "OD2", atom_type: "O"}`
    - `LYS+proton_shuttle` → `{atom_name: "NZ", atom_type: "N"}`
    - `ALA+oxyanion_hole` → `{atom_name: "N", atom_type: "N", function_location: "main-N"}`
    - `GLY+oxyanion_hole` → `{atom_name: "N", atom_type: "N", function_location: "main-N"}`
    - `WAT+proton_shuttle` → `{atom_name: "O", atom_type: "O"}`
  - **验收**: 45+ 条映射，覆盖所有高频组合

- [ ] 1.3.3 处理 function_location_abv (主链原子)
  - M-CSA API 提供 `function_location_abv` 字段
  - 当值为 "main-N" 时，活性原子为主链氮 (N)
  - 当值为 "main-O" 时，活性原子为主链氧 (O)
  - 在映射中添加 `function_location` 字段标注主链原子
  - **验收**: oxyanion_hole 角色的残基 (ALA, GLY, SER, etc.) 正确标注 main-N

- [ ] 1.3.4 交叉验证: PDB 结构抽查
  - 随机选取 10 个 M-CSA entry
  - 在对应 PDB 文件中定位催化残基，检查映射的 atom_name 是否存在
  - 特别关注: GLU 的 OE1/OE2 选择、ASP 的 OD1/OD2 选择、HIS 的 ND1/NE2 选择
  - **验收**: 10 个抽查条目的 atom_name 在 PDB 中全部存在且位置合理

---

## 输出文件清单

- `data/auxiliary/active_atom_definitions.json`

---

## 常见陷阱

1. **GLU/ASP 的原子选择**: GLU 有 OE1 和 OE2 两个羧基氧，ASP 有 OD1 和 OD2。具体选哪个取决于 PDB 中的质子化状态和氢键网络；一般取编号较大的 (OE2/OD2) 作为默认，但 PDB 抽查时需确认
2. **HIS 的 ND1 vs NE2**: 质子供体倾向 ND1，质子受体倾向 NE2，这取决于互变异构态。需要根据角色 (proton_donor vs proton_acceptor) 区分
3. **主链原子标注遗漏**: oxyanion_hole 角色通常使用主链 N 原子，容易误写为侧链原子。务必检查 function_location_abv 字段
4. **罕见残基-角色组合**: 如 MET+nucleophile, TRP+electrostatic_stabiliser 等低频组合，可暂不映射但记录为 "unmapped"，后续按需补充
5. **同一残基不同角色不同原子**: SER+nucleophile → OG，但 SER+proton_donor 也可能是 OG；同一原子多角色是正常的，但需确认 rationale 描述准确

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-1-4.md` 继续
