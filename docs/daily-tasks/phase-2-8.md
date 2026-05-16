# Phase 2-8: 同源替代 DS3

**Phase**: 2
**任务编号**: 2.8
**前置依赖**: phase-2-7 (残基保守性验证), phase-2-3 (DS3 Scene A 框架和构建逻辑)
**阻塞后续**: phase-2-12 (置信度评估需Scene B数据), Phase 2.5 (Scene B验证管线)
**预计耗时**: 2天

---

## 任务清单

- [ ] 2.8.1 扩展 `cgd/builders/ds3_builder.py` 支持 Scene B
  - 在现有 DS3Builder 类中添加 `build_scene_b()` 方法
  - 数据流: 通过保守性验证的同源结构 → 残基-配体距离计算 → TM-score 加权聚合
  - Scene B 数据标记: `source_type="homolog"`
  - **验收**: Scene B 构建接口可用

- [ ] 2.8.2 同源结构残基-配体距离计算
  - 对每个通过保守性验证的同源结构:
    1. 获取等价催化残基 (从 conservation_results 中映射)
    2. 识别配体 (HETATM，使用 LigandClassifier 过滤)
    3. 匹配反应原子 (SMARTS，同 phase-2-3 逻辑)
    4. 计算 D1-D6 距离 (同 phase-2-3 逻辑)
    5. 角度 A1-A3 占位 (null，同 phase-2-3)
  - 距离需变换到参考坐标系 (使用 TM-align 的旋转矩阵+平移向量)
  - **验收**: 同源距离计算逻辑正确，坐标变换一致

- [ ] 2.8.3 TM-score 加权聚合
  - 对同一 (ec_class, distance_category, role, residue_type) 分组:
    - Scene A 观测: weight = 1.0
    - Scene B 观测: weight = TM-score tier weight (1.0 / TM-score / discarded)
  - 加权统计:
    - 加权均值: `Σ(w_i × d_i) / Σ(w_i)`
    - 加权百分位: 按 weight 重复采样后计算百分位
    - 或简化: 将同源观测按 weight 比例加入样本池 (weight=0.8的观测复制0.8次 ≈ 4/5概率包含)
  - **验收**: TM-score 加权聚合逻辑正确

- [ ] 2.8.4 合并 Scene A + Scene B 数据
  - Level 0 分组: `(distance_category, role)` — 合并 Scene A + B
  - Level 1 分组: `(distance_category, role, residue_type)` — 合并 Scene A + B
  - 每条记录标注:
    - `source_type`: "direct" (Scene A) 或 "homolog" (Scene B) 或 "mixed" (合并后)
    - `n_direct`: Scene A 观测数
    - `n_homolog`: Scene B 观测数
    - `tm_scores`: 参与的同源结构 TM-score 列表
  - **验收**: Scene A + B 合并结构正确

- [ ] 2.8.5 输出更新后的 DS3 数据集
  - 路径: `data/datasets/DS3_residue_ligand_distance.json` (覆盖 Scene A 版本)
  - 新增 Scene B 数据和合并统计
  - 元数据: n_scene_a_entries, n_scene_b_entries, n_entries_total
  - **验收**: JSON 包含 Scene A 和 Scene B 数据

- [ ] 2.8.6 验收验证
  - Scene B 距离与 Scene A 参考距离偏差 < 1.0Å (对于同一分组)
  - 同源结构引入后 n_obs 增加 (Scene A+B > Scene A alone)
  - 高 TM-score 同源的距离偏差小于低 TM-score 同源
  - **验收**: Scene B 距离在合理范围内

---

## 输出文件清单

- `cgd/builders/ds3_builder.py` (扩展)
- `data/datasets/DS3_residue_ligand_distance.json` (更新，含Scene A+B)

---

## 常见陷阱

1. **坐标系不一致**: Scene A 在参考结构坐标系，Scene B 需先变换到参考坐标系再计算距离；直接在同源坐标系计算的距离无法与 Scene A 合并
2. **同源配体可能不同**: 同源结构结合的配体可能与参考结构不同 (不同底物/抑制剂)，需确认配体类型一致或可比较
3. **TM-score 加权过度简化**: 将连续的 TM-score 离散化为 3 层会损失信息；考虑直接使用 TM-score 作为权重
4. **加权百分位计算**: 加权百分位的标准算法较复杂；MVP 阶段可用简化方法 (weight 作为采样概率)
5. **Scene B 观测不独立**: 同一蛋白的不同同源结构之间不独立，可能引入统计偏差；但 CGD 是描述性统计而非推断统计，可接受
6. **合并后统计量变化**: 加入 Scene B 可能改变 Scene A 的百分位分布，需检查是否引入异常值
7. **同源残基映射错误**: 如果 Level 1 保守性验证有假阳性，错误的残基映射会导致距离偏差

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2-9.md` 继续
