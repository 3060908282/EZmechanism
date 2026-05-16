# Phase 2-12: 置信度评估

**Phase**: 2
**任务编号**: 2.12
**前置依赖**: phase-2-8 (Scene B DS3需TM-score), phase-2-10 (PAP放置需评分)
**阻塞后续**: Phase 2.5 (验证结果需置信度), Phase 5 (Agent评审需置信度输入)
**预计耗时**: 1天

---

## 任务清单

- [ ] 2.12.1 编写 `cgd/pap/confidence.py` 框架
  - 创建置信度评估模块，定义 `ConfidenceAssessor` 类
  - 4级置信度: High / Medium / Low / Rejected
  - 输入: PAP 结果 (n_candidates, ds3_pass_rate, placement_score) + 同源信息 (tm_score)
  - 输出: confidence_level + confidence_score (0-1) + 判定理由
  - **验收**: 类可实例化，接口定义清晰

- [ ] 2.12.2 置信度判定规则
  - High:
    - n_candidates ≥ 10 (通过DS3+碰撞检测的候选数)
    - DS3 filter pass rate ≥ 5% (50,000 候选中 ≥ 2,500 通过)
    - best ds3_score ≥ 0.7
    - 如果有同源数据: TM-score tier = High
  - Medium:
    - n_candidates ≥ 5
    - DS3 filter pass rate ≥ 1%
    - best ds3_score ≥ 0.5
    - 如果有同源数据: TM-score tier = High 或 Medium
  - Low:
    - n_candidates ≥ 1 (至少有1个通过)
    - best ds3_score ≥ 0.3
  - Rejected:
    - n_candidates = 0 (无通过DS3筛选的候选)
    - 或重试后仍无候选
  - **验收**: 4级判定规则逻辑正确

- [ ] 2.12.3 置信度评分计算
  - 连续评分 (0-1):
    ```
    score = 0.4 × f(n_candidates) + 0.3 × f(ds3_pass_rate) + 0.3 × f(placement_score)
    ```
  - f(n_candidates): `min(1.0, n_candidates / 20)` (20个候选饱和)
  - f(ds3_pass_rate): `min(1.0, pass_rate / 0.1)` (10%通过率饱和)
  - f(placement_score): 直接使用 best ds3_score (已在0-1范围)
  - 同源数据加成: 如果 TM-score tier = High → score += 0.1 (clamp 到 1.0)
  - **验收**: 评分计算公式正确，结果在 0-1 范围

- [ ] 2.12.4 置信度与判定等级的映射
  - score ≥ 0.75 → High
  - 0.5 ≤ score < 0.75 → Medium
  - 0.25 ≤ score < 0.5 → Low
  - score < 0.25 → Rejected
  - 特殊规则: n_candidates = 0 直接 Rejected (不论公式计算结果)
  - **验收**: 评分与等级映射一致

- [ ] 2.12.5 验收验证
  - 选择10个已知案例 (覆盖不同置信度):
    - Scene A + 有配体 + 高质量结构 → 期望 High
    - Scene B + 有同源 + TM-score High → 期望 Medium-High
    - Scene B + 低TM-score同源 → 期望 Low
    - 无通过候选 → 期望 Rejected
  - 验证判定结果与预期一致 (≥ 8/10)
  - **验收**: 10个已知案例置信度判定合理

---

## 输出文件清单

- `cgd/pap/confidence.py`

---

## 常见陷阱

1. **置信度与评分不一致**: 规则判定和连续评分可能不一致 (如 n_candidates 少但 ds3_score 高)；规则优先
2. **n_candidates 阈值过严**: 如果 DS3 筛选通过率普遍较低，High 阈值 (≥10) 可能几乎不可达；需根据 phase-2-13 的实际数据调整
3. **同源加成过度**: +0.1 的同源加成可能过度放大 TM-score 的影响；如果同源数据质量差，加成反而引入偏差
4. **DS3 pass rate 分母**: 分母是 50,000 (总候选数) 还是实际生成的候选数？应使用实际生成数
5. **Rejected 的处理**: Rejected 不代表机制错误，只是当前数据不足以验证；需在下游管线中正确处理
6. **评分公式权重**: 0.4/0.3/0.3 是经验权重，后续可能需要根据对比实验结果调整

> ⚠️ **confidence 层级区分**: 本任务的 confidence 是 CGD/PAP 层面的放置置信度(0.4×f(n_candidates)+0.3×f(ds3_pass_rate)+0.3×f(placement_score))，不同于系统级置信度 (0.25×MF+0.50×EZ+0.15×Agent+0.10×Arbiter)。PAP confidence 将作为 EZ 分量的输入之一。

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2-13.md` 继续
