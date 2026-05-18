# Phase 5.5-2: 氧化还原步骤分类

**Phase**: 5.5  
**任务编号**: 5.5.2  
**前置依赖**: phase-5.5-1 (氧化还原中心识别)  
**阻塞后续**: phase-5.5-3 (辅因子几何验证), phase-5.5-4 (金属配位几何分析+扩展距离+氢原子)  
**预计耗时**: 1.5天  

> ⚠️ **D22 重要定位修正**: 本模块不是"电子转移验证器"(旧名`electron_transfer_validator.py`)，而是"氧化还原步骤分类器"(`redox_step_classifier.py`)。它**不声称能验证电子转移步骤的化学正确性**，而是区分哪些步骤**可以**用3D验证(辅因子氢负转移)和哪些**不可以**(金属价态变化)。

---

## 任务清单

- [ ] 5.5.2.1 编写 `ez_validator/redox/redox_step_classifier.py` 框架
  - 核心函数: `classify_redox_step(redox_center, mechanism_steps) → RedoxStepClassification`
  - `RedoxStepClassification`: step_type ("cofactor_hydride_transfer" | "cofactor_organic" | "metal_valence_change" | "disulfide" | "other"), verifiable_3d (bool), recommended_scene ("A"/"B"/"C"), reasoning (str)
  - **验收**: 模块可导入运行

- [ ] 5.5.2.2 实现辅因子氢负转移步骤分类
  - 识别可3D验证的氧化还原步骤:
    - NAD⁺/NADH 氢负转移: RunReactants可模拟(NADH→NAD⁺ + H⁻)
    - FAD/FADH₂ 氢负转移: RunReactants可模拟
    - FMN/FMNH₂ 氢负转移: RunReactants可模拟
  - 判定逻辑: 如果redox_center.center_type == "cofactor" 且辅因子在[NAD, NADP, FAD, FMN]列表中 → verifiable_3d = True, recommended_scene = 按PDB状态(A/B)
  - **验收**: NAD/FAD辅因子步骤正确分类为可3D验证

- [ ] 5.5.2.2b 实现有机辅因子步骤分类 (⭐ 新增: D22扩展)
  - 识别可3D验证但非氢负转移的有机辅因子步骤:
    - PLP (Schiff碱形成): RunReactants可模拟(亲核加成/消除)
    - 硫胺素 (Thiamine/TPP, 供质子/电子转移): RunReactants可模拟
    - 生物素 (Biotin, CO₂载体): RunReactants可模拟
  - 判定逻辑: 如果redox_center.center_type == "cofactor" 且辅因子在[PLP, TPP, Biotin]列表中 → step_type = "cofactor_organic", verifiable_3d = True, recommended_scene = 按PDB状态(A/B)
  - ⚠️ PLP主要出现在EC 2.x(转移酶)和EC 4.x(裂解酶)，不涉及氧化还原，但验证逻辑相同
  - **验收**: PLP/TPP辅因子步骤正确分类为cofactor_organic, verifiable_3d=True

- [ ] 5.5.2.3 实现金属价态变化步骤分类
  - 识别不可3D验证的氧化还原步骤:
    - Fe²⁺→Fe³⁺: RunReactants无法模拟(需要量子化学描述金属电子态)
    - Cu⁺→Cu²⁺: 同理
    - 其他金属价态变化: Mo, Mn, Co 价态变化同理
  - 判定逻辑: 如果redox_center.center_type == "metal" 且涉及价态变化 → verifiable_3d = False, recommended_scene = "C"
  - **不声称**能验证电子转移步骤的化学正确性，只标记为"不可3D验证"
  - **验收**: 金属价态变化步骤正确分类为不可3D验证，自动降级Scene C

- [ ] 5.5.2.4 实现分类结果的路由逻辑
  - 分类结果驱动下游验证路径:
    - `cofactor_hydride_transfer` + verifiable_3d=True → 路由到 cofactor_geometry_validator (phase-5.5-3) + Scene A/B验证
    - `cofactor_organic` + verifiable_3d=True → 路由到 cofactor_geometry_validator (phase-5.5-3, PLP几何验证) + Scene A/B验证
    - `metal_valence_change` + verifiable_3d=False → 路由到 metal_coordination_analyzer (phase-5.5-4) + Scene C降级
    - `disulfide` → ⭐ 路由到 cofactor_geometry_validator (半胱氨酸二硫键几何验证, 与cofactor_hydride_transfer共用几何验证管线) + Scene A/B验证
    - `other` → 仅CGPS统计评分 (Scene C), 无下游验证模块
  - 输出结构供pipeline_orchestrator消费
  - **验收**: 不同分类结果正确路由到不同下游模块

- [ ] 5.5.2.6 ⭐ 实现 Scene C + 氧化还原酶的增强路由 (D22整合到三层漏斗)
  - **背景**: 金属氧化还原酶自动降级到Scene C后，metal_coordination_analyzer提供的配位几何分析是Scene C下唯一的"准结构信息"。需将这些信息整合到fallback_analysis.redox_specific中
  - 增强路由逻辑:
    1. 当 `metal_valence_change` + Scene C 时，除了调用metal_coordination_analyzer，还执行:
       - `infer_metal_from_ec(ec_code)`: 从EC推断可能的金属类型 (如EC 1.1.1.1 → 可能含Zn，EC 1.97.1→可能含Mo)
       - `predict_geometry(metal)`: 预测配位几何 (如Fe→octahedral, Cu→tetrahedral)
       - `estimate_redox_potential(substrate)`: 估计氧化还原电位范围 (粗略估计，仅供fallback_analysis参考)
       - `infer_cofactor(ec_code)`: 推断辅因子需求 (如EC 1.x.1.x → 常见NAD+/NADH)
    2. 输出 `RedoxStepClassification` 扩展:
       ```python
       @dataclass
       class RedoxStepClassification:
           # ... 原有字段 ...
           step_type: str
           verifiable_3d: bool
           recommended_scene: str
           reasoning: str
           # ⭐ 新增: Scene C增强信息
           scene_c_enhancement: Optional[RedoxSceneCEnhancement] = None

       @dataclass
       class RedoxSceneCEnhancement:
           likely_metal: str                    # 从EC推断
           coordination_geometry: str           # 从metal_coordination_analyzer获取
           coordination_score: float            # 配位几何合理性评分
           redox_potential_range: Optional[str] # 估计的氧化还原电位范围
           cofactor_requirement: str            # 从EC推断
           fallback_note: str                   # 如 "金属价态变化无法通过RunReactants验证，配位几何分析仅供参考"
       ```
    3. 这些信息将被 `scene_c_fallback_analyzer.py` (phase-5-8) 消费，填充到 `FallbackAnalysis.redox_specific` 中
  - **验收**: metal_valence_change + Scene C → RedoxSceneCEnhancement非空; 非氧化还原酶 → scene_c_enhancement=None

- [ ] 5.5.2.5 编写测试用例
  - 测试1: 乙醇脱氢酶 (NAD⁺辅因子) → classify为cofactor_hydride_transfer, verifiable_3d=True
  - 测试2: 铁氧还蛋白 (Fe-S簇) → classify为metal_valence_change, verifiable_3d=False, recommended_scene=C
  - 测试3: 细胞色素c (heme+金属) → classify为metal_valence_change, verifiable_3d=False
  - 测试4: 谷胱甘肽还原酶 (FAD) → classify为cofactor_hydride_transfer, verifiable_3d=True
  - 测试5: 转氨酶 (PLP辅因子) → classify为cofactor_organic, verifiable_3d=True, recommended_scene=A/B
  - 测试6: ⭐ 铁氧还蛋白 + Scene C → scene_c_enhancement非空 (likely_metal="Fe", coordination_geometry推断)
  - 测试7: ⭐ 乙醇脱氢酶 (非金属) + Scene C → scene_c_enhancement=None (不是metal_valence_change)
  - **验收**: 7个测试用例分类正确

---

## 输出文件清单

- `ez_validator/redox/redox_step_classifier.py`
- `tests/test_redox_step_classifier.py`

---

## 常见陷阱

1. **不声称验证电子转移**: 本模块的职责是**分类**而非验证。它判断哪些步骤**可以**被3D验证，哪些**不可以**。实际的距离/角度验证由下游模块(cofactor_geometry_validator)执行
2. **辅因子vs金属的双重中心**: 部分酶(如细胞色素P450)同时含heme(金属)和NADPH(辅因子)，需按步骤逐一分类而非按酶整体分类
3. **RunReactants的局限性**: 即使辅因子氢负转移可3D验证，RunReactants也可能无法完美模拟所有辅因子反应(如需要质子化态特殊处理)，需在验证时设置合理容差
4. **金属配位几何分析≠验证**: 金属价态变化步骤虽不可3D验证，但metal_coordination_analyzer仍可提供配位几何合理性评分(与CGD统计对比)，这属于**结构分析**而非**化学验证**
5. **⭐ PLP非氧化还原但可3D验证**: PLP(Schiff碱形成)属于有机辅因子反应，不涉及氢负转移或电子转移，但RunReactants可以模拟其化学步骤。将其放入Phase 5.5(氧化还原模块)是为了复用辅因子几何验证管线，而非声称它涉及氧化还原。模块命名redox/仅表示"辅因子相关验证"，非严格的氧化还原限定
6. **⭐ M21修正: Heme分类粒度说明**: 当前MVP将所有heme统一分类为metal_valence_change(verifiable_3d=False)，因为heme含Fe中心。但实际中部分heme步骤不涉及Fe价态变化(如peroxidase的底物氧化涉及heme π-系统而非Fe²⁺/Fe³⁺)，MVP为简化暂不区分。后续可增加heme_subclass: "heme_metal"(Fe价态变化) vs "heme_organic"(π-系统参与)
7. **⭐ L11修正: Disulfide路由**: 旧版disulfide标记为"特殊处理"无下游模块。修正后disulfide路由到cofactor_geometry_validator(半胱氨酸二硫键C-S-S-C几何验证，包括二面角和键长检查)，与辅因子共用几何验证管线。verifiable_3d=True, recommended_scene=A/B
8. **⭐ Scene C增强信息的置信度**: `infer_metal_from_ec`和`estimate_redox_potential`是粗略推断，不能等同于实验测量。fallback_analysis.redox_specific中的信息应标注为"inferred from EC classification"，置信度低于Scene A/B的3D验证

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5.5-3.md` 继续
