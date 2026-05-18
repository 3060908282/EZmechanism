# Phase 5-2: Agent①化学审查

**Phase**: 5  
**任务编号**: 5.2  
**前置依赖**: phase-5-1 (LLM接口封装)  
**阻塞后续**: phase-5-3 (Agent②需要化学审查结果), phase-5-5 (争议检测)  
**预计耗时**: 2天  

---

## 任务清单

- [ ] 5.2.1 编写 `agents/agent1_chemist.py` 框架
  - 核心函数: `review_chemistry(mechanism, substrate, product) → ChemistryReview`
  - `ChemistryReview`: plausibility_score (0-1), flagged_changes, explanation
  - **验收**: 模块可导入运行

- [ ] 5.2.2 实现基团变化向量分析
  - 提取候选机制每一步的基团变化:
    - 键形成: A-B (键类型: 单键/双键/三键)
    - 键断裂: A~B
    - 电荷变化: A: +1 → A: 0
    - 质子转移: H 从 A 转移到 B
  - 将变化向量编码为 LLM 可理解的文本描述
  - **验收**: 变化向量可正确提取和编码

- [ ] 5.2.3 实现 LLM 化学审查 prompt
  - Prompt 结构:
    ```
    System: 你是催化机制化学审查专家
    Input: 底物SMILES, 产物SMILES, 机制步骤列表(含基团变化)
    Task: 评估每一步的化学合理性
    Output JSON: {plausibility_score: 0.0-1.0, flagged_steps: [...], explanation: "..."}
    ```
  - 重点审查:
    - 不可能的键变化 (如 C-C 四键)
    - 不合理的电荷转移 (如远距离质子转移无介质)
    - 违反八隅体规则的中间体
    - 不合理的氧化态变化 (⚠️ M15: 见下方LLM局限性)
  - ⚠️ **M15修正: LLM无法可靠判断金属价态变化合理性**: Fe²⁺→Fe³⁺、Cu⁺→Cu²⁺等金属氧化态变化需要量子化学计算，LLM无法可靠判断。对金属氧化态变化步骤，Agent①应标注"metal_valence_change_beyond_llm_capability"并降级到Scene C (D22)，而非给出可能有误的plausibility评分
  - **验收**: LLM 可识别明显不合理的化学变化; 金属价态变化步骤自动降级标记

- [ ] 5.2.4 实现硬编码规则降级
  - LLM 不可用时，使用 `residue_info.py` 中的硬编码规则:
    - 亲核试剂规则: nucleophile 必须有孤对电子
    - 酸碱规则: proton_donor 必须有可转移的 H
    - 电负性规则: 键变化方向符合电负性趋势
  - 降级模式: 返回 `plausibility_score=0.5` (中性) + 简单规则判定
  - **验收**: LLM 关闭时系统仍可运行

- [ ] 5.2.5 验证测试
  - 测试1: 合理机制 (丝氨酸水解) → plausibility_score > 0.7
  - 测试2: 不合理机制 (C-C 四键) → flagged
  - 测试3: LLM 不可用 → 硬编码降级
  - **验收**: Implausible changes flagged

---

## 输出文件清单

- `agents/agent1_chemist.py`
- `agents/prompts/chemist_prompt.py`
- `tests/test_agent1_chemist.py`

---

## 常见陷阱

1. **LLM 幻觉**: LLM 可能"自信地"给出错误的化学判断，需要将关键结论锚定到 DS 数据而非纯 LLM 推理
2. **prompt 工程**: 化学 SMILES 表示对 LLM 是挑战，需在 prompt 中提供足够的示例和格式说明
3. **plausibility_score 校准**: LLM 给出的分数可能偏乐观 (集中在 0.6-0.9)，需做归一化
4. **降级一致性**: 硬编码规则和 LLM 的判定标准需尽量一致，避免降级时评分跳变
5. **⭐ M15: LLM无法判断金属价态变化**: 金属氧化态(Fe²⁺/Fe³⁺, Cu⁺/Cu²⁺)的合理性判断需要量子化学计算或实验数据支撑，LLM仅基于文本训练无法可靠推理。Agent①对含金属价态变化的步骤应: (a) 不给plausibility评分; (b) 标注"metal_valence_change_beyond_llm_capability"; (c) 按D22降级到Scene C

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5-3.md` 继续
