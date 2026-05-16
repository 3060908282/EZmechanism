# Phase 3-2: EZ SMARTS规则库提取

**Phase**: 3  
**任务编号**: 3.2  
**前置依赖**: 无 (可与 phase-3-1 并行)  
**阻塞后续**: phase-3-3 (DS5 Layer 0构建需要EZ规则库)  
**预计耗时**: 0.5天  

---

## 任务清单

- [ ] 3.2.1 提取 EzMechanism SMARTS 规则
  - 路径: `cgd/parsers/ez_rule_extractor.py`
  - 从 EzMechanism 规则文件中提取全部 6083 条 SMARTS 规则
  - 每条规则提取:
    - `rule_id`: EZ 规则唯一标识
    - `smarts_pattern`: SMARTS 反应模式 (含原子映射)
    - `description`: 规则描述 (如有)
    - `bond_changes`: 键变化类型 (形成/断裂/变化)
  - **验收**: 规则提取脚本可运行

- [ ] 3.2.2 构建可搜索规则索引
  - 输出: `data/cache/ez_rules_index.json`
  - 结构: `{total_rules: 6083, rules: [{rule_id, smarts_pattern, description, bond_changes}]}`
  - 支持按 SMARTS 子串搜索
  - 支持按键变化类型过滤
  - **验收**: 6083 rules indexed and searchable

- [ ] 3.2.3 验证 SMARTS 规则有效性
  - 对每条 SMARTS: `AllChem.ReactionFromSmarts(smarts)` → 检查是否可解析
  - 记录解析失败的规则
  - 统计: 有效规则比例、无效规则列表
  - **验收**: 绝大多数 (>99%) SMARTS 规则可解析

---

## 输出文件清单

- `cgd/parsers/ez_rule_extractor.py`
- `data/cache/ez_rules_index.json`
- `tests/test_ez_rule_extractor.py`

---

## 常见陷阱

1. **SMARTS 语法变体**: EzMechanism 的 SMARTS 可能使用非标准语法或 RDKit 不支持的特性，需逐一验证
2. **规则文件格式**: EzMechanism 规则文件可能是自定义 JSON 或 XML，需先确定文件格式和字段映射
3. **6083 条规则**: 此为文档中的数字，实际可能有偏差，以提取结果为准
4. **原子映射标签**: SMARTS 中的原子映射标签 `[:1]` `[:2]` 是规则匹配的关键，需保留

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-3-3.md` 继续
