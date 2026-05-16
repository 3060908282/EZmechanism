# Phase 1-4: ligand_reactive_atom_smarts.json

**Phase**: 1  
**任务编号**: 1.4  
**前置依赖**: phase-1-1 (需要 M-CSA entry 数据了解反应类型分布)  
**阻塞后续**: phase-2-3 (Scene A DS3 需 SMARTS 匹配配体反应原子)  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 1.4.1 分析 M-CSA 中的距离类别分布
  - 统计 1003 条 entries 中各类残基角色的频率
  - 确定需要覆盖的 6 个距离类别 (D1-D6) + 3 个角度类别 (A1-A3) 的优先级
  - D1 (nucleophile→electrophilic_C) 模式最多最复杂，优先处理
  - **验收**: 得到各距离/角度类别的条目数分布

- [ ] 1.4.2 编写 ~25 个 SMARTS 模式
  - 输出路径: `data/auxiliary/ligand_reactive_atom_smarts.json`
  - 每个模式格式: `{id, smarts, context_keywords, keyword_priority, comment}`
  - 按 CGD_MASTER_PLAN §3.3 的结构组织，按距离类别分组
  - D1 (nucleophile→electrophilic_C) 需最多模式:
    - beta_lactam_C: `[CX3;r4](=[OX1])` (keyword_priority: 1)
    - phospho_P: `[PX4](=[OX1])` (keyword_priority: 1)
    - glycosidic_C: `[CX3;r5;r6]([OX2,NX3])[OX2,NX3]` (keyword_priority: 1)
    - amide_C: `[CX3](=[OX1])[NX3]` (keyword_priority: 5)
    - ester_C: `[CX3](=[OX1])[OX2]` (keyword_priority: 5)
    - thioester_C: `[CX3](=[OX1])[SX2]` (keyword_priority: 4)
    - imine_C: `[CX3]=[NX2]` (keyword_priority: 6)
    - generic_carbonyl_C: `[CX3](=[OX1])` (keyword_priority: 10, fallback)
  - D2 (proton_donor→proton_acceptor): alcohol_O, amine_N, thiol_S
  - D3 (electrostatic_stabiliser→charge_center): carboxylate_O, ammonium_N
  - D4-D6 和 A1-A3 的模式按实际需求编写
  - **验收**: 20+ 个 SMARTS 模式，覆盖 D1-D6 + A1-A3

- [ ] 1.4.3 测试每个 SMARTS 模式
  - 对每个模式，用 RDKit 的 `Chem.MolFromSmarts()` 验证语法正确性
  - 每个模式用 3-5 个已知配体 SMILES 测试匹配:
    - beta_lactam_C: 测试 penicillin G, cephalosporin C
    - phospho_P: 测试 ATP, glucose-6-phosphate
    - amide_C: 测试肽段, 乙酰苯胺
    - ester_C: 测试乙酸乙酯, 乙酰胆碱
  - 记录测试结果到文件注释中
  - **验收**: 每个模式至少在 1 个已知配体上成功匹配

- [ ] 1.4.4 验证关键词优先级排序
  - 确认低 keyword_priority 值 = 更特异 = 优先匹配
  - 确认 generic 模式 (priority ≥ 10) 作为最后回退
  - 确认无循环依赖或矛盾优先级
  - **验收**: 关键词匹配逻辑的优先级排序合理

---

## 输出文件清单

- `data/auxiliary/ligand_reactive_atom_smarts.json`

---

## 常见陷阱

1. **SMARTS 语法错误**: RDKit 对 SMARTS 语法检查严格，如 `[CX3;r4](=[OX1])` 中的环大小限制 `r4` 必须精确；建议每个模式写完立即用 RDKit 验证
2. **过度匹配**: 通用模式如 `[CX3](=[OX1])` 会匹配所有羰基碳，包括不需要的位点。keyword_priority 必须确保特异性模式优先于通用模式
3. **环大小限制**: beta_lactam (4元环) vs gamma_lactam (5元环) vs delta_lactam (6元环) 需用 `r4/r5/r6` 区分，错误使用会误匹配
4. **配体来源差异**: PDB 中的配体可能不完整 (缺少部分原子)，SMARTS 匹配可能因片段化配体而失败
5. **protonation 状态**: SMARTS 模式需考虑配体在生理 pH 下的质子化状态，如羧酸根 `[-]` vs 羧酸 `[H]`

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-1-5.md` 继续
