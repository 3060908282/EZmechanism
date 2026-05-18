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
    2. 场景判定 (Scene A/B/C) — ⭐ 含Step 2.5同源搜索增强(2.5.1.9) + Scene C前置引导(2.5.1.10)
    2.5. ⭐ 氧化还原步骤分类 (D22): 调用 redox_step_classifier → 含金属价态变化的路径强制降级Scene C + metal_coordination_analyzer配位几何分析
    3. MechFind MILP 求解 → Top-N 候选
    3.5. ⭐ PDB预选 + 用户确认 (D19: 选择题而非填空题)
    4. Agent①化学审查 (若 use_llm)
    5. Agent②规则翻译 + DS5 映射 (若 use_llm)
    6. EZ 验证 (Scene A/B/C 分支)
    7. CGPS 评分
    8. 争议检测 — ⭐ 含触发条件⑥: Scene C + 低分 → 强制触发Agent③④⑤ (5.5.8)
    9. Agent③④⑤⑥ 评审 (若触发争议 + use_llm) — ⭐ Scene C使用专用prompt (5.6.6)
    9.5. ⭐ **Scene C低分增强** (三层漏斗第二层): 
        - 条件: scene=="C" AND quality_score < T_Q
        - 步骤: 交叉验证(scene_c_cross_validator) → fallback_analysis生成(scene_c_fallback_analyzer) → D22 redox_specific整合
        - 输出: VerificationResult + fallback_analysis + reliability_assessment
    9.6. ⭐ **Scene C后置引导** (三层漏斗第三层):
        - 条件: Scene C + 最终quality_score < T_Q
        - 输出: recommendation (如何升级验证) + experimental_suggestion (实验建议)
    10. 置信度综合计算
    11. 排序输出
  - **验收**: Full pipeline runs end-to-end; Scene C低分→fallback_analysis非空; Scene A/B不受影响

- [ ] 6.1.2 集成 Phase 2.5 管线编排器
  - 复用 `pipeline_orchestrator.py` 的核心逻辑
  - 扩展: 加入 Agent 管线 (Phase 5)
  - 扩展: 加入氧化还原验证 (Phase 5.5)
  - 扩展: 加入 D22 氧化还原步骤分类逻辑 (redox_step_classifier + metal_coordination_analyzer)
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
    - enable_d22_redox_classification: True  # D22: 是否启用金属氧化还原自动降级
    - grey_zone_penalty: {verified: 1.0, grey_zone: 0.85, unverified: 0.60}
  - **验收**: 配置文件可加载，参数可覆盖

- [ ] 6.1.5 端到端冒烟测试
  - 测试1: Scene A 案例 (1BTL) → 完整管线运行 → 输出合理
  - 测试2: Scene C 案例 → CGPS only → 输出合理
  - 测试2b: ⭐ Scene C + 低分案例 → fallback_analysis非空 + reliability_assessment + recommendation
  - 测试2c: ⭐ Scene C + 高分案例 → fallback_analysis为空 (不需要降级分析)
  - 测试3: LLM 不可用 → 降级模式 → 输出合理
  - 测试4: 金属氧化还原案例 → D22降级至Scene C + 配位几何分析 → redox_specific非空
  - 测试5: ⭐ 同源结构案例 → 无直接PDB但有同源 → Scene B (非Scene C) + source_type="homolog"
  - **验收**: 7 个冒烟测试全部通过

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
5. **⭐ D22金属氧化还原降级**: 场景判定仅基于PDB+配体可用性，但候选机制可能含金属价态变化步骤(Fe²⁺→Fe³⁺)，RunReactants无法模拟。必须在场景判定后调用redox_step_classifier，将含金属价态变化的路径自动降级至Scene C
6. **⭐ 三层漏斗集成顺序**: Scene C增强处理的三个层次必须按序执行: (1)预防(Step 2.5同源搜索) → (2)增强(低分→Agent+fallback_analysis) → (3)引导(recommendation+experimental_suggestion)。不能跳过预防直接进入增强——能升级到Scene B的就不需要fallback_analysis
7. **⭐ fallback_analysis的性能影响**: Scene C低分时强制触发3个Agent+交叉验证+fallback分析，额外耗时约5-15秒。对于批量验证场景，需考虑是否所有Scene C低分结果都需要完整fallback_analysis，还是只对Top-1候选执行

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-6-2.md` 继续
