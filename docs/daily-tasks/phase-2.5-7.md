# Phase 2.5-7: S_geo 运行时组合

**Phase**: 2.5  
**任务编号**: 2.5.7  
**前置依赖**: phase-2.5-5 (Scene A验证管线产出维度评分)  
**阻塞后续**: phase-2.5-10 (置信度计算使用S_geo), phase-2.5-11 (管线编排)  
**预计耗时**: 0.5天  

---

## 任务清单

- [ ] 2.5.7.1 编写 `ez_validator/scoring/s_geo_runtime.py`
  - 定义核心函数: `compute_s_geo(distance_scores: Dict[str, float], scene: str) → float`
  - 输入: D1-D6, A1-A3 逐维度评分 (每个 [0,1])
  - 输出: S_geo ∈ [0, 1]
  - **验收**: 函数签名正确，可导入调用

- [ ] 2.5.7.2 实现 Scene A: 9 维度组合
  - Scene A 可用维度: D1, D2, D3, D4, D5, D6, A1, A2, A3
  - 组合策略 (MVP): 等权平均 `S_geo = mean(D1..D6, A1..A3)`
  - 逐维度线性插值: 若距离 d 在 [P5, P95] 内 → score=1; 超出 → 线性衰减到 0
  - **验收**: 9 维度全部在 [0,1] → S_geo=1.0; 全部为 0 → S_geo=0.0

- [ ] 2.5.7.3 实现 Scene B: 8 维度组合
  - Scene B: D1 退化为常数 (PAP 锚定使 D1 不变)，实际 8 维度
  - `S_geo = mean(D2..D6, A1..A3)` (排除 D1)
  - Scene B 的 S_geo 需乘以置信度系数 (High=1.0, Medium=0.7, Low=0.4)
  - ⚠️ **注意**: 此处的乘法系数与 phase-2-12 的 `score += 0.1` 同源加成是不同机制——phase-2-12 的加成作用于 PAP 放置质量评分 (CGD构建阶段), 此处系数作用于运行时 S_geo 组合。两者不冲突，分别在不同层级生效
  - **验收**: Scene B 的 S_geo 排除 D1，且含置信度衰减

- [ ] 2.5.7.4 实现 Scene C: S_geo = 0
  - 无 PDB 结构 → 无几何验证数据 → S_geo = 0
  - CGPS 公式中 w2·S_geo 项为 0，退化为 w1·S_co + w3·S_path
  - **验收**: Scene C returns S_geo=0

- [ ] 2.5.7.5 边界情况处理
  - 维度缺失: 某维度无 DS2/DS3 数据 → 从平均中排除，剩余维度等权
  - 全部维度缺失: S_geo = 0 (无信息)
  - NaN/Inf: 某维度评分为异常值 → 排除该维度
  - **验收**: 缺失维度不 crash，S_geo 始终在 [0,1]

- [ ] 2.5.7.6 编写单元测试
  - 测试1: Scene A 全维度满分 → S_geo=1.0
  - 测试2: Scene A 全维度零分 → S_geo=0.0
  - 测试3: Scene B 排除 D1
  - 测试4: Scene C → S_geo=0
  - 测试5: 部分维度缺失 → 正确降级
  - **验收**: S_geo in [0,1], Scene C returns 0

---

## 输出文件清单

- `ez_validator/scoring/s_geo_runtime.py`
- `tests/test_s_geo_runtime.py`

---

## 常见陷阱

1. **D1 退化设计特征**: PAP 将底物反应原子固定在锚点，旋转不改变 D1 距离。Scene B 排除 D1 是设计特征，不是 bug
2. **等权 vs 加权**: MVP 使用等权平均，后续可改为加权 (按类别重要性)。加权方案需用 Scene A 数据做消融实验验证
3. **线性插值衰减**: 距离超出 P5-P95 时的衰减函数选择影响 S_geo 分布，线性衰减为最保守选择
4. **维度数量不一致**: 不同机制可能激活不同维度的距离类别，S_geo 计算时需动态处理可用维度集合

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2.5-8.md` 继续
