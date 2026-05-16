# Phase 3-1: MechFind规则解析 + M-CSA批量下载

**Phase**: 3  
**任务编号**: 3.1  
**前置依赖**: phase-0-4 (Unique_Rules_1.csv), phase-0-1 (M-CSA API客户端); ⚠️ 本任务不依赖Phase 2.5，可与Phase 2.5并行启动 (HANDBOOK §7约束5); 反向依赖: Phase 2.5-4路径2查询依赖本任务产出的M-CSA残基缓存  
**阻塞后续**: phase-3-3 (DS5 Layer 0构建需要解析后的规则 + M-CSA残基缓存)  
**预计耗时**: 2天  

---

## 任务清单

- [ ] 3.1.1 编写规则解析模块
  - 路径: `cgd/parsers/mechfind_rule_parser.py`
  - 读取 `Unique_Rules_1.csv`，提取:
    - `rule_id`: 格式 `{mcsa_id}_{mech_idx}_{step_idx}`
    - `mcsa_id`: 关联的 M-CSA 条目 ID
    - `mech_idx`: 机制索引
    - `step_idx`: 步骤索引
    - `moiety_changes`: 基团变化向量 (MechFind 的原子变化描述)
    - `residue_roles`: 涉及的残基角色
    - `rule_name`: 规则原始名称 (用于路径1残基识别，如 "Ser_pro", "HisN3_depro")
  - ⭐ 30% 复用: `load_rules()` 和 `_preparse_rules()` 可提供规则加载基础
  - ⭐ 新增: 区分两种规则格式:
    - `j_i_s` 格式: 数字型 → M-CSA关联路径 (路径2)
    - `XXX_pro/depro` 格式: 质子化规则 → 规则名解析路径 (路径1)
  - **验收**: 所有规则行可正确解析，字段完整；两种格式可区分

- [ ] 3.1.2 提取 M-CSA 关联
  - 从 rule_id 解析出 mcsa_id
  - 查 M-CSA 缓存: 获取该条目的机制步骤描述
  - 建立 rule_id → mcsa_id → mechanism_steps 的映射
  - 处理: 同一 mcsa_id 可能有多个机制 (mech_idx 不同)
  - **验收**: 每个 rule_id 可追溯到 M-CSA 条目和机制步骤

- [ ] 3.1.3 ⭐ M-CSA API 批量下载 (残基数据缓存)
  - **目的**: 为路径2 (M-CSA查询) 和 DS5 residue_info 构建提供完整的残基数据
  - 复用 `cgd/parsers/mcsa_api_client.py` (Phase 0-1 已验证)
  - 批量获取全部 1003 条 entries (若 Phase 1-1 已完成爬取则复用缓存，仅补缺)
  - **关键字段提取** (供 DS5 residue_info 使用):
    - `residues[].residue_chains[]`: 含 `{code, chain, resid}` — 残基定位
    - `residues[].roles[]`: 含 `{function_type, function, group_function}` — 残基角色
    - `steps[]`: 机制步骤 — 步骤→残基关联
    - `cofactors[]`: 辅因子列表 — 辅因子类型识别
  - 实现 rate limiting: 间隔 ≥ 1 秒
  - 实现断点续传: 检查已有缓存文件完整性(>5KB)
  - 缓存路径: `data/cache/mcsa_entries/entry_{mcsa_id}.json`
  - **验收**: `data/cache/mcsa_entries/` 下有≥1000个完整 JSON；关键字段提取正确

- [ ] 3.1.4 构建规则索引
  - 输出: `data/cache/mechfind_rules_index.json`
  - 结构: `{total_rules, rules: [{rule_id, rule_name, mcsa_id, mech_idx, step_idx, moiety_changes, residue_roles, rule_format}]}`
  - `rule_format`: "mcsa_format" | "protonation_format" — 区分两种规则类型
  - 去重: 确保同一 rule_id 不重复
  - 统计: 规则总数、M-CSA格式规则数、质子化格式规则数、关联 M-CSA 条目数、独立规则数
  - **验收**: 索引文件格式正确，规则无重复，两种格式统计正确

- [ ] 3.1.5 验证规则数据质量
  - 检查: rule_id 格式一致性
  - 检查: mcsa_id 是否在 M-CSA 缓存中存在 (对比批量下载结果)
  - 检查: moiety_changes 字段非空
  - 检查: 质子化规则名是否可被 parse_protonation_rule() 识别 (覆盖率测试)
  - 报告: 解析失败/字段缺失的规则比例; 质子化规则识别覆盖率
  - **验收**: All rules parsed with M-CSA ID links; protonation rule coverage >90%

---

## 输出文件清单

- `cgd/parsers/mechfind_rule_parser.py`
- `data/cache/mechfind_rules_index.json`
- `data/cache/mcsa_entries/entry_*.json` (补充下载，若 Phase 1-1 未完全覆盖)
- `tests/test_mechfind_rule_parser.py`

---

## 常见陷阱

1. **CSV 格式变化**: Unique_Rules_1.csv 的列名可能在 MechFind 版本更新后变化，需用列名而非列索引访问
2. **rule_id 编码**: `{mcsa_id}_{mech_idx}_{step_idx}` 中 mcsa_id 本身可能含下划线，解析时需从右向左切分
3. **moiety_changes 格式**: MechFind 的基团变化向量可能是自定义格式，需了解其编码规则后才能解析
4. **M-CSA 缓存一致性**: 部分 mcsa_id 可能在 M-CSA 缓存中不存在 (爬取遗漏或 ID 变更)，需跳过并记录
5. **与 Phase 1-1 的缓存复用**: Phase 1-1 已爬取过 M-CSA entries，本任务应复用已有缓存，仅补充缺失条目；检查 `data/cache/mcsa_entries/index.json` 的 total 与本任务需求是否一致
6. **质子化规则名变体**: 规则名可能有大小写变体或拼写差异 (如 `His_N3_depro` vs `HisN3_depro`)，需做归一化处理

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-3-2.md` 继续
