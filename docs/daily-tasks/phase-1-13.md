# Phase 1-13: 样本量缺口报告 + Go/No-Go 检查点

**Phase**: 1  
**任务编号**: 1.13  
**前置依赖**: phase-1-8 (DS2 数据), phase-1-11 (覆盖度报告框架)  
**阻塞后续**: Phase 2 (DS3 层级化构建策略依赖此报告的结论)  
**预计耗时**: 1天 (原0.5天 + 0.5天 Go/No-Go 验证)  
**⭐ 重要性**: 本任务是整个项目的**关键决策点**，决定后续Phase 2-7的执行策略

---

## 任务清单

- [ ] 1.13.1 编写 `cgd/statistics/aggregator.py` (部分实现)
  - 创建统计聚合模块
  - 实现 `analyze_sample_size_distribution(dataset, group_key)` 函数
  - 统计各分组的 n_obs 分布
  - **验收**: 模块框架可导入运行

- [ ] 1.13.2 DS2 分组 n_obs 分布分析
  - 读取 `data/datasets/DS2_residue_distance.json`
  - 按 (role_pair, residue_type_pair) 分组，统计每组 n_obs
  - 计算各级别达标率:
    - Level 0 (粗粒度: role_pair only): n_obs ≥ 20 的比例
    - Level 1 (细粒度: role_pair + residue_type_pair): n_obs ≥ 20 的比例
  - **验收**: DS2 各分组 n_obs 分布统计完整

- [ ] 1.13.3 DS3 分组 n_obs 预估
  - DS3 尚未构建，但可基于 DS2 数据 + 场景分布预估
  - DS3 的分组维度: (distance_category, role, residue_type)
  - Scene A 条目数 (来自 phase-1-10) 决定 DS3 的最大样本量
  - 预估各 distance_category 的可能 n_obs 范围
  - **验收**: DS3 各分组预估样本量合理

- [ ] 1.13.4 Level 0 / Level 1 覆盖率报告
  - Level 0 (粗粒度): 按 role_pair / distance_category 聚合，达标率应 > 80%
  - Level 1 (细粒度): 按 role_pair + residue_type_pair 聚合，达标率可能 < 50%
  - 输出: 每个级别的达标分组数、未达标分组数、达标率
  - **验收**: Level 0/Level 1 达标率统计清晰

- [ ] 1.13.5 层级化策略推荐
  - 若 Level 1 达标率 ≥ 60%: 推荐使用 Level 1 (细粒度)
  - 若 Level 1 达标率 < 60% 但 Level 0 ≥ 80%: 推荐层级化 (Level 0 + Level 1 双层)
  - 若 Level 0 达标率 < 80%: 建议补充数据源 (同源替代) 或放宽阈值
  - 确定 DS3 构建的层级化参数 (Level 0/Level 1 的分组粒度和 n_obs 阈值)
  - **验收**: 策略推荐有数据支撑，参数具体可执行

- [ ] 1.13.6 输出样本量缺口报告
  - 路径: `data/reports/sample_size_gap.json`
  - 结构:
    ```json
    {
      "ds2": {
        "level0": {"n_groups": N, "n_pass": N, "pass_rate": X, "threshold": 20},
        "level1": {"n_groups": N, "n_pass": N, "pass_rate": X, "threshold": 20}
      },
      "ds3_estimated": {
        "level0": {"n_groups": N, "n_pass_estimated": N, "pass_rate_estimated": X, "threshold": 30},
        "level1": {"n_groups": N, "n_pass_estimated": N, "pass_rate_estimated": X, "threshold": 30}
      },
      "recommendation": {
        "strategy": "hierarchical",
        "level0_threshold_ds2": 20,
        "level1_threshold_ds2": 20,
        "level0_threshold_ds3": 30,
        "level1_threshold_ds3": 30,
        "rationale": "..."
      }
    }
    ```
  - **验收**: 报告包含 DS2/DS3 的各级别达标率和层级化策略推荐

- [ ] 1.13.7 ⭐ DS3 Scene A 覆盖率快速验证 (Go/No-Go 检查点 1)
  - **背景**: 设计中DS3 Scene A预期覆盖率为75-85%（对适用entries），但实际覆盖率需要尽早验证。Phase 1完成后有足够数据做快速抽样
  - 方法: 从Phase 1-10的覆盖度报告中抽取50个Scene A entries (有PDB + 有配体)
  - 对每个抽样entry，模拟DS3收集流程:
    1. 检查配体分类结果 (LigandClassifier) → 排除excluded
    2. 检查SMARTS匹配是否成功 → 记录成功/失败
    3. 检查距离计算是否可行 → 记录结果
  - 计算实际产出率: `n_valid / n_sampled`
  - 输出: `data/reports/ds3_scene_a_coverage_check.json`
  - **Go/No-Go 判定**:
    - ≥75% → ✅ GO: 按原计划执行Phase 2
    - 60-75% → ⚠️ 谨慎GO: 需准备降级策略，增加Scene B同源搜索投入
    - <60% → ❌ 重新评估: PAP可行性存疑，考虑调整Scene B权重或简化DS3需求
  - **验收**: 50个抽样entries的实际产出率已计算; Go/No-Go判定已记录

- [ ] 1.13.8 ⭐ PAP 预实验 (Go/No-Go 检查点 2)
  - **背景**: PAP是Scene B的核心方法，其RMSD精度直接决定Scene B验证的可信度。需要用已知结构做预实验验证
  - 方法: 选择3-5个已知结构做PAP "反向验证":
    1. 1BTL (beta-lactamase + benzylpenicillin) — 经典测试案例
    2. 1XYZ 或其他有底物配体的高分辨率PDB
    3. 覆盖不同EC类 (水解酶/氧化还原酶/转移酶)
  - 预实验流程:
    1. 从PDB中移除配体 → 模拟"无配体"状态
    2. 运行PAP放置 → 获取预测配体位置
    3. 对比PDB中配体的真实位置 → 计算RMSD
  - 使用Phase 2-9的MVP代码 (如已开发)；否则手写简化版PAP
  - 输出: `data/reports/pap_preexperiment.json`
    ```json
    {
      "test_cases": [
        {"pdb_id": "1BTL", "rmsd": 2.8, "d1_error": 0.3, "status": "pass"},
        {"pdb_id": "2XYZ", "rmsd": 3.5, "d1_error": 0.7, "status": "pass"}
      ],
      "median_rmsd": 3.15,
      "go_no_go": "cautious_go"
    }
    ```
  - **Go/No-Go 判定** (RMSD中位数):
    - ≤3.5Å → ✅ GO: PAP作为Scene B验证方法
    - 3.5-4.5Å → ⚠️ 谨慎GO: PAP目标调整为4.0Å，论文中标注为"探索性分析"
    - >4.5Å → ❌ 启动Plan B: PAP降级为"探索性分析"，论文叙事重心转移至Scene分层框架+CGD数据贡献
  - **验收**: 3-5个测试案例RMSD已计算; Go/No-Go判定已记录

- [ ] 1.13.9 ⭐ DS5 Layer 0 映射率快速验证 (Go/No-Go 检查点 3)
  - **背景**: DS5 Layer 0预期1:1映射率40-50%。虽然S_path权重w3≈0.1-0.15影响有限，但需验证不至于更低
  - 方法: 抽样100条MechFind规则 (从Unique_Rules_1.csv)
  - 对每条规则:
    1. 判断规则格式 (质子化/M-CSA/其他)
    2. 尝试路径1/2/3残基映射
    3. 尝试SMARTS直接匹配
    4. 记录映射结果: exact/partial/unmapped
  - 计算实际1:1映射率: `n_exact + n_partial / n_sampled`
  - 输出: `data/reports/ds5_layer0_coverage_check.json`
  - **Go/No-Go 判定**:
    - ≥40% → ✅ GO: 按原计划执行Phase 3
    - 30-40% → ⚠️ 接受: 影响有限(w3低)，Phase 3照常执行
    - <30% → ⚠️ 提前启动: 在Phase 3完成后立即启动Layer 1 LLM消歧(Phase 5-3)
  - **注意**: 此检查点为"软"检查——即使DS5映射率低，项目仍可继续。S_path低权重设计本身就是对冲这个风险
  - **验收**: 100条抽样规则映射结果已记录; Go/No-Go判定已记录

- [ ] 1.13.10 ⭐ 综合Go/No-Go决策报告
  - 汇总检查点1-3的结果，输出综合决策: `data/reports/go_nogo_decision.json`
    ```json
    {
      "checkpoint_1_ds3_coverage": {"result": "cautious_go", "value": 0.68, "threshold": 0.75},
      "checkpoint_2_pap_rmsd": {"result": "go", "value": 3.2, "threshold": 3.5},
      "checkpoint_3_ds5_mapping": {"result": "go", "value": 0.42, "threshold": 0.40},
      "overall_decision": "GO_WITH_ADJUSTMENTS",
      "adjustments": ["增加Scene B同源搜索投入", "PAP目标调整为4.0Å"],
      "plan_b_trigger": false,
      "decision_date": "2025-XX-XX",
      "decision_maker": "项目组"
    }
  ```
  - 可能的综合决策:
    - `GO`: 所有检查点通过，按原计划执行
    - `GO_WITH_ADJUSTMENTS`: 部分检查点需要调整，但项目继续
    - `MAJOR_RESCOPING`: 多个检查点未通过，需大幅调整项目范围
    - `NO_GO`: 核心检查点失败，项目暂停重新评估
  - **验收**: 综合决策已记录; 调整措施已明确; 所有利益相关方已确认

---

## 输出文件清单

- `cgd/statistics/aggregator.py`
- `data/reports/sample_size_gap.json`
- `data/reports/ds3_scene_a_coverage_check.json` (⭐ 新增: Go/No-Go检查点1)
- `data/reports/pap_preexperiment.json` (⭐ 新增: Go/No-Go检查点2)
- `data/reports/ds5_layer0_coverage_check.json` (⭐ 新增: Go/No-Go检查点3)
- `data/reports/go_nogo_decision.json` (⭐ 新增: 综合决策报告)

---

## 常见陷阱

1. **DS3 预估不确定性**: DS3 尚未构建，预估基于 DS2 和场景分布推算。预估值与实际 DS3 可能有显著差异，需标注为 "estimated"
2. **n_obs 阈值选择**: DS2 的最小可信样本量通常为 20，DS3 为 30 (因为多了配体维度)。阈值过严导致大量分组不达标，过松则统计不可靠
3. **Level 0/Level 1 边界**: Level 0 的粒度需明确定义。DS2: role_pair only; DS3: distance_category × role。Level 1 则加入 residue_type
4. **小样本偏差**: n_obs < 5 的分组，百分位值 (P5/P95) 完全不可靠。报告中需特别标注这些"危险分组"
5. **层级化策略的实际影响**: 推荐策略直接影响 Phase 2 的 DS3 构建代码，如果策略不当会导致 Phase 2 返工。建议保守选择 (优先保障 Level 0)
6. **⭐ Go/No-Go不是终点而是起点**: 即使所有检查点都通过，风险仍然存在。Go/No-Go决策的价值在于**及早发现致命问题**，而非保证后续顺利
7. **⭐ PAP预实验样本量偏小**: 3-5个测试案例只能初步验证，不能代表全部M-CSA entries的PAP表现。Phase 7的完整验证才是最终评估
8. **⭐ DS3覆盖率"对适用entries"而非"对全部entries"**: 75-85%是条件概率(给定Scene A entry的成功率)，不是全局覆盖率。全局覆盖率取决于场景分布

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. Phase 1 全部任务完成！继续打开 Phase 2 的第一个任务文件
