# Phase 1-8: DS2 残基-残基距离分布构建

**Phase**: 1  
**任务编号**: 1.8  
**前置依赖**: phase-1-2 (PDB 文件), phase-1-3 (active_atom_definitions), phase-1-5 (PDB 解析器), phase-1-6 (主要角色)  
**阻塞后续**: phase-1-11, phase-1-12, phase-1-13, Phase 2 (DS3 先验验证), Phase 4 (S_geo 评分)  
**预计耗时**: 4天  

---

## 任务清单

- [ ] 1.8.1 编写 `cgd/builders/ds2_builder.py` 框架
  - 创建 DS2 构建器模块
  - 定义数据流: M-CSA entries + PDB 文件 + active_atom_defs → 活性原子坐标 → 距离计算 → 统计聚合
  - **验收**: 模块框架可导入运行

- [ ] 1.8.2 筛选合格 PDB (分辨率 ≤ 2.5Å)
  - 从 PDB header 中提取分辨率信息
  - 仅使用分辨率 ≤ 2.5Å 的结构
  - 无分辨率信息的 PDB 排除
  - 记录被排除的 PDB 及原因
  - **验收**: 分辨率过滤逻辑正确

- [ ] 1.8.3 提取催化残基的活性原子坐标
  - 对每条 entry:
    1. 获取催化残基列表 + primary roles (来自 phase-1-6)
    2. 查询 `active_atom_definitions` 获取每个 (residue_type, role) 的 atom_name
    3. 调用 `get_active_atom_coord()` 提取坐标
  - 处理缺失原子: 记录到 `data/cache/ds2_missing_atoms.json`
  - 处理 alternate conformations: 取 occupancy 最高的构象
  - **验收**: 坐标提取逻辑正确，缺失原子有记录

- [ ] 1.8.4 计算残基对间欧几里得距离
  - 对每条 entry 的催化残基列表，计算所有无序对的活性原子间距离
  - `distance = sqrt((x1-x2)² + (y1-y2)² + (z1-z2)²)`
  - 按 `(role_pair, residue_type_pair)` 分组收集距离值
  - **验收**: 距离计算公式正确

- [ ] 1.8.5 统计聚合: 按分组计算百分位
  - 对每个 `(role_pair, residue_type_pair)` 分组:
    - 计算: p5, p25, p50, p75, p95, mean, std
    - 记录: n_obs, source_type ("direct"), pdb_ids 列表
  - 使用 numpy 的 `percentile()` 函数
  - **验收**: 统计量计算正确

- [ ] 1.8.6 处理边界情况
  - 缺失原子: 某残基的活性原子不在 PDB 中 → 跳过该残基对
  - alternate conformations: 取 occupancy 最高的构象 A
  - 多 PDB: 同一 entry 可能关联多个 PDB，每个 PDB 独立计算距离
  - 自配对: 同链/不同链的同角色残基对均需计算
  - **验收**: 边界情况均有处理逻辑，无未捕获异常

- [ ] 1.8.7 输出 DS2 数据集
  - 路径: `data/datasets/DS2_residue_distance.json`
  - 每条记录包含: role_pair, residue_type_pair, active_atom_pair, distance_values, n_obs, p5, p25, p50, p75, p95, mean, std, source_type, pdb_ids
  - **验收**: JSON 格式与 CGD_MASTER_PLAN §2.2 定义一致

- [ ] 1.8.8 1BTL 验证
  - 1BTL (Class A beta-lactamase): SER70(OG) + GLU166(OE2) 核酸残基对
  - 手动计算 OG-OE2 距离，与 DS2 输出对比
  - 误差 < 0.1Å
  - **验收**: 1BTL 验证距离正确

---

## 输出文件清单

- `cgd/builders/ds2_builder.py`
- `data/datasets/DS2_residue_distance.json`
- `data/cache/ds2_missing_atoms.json`

---

## 常见陷阱

1. **残基编号格式**: PDB 中残基编号可能是 "70" 或 "70A" (含插入码)，需与 M-CSA 的 resid 字段精确匹配
2. **chain ID 不一致**: M-CSA 记录的 chain ID 可能与 PDB 文件中的 chain ID 不一致 (如 M-CSA 用 "A"，PDB 用 "E")
3. **HET 残基**: 催化残基中可能包含水 (WAT/HOH) 或修饰残基，其原子命名与标准氨基酸不同
4. **分辨率过滤遗漏**: 部分旧 PDB 文件的分辨率信息在 REMARK 行而非 HEADER 行，解析逻辑需全面
5. **大 PDB 文件处理**: 部分大分子 (如核糖体) PDB 文件可能包含数十万行 ATOM 记录，解析时注意内存
6. **n_obs 过少的分组**: 部分罕见 role_pair + residue_type_pair 组合可能只有 1-2 个观测，统计量不可靠，需标注
7. **坐标精度**: PDB 坐标精度为 0.001Å，距离计算结果保留 3 位小数即可
8. **⭐ M1: DS2可能需在phase-1-10后重建**: 本任务(1.8)使用简化版分辨率过滤(≤2.5Å, 1.8.2)，但phase-1-10有更严格的质量过滤(分辨率+R-factor+残基完整性)。phase-1-10完成后，建议比较过滤前后的entry差异：若差异>10%，DS2需用phase-1-10过滤后的entry重建，否则P5/P95阈值可能基于低质量PDB计算

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-1-9.md` 继续
