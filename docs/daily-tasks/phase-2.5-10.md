# Phase 2.5-10: 置信度分量计算

**Phase**: 2.5  
**任务编号**: 2.5.10  
**前置依赖**: phase-2.5-5 (Scene A验证产出S_geo维度分), phase-2.5-6 (验证结果格式), phase-2.5-7 (S_geo组合评分)  
**阻塞后续**: phase-2.5-11 (管线编排需要置信度), Phase 5 (Agent评分融入)  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 2.5.10.1 编写 `ez_validator/confidence_calculator.py` 框架
  - 定义核心函数: `calculate_confidence(verification_result, mechfind_score=None, agent_consensus=None, arbiter_score=None) → float`
  - ⚠️ **M11修正: 明确区分confidence和quality_score**:
    - `confidence` = 加权归一化得分 ∈ [0, 1]，计算公式: `0.25×MF + 0.50×EZ + 0.15×Agent + 0.10×Arbiter`
    - `quality_score` = 最终质量评分 ∈ [0, 100]，计算公式: `confidence × 100 × grey_zone_penalty`
    - 两者是不同变量，不可混用。confidence是归一化的概率量度，quality_score是带惩罚的百分制评分
  - grey_zone_penalty 吸收 CGPS 验证状态:
    - CGPS > θ_high (已验证) → penalty = 1.0
    - θ_low < CGPS ≤ θ_high (灰色区间) → penalty = 0.85
    - CGPS ≤ θ_low (未验证) → penalty = 0.60
  - 输出: confidence ∈ [0, 1], quality_score ∈ [0, 100]
  - **验收**: 函数签名正确，confidence和quality_score计算分离，可导入调用

- [ ] 2.5.10.2 实现 MechFind 分量 (0.25×MF)
  - 输入: MechFind MILP 目标函数值
  - 归一化到 [0,1]: `MF_norm = MF_score / max_possible_score`
  - 多候选时的相对排名: `MF_norm = 1 - (rank - 1) / total_candidates`
  - 无 MechFind 时: 此项 = 0，权重重新分配
  - **验收**: MF 分量在 [0, 0.25] 范围内

- [ ] 2.5.10.3 实现 EZ 分量 (0.50×EZ)
  - Scene A: EZ = S_geo (归一化的几何评分)
  - Scene B: EZ = S_geo × 置信度系数 (High=1.0, Medium=0.7, Low=0.4)
  - Scene C: EZ = CGPS 值 (w1·S_co + w3·S_path)
  - EZ 验证失败时: 此项 = 0
  - **验收**: EZ 分量在 [0, 0.50] 范围内，Scene B 含降权

- [ ] 2.5.10.4 实现 Agent 分量 (0.15×Agent)
  - 输入: Agent③④⑤ 中 accept 的比例
  - `agent_consensus = n_accept / n_total`
  - 无 LLM 时: 此项 = 0
  - **验收**: Agent 分量在 [0, 0.15] 范围内

- [ ] 2.5.10.5 实现 Arbiter 分量 (0.10×Arbiter)
  - 输入: Agent⑥ 的裁决分数
  - accept=1.0, needs_revision=0.5, reject=0.0
  - 无 LLM 时: 此项 = 0
  - **验收**: Arbiter 分量在 [0, 0.10] 范围内

- [ ] 2.5.10.6 实现权重重新归一化
  - 当某些分量缺失时 (如无 LLM), 权重需重新分配:
    - 无 LLM: `0.25×MF + 0.50×EZ + 0.25×(重新分配)` → 可选方案: 按比例分配到 MF 和 EZ
    - 无 MechFind: `0.50×EZ + 0.15×Agent + 0.10×Arbiter + 0.25×(重新分配)`
    - 仅 EZ: `1.0×EZ`
  - 重新分配方案: 缺失分量的权重按剩余分量的原始比例分配
  - **验收**: 缺失分量时权重归一化正确，confidence 始终在 [0,1]

- [ ] 2.5.10.7 编写单元测试
  - 测试1: 全部分量存在+已验证 → confidence = 1.0, quality_score = 100.0
  - 测试2: 无 LLM → 权重重分配正确, confidence和quality_score均合理
  - 测试3: Scene C (S_geo=0) → confidence 仍合理
  - 测试4: EZ 验证失败 → confidence 显著降低
  - 测试5: grey_zone_penalty影响 → CGPS在灰色区间时quality_score下降15%
  - **验收**: Confidence in [0,1], correct for test cases

---

## 输出文件清单

- `ez_validator/confidence_calculator.py`
- `tests/test_confidence_calculator.py`

---

## 常见陷阱

1. **权重归一化**: 缺失分量时的重新分配逻辑需仔细推导，避免权重和 ≠ 1.0
2. **MF 归一化**: MechFind 的目标函数值范围未知，需从实际运行数据确定 max_possible_score
3. **Scene B 降权系数**: High/Medium/Low 对应的 1.0/0.7/0.4 是经验值，可能需要根据验证数据调整
4. **0 分量的传播**: 当 EZ=0 时，即使其他分量满分，confidence 也不会超过 0.50，这是设计意图 (EZ 是最核心分量)
5. **⭐ M11修正: confidence vs quality_score**: 旧版本混用这两个概念。正确关系: `quality_score = confidence × 100 × grey_zone_penalty`。confidence ∈ [0,1]是归一化的概率量度；quality_score ∈ [0,100]是带惩罚的百分制评分。阈值判断(T_Q≈75)基于quality_score而非confidence

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2.5-11.md` 继续
