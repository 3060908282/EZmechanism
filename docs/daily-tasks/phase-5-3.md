# Phase 5-3: Agent②规则翻译 + DS5 Layer 1

**Phase**: 5  
**任务编号**: 5.3  
**前置依赖**: phase-5-2 (Agent①化学审查), phase-3-3 (DS5 Layer 0 构建)  
**阻塞后续**: phase-5-4 (RunReactants闭环验证)  
**预计耗时**: 2.5天  

---

## 任务清单

- [ ] 5.3.1 编写 `agents/agent2_translator.py` 框架
  - 核心函数: `translate_rules(mechfind_rules, ds5_mapping, llm_client) → List[TranslatedRule]`
  - `TranslatedRule`: rule_id_mf, rule_id_ez (Optional), smarts_ez (Optional), mapping_type, llm_confidence
  - **验收**: 模块可导入运行

- [ ] 5.3.2 实现 DS5 映射表查询 (1:1 快速路径)
  - 先查 DS5 Layer 0 映射表:
    - 1:1 映射 → 直接返回，无需 LLM
    - unmapped → 进入 LLM 消歧流程
  - **验收**: 1:1 映射直接走快速路径

- [ ] 5.3.3 实现 LLM 辅助 1:N 映射消歧
  - 对 unmapped 规则:
    1. 提取 MechFind 规则的 moiety_changes 描述
    2. 从 EZ 规则库中搜索候选 SMARTS (按键变化类型过滤)
    3. 将候选列表交给 LLM 判断最匹配的规则
    4. LLM prompt:
       ```
       System: 你是酶机制规则翻译专家
       Input: MechFind基团变化描述 + 候选EZ SMARTS列表(最多10条)
       Task: 选择最匹配的SMARTS规则，或判断无匹配
       Output JSON: {best_match: rule_id, confidence: 0.0-1.0, reasoning: "..."}
       ```
  - **验收**: LLM 可从候选中选择合理的 SMARTS 规则

- [ ] 5.3.4 实现 DS5 Layer 1 构建
  - 将 LLM 消歧结果写入 DS5:
    - mapping_type: "1:N" → LLM 选择后变为 "1:1" (LLM-confirmed)
    - confidence: "llm_confirmed" (vs Layer 0 的 "exact")
  - 输出: 更新 `data/datasets/DS5_rule_crossmapping.json`
  - 更新: `data/derived/rule_mapping_table.json` (Layer 1 版本)
  - **验收**: DS5 Layer 1 映射表更新，覆盖率提升

- [ ] 5.3.5 评估 Layer 1 覆盖率提升
  - Layer 0 覆盖率 vs Layer 1 覆盖率
  - 目标: Layer 1 比Layer 0 提升 10-15%
  - LLM 消歧质量: 抽样 20 条 LLM-confirmed 映射，人工验证
  - **验收**: 1:N mapping coverage improved

---

## 输出文件清单

- `agents/agent2_translator.py`
- `agents/prompts/translator_prompt.py`
- `data/datasets/DS5_rule_crossmapping.json` (Layer 1 更新)
- `data/derived/rule_mapping_table.json` (Layer 1 更新)
- `tests/test_agent2_translator.py`

---

## 常见陷阱

1. **LLM 幻觉风险**: LLM 可能"编造"不存在的 SMARTS 匹配，需限制只能从候选列表中选择
2. **候选数量**: EZ 规则库有 6083 条，全部交给 LLM 不现实，需先按键变化类型过滤到 ≤10 条候选
3. **Layer 1 置信度**: LLM-confirmed 映射的置信度低于 direct SMARTS 匹配，在 S_path 计算中需反映
4. **更新原子性**: 更新 DS5 和 rule_mapping_table 需保持一致性，避免一个更新另一个没更新

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5-4.md` 继续
