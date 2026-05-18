# Phase 2.5-2: PDB获取+残基定位

**Phase**: 2.5  
**任务编号**: 2.5.2  
**前置依赖**: phase-2.5-1 (场景判定模块)  
**阻塞后续**: phase-2.5-3 (配体Mol构建), phase-2.5-5 (Scene A验证)  
**预计耗时**: 0.8天 (+0.2天 for D19扩展)  

---

## 任务清单

- [ ] 2.5.2.1 编写 `ez_validator/pdb_locator.py` 框架
  - 定义核心函数: `locate_pdb_and_residues(ec_code, uniprot_id, mcsa_id) → PDBLocationResult`
  - `PDBLocationResult`: pdb_id, chain_id, residue_map, resolution, has_ligand
  - **验收**: 模块框架可导入运行

- [ ] 2.5.2.2 实现 RCSB 搜索 + 多条件排序
  - 调用 RCSB Search API 按 EC/UniProt 查询 PDB ID 列表
  - 多条件排序优先级:
    1. 分辨率 (越低越好)
    2. 配体存在 (有底物配体优先)
    3. 残基完整性 (催化残基全部存在优先)
  - 去重: 同一蛋白质多个 PDB 只保留最优
  - ⭐ 复用 `fetch_pdb_info()` (PDB下载), `parse_pdb_text()` (PDB解析)
  - **验收**: EC=3.5.2.6 → 返回最优 PDB 及其元信息

- [ ] 2.5.2.3 实现 M-CSA 催化残基定位
  - 从 M-CSA API 的 `residue_chains` 字段获取催化残基编号
  - 映射: M-CSA residue_number → PDB residue_number + chain
  - 处理 chain ID 不一致问题 (M-CSA 与 PDB 编号可能不同)
  - ⭐ 复用 `_predict_active_site_internal()` (活性位点预测)
  - **验收**: 1BTL 催化残基 SER70, GLU166 等在 PDB 中正确定位

- [ ] 2.5.2.4 实现 DBREF→UniProt 映射
  - 从 PDB DBREF 记录提取 UniProt 映射
  - 用于验证 M-CSA 条目与 PDB 条目的对应关系
  - ⭐ 复用 `_parse_dbref_records()` 从 pdb_handler.py
  - **验收**: 1BTL 的 DBREF 记录正确解析

- [ ] 2.5.2.5 实现配体 SMILES 查找
  - 给定 PDB + HET code → 查找配体 SMILES
  - ⭐ 复用 `get_ligand_smiles_with_fallback()` 从 ligand_compare.py
  - **验收**: 1BTL 的配体 SMILES 可查到

- [ ] 2.5.2.6 1BTL 端到端验证
  - 给定 1BTL → 定位催化残基 SER70(OG), GLU166(OE2) 等
  - 检查残基坐标可提取
  - 检查配体信息可获取
  - **验收**: Catalytic residues located in 1BTL (SER70, GLU166, etc.)

- [ ] 2.5.2.7 实现 locate_by_mcsa_id(mcsa_id)
  - D19 PDB自动预选核心函数
  - 流程: mcsa_id → M-CSA缓存 → EC/UniProt → locate_pdb_and_residues()
  - M-CSA缓存路径: `data/cache/mcsa_entries/entry_{mcsa_id}.json`
  - 降级: 缓存缺失→用户EC/UniProt→Scene C
  - **验收**: 通过mcsa_id可自动定位PDB和残基

- [ ] 2.5.2.8 实现 check_residue_compatibility(pdb_id, residue_info)
  - D19残基兼容性检查
  - 输入: pdb_id + ResidueInfo (from types.py)
  - 输出: ResidueCompatibilityReport (from types.py)
  - ⭐ **C1修复**: ResidueCompatibilityReport 和 LocatedResidue 定义在 ez_validator/types.py 中，本模块从 types 导入，避免循环依赖
  - 兼容性判定逻辑: 全located→A, 无配体→B, 关键缺失→C
  - 双候选消歧: Asp/Glu_pro → 3D距离检查
  - **验收**: 残基兼容性检查可判定推荐场景

---

## 输出文件清单

- `ez_validator/pdb_locator.py` (含 locate_by_mcsa_id + check_residue_compatibility)
- `tests/test_pdb_locator.py`

---

## 常见陷阱

1. **68% 复用**: 本任务核心是调用 `pdb_handler.py` 已有函数，不要重写 PDB 下载/解析逻辑，直接 import 复用
2. **M-CSA residue_chains 格式**: `residue_chains[].code` 是三字母氨基酸编码，`residue_chains[].resid` 是残基编号(字符串)，需注意类型转换
3. **chain ID 映射**: M-CSA 记录的 chain 可能与 PDB 不一致，需用 DBREF 做交叉验证
4. **多 PDB 竞争**: 同一酶可能有多个 PDB，多条件排序时需统一评分函数，避免不同排序维度冲突
5. **缺失残基**: 部分催化残基可能在 PDB 中缺失 (如柔性 loop 区域)，需在结果中标注并降低置信度
6. **M-CSA缓存依赖**: locate_by_mcsa_id() 依赖 Phase 1-1 (M-CSA批量爬取, Phase 3-1补充扩展) 的缓存，缓存缺失时需降级
7. **双候选消歧时机**: Asp/Glu_pro 的消歧在check_residue_compatibility中完成，不要在rule_mapper中提前消歧
8. **同组共享PDB**: 同一mcsa_id的路径共享PDB搜索结果，避免重复API调用

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2.5-3.md` 继续
