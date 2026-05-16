# Phase 1-9: HET_to_ChEBI_mapping.json

**Phase**: 1  
**任务编号**: 1.9  
**前置依赖**: phase-1-1 (M-CSA entries 中的 compounds/cofactors), phase-1-2 (PDB 文件中的 HETATM)  
**阻塞后续**: phase-2-2 (配体分类), phase-2-3 (DS3 Scene A 配体过滤)  
**预计耗时**: 2.5天  

---

## 任务清单

- [ ] 1.9.1 扩展/复用 phase-0-2 的 PDBe API 客户端 (如已存在)，否则编写 `cgd/parsers/pdbe_api_client.py`
  - PDBe API 基础 URL: `https://www.ebi.ac.uk/pdbe/api/pdb/compound/MOLECULE/{het_code}` (⚠️ 接受HET code如BZG/NAG，非PDB ID)
  - 实现 rate limiting (1 req/sec)
  - 实现响应缓存 (避免重复查询同一 HET code)
  - 实现 JSON 解析和错误处理
  - **验收**: 可成功查询 PDBe API 并返回 ChEBI 映射

- [ ] 1.9.2 收集所有 HET codes
  - 从 M-CSA entries 的 PDB 文件中提取所有 HETATM 记录
  - 提取唯一的 HET codes (3 字母代码)
  - 预计约 200-300 个唯一 HET codes
  - **验收**: 得到完整去重 HET codes 列表

- [ ] 1.9.3 实现五级权威分类策略
  - 按 CGD_MASTER_PLAN §3.2 的分类流程:
    1. **M-CSA compounds**: HET 的 ChEBI ID 匹配 M-CSA entry 的 reactant ChEBI → **substrate**
    2. **M-CSA cofactors**: HET 的 ChEBI ID 匹配 M-CSA entry 的 cofactor 字段 → **cofactor**
    3. **PDBe API**: 查询 PDBe 获取 HET 的 ChEBI + 功能注释 → 辅助判定
    4. **辅因子白名单**: PLP, NAD, NADP, FAD, FMN, TPP, THF, SAM, CoA, biotin, heme → **cofactor**
    5. **排除白名单**: NAG, MAN, BMA, ZN, MG, CA, CL, SO4, PO4, EDO, PEG, DMS → **excluded**
    6. **默认**: 无法判定的 → **excluded** (宁可漏不可错)
  - 每个分类记录 `classification_reason`
  - **验收**: 五级分类逻辑完整，每条有 classification_reason

- [ ] 1.9.4 批量查询 PDBe API
  - 对不在 M-CSA compounds/cofactors 和白名单中的 HET codes 批量查询 PDBe
  - Rate limiting: 1 req/sec
  - 缓存查询结果到 `data/cache/pdbe_responses/`
  - 处理 API 返回的异常情况 (无 ChEBI、网络错误等)
  - **验收**: 所有 HET codes 均有分类结果

- [ ] 1.9.5 输出 HET_to_ChEBI_mapping.json
  - 路径: `data/auxiliary/HET_to_ChEBI_mapping.json`
  - 每条记录: `{chebi_id, chebi_name, classification, classification_reason}`
  - key 为 HET code (3 字母)
  - **验收**: >200 条映射，格式与 CGD_MASTER_PLAN §3.2 一致

- [ ] 1.9.6 关键 HET code 验证
  - PLP → classification: "cofactor" ✓
  - NAG → classification: "excluded" ✓
  - BZG (benzylpenicillin) → classification: "substrate" ✓
  - NAD → classification: "cofactor" ✓
  - SO4 → classification: "excluded" ✓
  - **验收**: 已知 HET codes 分类正确

---

## 输出文件清单

- `cgd/parsers/pdbe_api_client.py`
- `data/auxiliary/HET_to_ChEBI_mapping.json`
- `data/cache/pdbe_responses/` (API 响应缓存目录)

---

## 常见陷阱

1. **ChEBI ID 格式**: M-CSA API 中 ChEBI ID 可能是 "CHEBI:18405" 格式，PDBe API 返回的可能是 "18405" (纯数字)，匹配时需统一格式
2. **一个 HET 多个 ChEBI**: 部分HET code 可能对应多个 ChEBI ID (如异构体)，需选择最相关的一个
3. **白名单维护**: 辅因子/排除白名单需要持续维护，建议从文件读取而非硬编码，方便后续扩展
4. **PDBe API 限速**: PDBe API 对批量查询有限制，务必 rate limiting，否则会被临时封禁 IP
5. **分类优先级严格性**: 五级分类必须严格按顺序执行，高优先级匹配后不再检查低优先级。如 NAG 在排除白名单中，即使 PDBe 返回其他信息也应标为 "excluded"
6. **金属离子**: ZN, MG, CA, FE, MN, CU 等金属离子一律标为 "excluded" (非催化配体)

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-1-10.md` 继续
