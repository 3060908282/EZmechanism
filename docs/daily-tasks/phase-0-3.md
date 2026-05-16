# Phase 0-3: RCSB Search + RDKit 环境

**Phase**: 0  
**任务编号**: 0.5, 0.6  
**前置依赖**: 0.1 目录结构，0.3 PDB 下载流程已验证  
**阻塞后续**: 0.8 缓存模块（需 RCSB API 客户端），Phase 2 同源查找（任务 2.5）  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 0.5 RCSB Search API验证
  - 编写 `cgd/parsers/rcsb_api_client.py` 封装 RCSB Search API 调用
  - 查询 1BTL 的同源结构: seq_identity >= 70%
  - API 端点: `https://search.rcsb.org/rcsbsearch/v2/query`
  - 构建查询 JSON: 按序列相似性搜索，返回 PDB ID 列表
  - 验证返回 JSON 结构: `result_set[]` → 每项含 `identifier` (PDB ID)
  - 解析响应: 提取 PDB ID 列表 + 序列一致性分数
  - 记录查询模板供 Phase 2 任务 2.5 同源查找复用
  - **验收**: RCSB Search API 返回 1BTL 的同源结构列表（至少含 1BTL 自身）；JSON 结构可解析；PDB ID 可提取

- [ ] 0.6 RDKit环境验证
  - 验证 RDKit 已安装且版本 >= 2023.03
  - 测试 SMILES → Mol 转换: `Chem.MolFromSmiles('CC(=O)O')` → 非 None
  - 测试 Mol → SMARTS 生成: `Chem.MolToSmarts(mol)` → 合法 SMARTS 字符串
  - 测试 ETKDGv3 构象生成: `AllChem.ETKDGv3()` → `AllChem.EmbedMultipleConfs(mol, numConfs=10)` → 至少 1 个构象
  - 测试 Kabsch 对齐: 生成两个构象 → 用 `kabsch_align()` 对齐 → RMSD < 0.01
  - 测试 SMARTS 匹配: `mol.GetSubstructMatches(Chem.MolFromSmarts('[OD1]'))` → 匹配数 > 0
  - 验证 `overlay_substrate.py` 中的 `generate_3d_conformer()` 和 `kabsch_align()` 可直接 import
  - **验收**: SMILES→Mol→SMARTS 管线无报错；ETKDGv3 构象生成成功；Kabsch 对齐 RMSD < 0.01；SMARTS 匹配返回结果

---

## 输出文件清单

[cgd/parsers/rcsb_api_client.py]  

---

## 常见陷阱

1. **RCSB Search API 查询格式**: 必须构建精确的 JSON 查询体，格式错误返回 400；建议从 RCSB 官方文档复制模板再修改。查询结构示例:
   ```json
   {
     "query": {
       "type": "terminal",
       "service": "sequence",
       "parameters": {
         "evalue_cutoff": 0.1,
         "identity_cutoff": 0.7,
         "sequence_type": "protein",
         "value": "M..."
       }
     },
     "return_type": "entry"
   }
   ```
2. **序列输入来源**: RCSB 序列搜索需要 FASTA 序列而非 PDB ID；需先从 1BTL.pdb 提取 FASTA 或从 UniProt 获取
3. **RDKit 版本兼容**: `ETKDGv3` 在旧版 RDKit 中不存在，需 >= 2020.09；若不可用则回退 `ETKDGv2`
4. **Kabsch 实现位置**: `kabsch_align()` 在 `overlay_substrate.py` 中，可能需要调整 import 路径；确认函数签名和返回值
5. **SMARTS 匹配注意原子映射**: SMARTS 中的 `:1` 编号是映射标签，不是原子编号；`GetSubstructMatches` 返回的是 Mol 中的原子索引元组

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-0-4.md` 继续
