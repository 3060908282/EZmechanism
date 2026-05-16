# Phase 1-2: PDB 批量下载

**Phase**: 1  
**任务编号**: 1.2  
**前置依赖**: phase-1-1 (需要 M-CSA entries 提取 PDB ID)  
**阻塞后续**: phase-1-5, phase-1-8, phase-1-9, phase-1-10  
**预计耗时**: 1.5天  

---

## 任务清单

- [ ] 1.2.1 从 M-CSA entries 提取唯一 PDB ID 列表
  - 读取 `data/cache/mcsa_entries/index.json`
  - 提取所有 entries 的 `pdb_ids` 字段
  - 去重得到唯一 PDB ID 列表
  - 统计总数 (预计约 800 个唯一 PDB ID)
  - **验收**: 生成去重后的 PDB ID 列表文件，记录总数

- [ ] 1.2.2 批量下载 PDB 文件
  - 使用 `fetch_pdb_info()` (来自 `pdb_handler.py`) 下载 PDB 文本
  - Rate limiting: 每次下载间隔 ≥ 0.5 秒
  - 缓存到 `data/cache/pdb_files/{pdb_id}.pdb`
  - 下载前检查文件是否已存在 (断点续传)
  - **验收**: 下载脚本可稳定运行

- [ ] 1.2.3 追踪下载失败和重试
  - 记录首次下载失败的 PDB ID 到 `data/cache/pdb_files/download_failures.json`
  - 对失败条目进行最多 3 次重试，每次间隔 5 秒
  - 重试仍失败的标记为 "permanent_failure"，记录失败原因
  - **验收**: 失败日志包含 PDB ID + 失败原因 + 重试次数

- [ ] 1.2.4 验证下载完整性
  - 检查每个 PDB 文件是否包含 ATOM 记录
  - 统计总下载数、成功数、失败数
  - 要求成功下载率 > 90%
  - 输出摘要到 `data/cache/pdb_files/download_summary.json`
  - **验收**: ~800 个 PDB 文件已下载，成功率 > 90%

---

## 输出文件清单

- `data/cache/pdb_files/{pdb_id}.pdb` (~800 个文件)
- `data/cache/pdb_files/download_failures.json`
- `data/cache/pdb_files/download_summary.json`

---

## 常见陷阱

1. **PDB ID 大小写**: PDB ID 在 M-CSA 中可能为小写，但 PDB 服务器不区分大小写；本地缓存统一使用大写命名
2. **已废弃 PDB ID**: 部分 PDB ID 已被废弃或替换 (superseded)，需处理重定向或记录为失败
3. **大文件超时**: 部分大分子 PDB 文件可能超过 10MB，需设置合理的下载超时时间 (建议 60 秒)
4. **网络不稳定**: 批量下载过程中网络中断很常见，断点续传机制是必须的
5. **磁盘空间**: ~800 个 PDB 文件约需 2-3 GB 磁盘空间，提前确认磁盘余量

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-1-3.md` 继续
