# Phase 5-6: Agent③④⑤

**Phase**: 5  
**任务编号**: 5.6  
**前置依赖**: phase-5-5 (争议检测确定触发哪些Agent)  
**阻塞后续**: phase-5-7 (Agent⑥需要③④⑤的评审结果)  
**预计耗时**: 3天  

---

## 任务清单

- [ ] 5.6.1 编写 `agents/agent3_catalytic.py` — 催化化学审查
  - 核心函数: `review_catalytic_chemistry(mechanism, pdb_structure, cgd_datasets) → CatalyticReview`
  - `CatalyticReview`: accept/reject/needs_revision, confidence, reasoning, specific_issues
  - Prompt 要点:
    - 残基角色是否与催化功能匹配 (如 SER 作为亲核试剂)
    - 催化残基的 pKa 是否适合其功能
    - 辅因子是否为该反应类型所必需
    - 反应机理是否符合已知催化策略
  - **验收**: Agent③可返回结构化评审结果

- [ ] 5.6.2 编写 `agents/agent4_structural.py` — 结构生物学审查
  - 核心函数: `review_structural_biology(mechanism, pdb_structure, distance_scores) → StructuralReview`
  - `StructuralReview`: accept/reject/needs_revision, confidence, reasoning, specific_issues
  - Prompt 要点:
    - 活性位点几何是否合理 (距离/角度)
    - 底物是否能进入活性位点 (通道分析)
    - 构象变化是否需要 (induced fit)
    - 同源结构是否支持该机制
  - **验收**: Agent④可返回结构化评审结果

- [ ] 5.6.3 编写 `agents/agent5_literature.py` — 文献验证审查
  - 核心函数: `review_literature(mechanism, enzyme_info) → LiteratureReview`
  - `LiteratureReview`: accept/reject/needs_revision, confidence, reasoning, references
  - Prompt 要点:
    - 该机制是否有文献支持
    - 是否有已知的替代机制
    - 关键残基突变实验数据是否一致
    - 辅因子需求是否与文献一致
  - **验收**: Agent⑤可返回结构化评审结果

- [ ] 5.6.4 统一评审结果格式
  - 所有 Agent 返回统一格式:
    ```python
    @dataclass
    class AgentReview:
        agent_id: str          # "agent3" / "agent4" / "agent5"
        verdict: str           # "accept" / "reject" / "needs_revision"
        confidence: float      # 0.0-1.0
        reasoning: str         # 推理过程
        specific_issues: List[str]  # 具体问题列表
    ```
  - **验收**: 三个Agent输出格式一致

- [ ] 5.6.5 实现并行调用
  - 争议检测触发多个Agent → 并行调用
  - `concurrent.futures.ThreadPoolExecutor` → 同时调用 Agent③④⑤
  - 部分Agent失败 → 仅用成功的Agent结果
  - **验收**: Multi-agent review returns structured feedback

---

## 输出文件清单

- `agents/agent3_catalytic.py`
- `agents/agent4_structural.py`
- `agents/agent5_literature.py`
- `agents/prompts/catalytic_prompt.py`
- `agents/prompts/structural_prompt.py`
- `agents/prompts/literature_prompt.py`
- `tests/test_agent3_catalytic.py`
- `tests/test_agent4_structural.py`
- `tests/test_agent5_literature.py`

---

## 常见陷阱

1. **Prompt 质量**: Agent③④⑤ 的评审质量高度依赖 prompt 工程，需多次迭代优化
2. **LLM 幻觉锚定**: 每个 Agent 的 prompt 应包含具体的 CGD 数据 (距离、频率)，减少 LLM "凭空"推理
3. **verdict 校准**: LLM 可能倾向于给 "accept" (礼貌偏好)，需在 prompt 中强调批判性思维
4. **超时管理**: 3个Agent并行调用，总时间受最慢Agent限制，需设置单Agent超时 (60s)

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5-7.md` 继续
