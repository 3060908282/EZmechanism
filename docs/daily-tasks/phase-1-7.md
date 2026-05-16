# Phase 1-7: DS1 残基共现频率矩阵构建

**Phase**: 1  
**任务编号**: 1.7  
**前置依赖**: phase-1-1 (M-CSA entries), phase-1-6 (residue_primary_roles)  
**阻塞后续**: phase-1-11 (覆盖度报告), Phase 4 (S_co 评分)  
**预计耗时**: 2天  

---

## 任务清单

- [ ] 1.7.1 编写 `cgd/builders/ds1_builder.py` 框架
  - 创建 DS1 构建器模块
  - 定义数据流: M-CSA entries → 残基对提取 → 聚合 → 统计
  - **验收**: 模块框架可导入运行

- [ ] 1.7.2 遍历 entries 提取催化残基对
  - 读取 `data/cache/mcsa_entries/` 下所有 entry 文件
  - 读取 `data/cache/mcsa_entries/residue_primary_roles.json` 获取主角色
  - 对每条 entry 的催化残基列表，生成所有无序对 (i, j), i < j
  - 每对提取: `(role_pair, residue_type_pair, ec_class)`
  - `role_pair`: 将两个角色按字母序排列，用 "-" 连接 (如 "nucleophile-base")
  - `residue_type_pair`: 将两个残基类型按字母序排列，用 "-" 连接 (如 "GLU-SER")
  - `ec_class`: 取 EC 编号的第一位 (1-6)
  - **验收**: 每条 entry 的残基对提取逻辑正确

- [ ] 1.7.3 聚合计数与频率计算
  - 对每个 `(role_pair, residue_type_pair, ec_class)` 三元组计数
  - 计算 `frequency = count / role_pair_total` (同一 role_pair 下的频率)
  - 计算 `n_entries`: 贡献的不同 M-CSA entry 数 (去重)
  - **验收**: 频率计算公式正确，n_entries 为去重计数

- [ ] 1.7.4 输出 DS1 数据集
  - 路径: `data/datasets/DS1_residue_cooccurrence.json`
  - 每条记录: `{role_pair, residue_type_pair, ec_class, count, frequency, n_entries}`
  - 按 role_pair 分组，组内按 frequency 降序排列
  - **验收**: JSON 文件格式与 CGD_MASTER_PLAN §2.1 定义一致

- [ ] 1.7.5 验证 DS1 数据质量
  - 检查: >50 个唯一 role_pairs
  - 检查: 最常见的 role_pair 应为 "nucleophile-base" (或类似高频率对)
  - 检查: frequency 总和 ≈ 1.0 (每个 role_pair 内)
  - 检查: 无异常值 (如 count=1 但 frequency > 0.5)
  - **验收**: DS1 数据质量检查通过

---

## 输出文件清单

- `cgd/builders/ds1_builder.py`
- `data/datasets/DS1_residue_cooccurrence.json`

---

## 常见陷阱

1. **角色对排序一致性**: `role_pair` 必须按字母序排列以确保去重。例如 "base-nucleophile" 和 "nucleophile-base" 必须统一为 "nucleophile-base"
2. **单残基 entry**: 部分 M-CSA entry 只有 1 个催化残基，无法形成残基对，应跳过而非报错
3. **EC 分类缺失**: 部分 entry 可能无 EC 编号，`ec_class` 标记为 "unknown"
4. **自配对**: 同一残基类型+角色出现两次 (如两个 proton_acceptor)，需确保 `residue_type_pair` 如 "GLU-GLU" 被正确处理
5. **频率计算分母**: `frequency` 的分母是同一 `role_pair` 下的所有 `count` 之和，不是 `role_pair + ec_class` 的子集

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-1-8.md` 继续
