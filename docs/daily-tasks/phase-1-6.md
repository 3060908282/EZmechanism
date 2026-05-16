# Phase 1-6: 主要角色提取

**Phase**: 1  
**任务编号**: 1.6  
**前置依赖**: phase-1-1 (需要 M-CSA entries 的 residue roles 数据)  
**阻塞后续**: phase-1-7, phase-1-8  
**预计耗时**: 0.5天  

---

## 任务清单

- [ ] 1.6.1 实现 `get_primary_role()` 函数
  - 按 CGD_MASTER_PLAN §4.1 问题1的方案实现
  - 优先级规则:
    1. 取 `function_type == "reactant"` 的角色 (最高优先级)
    2. 若无 reactant，取 `function_type == "spectator"` 且有 `group_function` 的角色
    3. 若有多个 reactant 角色，按出现顺序取第一个
    4. 若无以上匹配，取 `roles[0]` (回退)
  - 函数签名: `get_primary_role(residue_entry: dict) -> str`
  - 参考 CGD_MASTER_PLAN §4.1 的实现代码
  - **验收**: 函数逻辑与 CGD_MASTER_PLAN §4.1 完全一致

- [ ] 1.6.2 对全部 1003 条 entries 提取每个催化残基的 primary role
  - 遍历每条 entry 的 `residues[]`
  - 对每个 residue 调用 `get_primary_role()` 获取主角色
  - 记录: `{mcsa_id, residue_id, residue_type, primary_role, all_roles}`
  - **验收**: 全部 entries 处理完毕，无遗漏

- [ ] 1.6.3 输出 residue_primary_roles.json
  - 路径: `data/cache/mcsa_entries/residue_primary_roles.json`
  - 结构: `{entries: [{mcsa_id, residues: [{residue_id, residue_type, primary_role, all_roles}]}]}`
  - **验收**: 文件包含全部 1003 条 entries 的角色提取结果

- [ ] 1.6.4 关键案例验证
  - beta-lactamase (1BTL): SER70 → "nucleophile" ✓
  - serine protease (如 1TRN): HIS57 → "proton_acceptor", SER195 → "nucleophile" ✓
  - 多角色残基: 确认 reactant 类型角色被正确优先选取
  - **验收**: 关键案例的角色提取结果正确

---

## 输出文件清单

- `data/cache/mcsa_entries/residue_primary_roles.json`

---

## 常见陷阱

1. **roles 为空列表**: 极少数残基的 roles 可能为空，此时 `get_primary_role()` 应返回 "unknown"
2. **function_type 命名不一致**: M-CSA API 中 `function_type` 的值可能是 "reactant" 或其他变体，需检查实际 API 返回值
3. **spectator 的 group_function 为空**: 部分 spectator 角色可能没有 `group_function`，不应将其作为优先选择
4. **角色命名规范**: M-CSA 角色名如 "nucleophile", "proton_acceptor", "electrostatic_stabiliser" 等，注意拼写 (英式英语: stabiliser 非 stabilizer)
5. **多 reactant 角色选择**: 当一个残基在多个步骤中都是 reactant 时，"按出现顺序取第一个"是近似方案，但足以满足统计需求

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-1-7.md` 继续
