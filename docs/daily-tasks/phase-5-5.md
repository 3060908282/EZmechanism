# Phase 5-5: 争议检测

**Phase**: 5  
**任务编号**: 5.5  
**前置依赖**: Phase 4 完成 (CGPS评分可用, 灰色区间已定义), phase-5-2 (Agent①化学审查结果用于触发条件③)  
**阻塞后续**: phase-5-6 (Agent③④⑤需要争议检测结果触发), phase-5-7 (Agent⑥需要争议上下文)  
**预计耗时**: 2天  

---

## 任务清单

- [ ] 5.5.1 编写 `agents/dispute_detector.py` 框架
  - 核心函数: `detect_dispute(cgps_result, chemistry_review, ez_verification) → DisputeResult`
  - `DisputeResult`: has_dispute (bool), triggers (List[str]), dispute_level ("low"/"medium"/"high")
  - **验收**: 模块可导入运行

- [ ] 5.5.2 实现触发条件① — CGPS 灰色区间
  - 条件: `θ_low < CGPS_score ≤ θ_high`
  - 含义: 评分不确定，需进一步审查
  - 触发级别: medium
  - **验收**: 灰色区间判定正确

- [ ] 5.5.3 实现触发条件② — Agent 分歧
  - 条件: Agent①(化学审查)和 EZ验证 给出矛盾结论
  - 具体: Agent① plausibility ≥ 0.6 (合理) 但 EZ验证 S_geo < 0.3 (几何不通过)，或反之
  - 含义: 化学审查和几何验证给出矛盾结论，需仲裁
  - 触发级别: high
  - **验收**: Agent分歧检测正确

- [ ] 5.5.4 实现触发条件③ — 几何矛盾
  - 条件: 同一机制内不同几何维度给出矛盾信号
  - 具体: 某残基-配体距离在阈值内(pass) 但角度明显异常(A1偏离>30°)，或反之
  - 含义: 3D验证内部不一致，可能存在数据质量问题
  - 触发级别: medium
  - **验收**: 几何矛盾检测正确

- [ ] 5.5.5 实现触发条件④ — 路径断裂
  - 条件: 多步机制中相邻步骤的原子映射不连续
  - 具体: 步骤 i 的产物原子 ≠ 步骤 i+1 的反应物原子 (原子映射断裂)
  - 含义: 机制步骤间存在逻辑断裂，可能是假阳性机制
  - 触发级别: high
  - **验收**: 路径断裂检测正确

- [ ] 5.5.6 实现补充触发条件⑤ — 多候选评分接近
  - 条件: Top-1 和 Top-2 的 CGPS 分差 < 0.1
  - 含义: 多个候选竞争激烈，需仔细甄别
  - 触发级别: low
  - **验收**: 多候选接近检测正确

- [ ] 5.5.7 实现争议分级和输出
  - 无争议 → 直接输出结果 (无需 Agent 评审)
  - low 级别 → 仅触发 Agent③ (催化化学审查)
  - medium 级别 → 触发 Agent③④ (催化+结构)
  - high 级别 → 触发 Agent③④⑤ (全部评审)
  - 多触发叠加时 dispute_level 取最高
  - **验收**: Disputed cases detected, 分级正确

- [ ] 5.5.8 ⭐ 实现触发条件⑥ — Scene C 低分强制触发 (三层漏斗第二层: 增强)
  - **背景**: Scene C无3D验证数据，CGPS评分区分力弱。当Scene C + 低分时，系统不能只返回一个低分沉默退出，必须强制触发Agent评审，将"低置信度结果"转化为"可操作假设"
  - 条件: `scene == "C"` AND (`CGPS_score ≤ θ_low` OR `quality_score < T_Q`)
  - 含义: Scene C下评分低或不确定，统计评分不足以支撑判断，需Agent③④⑤提供序列/化学/文献推理
  - **此触发条件绕过争议检测**，直接强制触发Agent③④⑤ (dispute_level="high")
  - 与其他触发条件的关系:
    - Scene C + 低分 → 无论其他条件是否满足，至少触发Agent③④⑤
    - Scene C + 低分 + 其他争议 → 取最高dispute_level (已经是最高的"high")
  - Scene C强制触发时Agent使用**Scene C专用prompt** (见phase-5-6的SCENE_C_SYSTEM_PROMPT)
  - **验收**: Scene C + CGPS≤θ_low → 强制触发Agent③④⑤; Scene C + CGPS>θ_high → 不强制触发

---

## 输出文件清单

- `agents/dispute_detector.py`
- `tests/test_dispute_detector.py`

---

## 常见陷阱

1. **灰色区间边界**: θ_low 和 θ_high 是校准值，边界附近的判定可能不稳定，需加缓冲区 (±0.02)
2. **Agent分歧阈值**: Agent① plausibility 和 EZ S_geo 的矛盾阈值需从实际数据验证。太低 → 过多争议；太高 → 遗漏矛盾
3. **路径断裂与多步匹配**: 部分机制步骤的原子映射本身就不完美 (过渡态模糊)，需容忍少量不连续
4. **无争议快速路径**: 大部分情况应无争议 → 直接输出，避免不必要的 LLM 调用
5. **多触发叠加**: 可能同时满足多个触发条件，需正确组合 dispute_level (取最高)
6. **⭐ Scene C低分强制触发的成本**: 触发Agent③④⑤意味着3次额外LLM调用。但Scene C低分意味着统计评分无法支撑判断，Agent的序列/化学/文献推理可能是唯一的判断依据，值得成本
7. **⭐ Scene C高分不触发**: 触发条件⑥只对Scene C低分生效。Scene C + CGPS>θ_high → 统计评分已有足够区分力，无需额外Agent调用

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5-6.md` 继续
