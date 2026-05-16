# Phase 4-1: S_co实现

**Phase**: 4  
**任务编号**: 4.1  
**前置依赖**: Phase 1 完成 (DS1数据集可用), Phase 3 完成 (DS5数据集可用)  
**阻塞后续**: phase-4-4 (CGPS综合评分)  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 4.1.1 编写 `cgps/s_co.py` 框架
  - 定义核心函数: `compute_s_co(residue_roles: List[str], ds1_data: dict) → float`
  - S_co ∈ [0, 1]: 残基共现频率评分
  - **验收**: 模块可导入，函数签名正确

- [ ] 4.1.2 实现 DS1 频率 → S_co 映射
  - 输入: 候选机制的残基角色列表 (如 ["nucleophile", "electrophilic_catalyst", "proton_acceptor"])
  - 从 DS1 查询: 所有可能的 role_pair 组合的共现频率
  - 频率归一化: `f(role_pair) = count(role_pair) / max_count` → [0, 1]
  - S_co = 所有 role_pair 频率的加权平均 (或几何平均)
  - **验收**: DS1 频率可正确查询并归一化

- [ ] 4.1.3 实现层级化查询
  - DS1 分组: Level 0 (role_pair) 和 Level 1 (role_pair + residue_type_pair)
  - 优先查 Level 1 (细粒度), n_obs < 10 → 降级到 Level 0 (粗粒度)
  - 降级时标注 confidence="coarse"
  - **验收**: 层级化降级逻辑正确

- [ ] 4.1.4 处理边界情况
  - 未知 role_pair: DS1 中不存在 → S_co 降权
  - 单残基机制: 只有1个催化残基，无 role_pair → S_co = 0.5 (中性)
  - DS1 数据缺失: 数据文件不存在 → S_co = 0 (保守)
  - **验收**: 边界情况不 crash

- [ ] 4.1.5 验证测试
  - 测试1: 已知机制 (1BTL) → S_co 高 (>0.5)
  - 测试2: 随机残基组合 → S_co 低 (<0.3)
  - 测试3: 层级化降级 → 正确回退到 Level 0
  - **验收**: Known mechanism scores higher than random

---

## 输出文件清单

- `cgps/s_co.py`
- `cgps/__init__.py`
- `tests/test_s_co.py`

---

## 常见陷阱

1. **role_pair 排序**: DS1 中 (A, B) 和 (B, A) 是同一对，需统一排序后再查询
2. **频率归一化方案**: 最大值归一化 vs Z-score 归一化 vs 百分位归一化，选择影响评分分布，MVP 用最大值归一化
3. **多 role_pair 组合**: 一个机制可能有多个 role_pair，如何组合为单个 S_co? 几何平均比算术平均更严格
4. **DS1 覆盖度**: 部分 role_pair 可能在 DS1 中无记录 (罕见组合)，需有 fallback 策略

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-4-2.md` 继续
