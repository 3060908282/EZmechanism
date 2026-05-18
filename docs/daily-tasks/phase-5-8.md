# Phase 5-8: 置信度综合 + 降级 + PAP回流

**Phase**: 5  
**任务编号**: 5.8+5.9+5.12  
**前置依赖**: phase-5-7 (Agent⑥综合评审)  
**阻塞后续**: phase-5-9 (端到端测试需要完整置信度管线)  
**预计耗时**: 2.5天  

---

## 任务清单

- [ ] 5.8.1 编写 `agents/confidence.py` — 置信度综合计算
  - 整合 Phase 2.5 的 `confidence_calculator.py` 与 Agent 评审结果
  - 公式: `(0.25×MF + 0.50×EZ + 0.15×Agent + 0.10×Arbiter) × 100 × grey_zone_penalty`
  - Agent 分量: `n_accept / n_total` (Agent③④⑤中accept的比例)
  - Arbiter 分量: Agent⑥ 的裁决分数 (accept=1.0, needs_revision=0.5, reject=0.0)
  - grey_zone_penalty 吸收 CGPS 验证状态:
    - CGPS > θ_high (已验证) → penalty = 1.0
    - θ_low < CGPS ≤ θ_high (灰色区间) → penalty = 0.85
    - CGPS ≤ θ_low (未验证) → penalty = 0.60
  - quality_score = final_confidence × 100 × grey_zone_penalty
  - 阈值通过 Phase 7.1 加权成本优化确定(w=0.5)
  - 权重重归一化: 无LLM时缺失分量按比例重分配
  - **验收**: 置信度综合计算正确

- [ ] 5.9.1 编写 `agents/fallback.py` — LLM降级策略
  - LLM 不可用时的降级行为:
    - Agent①化学审查 → `residue_info.py` 硬编码规则
    - Agent②规则翻译 → DS5映射表首条匹配 (不消歧)
    - Agent③④⑤⑥ → 不执行，直接用EZ+CGPS输出
  - 降级检测: LLM API 超时/错误 → 自动切换
  - 降级恢复: LLM 恢复后自动切回 (无需重启)
  - **验收**: System works with LLM off

- [ ] 5.12.1 编写 `agents/pap_ez_bridge.py` — PAP→EZ回流接口
  - 核心函数: `bridge_pap_to_ez(pap_placement, pdb_structure, mechanism) → EZVerificationInput`
  - 流程:
    1. PAP 输出: 最优放置坐标 (best_placement_coords)
    2. 构建虚拟配体 Mol (从放置坐标 + SMILES)
    3. 注入 EZ 验证管线 (视同真实配体)
    4. ⭐ 进入 Scene B 验证逻辑 (PAP放置为overlay数据，非直接观测，应走Scene B+source_type="overlay"，不能等同Scene A)
    5. 置信度降权: overlay 数据 vs 直接观测数据
  - 降权因子:
    - PAP High confidence → 0.8
    - PAP Medium confidence → 0.5
    - PAP Low confidence → 0.2
  - **验收**: PAP→EZ bridge functional

- [ ] 5.12.2 实现 PAP 坐标→虚拟配体 Mol
  - 从 PAP 放置坐标重建配体 3D Mol:
    - 底物 SMILES → RDKit Mol → AddHs → 生成初始构象
    - 用 PAP 旋转参数对齐构象
    - 或: 直接从 PAP 坐标 + 原子类型构建 Mol
  - 复用: `overlay_smiles_to_pdb()` 的反向逻辑
  - **验收**: 虚拟配体 Mol 坐标与 PAP 放置一致

- [ ] 5.12.3 实现边界情况
  - PAP 放置失败 → 降级到 Scene C (CGPS评分)
  - 虚拟配体构建失败 → 降级到 Scene C
  - EZ 验证管线接收虚拟配体 → 需标注 source_type="overlay"
  - **验收**: 边界情况不 crash

- [ ] 5.8.2 ⭐ 实现 Scene C Fallback Analysis 输出模块 (三层漏斗第二层: 结构化输出)
  - **背景**: Scene C低分时强制触发Agent③④⑤后，需要一个结构化模块将Agent推理整合为可操作的fallback_analysis报告
  - 编写 `agents/scene_c_fallback_analyzer.py`
  - 核心函数: `generate_fallback_analysis(agent_reviews, cgps_result, scene_result, redox_classification=None) → FallbackAnalysis`
  - **完整输出结构**:
    ```python
    @dataclass
    class FallbackAnalysis:
        # === 序列/化学推理 ===
        sequence_based_inference: SequenceInference
        chemical_plausibility: ChemicalPlausibility
        literature_support: LiteratureSupportInfo
        
        # === 数据缺失诊断 ===
        missing_data_diagnosis: MissingDataDiagnosis
        
        # === D22氧化还原特殊信息 (仅EC 1.x) ===
        redox_specific: Optional[RedoxSpecificInfo]
        
        # === 可靠性评估 ===
        reliability_assessment: ReliabilityAssessment
        
        # === 用户建议 ===
        recommendation: RecommendationInfo

    @dataclass
    class SequenceInference:
        catalytic_motifs: List[str]          # 如 ["GXSYG (丝氨酸水解酶特征 motif)"]
        conserved_residues: List[str]        # 如 ["Ser70", "Lys73", "Glu166"]
        ec_class_statistics: str             # 如 "EC 3.1.1 最常见机制：酰基酶中间体"
        homolog_structures_available: bool   # 是否有同源结构可升级
        best_homolog: Optional[dict]         # {pdb_id, tm_score, resolution, potential_scene}

    @dataclass
    class ChemicalPlausibility:
        reaction_type: str                   # 如 "ester hydrolysis"
        likely_mechanism_class: str          # 如 "nucleophilic acyl substitution"
        required_features: List[str]         # 如 ["nucleophile", "tetrahedral intermediate stabilization"]
        d22_redox_subclass: Optional[str]    # 如 "metal_valence_change" / "cofactor_hydride" / None

    @dataclass
    class LiteratureSupportInfo:
        known_mechanisms_for_ec: int         # 该EC类已知机制数
        consensus_residues: List[str]        # 文献共识残基
        pmid_references: List[int]           # PMID列表
        all_verified: bool                   # 所有引用是否经过验证
        fabrication_risk: str                # "low"/"medium"/"high"

    @dataclass
    class MissingDataDiagnosis:
        reason: str                          # "no_pdb_structure" / "pap_rejected" / "no_ligand"
        impact: str                          # 如 "S_geo=0, 无法进行3D几何验证"
        recoverable: bool                    # 用户能否通过提供数据改善
        recovery_action: str                 # 如 "提供PDB ID或UniProt ID可升级至Scene B"

    @dataclass
    class RedoxSpecificInfo:  # ⭐ D22整合: Scene C下唯一的"准结构信息"
        likely_metal: str                    # 如 "Fe" (从EC推断)
        coordination_geometry: str           # 如 "octahedral" (从metal_coordination_analyzer)
        redox_potential: Optional[str]       # 估计的氧化还原电位范围
        cofactor_requirement: str            # 如 "NAD+/NADH" (从EC推断)

    @dataclass
    class ReliabilityAssessment:
        fabrication_risk: str                # "low"/"medium"/"high"
        agent_agreement_score: float         # 0.0-1.0 (来自scene_c_cross_validator)
        consensus_residues: List[str]        # Agent间一致的残基
        disputed_residues: List[str]         # Agent间不一致的残基
        recommendation: str                  # 如 "本结果基于序列和文献推理，未经3D结构验证。建议通过实验或同源建模进一步确认。"

    @dataclass
    class RecommendationInfo:
        primary: str                         # 如 "寻找同源结构以升级至Scene B验证"
        actions: List[str]                   # 如 ["1. 当前EC有23个PDB结构可用", "2. 推荐同源: 2XYZ"]
        experimental_suggestion: str         # 如 "建议定点突变验证: Ser70Ala, Lys73Ala"
    ```
  - 整合D22: 如果`redox_classification`不为None且step_type为metal_valence_change，填充RedoxSpecificInfo
  - 整合cross_validator: 从`scene_c_cross_validator.py`获取agreement_score和fabrication_risk
  - **验收**: Scene C + 低分 → fallback_analysis输出完整; 非Scene C → fallback_analysis为None

- [ ] 5.8.3 ⭐ 实现 Scene C 增强输出在 VerificationResult 中的集成
  - 扩展 VerificationResult (phase-4 定义) 增加 fallback_analysis 字段:
    ```python
    @dataclass
    class VerificationResult:
        # ... 原有字段 ...
        scene: str
        confidence: float
        quality_score: float
        s_co: Optional[float]
        s_geo: Optional[float]
        s_path: Optional[float]
        source_type: str
        # ⭐ 新增
        fallback_analysis: Optional[FallbackAnalysis] = None  # 仅Scene C低分时填充
    ```
  - 在 `confidence.py` 的 `compute_confidence()` 中集成: 当Scene C + quality_score < T_Q → 调用scene_c_fallback_analyzer
  - PipelineOutput 输出示例 (Scene C低分):
    ```json
    {
      "scene": "C",
      "confidence": 0.42,
      "quality_score": 42.3,
      "s_co": 0.55,
      "s_geo": 0,
      "s_path": 0.35,
      "source_type": "cgps_only",
      "fallback_analysis": {
        "sequence_based_inference": {
          "catalytic_motifs": ["GXSYG (丝氨酸水解酶特征 motif)"],
          "conserved_residues": ["Ser70", "Lys73", "Glu166"],
          "ec_class_statistics": "EC 3.1.1 最常见机制：酰基酶中间体",
          "homolog_structures_available": true,
          "best_homolog": {"pdb_id": "2XYZ", "tm_score": 0.85, "resolution": 1.8, "potential_scene": "B"}
        },
        "chemical_plausibility": {
          "reaction_type": "ester hydrolysis",
          "likely_mechanism_class": "nucleophilic acyl substitution",
          "required_features": ["nucleophile", "tetrahedral intermediate stabilization"],
          "d22_redox_subclass": null
        },
        "literature_support": {
          "known_mechanisms_for_ec": 3,
          "consensus_residues": ["Ser", "His", "Asp/Glu"],
          "pmid_references": [123456, 234567],
          "all_verified": false,
          "fabrication_risk": "medium"
        },
        "missing_data_diagnosis": {
          "reason": "no_pdb_structure",
          "impact": "S_geo=0, 无法进行3D几何验证",
          "recoverable": true,
          "recovery_action": "提供PDB ID或UniProt ID可升级至Scene B"
        },
        "redox_specific": null,
        "reliability_assessment": {
          "fabrication_risk": "medium",
          "agent_agreement_score": 0.67,
          "consensus_residues": ["Ser", "His"],
          "disputed_residues": ["Glu vs Asp"],
          "recommendation": "本结果基于序列和文献推理，未经3D结构验证。建议通过实验或同源建模进一步确认。"
        },
        "recommendation": {
          "primary": "寻找同源结构以升级至Scene B验证",
          "actions": [
            "1. 当前 EC 3.1.1.1 有 23 个 PDB 结构可用",
            "2. 推荐同源结构：2XYZ (TM-score=0.85, 分辨率 1.8Å)",
            "3. 如无法获得结构，可仅提供 UniProt ID 进行序列分析"
          ],
          "experimental_suggestion": "建议定点突变验证催化残基: Ser70Ala, Lys73Ala"
        }
      }
    }
    ```
  - **验收**: VerificationResult可承载fallback_analysis; JSON序列化正确; Scene A/B结果不受影响

---

## 输出文件清单

- `agents/confidence.py`
- `agents/fallback.py`
- `agents/pap_ez_bridge.py`
- `agents/scene_c_fallback_analyzer.py` (⭐ 新增: Scene C结构化降级分析输出)
- `agents/scene_c_types.py` (⭐ 新增: FallbackAnalysis等Scene C专用数据类)
- `tests/test_confidence.py`
- `tests/test_fallback.py`
- `tests/test_pap_ez_bridge.py`
- `tests/test_scene_c_fallback_analyzer.py` (⭐ 新增)

---

## 常见陷阱

1. **三任务合并**: 本文件合并了任务 5.8(置信度)+5.9(降级)+5.12(PAP回流)，三者紧密耦合
2. **PAP 降权**: overlay 数据比直接观测数据可信度低，EZ 评分需乘以降权因子，不能与 Scene A 直接等同
3. **⭐ M19修正: PAP→Scene B而非Scene A**: PAP放置的配体是计算生成的overlay数据，属于Scene B (有PDB+无配体→PAP锚定放置)，验证时需标注source_type="overlay"。即使PAP放置后可获得3D坐标，也不应路由到Scene A(直接观测数据)
4. **降级透明性**: 系统需在输出中明确标注使用了降级模式，用户需知道哪些结果是LLM辅助的
5. **循环降级**: 避免降级→失败→再降级的无限循环，最多降级一次 (A→B→C，不会 C→?)
6. **权重硬编码风险**: MF/EZ/Agent/Arbiter权重(0.25/0.50/0.15/0.10)为设计初值，Phase 7.1校准后可能需调整。代码中权重应从config加载而非硬编码，便于后期优化
7. **⭐ fallback_analysis不是验证结果**: fallback_analysis是Agent推理的汇总，不等同于3D验证。用户应理解为"假设"而非"确认"。reliability_assessment明确标注了fabrication_risk
8. **⭐ D22 redox_specific是"准结构信息"**: 金属配位几何来自metal_coordination_analyzer，它对比CGD统计数据，不使用量子化学计算。这是Scene C下唯一可能的结构信息来源，但置信度有限
9. **⭐ fallback_analysis只对Scene C低分填充**: Scene A/B结果不应包含fallback_analysis字段；Scene C + 高分(quality_score ≥ T_Q)也不需要

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5-9.md` 继续
