# Phase 1-12: DS2 衍生 — 距离阈值表

**Phase**: 1  
**任务编号**: 1.12  
**前置依赖**: phase-1-8 (DS2 数据集构建完成)  
**阻塞后续**: Phase 2 (Scene B DS3 筛选标准), Phase 4 (CGPS S_geo 阈值), Phase 5 (争议检测)  
**预计耗时**: 0.5天  

---

## 任务清单

- [ ] 1.12.1 从 DS2 提取 P90/P95 百分位
  - 读取 `data/datasets/DS2_residue_distance.json`
  - 对每个 `role_pair` 分组，提取该分组内所有观测距离值
  - 若 DS2 中已存 p90/p95，直接读取
  - 若 DS2 仅存 p5-p95，则对全量 distance_values 重新计算 p90 和 p95
  - **验收**: 每个 role_pair 有 P90/P95 值

- [ ] 1.12.2 聚合为 role_pair 级别阈值
  - DS2 按 (role_pair, residue_type_pair) 分组，但距离阈值表只需 role_pair 级别
  - 聚合方式: 将同一 role_pair 下所有 residue_type_pair 的 distance_values 合并后计算 P90/P95
  - 若某 role_pair 样本量充足 (n_obs ≥ 20)，直接计算
  - 若样本量不足，标注为 "low_sample_size" 并使用全部数据合并计算
  - **验收**: 聚合逻辑正确，样本量标注清晰

- [ ] 1.12.3 编写距离阈值表
  - 路径: `data/derived/distance_thresholds.json`
  - 结构: `{role_pair: {p90, p95, n_obs, source_type}}`
  - `source_type`: "direct" (直接从 PDB 计算) / "mixed" (含同源替代数据)
  - **验收**: 每个 role_pair 有完整的 P90/P95/n_obs/source_type 字段

- [ ] 1.12.4 关键阈值合理性验证
  - nucleophile-base 的 P95 应在 6-8Å 范围内 (文献参考值)
  - proton_donor-proton_acceptor 的 P95 应在 3-5Å 范围内 (氢键距离)
  - electrostatic_stabiliser 相关对的 P95 应较长 (~8-12Å)
  - oxyanion_hole 相关对的 P95 应较短 (~3-5Å)
  - 异常值 (如 P95 > 15Å 或 < 1Å) 需人工审查
  - **验收**: 各 role_pair 的 P95 在物理合理范围内

---

## 输出文件清单

- `data/derived/distance_thresholds.json`

---

## 常见陷阱

1. **P90 vs P95 选择**: 距离阈值表同时提供 P90 和 P95，但不同场景使用不同阈值。Scene B 筛选用 P95 (宽松)，争议检测用 P90 (严格)。确保两个值都准确
2. **低样本量分组**: 部分罕见 role_pair (如 "activator-proton_shuttle") 可能只有 5-10 个观测，P95 不可靠。需标注 `n_obs` 以便下游判断
3. **聚合粒度混淆**: 距离阈值表是 role_pair 级别 (不含 residue_type_pair)，但 DS2 是 (role_pair, residue_type_pair) 级别。聚合时需将同一 role_pair 下所有 residue_type_pair 的数据合并
4. **source_type 标注**: Phase 1 的 DS2 全部是 "direct" (来自 PDB 直接计算)，同源替代数据要到 Phase 2 才会加入。标注时需区分
5. **离群值影响**: 极少数距离值可能异常大 (>20Å，如不同亚基的残基对)，聚合计算 P90/P95 前应先做基本清洗

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-1-13.md` 继续
