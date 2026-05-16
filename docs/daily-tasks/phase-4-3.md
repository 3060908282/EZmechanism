# Phase 4-3: S_path实现

**Phase**: 4  
**任务编号**: 4.3  
**前置依赖**: Phase 3 完成 (DS5规则映射表可用)  
**阻塞后续**: phase-4-4 (CGPS综合评分)  
**预计耗时**: 1.5天  

---

## 任务清单

- [ ] 4.3.1 编写 `cgps/s_path.py` 框架
  - 定义核心函数: `compute_s_path(rule_sequence: List[str], rule_mapping_table: dict) → float`
  - S_path ∈ [0, 1]: 规则路径评分，基于 MechFind→EZ 规则映射覆盖率
  - **验收**: 模块可导入，函数签名正确

- [ ] 4.3.2 实现规则映射覆盖率计算
  - 对候选机制的每一步规则:
    - 查 rule_mapping_table → 判定映射类型
    - 1:1 映射 → step_score = 1.0
    - 1:N 映射 → step_score = 0.5 (待消歧，Phase 5 提升)
    - unmapped → step_score = 0.0
  - S_path = mean(step_scores) = (mapped_steps / total_steps)
  - **验收**: 覆盖率计算正确

- [ ] 4.3.3 实现路径连贯性检查
  - 不仅看覆盖率，还需检查规则步骤间的连贯性:
    - 前一步产物是否与后一步反应物匹配?
    - 原子映射是否连续?
  - 连贯性得分: `coherence = n_coherent_transitions / (total_steps - 1)`
  - S_path = α × coverage + (1-α) × coherence (α=0.7 MVP)
  - **验收**: 连贯性检查可运行

- [ ] 4.3.4 处理边界情况
  - 单步机制: 只有1步 → coherence = 1.0 (无需检查)
  - 全部 unmapped: S_path = 0
  - 部分步骤 SMARTS 匹配失败: 只影响该步骤得分
  - 空规则序列: S_path = 0
  - **验收**: 边界情况不 crash

- [ ] 4.3.5 验证测试
  - 测试1: 全部 1:1 映射 → S_path = 1.0
  - 测试2: 50% 映射 → S_path ≈ 0.5
  - 测试3: 全部 unmapped → S_path = 0
  - 测试4: 映射但步骤间不连贯 → S_path 降低
  - **验收**: Mapped paths score higher than unmapped

---

## 输出文件清单

- `cgps/s_path.py`
- `tests/test_s_path.py`

---

## 常见陷阱

1. **S_path 权重最低**: CGPS 中 w3 ≈ 0.1-0.15，S_path 对最终评分影响较小，不要过度优化
2. **1:N 映射暂定 0.5**: Phase 5 Agent② 消歧后可能提升，当前保守处理
3. **连贯性检查复杂度**: 原子映射追踪在多步后可能断裂，MVP 可简化为 SMILES 匹配 (产物 SMILES = 下一步反应物 SMILES)
4. **DS5 Layer 0 覆盖率**: 若覆盖率仅 40-50%，S_path 平均分可能较低，这是预期行为

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-4-4.md` 继续
