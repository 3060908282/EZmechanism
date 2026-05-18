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
  - ⚠️ **M18修正: 严格禁止编造文献引用**: Agent⑤的prompt必须包含以下硬性指令:
    - "你必须严格区分已知事实和你的推理。如果你不确定某条文献是否存在，请回答'unknown'而非编造引用。"
    - "禁止生成具体的PubMed ID、DOI、作者名或期刊名，除非你完全确定其存在。如需引用，仅提供概括性描述(如'已有文献报道转氨酶中PLP形成Schiff碱的机制')。"
    - references字段中，编造的引用和真实的引用必须明确区分(标记`verified: false`/`verified: true`)
    - 默认所有LLM生成的引用为`verified: false`，除非在CGD或M-CSA数据中有对应记录
  - **验收**: Agent⑤可返回结构化评审结果; 文献引用标注verified状态; 无编造的DOI/PMID

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

- [ ] 5.6.6 ⭐ 实现 Scene C 专用 Prompt 约束 (三层幻觉防护)
  - **背景**: Scene C下Agent无3D结构数据，幻觉风险远高于Scene A/B。需三层防护机制确保输出可靠性
  - **防护层1: Scene C专用系统提示** — 编写 `agents/prompts/scene_c_system_prompt.py`
    ```python
    SCENE_C_SYSTEM_PROMPT = """
    ⚠️ 警告：当前为 Scene C 模式（无 3D 结构数据）

    约束规则：
    1. 禁止编造具体的原子坐标、距离、角度等 3D 信息
    2. 所有催化残基推断必须基于：
       - 已知 EC 类的保守残基模式
       - 序列比对结果
       - 文献支持
    3. 每个推断必须标注置信度：
       - high: 有 EC 类保守性 + 文献支持
       - medium: 仅有 EC 类保守性
       - low: 仅基于化学推理
    4. 如无法确定，明确说明"无法推断"而非猜测

    输出格式（每个推理结论必须包含）：
    {
      "inference": "...",
      "evidence": ["EC 类保守模式", "PMID:123456"],
      "confidence": "high/medium/low",
      "fabrication_risk": "low/medium/high"
    }
    """
    ```
  - Agent③/④/⑤在Scene C模式下，system_prompt中注入SCENE_C_SYSTEM_PROMPT
  - **防护层2: 多Agent交叉验证** — 编写 `agents/scene_c_cross_validator.py`
    - 核心函数: `cross_validate(agent3_result, agent4_result, agent5_result) → CrossValidationResult`
    - 验证逻辑:
      - Agent③催化残基推断 ∩ Agent⑤文献残基共识 → agreement_score
      - agreement_score ≥ 0.67 → fabrication_risk="low"
      - 0.33 ≤ agreement_score < 0.67 → fabrication_risk="medium"
      - agreement_score < 0.33 → fabrication_risk="high"
    - 输出: `CrossValidationResult(agreement_score, fabrication_risk, consensus_residues, disputed_residues)`
  - **防护层3: 可靠性评估标注** — 在AgentReview中增加Scene C可靠性字段:
    ```python
    @dataclass
    class AgentReview:  # 扩展
        # ... 原有字段 ...
        scene_c_reliability: Optional[SceneCReliability] = None  # 仅Scene C时填充

    @dataclass
    class SceneCReliability:
        fabrication_risk: str          # "low"/"medium"/"high"
        agent_agreement_score: float   # 0.0-1.0
        consensus_residues: List[str]  # Agent间一致的残基
        disputed_residues: List[str]   # Agent间不一致的残基
        recommendation: str            # 可靠性建议文本
    ```
  - **验收**: Scene C模式下Agent使用专用prompt; 交叉验证可检测不一致; 可靠性评估输出完整

---

## 输出文件清单

- `agents/agent3_catalytic.py`
- `agents/agent4_structural.py`
- `agents/agent5_literature.py`
- `agents/prompts/catalytic_prompt.py`
- `agents/prompts/structural_prompt.py`
- `agents/prompts/literature_prompt.py`
- `agents/prompts/scene_c_system_prompt.py` (⭐ 新增: Scene C专用系统提示)
- `agents/scene_c_cross_validator.py` (⭐ 新增: Scene C多Agent交叉验证)
- `tests/test_agent3_catalytic.py`
- `tests/test_agent4_structural.py`
- `tests/test_agent5_literature.py`
- `tests/test_scene_c_cross_validator.py` (⭐ 新增)

---

## 常见陷阱

1. **Prompt 质量**: Agent③④⑤ 的评审质量高度依赖 prompt 工程，需多次迭代优化
2. **LLM 幻觉锚定**: 每个 Agent 的 prompt 应包含具体的 CGD 数据 (距离、频率)，减少 LLM "凭空"推理
3. **verdict 校准**: LLM 可能倾向于给 "accept" (礼貌偏好)，需在 prompt 中强调批判性思维
4. **超时管理**: 3个Agent并行调用，总时间受最慢Agent限制，需设置单Agent超时 (60s)
5. **⭐ M18修正: Agent⑤文献幻觉风险极高**: LLM编造文献引用(DOI/PMID/作者)的倾向非常强，这是已知的LLM系统性缺陷。必须在prompt中硬编码"禁止编造"指令，且所有引用默认标记为`verified: false`。如果Agent⑤的references列表中全部为`verified: false`，则该Agent的confidence应自动降权至0.3
6. **⭐ Scene C下幻觉风险倍增**: 无3D结构时Agent更容易"编造"几何信息(如"亲核残基距底物3.5Å")。Scene C专用prompt的约束1(禁止编造3D信息)必须严格执行，输出中任何3D信息都应视为幻觉标记
7. **⭐ 交叉验证不等于真实验证**: 多Agent一致性(agreement_score高)不等于结果正确——三个Agent可能基于相同的错误前提得出一致结论。交叉验证只能检测"不一致"(高幻觉风险)，不能保证"一致"就是正确的

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5-7.md` 继续
