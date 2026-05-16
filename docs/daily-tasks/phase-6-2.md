# Phase 6-2: API服务

**Phase**: 6  
**任务编号**: 6.2  
**前置依赖**: phase-6-1 (主管线编排)  
**阻塞后续**: phase-6-3 (Web UI调用API)  
**预计耗时**: 2天  

---

## 任务清单

- [ ] 6.2.1 搭建 FastAPI 应用框架
  - 路径: `pipeline/api.py`
  - 技术栈: FastAPI + uvicorn + pydantic
  - CORS: 允许前端访问
  - **验收**: FastAPI 应用可启动

- [ ] 6.2.2 实现 `/predict` 端点
  - 输入:
    ```json
    {
      "substrate_smiles": "CC(=O)O",
      "product_smiles": "CC(=O)[O-]",
      "ec_code": "3.1.1.7",
      "pdb_id": null,
      "top_n": 5,
      "use_llm": true
    }
    ```
  - 输出: `PredictResponse` (含 task_id); 完成后通过 GET /results/{task_id} 获取 PipelineOutput
  - 异步执行: 长时间运行的任务返回 task_id，客户端轮询
  - **验收**: /predict 端点可接收请求并返回结果

- [ ] 6.2.3 实现 `/results/{task_id}` 端点
  - 查询异步任务的结果
  - 状态: pending / running / completed / failed
  - 结果: completed 时返回 PipelineOutput
  - **验收**: 可查询任务状态和结果

- [ ] 6.2.4 实现 `/cgd/stats` 端点
  - 返回 CGD 数据集统计:
    - DS1: role_pair 数量, top 频率
    - DS2: 分组数, 覆盖率
    - DS3: Scene A/B 分布
    - DS4: 辅因子统计
    - DS5: 映射覆盖率
  - **验收**: /cgd/stats 返回正确的统计信息

- [ ] 6.2.5 实现 `/step25` 端点
  - EZ 验证子管线: 给定候选机制 + PDB → 直接运行 EZ 验证
  - 输入: mechanism, pdb_id, scene
  - 输出: VerificationResult
  - **验收**: /step25 端点可运行 EZ 验证

- [ ] 6.2.6 实现 `/verify` 和 `/scene` 端点
  - `/verify`: 给定机制+PDB → 完整验证 (Scene A/B/C)
  - `/scene`: 给定 EC/PDB → 场景判定
  - **验收**: /verify 和 /scene 端点功能正确

- [ ] 6.2.7 实现错误处理和文档 + ⭐ OpenAPI Schema 导出
  - 全局异常处理: 返回结构化错误 JSON
  - OpenAPI 文档: 自动生成 (FastAPI 默认)
  - ⭐ **OpenAPI Schema 导出**: `app.openapi()` → 保存为 `docs/api_schema.json`
    - 确保 PredictRequest, VerificationResult, SceneResult 等核心模型有完整 description
    - 导出命令: `python -c "from pipeline.api import app; import json; json.dump(app.openapi(), open('docs/api_schema.json','w'), indent=2)"`
    - 前端开发以此文件为契约，无需阅读后端代码
  - 速率限制: /predict 10次/分钟/IP, /results 60次/分钟/IP, 其余端点不限
  - **验收**: API endpoints functional, 错误处理完善, `docs/api_schema.json` 导出成功

- [ ] 6.2.8 健康检查端点: GET /health → {"status": "ok"}
  - 用于负载均衡器和监控系统探测服务状态
  - 无需认证，无速率限制
  - **验收**: GET /health 返回 {"status": "ok"}

---

## 输出文件清单

- `pipeline/api.py`
- `pipeline/api_models.py` (pydantic models)
- `docs/api_schema.json`
- `tests/test_api.py`

---

## 常见陷阱

1. **异步任务管理**: 预测任务可能运行数分钟，需用 background tasks 或 Celery 管理
2. **内存泄漏**: 多次请求后 Mol 对象可能不被回收，需在请求结束时显式清理
3. **并发安全**: 多个请求可能同时访问共享缓存，需线程安全
4. **API 超时**: FastAPI 默认无请求超时，需用 uvicorn timeout 或中间件设置

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-6-3.md` 继续
