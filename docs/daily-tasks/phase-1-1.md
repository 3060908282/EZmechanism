# Phase 1-1: M-CSA 批量爬取

**Phase**: 1  
**任务编号**: 1.1  
**前置依赖**: Phase 0 完成 (API连通性已验证)  
**阻塞后续**: phase-1-2, phase-1-3, phase-1-4, phase-1-6, phase-1-7, phase-1-9  
**预计耗时**: 2天  

---

## 任务清单

- [ ] 1.1.1 编写 M-CSA API 分页爬取脚本
  - 使用 `mcsa_api_client.py` 中的接口
  - 分页获取全部 1003 条 entries
  - 实现 rate limiting: 每次请求间隔 ≥ 1 秒，避免被 API 封禁
  - 实现断点续传：已下载的 entry 不重复请求
  - **验收**: 脚本可稳定运行至 1003 条完成

- [ ] 1.1.2 解析每条 entry 的关键字段
  - `mcsa_id`: 条目唯一标识
  - `enzyme_name`: 酶名称
  - `all_ecs`: 所有 EC 编号列表
  - `residues[]`: 催化残基列表
    - `residues[].roles[]`: 残基角色列表 (含 function_type, function, group_function)
    - `residues[].residue_chains[]`: 残基链信息 (含 code, chain, resid)
  - `steps[]`: 机制步骤列表
  - `cofactors`: 辅因子列表
  - `compounds`: 化合物/反应物列表 (含 ChEBI ID)
  - **验收**: 任意 entry 可正确解析上述全部字段

- [ ] 1.1.3 缓存每条 entry 为独立 JSON 文件
  - 存储路径: `data/cache/mcsa_entries/entry_{mcsa_id}.json`
  - 每个文件包含该 entry 的完整原始数据 + 解析后的关键字段
  - 验证每个缓存文件大小 > 5KB (确保内容完整)
  - **验收**: `data/cache/mcsa_entries/` 下有 1003 个 JSON 文件

- [ ] 1.1.4 生成 entry 索引文件
  - 输出路径: `data/cache/mcsa_entries/index.json`
  - 结构: `{total: 1003, entries: [{mcsa_id, enzyme_name, ec, pdb_ids}]}`
  - `ec` 取第一个 EC 编号
  - `pdb_ids` 从 residues 中提取所有相关 PDB ID
  - **验收**: index.json 列出全部 1003 条 entries，字段完整

---

## 输出文件清单

- `data/cache/mcsa_entries/entry_*.json` (1003 个文件)
- `data/cache/mcsa_entries/index.json`

---

## 常见陷阱

1. **API 限速**: M-CSA API 对频繁请求有限制，务必在每次请求间 sleep ≥ 1 秒；批量爬取前先用少量条目测试
2. **字段缺失**: 部分 entry 的 residues 或 steps 可能为空列表，解析时需要防御性编程，避免 KeyError
3. **EC 编号格式**: `all_ecs` 可能返回多个 EC 编号，部分包含 " - " 连接符表示跨类 EC，需妥善处理
4. **residue_chains 编码**: 注意 `residue_chains[].code` 使用三字母氨基酸编码 (SER, GLU 等)，需与 PDB 的单字母/三字母对应
5. **缓存完整性**: 网络中断后重跑时，检查已有缓存文件是否完整 (文件大小 > 5KB)，避免因部分写入导致数据损坏

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-1-2.md` 继续
