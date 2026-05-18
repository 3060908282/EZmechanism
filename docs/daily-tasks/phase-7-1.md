# Phase 7-1: M-CSA留出验证

**Phase**: 7  
**周次**: Week 21-22
**任务编号**: 7.1  
**前置依赖**: Phase 6 完成 (完整系统可运行); Phase 3-4 (DS5 residue_info + rule_mapping_table 为 E1 分类和管线查询所需)  
**阻塞后续**: phase-7-2 (跨EC泛化需要留出验证结果), phase-7-4 (IDR需要验证数据)  
**预计耗时**: 4天  
**预警检查点**: E1 (双阈值分类), E5 (full-pool子集上 Top-1 ≥ 50%)  

---

## 任务清单

- [ ] 7.1.1 准备 M-CSA 留出验证数据集
  - 从 M-CSA 1003 条 entries 中:
    - 训练集: 80% (~800 entries) — 用于 CGPS 权重校准 (Phase 4 已完成)
    - 测试集: 20% (~200 entries) — 留出验证，此阶段首次使用
  - 分层抽样: 按 EC 主类 (1/2/3/4/5/6/7) 分层，确保各 EC 类都有代表
  - 数据泄露检查: 同一 M-CSA 条目的不同 PDB 不可跨集
  - **验收**: 训练集/测试集划分合理，无数据泄露

- [ ] 7.1.2 运行测试集验证 + E1 双阈值分类
  - 对测试集中每条 entry:
    1. 提取: substrate SMILES, product SMILES, EC code, PDB ID
    2. 调用 MechFind: 检查搜索是否成功 (**E1 阈值1**)
       - 成功 → 检查候选路径数 (**E1 阈值2**):
         - ≥ 5条 → 标记为 `full_pool`
         - < 5条 → 标记为 `limited_pool`
       - 失败/超时 → 标记为 `mechfind_failure`
    2.5. ⭐ **D22氧化还原分类**: 对EC 1(氧化还原酶)的entry, 调用redox_step_classifier标注redox_subclass:
         - `cofactor_redox`: 辅因子介导(NAD/FAD等) → 纳入Scene A/B评估
         - `metal_redox`: 金属价态变化(Fe/Cu等) → 仅纳入Scene C评估
         - `mixed_redox`: 同时含辅因子和金属步骤 → 辅因子步骤Scene A/B, 金属步骤Scene C
         - `non_redox`: 非氧化还原酶(EC 2-7) → 无需分类
    3. 对 `full_pool` 和 `limited_pool` 条目，调用管线: `run_pipeline(substrate, product, ec, pdb_id)`
    4. 检查: 已知机制是否排名 Top-1 / Top-3 / Top-5
    5. 记录: CGPS 分数, S_co/S_geo/S_path, 置信度, 场景, pool_tag
  - 预计运行时间: 200 entries × 30s/entry ≈ 100min
  - **验收**: 测试集全部 entry 验证完成，每条有 pool_tag 分类

- [ ] 7.1.3 计算评估指标 (区分 full-pool 与 limited-pool)
  - **full-pool 子集** (E2-E5 量化评估作用域):
    - Top-1 准确率: 已知机制排名第1的比例
    - Top-3 准确率: 已知机制排名前3的比例
    - Top-5 准确率: 已知机制排名前5的比例
    - Mean Reciprocal Rank (MRR): 1/rank 的平均值
    - 按 Scene 分组: Scene A/B/C 分别统计
    - 按 EC 类分组: EC 1-7 分别统计
    - ⭐ **D22氧化还原分离**: EC 1(氧化还原酶)的指标需按redox_subclass分组:
      - cofactor_redox vs metal_redox vs mixed_redox 分别统计
      - 金属氧化还原案例在Scene A/B下的"验证失败"不计入Scene A/B指标(因D22已降级至Scene C)
  - **limited-pool 子集** (仅定性分析):
    - 已知机制是否出现在候选中 (found/not_found)
    - 管线执行状态 (rule_mapping / ez_validation / cgps_scoring / agent_review)
    - 排名合理性 (已知机制在少量候选中的排名)
    - **不纳入** Top-K / MRR 等量化指标
  - **mechfind_failure 子集**:
    - 失败原因分类统计 (timeout / no_results / api_error)
  - **⚠️ E5 预警检查**: 在 **full-pool 子集**上，Top-1 准确率 ≥ 50%
    - < 50% → 启动 4 层诊断树
  - **验收**: 指标计算正确，三类子集分别统计

- [ ] 7.1.3a 绘制 quality_score 分布分析
  - 按Scene分组绘制分布直方图
  - 按"正确Top-1"vs"未进Top-5"分组绘制
  - 计算两组的分布重叠度
  - **验收**: 分布图产出，重叠度量化

- [ ] 7.1.3b 基于分布选择候选阈值区间
  - 从分布图确定quality_score的合理阈值搜索区间
  - **验收**: 候选阈值区间确定

- [ ] 7.1.3c 加权成本优化确定最优质量评分阈值 T_Q
  - ⚠️ **命名约定**: 使用标准ML命名(以"高质量"为正类):
    - `FP_std` = 错误机制被标高质量 (代价高→实验资源浪费)
    - `FN_std` = 正确机制被标低质量 (代价较低→浪费计算)
  - 总成本 = w × FP_std + (1-w) × FN_std, **w=0.5**
  - 设计意图: w=0.5使FP(错纳)代价与FN(漏掉)代价相等偏重FP → 推高阈值 → 更保守(高精度)策略
  - ⚠️ **注意**: 旧版本文档使用反转命名(FP=正确被拒, FN=错误被纳)，与标准ML约定相反。代码实现必须使用标准命名，避免阈值计算错误
  - 搜索候选区间使总成本最小
  - **验收**: 最优阈值T_Q确定，成本曲线产出

- [ ] 7.1.3d 独立验证集确认阈值泛化性
  - 训练集分出10%独立验证集
  - 评估T_Q泛化性
  - **验收**: 泛化性验证结果

- [ ] 7.1.4 分析错误案例 (含 limited-pool 定性报告 + 负样本分析)
  - 对 full-pool 子集中已知机制未进 Top-3 的案例:
    - 分析失败原因: CGPS 评分低? EZ 验证失败? Agent 误判? grey_zone_penalty过度降权?
    - 按原因分类统计
  - 对 full-pool 子集中随机机制排名高于已知机制的案例:
    - 分析: 哪个评分分量导致偏差?
  - ⭐ **负样本分析**: 对 full-pool 子集中 MechFind 返回但已知机制未出现在候选中的案例:
    - 统计: 负样本比例 = (已知机制未出现在任何候选中的 entry 数) / (full-pool entry 总数)
    - 分类: 完全未返回 (MechFind 搜索未覆盖) vs 返回但被管线过滤 (规则映射失败 / EZ验证排除)
    - 与 limited-pool 区分: limited-pool 是候选<5但已知机制可能在其中；负样本是已知机制完全不在候选集
    - 报告: `data/reports/negative_sample_analysis.json`
  - 对 limited-pool 子集: 产出**定性评估报告**
    - 已知机制是否出现在候选中
    - 管线各模块执行状态 (证明管线在少量候选时仍正常工作)
    - 排名合理性 (化学合理性检查)
  - 对 mechfind_failure 子集: 统计失败原因分布
  - **验收**: 错误分析报告完整，limited-pool 定性报告产出，负样本分析产出

- [ ] 7.1.5 生成验证报告
  - 输出: `data/reports/mcsa_holdout_validation.json`
  - 包含:
    - E1 分类统计: full_pool / limited_pool / mechfind_failure 各自数量及占比
    - full-pool 整体指标: Top-1/3/5, MRR
    - full-pool 分组指标: Scene A/B/C, EC 1-7
    - limited-pool 定性报告: found/not_found, 管线状态, 排名合理性
    - mechfind_failure 统计: 失败原因分布
    - 错误分析: 失败原因分布
    - 与 Phase 4 校准结果对比 (训练集 vs 测试集)
    - quality_score分布分析: 直方图数据+两组重叠度
    - 最优阈值T_Q: 成本曲线+泛化性验证结果
    - 阈值分级表:
      - 90-100: 高置信度 → 直接采纳
      - [T_Q]-90: 中置信度 → 人工复核
      - <[T_Q]: 低置信度 → 触发Agent评审或放弃
    - **E5 检查结果**: full-pool Top-1 准确率是否 ≥ 50%
    - D22氧化还原分类统计: redox_subclass分布及各子类的Scene分布
  - **验收**: Test set metrics documented, 三类子集分别报告

---

## 输出文件清单

- `validation/mcsa_holdout.py`
- `data/reports/mcsa_holdout_validation.json`
- `data/reports/mcsa_holdout_errors.json`
- `data/reports/negative_sample_analysis.json`
- `validation/quality_score_analysis.py`
- `data/reports/quality_score_distribution.json`
- `data/reports/quality_score_threshold.json`
- `data/reports/figures/quality_score_distribution.png`
- `data/reports/figures/threshold_cost_curve.png`

---

## 常见陷阱

1. **数据泄露**: 必须确保测试集中的 entry 在 CGPS 校准时未被使用
2. **随机性**: MechFind 和 LLM 有随机性，需多次运行取平均 (至少3次)
3. **超时**: 部分 entry 的 MechFind 求解可能超时，需记录为 "timeout" 而非 "failure"
4. **Scene 分布不均**: 测试集中 Scene A 可能占大多数，Scene C 很少，需标注
5. **quality_score分布偏移**: 测试集的quality_score分布可能与训练集不同，T_Q需在独立验证集上确认
6. **grey_zone_penalty影响**: penalty会改变quality_score分布，需检查三个等级(1.0/0.85/0.60)是否合理，避免过度降权导致大量候选落入低置信度
7. **⭐ D22金属氧化还原案例处理**: EC 1(氧化还原酶)占M-CSA约25%，其中相当比例涉及金属中心。如果不分离cofactor vs metal氧化还原，金属案例在Scene A/B下RunReactants失败会拖低命中率，产生虚假低性能数据。必须按redox_subclass分组统计

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-7-2.md` 继续
