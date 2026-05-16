# Phase 0-5: HTTP 缓存 + Phase 0 检查点

**Phase**: 0  
**任务编号**: 0.8, 0.10, 0.11, 0.12  
**前置依赖**: 0.2 M-CSA API, 0.3 PDB 下载, 0.4 PDBe API, 0.5 RCSB Search 均已验证  
**阻塞后续**: Phase 1 批量数据获取（1.1 M-CSA 批量爬取、1.2 PDB 批量下载均依赖缓存模块避免重复请求）  
**预计耗时**: 2.5天  

---

## 任务清单

- [ ] 0.8 缓存模块
  - 编写 `cgd/utils/http_cache.py`，实现 HTTP 请求缓存
  - 支持基于文件的缓存: 请求 URL → hash → 本地 JSON 文件
  - 支持 TTL (Time-To-Live): 缓存文件过期后自动重新请求
  - 默认 TTL: 7 天（PDB 文件等不常变化的数据）；可配置
  - 避免重复 API 调用: M-CSA API、PDBe API、RCSB API 的相同请求只发一次
  - 实现请求限速: 两次请求间隔至少 1 秒（`time.sleep(1)`）
  - 缓存目录: `data/cache/` 下按服务分目录（`mcsa_entries/`, `pdb_files/`, `pdbe_responses/`, `rcsb_responses/`）
  - 提供统一接口: `cached_get(url, ttl_days=7, force_refresh=False) -> dict|str`
  - 在 `mcsa_api_client.py` 和 `rcsb_api_client.py` 中集成缓存（可选，Phase 1 再做也行）
  - **验收**: 相同 URL 第二次调用从缓存读取（无 HTTP 请求）；TTL 过期后自动重新请求；1 秒限速生效；缓存文件格式正确

- [ ] 0.10 Phase 0 完整检查
  - 逐项验证 Phase 0 所有验收标准:
    - [ ] M-CSA API 可达 — Entry #1 和 #2 JSON 已缓存
    - [ ] PDB 可下载解析 — 1BTL.pdb 已缓存，ATOM 记录可提取
    - [ ] PDBe API 可达 — HET→ChEBI 映射可查询
    - [ ] RCSB Search API 可达 — 同源结构列表可查询
    - [ ] RDKit SMARTS 匹配正常 — SMILES→Mol→SMARTS→匹配 管线畅通
    - [ ] MechFind 服务可达 — port 3002 响应正常
    - [ ] MechFind 数据可导出 — Unique_Rules_1.csv 列名格式确认
  - 检查所有缓存文件完整性: `entry_1.json`, `entry_2.json`, `1BTL.pdb`, `Unique_Rules_1_sample.csv`
  - 检查所有 `__init__.py` 文件存在且 `import cgd` 无报错
  - 记录任何遗留问题或已知限制到 Phase 0 总结
  - **验收**: Phase 0 全部 6 项验收标准通过；无阻塞性问题遗留

- [ ] 0.11 环境配置
  - 创建 `.env.example` 模板文件，包含:
    - `MECHFIND_URL=http://localhost:3002`
    - `PREDICTION_SERVICE_URL=http://localhost:3003`
    - `LLM_API_KEY=` (可选，Phase 5 才需要)
    - `LLM_MODEL=gpt-4o-mini` (可选)
    - `RDKit_CACHE_DIR=data/cache/`
  - 创建 `requirements.txt`: fastapi, uvicorn, pydantic, rdkit, httpx, numpy
  - 创建 `pyproject.toml` 或确认已有
  - **验收**: `.env.example` 存在且字段完整; `pip install -r requirements.txt` 可成功

- [ ] 0.12 prediction-service 骨架初始化
  - 在 `mini-services/prediction-service/` 下创建 FastAPI 骨架:
    - `main.py`: FastAPI app + `/health` 端点 + CORS 配置
    - `requirements.txt`: fastapi, uvicorn, pydantic
  - 目录结构:
    ```
    mini-services/prediction-service/
    ├── main.py              ← FastAPI 入口 (port 3003)
    ├── requirements.txt
    ├── step25/              ← 空目录占位 (Phase 2.5 填充)
    ├── ez_validator/        ← 空目录占位 (Phase 2.5 填充)
    ├── cgd/                 ← 空目录占位 (Phase 1 填充)
    ├── cgps/                ← 空目录占位 (Phase 4 填充)
    ├── agents/              ← 空目录占位 (Phase 5 填充)
    └── pipeline/            ← 空目录占位 (Phase 6 填充)
    ```
  - ⭐ **为什么在 Phase 0 就初始化**: Phase 2.5 的验证代码需要一个运行载体，不能等到 Phase 6 才搭建 FastAPI 骨架
  - **验收**: `uvicorn main:app --port 3003` 可启动，`/health` 返回 `{"status": "ok"}`

---

## 输出文件清单

[cgd/utils/__init__.py] [cgd/utils/http_cache.py] [data/cache/pdbe_responses/.gitkeep] [data/cache/rcsb_responses/.gitkeep] [.env.example] [requirements.txt] [mini-services/prediction-service/main.py] [mini-services/prediction-service/requirements.txt]  

---

## 常见陷阱

1. **缓存 hash 碰撞**: URL 哈希建议用 SHA256 而非 MD5；文件名过长时截断前 16 字符即可
2. **并发写入冲突**: 多进程同时缓存同一 URL 可能写坏文件；MVP 阶段单进程可忽略，但加 `os.rename` 原子写入更安全
3. **TTL 判断时机**: 应在读取缓存文件时检查修改时间，而非启动时全局清除；`os.path.getmtime()` + `time.time()` 比较
4. **限速与缓存交互**: 缓存命中时不应限速（没有实际 HTTP 请求）；限速仅在缓存未命中时生效
5. **二进制 vs 文本缓存**: PDB 文件应缓存为原始文本（.pdb），JSON 响应缓存为 .json；避免统一用 pickle 导致不可读
6. **Phase 0 验收遗漏**: 容易忘记 MechFind 数据导出验证（0.9）的验收——规则 ID 格式 `{mcsa_id}_{mech_idx}_{step_idx}` 必须确认，否则 Phase 3 规则解析全部出错

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 🎉 Phase 0 全部完成！打开 `phase-1-1.md` 进入 Phase 1
