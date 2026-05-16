# Phase 0-2: PDB 下载 + PDBe API 验证

**Phase**: 0  
**任务编号**: 0.3, 0.4  
**前置依赖**: 0.1 目录结构已创建，`cgd/parsers/` 目录可写入  
**阻塞后续**: 0.5 RCSB Search（依赖 PDB 下载流程验证）、Phase 1 PDB 批量下载  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 0.3 PDB下载验证
  - 使用现有 `pdb_handler.py` 的 `fetch_pdb_info()` 下载 1BTL.pdb
  - 调用 `parse_pdb_text()` 解析 PDB 文本
  - 验证 ATOM 记录可正确提取：链、残基序号、原子名、坐标
  - 验证文件大小 > 100KB
  - 验证包含 chain A
  - 验证催化残基存在：SER70 (OG原子)、GLU166 (OE1/OE2原子) 等关键残基
  - 将下载的 PDB 文件缓存到 `data/cache/pdb_files/1BTL.pdb`
  - **验收**: 1BTL.pdb 文件 > 100KB；`parse_pdb_text()` 可提取 chain A 的 SER70 和 GLU166；ATOM 记录数合理

- [ ] 0.4 PDBe API验证
  - 调用 PDBe API: `https://www.ebi.ac.uk/pdbe/api/pdb/entry/ligand_monomers/1btl` (查看PDB条目的配体列表) 和 `https://www.ebi.ac.uk/pdbe/api/pdb/compound/MOLECULE/BZG` (按HET code查化合物信息; ⚠️ 此端点接受HET code而非PDB ID)
  - 验证 HET code (如 BZG) 的化合物信息返回 ChEBI ID
  - 验证 ligand_monomers 响应结构: JSON 包含 `1btl` 键 → 配体列表 → 每项含 `chem_id`, `name` 等字段
  - 测试其他配体分类查找: 如 `_lookup_pdbechem()` 对 HET 代码的 SMILES 查询
  - 记录 API 响应格式到注释/文档，供后续 HET_to_ChEBI 映射构建使用
  - **验收**: PDBe API 可返回 1BTL 的配体化合物信息；ChEBI ID 可提取；API 响应格式明确

---

## 输出文件清单

[data/cache/pdb_files/1BTL.pdb] [cgd/parsers/pdbe_api_client.py] (如需新建)  

---

## 常见陷阱

1. **PDB ID 大小写**: RCSB FTP 用大写 `1BTL`，PDBe API 用小写 `1btl`；`fetch_pdb_info()` 内部是否自动转换需确认
2. **`fetch_pdb_info()` 行为差异**: 该函数可能返回解析后的结构而非原始文本；需确认返回值类型（str vs dict），必要时用 `requests` 直接下载原始 PDB
3. **1BTL 催化残基编号**: M-CSA 标注的催化残基编号可能与 PDB 文件中的实际编号不一致（链偏移、插入码等）；SER70 在 chain A 中可能实际为 `70 ` (含空格)
4. **PDBe compound 端点空响应**: 部分小分子 HET code 在 PDBe 中无 ChEBI 映射，需设计 fallback 策略（直接查 ChEBI 或用 SMILES）
5. **网络限速**: PDBe API 无严格限速但建议 1 秒间隔；PDB FTP 限 10 并发连接

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-0-3.md` 继续
