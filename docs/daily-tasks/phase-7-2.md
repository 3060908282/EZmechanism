# Phase 7-2: 跨EC泛化 + CGD约束对比

**Phase**: 7  
**周次**: Week 22-23
**任务编号**: 7.2+7.3  
**前置依赖**: phase-7-1 (M-CSA留出验证); Phase 5 完成 (含 phase-5-1 LLM接口, LOECO重新校准CGPS需完整Agent管线)  
**阻塞后续**: phase-7-2.5 (渐进降级交叉验证需要留出验证结果), phase-7-3 (论文需要验证结果)  
**预计耗时**: 3.5天 (7.2跨EC泛化≈2天 + 7.3 CGD约束对比≈1.5天)  
**预警检查点**: E2 (full-pool子集上 1BTL案例 Top-3), E4 (full-pool子集上 训练集 Top-3 ≥ 50%)  

---

## 任务清单

### 7.2: 跨EC泛化验证

- [ ] 7.2.1 设计跨EC验证实验
  - 目的: 验证系统对未见EC类的泛化能力
  - 方法: Leave-One-EC-Class-Out (LOECO)
    - 轮流排除一个 EC 主类 (1-7)
    - 在剩余6个 EC 类上校准 CGPS
    - 在排除的 EC 类上测试
  - 共7轮实验
  - **验收**: LOECO 实验设计合理

- [ ] 7.2.2 执行 LOECO 验证 (full-pool 子集上)
  - 对每个排除的 EC 类:
    1. 用其余6个 EC 类重新校准 CGPS (调 w1/w2/w3)
    2. 在排除的 EC 类的 **full-pool 子集**上运行管线
    3. 计算 Top-1/3/5, MRR
  - 比较: LOECO 准确率 vs 全数据集准确率
  - **⚠️ E2 预警检查**: full-pool 子集上，1BTL 案例已知机制排名 Top-3
    - 未进 Top-3 → Step 2.5 规则映射问题
  - **验收**: 7轮 LOECO 实验完成，E2 检查通过

- [ ] 7.2.3 ⭐ CGPS 校准回路验证
  - **目的**: 确保 LOECO 重新校准后的 CGPS 权重具有合理性，而非过拟合剩余6个 EC 类
  - 校准回路逻辑:
    ```
    对每轮 LOECO (排除 EC_i):
    1. 在6个 EC 类上重新校准 w1, w2, w3, θ_low, θ_high
    2. 检查: 新权重与 Phase 4 全数据校准权重的偏差
       - |Δw_i| < 0.15 → 合理，EC_i 对该权重贡献有限
       - |Δw_i| ≥ 0.15 → 记录为"敏感权重"，标注 EC_i 对该权重有显著影响
    3. 检查: 新 θ_low, θ_high 是否仍在合理范围 [0.2, 0.4] / [0.6, 0.8]
       - 超出范围 → 记录为"异常校准"，需人工审查
    4. 记录: 每轮校准后的权重向量 + 与全数据权重的偏差
    ```
  - 输出: `data/reports/loeco_calibration_delta.json`
    - 结构: `{ec_class_excluded, weights: {w1, w2, w3}, delta_from_full: {dw1, dw2, dw3}, theta: {low, high}, theta_delta: {dlow, dhigh}, calibration_status: "normal"|"sensitive"|"anomalous"}`
  - **验收**: 7轮校准偏差全部记录；异常校准被标注且有人工审查说明

- [ ] 7.2.4 分析泛化能力
  - 各 EC 类的泛化损失: (全数据准确率 - LOECO 准确率)
  - 泛化能力最强的 EC 类 (损失最小)
  - 泛化能力最弱的 EC 类 (损失最大)
  - 原因分析: 氧化还原酶(EC1)的 D7-D10 扩展维度是否改善泛化?
  - **验收**: Generalization metrics documented

### 7.3: CGD约束对比实验

- [ ] 7.3.1 设计对比实验
  - 对比组:
    - 组1: 无约束 overlay (直接 ETKDGv3, 无 DS3 筛选)
    - 组2: CGD 筛选 overlay (DS3 P5-P95 筛选, 当前方案)
    - 组3: 无 PDB (Scene C, CGPS only)
  - 在同一测试集上对比三组
  - **验收**: 对比实验设计清晰

- [ ] 7.3.2 执行对比实验 (full-pool 子集上)
  - 组1: 修改 PAP 模块跳过 DS3 筛选 → 生成 overlay
  - 组2: 使用当前完整管线
  - 组3: 强制 Scene C
  - 在 **full-pool 子集**上计算每组的 Top-1/3/5, MRR
  - **⚠️ E4 预警检查**: full-pool 子集上，训练集 Top-3 ≥ 50%
    - < 50% → 权重/阈值需重调
  - **验收**: 三组实验完成，E4 检查通过

- [ ] 7.3.3 生成对比图表
  - 图表1: 三组准确率柱状图 (Top-1/3/5)
  - 图表2: 各 Scene 的准确率对比
  - 图表3: overlay 距离误差分布 (有约束 vs 无约束)
  - 统计检验: 配对 t-test, p<0.05
  - **验收**: Comparison charts generated, statistical significance confirmed

---

## 输出文件清单

- `validation/loeco_validation.py`
- `validation/cgd_comparison.py`
- `data/reports/loeco_validation.json`
- `data/reports/loeco_calibration_delta.json`
- `data/reports/cgd_comparison.json`
- `data/reports/figures/loeco_accuracy.png`
- `data/reports/figures/cgd_comparison.png`

---

## 常见陷阱

1. **LOECO 计算成本**: 7轮 × 重新校准 + 测试，总计算量约为留出验证的 7 倍
2. **EC 类样本不均**: EC 6 (连接酶) 在 M-CSA 中数量少，LOECO 排除 EC 6 时训练集损失小，排除 EC 1 (氧化还原酶) 时损失大
3. **组1 实现风险**: 修改 PAP 跳过筛选可能引入 bug，需仔细验证
4. **统计功效**: 对比实验的样本量 (200) 是否足以检测 10% 的差异? 需计算统计功效
5. **⚠️ CGPS 校准回路过拟合**: LOECO 在6个 EC 类上重新校准 CGPS 时，若某个 EC 类在 Phase 4 全数据校准中贡献了特定权重方向，排除后权重可能发生大幅偏移；需通过校准回路检查 (7.2.3) 识别敏感权重，避免过拟合结论

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-7-2.5.md` 继续 (渐进降级交叉验证)
