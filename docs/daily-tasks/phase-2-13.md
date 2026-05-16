# Phase 2-13: 对比实验

**Phase**: 2
**任务编号**: 2.13
**前置依赖**: phase-2-10 (CGD筛选overlay)
**阻塞后续**: Phase 2 收尾 (需对比实验通过才能确认PAP方案有效)
**预计耗时**: 2天

---

## 任务清单

- [ ] 2.13.1 选择10个Scene A测试案例
  - 从 M-CSA 中选择10个有配体的 Scene A 条目
  - 选择标准:
    - 配体为 substrate (非 cofactor/excluded)
    - PDB 分辨率 ≤ 2.0Å (高质量参考)
    - 覆盖不同 EC 类别 (尽量覆盖 1-6 类)
    - 催化残基数 2-5 个 (覆盖不同活性位点大小)
  - 记录: mcsa_id, pdb_id, ligand_het, ec_class, catalytic_residues
  - **验收**: 10个测试案例选择合理，覆盖多样性

- [ ] 2.13.2 基准: 无约束overlay (unfiltered)
  - 对每个测试案例:
    1. 使用 `PocketAnchorPlacer` (phase-2-9) 生成候选
    2. 不使用 DS3 筛选 (跳过 Step 4 和 Step 5)
    3. 仅按距离评分排序 (MVP评分)
    4. 选择 top-1 候选
  - 计算距离误差: 配体反应原子到催化残基活性原子的实际距离 vs 晶体结构中的距离
  - `error_unfiltered = |d_predicted - d_crystal|`
  - **验收**: 无约束overlay的误差数据可计算

- [ ] 2.13.3 实验: DS3筛选overlay (filtered)
  - 对每个测试案例:
    1. 使用 `PAPRuntime` (phase-2-10) 完整管线
    2. 包含 DS3 Scene A P5-P95 阈值筛选
    3. 包含碰撞检测
    4. 选择 top-1 候选 (ds3_score 最高)
  - 计算距离误差: 同上
  - `error_filtered = |d_predicted - d_crystal|`
  - **验收**: DS3筛选overlay的误差数据可计算

- [ ] 2.13.4 误差指标计算
  - 对每个测试案例，计算多个距离类别的误差:
    - D1 (nucleophile→electrophilic_C) 误差
    - D2 (acid/base→proton_acceptor) 误差
    - D6 (any_catalytic→reactive_atom) 误差
  - 汇总指标:
    - 平均绝对误差 (MAE): `Σ|error_i| / n`
    - 中位误差 (Median)
    - 误差 < 1.0Å 的比例
  - 分别计算 unfiltered 和 filtered 的指标
  - **验收**: 误差指标计算正确

- [ ] 2.13.5 统计检验
  - 配对检验: 每个测试案例有一对 (error_unfiltered, error_filtered)
  - 检验方法:
    - 首选: Wilcoxon signed-rank test (非参数，不假设正态分布，n=10)
    - 备选: Paired t-test (如果误差差值近似正态)
  - 原假设 H0: filtered 和 unfiltered 的误差无显著差异
  - 显著性水平: α = 0.05
  - 计算效应量: Cohen's d 或 rank-biserial correlation
  - **验收**: 统计检验方法正确，p值可计算

- [ ] 2.13.6 输出对比报告
  - 路径: `data/reports/overlay_comparison.json`
  - 内容:
    - 每个测试案例的: pdb_id, ligand_het, error_unfiltered, error_filtered
    - 汇总: MAE_unfiltered, MAE_filtered, improvement_percentage
    - 统计: test_method, p_value, effect_size
    - 结论: "DS3-filtered overlay 误差降低 X% (p=Y)"
  - **验收**: 报告格式完整，结论清晰

- [ ] 2.13.7 验收判定
  - 目标: DS3-filtered 误差比 unfiltered 降低 ≥ 20%
  - 统计显著性: p < 0.05
  - 如果未达标:
    - 检查 DS3 阈值是否合理 (P5-P95 是否过宽/过窄)
    - 检查评分权重是否需要调整
    - 记录失败原因，考虑调整后重试
  - **验收**: DS3-filtered 误差 ≥ 20% 降低 (p < 0.05)

---

## 输出文件清单

- `data/reports/overlay_comparison.json`
- `data/reports/overlay_comparison_details/` (每个案例的详细结果)

---

## 常见陷阱

1. **样本量不足**: 10个案例的统计功效较低；如果 p > 0.05 但趋势明显，不能直接否定 DS3 筛选效果
2. **选择偏差**: 测试案例如果只选"容易的" (高分辨率、简单活性位点)，可能夸大效果；应包含有挑战的案例
3. **top-1 vs top-5**: 只比较 top-1 候选可能不稳定；建议同时报告 top-5 的统计
4. **误差度量选择**: MAE 对异常值敏感；如果某个案例误差极大，可用 Median AE 替代
5. **D1 退化问题**: PAP 的 D1 距离由锚点确定，filtered 和 unfiltered 的 D1 误差相同；对比实验应聚焦 D2-D6
6. **晶体结构非唯一构象**: 晶体结构中的配体位置只是实验条件下的一种构象，非"真实唯一解"；误差度量需考虑这一不确定性
7. **多重比较**: 如果对 D1-D6 分别检验，需 Bonferroni 校正；建议用综合距离误差做单一检验

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2-14.md` 继续
