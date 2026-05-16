# Phase 4-4: CGPS综合评分

**Phase**: 4  
**任务编号**: 4.4  
**前置依赖**: phase-4-1 (S_co), phase-4-2 (S_geo), phase-4-3 (S_path)  
**阻塞后续**: phase-4-5 (阈值校准)  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 4.4.1 编写 `cgps/scorer.py` 框架
  - 定义核心类: `CGPSScorer`
  - 主入口: `score(candidate_mechanism, cgd_datasets, scene) → CGPSResult`
  - `CGPSResult`: s_co, s_geo, s_path, final_score, weights_used, scene
  - **验收**: 类可实例化，主入口可调用

- [ ] 4.4.2 实现 CGPS 公式
  - `CGPS = w1·S_co + w2·S_geo + w3·S_path`
  - 初始权重 (待校准): w1=0.3, w2=0.55, w3=0.15
  - Scene C 特殊处理: w2=0 (无 S_geo), 重新归一化
    - `CGPS_scene_c = (w1/(w1+w3))·S_co + (w3/(w1+w3))·S_path`
  - **验收**: CGPS 公式计算正确

- [ ] 4.4.3 实现场景自适应权重
  - Scene A: w1, w2, w3 全部使用
  - Scene B: w2 降低 (overlay 数据降权), w2_adj = w2 × confidence_factor
  - Scene C: w2=0, w1+w3 归一化到 1.0
  - 权重调整时保证: Σw_i = 1.0
  - **验收**: 各场景权重正确，和为 1.0

- [ ] 4.4.4 实现灰色区间判定
  - CGPS_score > θ_high → "accept" (高置信)
  - θ_low < CGPS_score ≤ θ_high → "grey zone" (需 Agent 评审)
  - CGPS_score ≤ θ_low → "reject" (低置信)
  - 初始阈值 (待校准): θ_low=0.3, θ_high=0.7
  - **验收**: 灰色区间判定逻辑正确

- [ ] 4.4.5 实现多候选排序
  - 输入: 多个候选机制的 CGPSResult
  - 排序: final_score 降序
  - 同分: s_geo 降序 → s_co 降序
  - **验收**: 排序结果合理

- [ ] 4.4.6 验证测试
  - 测试1: 1BTL 已知机制 → CGPS > θ_high (accept)
  - 测试2: 随机机制 → CGPS < θ_low (reject)
  - 测试3: Scene C → w2=0, 仅 S_co + S_path
  - 测试4: 已知机制排名 Top-3
  - **验收**: Known mechanisms rank Top-3

---

## 输出文件清单

- `cgps/scorer.py`
- `tests/test_cgps_scorer.py`

---

## 常见陷阱

1. **权重和 ≠ 1**: 调整权重后务必检查 Σw_i = 1.0，特别是 Scene C 的归一化
2. **θ_low/θ_high 初值**: 0.3/0.7 是经验初值，实际分布可能偏移，需在 phase-4-5 校准
3. **S_geo=0 的影响**: Scene C 中 S_geo=0 且 w2=0，CGPS 退化为 S_co+S_path，区分度可能降低
4. **S_path 覆盖率低**: DS5 Layer 0 仅 ~40-50% 映射率，S_path 对多数候选为 0 或低分，这会压缩 CGPS 分数分布

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-4-5.md` 继续
