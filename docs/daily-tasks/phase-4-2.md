# Phase 4-2: S_geo实现

**Phase**: 4  
**任务编号**: 4.2  
**前置依赖**: Phase 3 完成 (DS2/DS3数据集+distance_thresholds.json可用)
**阻塞后续**: phase-4-4 (CGPS综合评分)  
**预计耗时**: 2天  

---

## 任务清单

- [ ] 4.2.1 编写 `cgps/s_geo.py` 框架
  - 定义核心函数: `compute_s_geo(distance_values: Dict[str, float], ds2_data: dict, ds3_data: dict, scene: str) → float`
  - S_geo ∈ [0, 1]: 几何评分，基于距离和角度的统计分布
  - **验收**: 模块可导入，函数签名正确

- [ ] 4.2.2 实现 DS2 距离阈值查询 (distance_thresholds.json)
  - 输入: (role_pair, distance_category)
  - 查询 `data/derived/distance_thresholds.json`: 获取 P5, P50, P95 值
  - 层级化: Level 1 (含 residue_type) → Level 0 (仅 role_pair)
  - 输出: 距离阈值区间
  - **验收**: DS2 阈值查询正确

- [ ] 4.2.3 实现 DS3 距离/角度阈值查询
  - 输入: (distance_category, role, residue_type?)
  - 查询 DS3: 获取 P5, P50, P95 值
  - 层级化: Level 1 → Level 0
  - 角度类 (A1-A3): 查询角度分布的 P5, P50, P95
  - **验收**: DS3 阈值查询正确

- [ ] 4.2.4 实现逐维度评分函数
  - 对每个距离/角度维度:
    - 值在 [P5, P95] 内 → score = 1.0
    - 值 < P5 → score = max(0, 1 - (P5 - value) / P5)
    - 值 > P95 → score = max(0, 1 - (value - P95) / (P95 - P50))
  - 评分 ∈ [0, 1]
  - **验收**: 逐维度评分计算正确

- [ ] 4.2.5 实现 S_geo 多维度组合
  - Scene A: 全部9维度 (D1-D6, A1-A3) 等权平均
  - Scene B: 8维度 (排除 D1) × 置信度系数
  - Scene C: S_geo = 0
  - 复用 `s_geo_runtime.py` (phase-2.5-7) 的逻辑
  - **验收**: Scene A distance score reasonable

- [ ] 4.2.6 实现边界情况
  - 缺失维度: 某维度无 DS2/DS3 数据 → 从平均中排除
  - n_obs 过少: n_obs < 10 → 标注 low confidence
  - 全部缺失: S_geo = 0
  - **验收**: 缺失数据不 crash

- [ ] 4.2.7 验证测试
  - 测试1: 1BTL Scene A → S_geo > 0.5 (已知机制)
  - 测试2: 随机距离 → S_geo < 0.3
  - 测试3: Scene C → S_geo = 0
  - **验收**: S_geo 评分合理，区分度高

---

## 输出文件清单

- `cgps/s_geo.py`
- `tests/test_s_geo.py`

---

## 常见陷阱

1. **DS2 vs DS3 距离**: DS2 是残基-残基距离，DS3 是残基-配体距离，不要混淆查询
2. **P5-P95 对称性**: 低于 P5 和高于 P95 的惩罚不应等权，距离过短 (空间碰撞) 通常比距离过长更严重
3. **角度 vs 距离量纲**: 角度 (度) 和距离 (Å) 量纲不同，评分函数需分别处理
4. **复用 s_geo_runtime**: phase-2.5-7 已实现运行时版 S_geo 组合，本任务的 CGPS 版可复用其核心逻辑

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-4-3.md` 继续
