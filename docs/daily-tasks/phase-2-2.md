# Phase 2-2: 配体分类模块

**Phase**: 2
**任务编号**: 2.2
**前置依赖**: phase-1-9 (HET_to_ChEBI_mapping), phase-1-1 (M-CSA entries缓存)
**阻塞后续**: phase-2-3 (Scene A DS3 需配体分类过滤), phase-2-4 (DS4 需辅因子识别)
**预计耗时**: 2天

---

## 任务清单

- [ ] 2.2.1 编写 `cgd/parsers/ligand_classifier.py` 框架
  - 创建配体分类模块，定义 `LigandClassifier` 类
  - 接口: `classify(pdb_id, het_code, mcsa_id) → LigandClassification`
  - 返回分类结果: substrate / cofactor / excluded / unknown
  - **验收**: 类可实例化，接口定义清晰

- [ ] 2.2.2 实现5级权威数据源分类 (per CGD_MASTER_PLAN §4.5)
  - Level 1 (最高权威): M-CSA 标注为 substrate 的配体 → substrate
  - Level 2: M-CSA 标注为 cofactor 的配体 → cofactor
  - Level 3: HET_to_ChEBI 白名单中的辅因子 (PLP, NAD, FAD, ATP 等) → cofactor
  - Level 4: 常见排除名单 (NAG, BMA, MAN 等糖类; HOH, SO4, PO4 等溶剂/缓冲液) → excluded
  - Level 5 (最低权威): 无法判定的配体 → unknown (后续需人工审查或跳过)
  - 优先级: Level 1 > Level 2 > Level 3 > Level 4 > Level 5
  - **验收**: 5级分类逻辑和优先级正确

- [ ] 2.2.3 排除名单 (excluded) 实现
  - 糖类修饰: NAG (N-acetylglucosamine), BMA, MAN, FUC, GAL, SIA 等
  - 溶剂/缓冲液: HOH, SO4, PO4, EDO, GOL, PEG, CIT, ACT, DMS, BME 等
  - 非功能金属离子: 已在2.1处理，但此处也需排除作为"配体"的金属
  - 晶体学试剂: EDO, PEG, MPD 等
  - 从 PDB 常见非功能配体列表整理，初始约 50 个 HET code
  - **验收**: 常见非功能配体被正确排除

- [ ] 2.2.4 辅因子白名单 (cofactor) 实现
  - 维生素衍生物: PLP, NAD, NAP (NADP), FAD, FMN, THM (thiamine), Biotin 等
  - 核苷酸: ATP, ADP, AMP, GTP, GDP 等
  - 金属簇: HEM, FES, SF4, MGD 等 (在配体上下文中为辅因子)
  - CoA 衍生物: COA, ACO 等
  - SAM/SAH: SAM, SAH
  - 从 HET_to_ChEBI_mapping 中筛选 ChEBI 分类为 cofactor 的条目
  - **验收**: 辅因子白名单包含常见辅因子 (>20个)

- [ ] 2.2.5 M-CSA 配体标注提取
  - 从缓存的 M-CSA entries 中提取配体标注信息
  - M-CSA 可能在 `residues[]` 中标注某些 HET 残基的角色
  - 部分条目在 `ligands[]` 字段中记录配体信息
  - 将 M-CSA 的配体标注映射到 HET code
  - **验收**: M-CSA 配体标注可正确提取

- [ ] 2.2.6 验收测试
  - BZG (benzylpenicillin, β-lactamase底物) → substrate
  - PLP (pyridoxal phosphate) → cofactor
  - NAG (N-acetylglucosamine, 糖基化修饰) → excluded
  - SO4 (sulfate, 缓冲液) → excluded
  - **验收**: 已知配体分类全部正确

---

## 输出文件清单

- `cgd/parsers/ligand_classifier.py`
- `cgd/parsers/ligand_whitelist.json` (辅因子白名单)
- `cgd/parsers/ligand_blacklist.json` (排除名单)

---

## 常见陷阱

1. **M-CSA 配体字段缺失**: 部分 M-CSA 条目不包含 `ligands[]` 字段，需 graceful 降级到 Level 3/4 判断
2. **HET code 大小写**: PDB 文件中 HET code 可能为小写，需统一转大写再查表
3. **同一配体不同角色**: PLP 在转氨酶中是辅因子，但在个别条目中可能是底物；M-CSA Level 1/2 标注优先
4. **白名单与黑名单冲突**: 某些分子 (如 ATP) 可能既是辅因子又在某些上下文中是底物，以 M-CSA 标注为准
5. **排除名单不完整**: 首批50个 HET code 不可能覆盖所有非功能配体，需在 DS3 构建中持续补充
6. **HET code 重叠**: 部分短代码 (如 EDO) 可能是不同分子，需确认 PDBe ChemComp 定义

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2-3.md` 继续
