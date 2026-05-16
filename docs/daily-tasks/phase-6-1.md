# Phase 6-1: 主管线编排

**Phase**: 6  
**任务编号**: 6.1  
**前置依赖**: Phase 5 完成 (基本验证管线就绪); Phase 5.5 完成 (氧化还原验证就绪, 基本管线可不依赖)  
**阻塞后续**: phase-6-2 (API服务需要主管线), phase-6-3 (Web UI需要主管线)  
**预计耗时**: 2天  

---

## 任务清单

- [ ] 6.1.1 编写 `pipeline/main.py` — 完整管线
  - 主入口: `run_pipeline(substrate_smiles, product_smiles, ec_code?, pdb_id?, uniprot_id?, top_n=5, use_llm=True, override_residue_combination: Optional[List[str]] = None) → PipelineOutput`
    - # override_residue_combination: Phase 7.2.5渐进降级实验用, 强制指定残基组合(隔离变量)
  - 完整流程:
    1. 输入验证 (SMILES 有效性)
    2. 场景判定 (Scene A/B/C)
    3. MechFind MILP 求解 → Top-N 候选
    4. Agent①化学审查 (若 use_llm)
    5. Agent②规则翻译 + DS5 映射 (若 use_llm)
    6. EZ 验证 (Scene A/B/C 分支)
    7. CGPS 评分
    8. 争议检测
    9. Agent③④⑤⑥ 评审 (若触发争议 + use_llm)
    10. 置信度综合计算
    11. 排序输出
  - **验收**: Full pipeline runs end-to-end

- [ ] 6.1.2 集成 Phase 2.5 管线编排器
  - 复用 `pipeline_orchestrator.py` 的核心逻辑
  - 扩展: 加入 Agent 管线 (Phase 5)
  - 扩展: 加入氧化还原验证 (Phase 5.5)
  - **验收**: Phase 2.5 编排器逻辑被正确集成

- [ ] 6.1.3 实现错误处理和日志
  - 全局 try/except: 任一阶段失败 → 记录错误 → 尝试降级继续
  - 结构化日志: 每个阶段记录输入/输出/耗时/错误
  - PipelineOutput 包含:
    - results: List[VerificationResult]
    - pipeline_log: 各阶段状态
    - total_time: 总耗时
    - degraded: 是否使用降级模式
  - **验收**: 错误不导致管线崩溃，有完整日志

- [ ] 6.1.4 实现管线配置
  - `pipeline/config.yaml`: 可配置参数
    - top_n: 候选数量 (默认5)
    - use_llm: 是否启用 LLM Agent (默认True)
    - scene_override: 强制场景 (None=自动)
    - timeout_per_candidate: 单候选超时 (默认120s)
    - cgps_weights: {w1, w2, w3}
    - theta_low, theta_high: 灰色区间
  - **验收**: 配置文件可加载，参数可覆盖

- [ ] 6.1.5 端到端冒烟测试
  - 测试1: Scene A 案例 (1BTL) → 完整管线运行 → 输出合理
  - 测试2: Scene C 案例 → CGPS only → 输出合理
  - 测试3: LLM 不可用 → 降级模式 → 输出合理
  - **验收**: 3 个冒烟测试全部通过

---

## 输出文件清单

- `pipeline/main.py`
- `pipeline/config.yaml`
- `tests/test_pipeline_main.py`

---

## 常见陷阱

1. **管线复杂度**: 完整管线涉及 10+ 个阶段，需确保各阶段接口对齐
2. **超时管理**: MechFind MILP 求解可能很慢，需设置超时 (默认120s)
3. **降级级联**: 一个阶段降级可能触发后续阶段也需降级，需追踪降级链
4. **内存管理**: Top-5 候选并行评估可能占用大量内存 (每个候选有多个 Mol 对象)

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-6-2.md` 继续
