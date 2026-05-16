# Phase 3-6: DS3迭代优化

**Phase**: 3  
**任务编号**: 3.6  
**前置依赖**: phase-3-5 (统计消歧产出P50先验)  
**阻塞后续**: phase-3-7 (全数据集审计)  
**预计耗时**: 1.5天  

---

## 任务清单

- [ ] 3.6.1 将消歧结果反馈到 DS3
  - 路径: `cgd/statistics/ds3_refiner.py`
  - 逻辑: 消歧后确定了更精确的原子映射 → 重新计算部分距离
  - 具体动作:
    1. 读取消歧结果: 确定的 atom assignment 对
    2. 对受影响的 DS3 分组，用精确映射重新计算距离
    3. 更新统计量 (P5, P50, P95 等)
  - **验收**: DS3 部分分组统计数据更新

- [ ] 3.6.2 评估优化效果
  - 比较优化前后 DS3 的分布变化:
    - 标准差: 应减小 (分布更集中)
    - P5-P95 区间: 应缩窄
    - 异常值: 应减少
  - 量化: 优化前后各分组 std 的平均变化率
  - **验收**: DS3 distributions slightly narrowed

- [ ] 3.6.3 处理优化引起的连锁效应
  - DS3 更新 → DS5 映射可能受影响 (P50 先验变化)
  - DS3 更新 → 距离阈值表可能需更新
  - 决策: 是否需要迭代多轮？
    - 通常 1 轮即可，变化量 <5% 不值得迭代
  - **验收**: 连锁效应被识别和处理

- [ ] 3.6.4 输出优化后 DS3
  - 路径: `data/datasets/DS3_residue_ligand_distance.json` (覆盖更新)
  - 保留版本信息: `refined_at`, `refinement_method`
  - 备份原版: `data/datasets/DS3_residue_ligand_distance.v0.json`
  - **验收**: 优化后 DS3 可正常使用

---

## 输出文件清单

- `cgd/statistics/ds3_refiner.py`
- `data/datasets/DS3_residue_ligand_distance.json` (更新版)
- `data/datasets/DS3_residue_ligand_distance.v0.json` (备份)
- `data/reports/ds3_refinement_report.json`

---

## 常见陷阱

1. **优化幅度有限**: 消歧只影响少量分组，整体 DS3 变化可能很小 (<5%)，这是预期行为
2. **备份原版**: 必须备份优化前的 DS3，以便回滚或对比
3. **不可逆操作**: 距离重计算后原数据被覆盖，需确保优化逻辑正确再执行
4. **迭代终止条件**: 若一轮优化后 std 变化 <1%，不值得继续迭代

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-3-7.md` 继续
