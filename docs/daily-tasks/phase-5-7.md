# Phase 5-7: Agent⑥综合评审

**Phase**: 5  
**任务编号**: 5.7  
**前置依赖**: phase-5-6 (Agent③④⑤产出评审结果)  
**阻塞后续**: phase-5-8 (置信度综合需要Arbiter结果)  
**预计耗时**: 1.5天  

---

## 任务清单

- [ ] 5.7.1 编写 `agents/agent6_arbiter.py` 框架
  - 核心函数: `arbitrate(agent_reviews, cgps_result, ez_verification) → ArbiterResult`
  - `ArbiterResult`: verdict ("accept"/"reject"/"needs_revision"), confidence, reasoning, adjustments
  - **验收**: 模块可导入运行

- [ ] 5.7.2 实现聚合逻辑
  - 汇总 Agent③④⑤ 的评审结果:
    - 多数 verdict: 2/3 accept → accept; 2/3 reject → reject; else → needs_revision
    - 加权: 按 agent confidence 加权投票
  - 结合 CGPS 和 EZ 验证结果:
    - CGPS high + agents accept → accept (高置信)
    - CGPS grey + agents split → needs_revision
    - CGPS reject + agents reject → reject
  - **验收**: 聚合逻辑覆盖主要组合情况

- [ ] 5.7.3 实现 LLM 综合评审 prompt
  - Prompt 结构:
    ```
    System: 你是催化机制评审仲裁者
    Input: Agent③④⑤评审结果 + CGPS评分 + EZ验证结果
    Task: 综合判断机制是否可信
    Output JSON: {
      verdict: "accept"/"reject"/"needs_revision",
      confidence: 0.0-1.0,
      reasoning: "...",
      adjustments: {s_geo_adjustment: ±0.x, ...}
    }
    ```
  - 关键: 仲裁者需处理 Agent 间的矛盾意见
  - **验收**: LLM 可产出合理的仲裁结果

- [ ] 5.7.4 实现一致性检查
  - 同一机制多次仲裁 → verdict 应一致
  - 测试: 10 个已知机制 → Arbiter 一致率 >70%
  - 不一致分析: 记录不一致的原因 (哪一步骤/哪个维度)
  - **验收**: Arbiter consistency >70%

- [ ] 5.7.5 实现无 LLM 降级
  - LLM 不可用时: 仅用 CGPS + EZ 结果
  - 降级裁决: CGPS > θ_high → accept; CGPS < θ_low → reject; else → needs_revision
  - 无 Agent 评审 → confidence 降低
  - **验收**: 无 LLM 时仍有合理裁决

- [ ] 5.7.6 ⭐ 实现 Scene C 低分仲裁特殊逻辑 (三层漏斗第二层整合)
  - **背景**: Scene C + 低分强制触发Agent③④⑤后，仲裁结果可能为`needs_revision`但没有更好替代方案。此时系统不能卡住，需输出结构化的降级分析报告
  - 处理逻辑:
    1. 正常仲裁流程 → ArbiterResult
    2. **Scene C + needs_revision 特殊处理**:
       - 如果ArbiterResult.verdict == "needs_revision" 且 scene == "C":
         - 不回退重试 (Scene C无法升级)
         - 在ArbiterResult中附加 `fallback_analysis` 字段 (见phase-5-8定义)
         - 将verdict语义从"需修订"转为"低置信度假设"——系统定位从"预测工具"变为"假设生成工具"
    3. **Scene C + reject 特殊处理**:
       - 如果全部Agent都reject → 明确输出"该机制在当前数据下不可信"
       - 但仍输出fallback_analysis供参考 (可能对其他候选机制有用)
  - ArbiterResult 扩展:
    ```python
    @dataclass
    class ArbiterResult:
        verdict: str
        confidence: float
        reasoning: str
        adjustments: dict
        # ⭐ 新增: Scene C降级分析 (仅Scene C + 低分时填充)
        fallback_analysis: Optional[dict] = None
        scene_c_enhanced: bool = False  # 标记是否经过Scene C增强处理
    ```
  - **验收**: Scene C + needs_revision → fallback_analysis不为空; Scene A/B不受影响

---

## 输出文件清单

- `agents/agent6_arbiter.py`
- `agents/prompts/arbiter_prompt.py`
- `tests/test_agent6_arbiter.py`

---

## 常见陷阱

1. **多数投票陷阱**: 2/3 accept 不一定正确，需结合 confidence 加权而非简单多数
2. **仲裁者偏见**: LLM 可能偏向于 "needs_revision" (最安全的选择)，需在 prompt 中强调决策性
3. **confidence 校准**: Arbiter 的 confidence 需与 CGPS 分数对齐，避免两者严重矛盾
4. **循环依赖**: Arbiter 不应修改底层 CGPS/EZ 评分，仅做裁决和置信度调整
5. **⭐ Scene C needs_revision不是死循环**: Scene C无法升级验证，Arbiter给出needs_revision后不应重试验证流程，而应直接输出fallback_analysis并标记scene_c_enhanced=True

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5-8.md` 继续
