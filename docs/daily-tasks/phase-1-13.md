# Phase 1-13: 样本量缺口报告

**Phase**: 1  
**任务编号**: 1.13  
**前置依赖**: phase-1-8 (DS2 数据), phase-1-11 (覆盖度报告框架)  
**阻塞后续**: Phase 2 (DS3 层级化构建策略依赖此报告的结论)  
**预计耗时**: 0.5天  

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

---

## 输出文件清单

- `cgd/statistics/aggregator.py`
- `data/reports/sample_size_gap.json`

---

## 常见陷阱

1. **DS3 预估不确定性**: DS3 尚未构建，预估基于 DS2 和场景分布推算。预估值与实际 DS3 可能有显著差异，需标注为 "estimated"
2. **n_obs 阈值选择**: DS2 的最小可信样本量通常为 20，DS3 为 30 (因为多了配体维度)。阈值过严导致大量分组不达标，过松则统计不可靠
3. **Level 0/Level 1 边界**: Level 0 的粒度需明确定义。DS2: role_pair only; DS3: distance_category × role。Level 1 则加入 residue_type
4. **小样本偏差**: n_obs < 5 的分组，百分位值 (P5/P95) 完全不可靠。报告中需特别标注这些"危险分组"
5. **层级化策略的实际影响**: 推荐策略直接影响 Phase 2 的 DS3 构建代码，如果策略不当会导致 Phase 2 返工。建议保守选择 (优先保障 Level 0)

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. Phase 1 全部任务完成！继续打开 Phase 2 的第一个任务文件
