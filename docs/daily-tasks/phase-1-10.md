# Phase 1-10: 质量过滤

**Phase**: 1  
**任务编号**: 1.10  
**前置依赖**: phase-1-2 (PDB 文件已下载), phase-1-3 (active_atom_definitions, 残基完整性检查需此)  
**阻塞后续**: Phase 2 (DS3 需质量合格的 PDB); ⚠️ 注意: phase-1-8 (DS2构建) 已内置简化版分辨率过滤 (1.8.2)，不严格依赖本任务的完整过滤; 完整过滤后 DS2 可选择回建  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 1.10.1 编写 `cgd/quality/filters.py` 模块
  - 创建质量过滤模块
  - 定义过滤函数: `filter_pdb_entries(entries, pdb_files_dir) -> filtered_entries`
  - **验收**: 模块框架可导入运行

- [ ] 1.10.2 分辨率过滤
  - 从 PDB header/REMARK 记录提取分辨率
  - 阈值: resolution ≤ 2.5Å → 通过
  - 无分辨率信息的 PDB → 排除
  - 记录每条 entry 的分辨率值和过滤结果
  - **验收**: 分辨率过滤逻辑正确

- [ ] 1.10.3 B-factor 质量检查
  - 计算每个催化残基活性原子的 B-factor
  - 阈值: B-factor > 50 的活性原子 → 标记为 "low_quality"
  - 整体 B-factor 均值 > 40 的 PDB → 排除
  - **验收**: B-factor 质量检查逻辑正确

- [ ] 1.10.4 残基完整性检查
  - 检查催化残基在 PDB 中的原子完整性
  - 缺失 backbone 原子 (N, CA, C, O) → 排除该残基
  - 缺失活性原子 (根据 active_atom_definitions, 来自 phase-1-3) → 排除该残基
  - 一条 entry 中 ≥50% 催化残基不完整 → 排除该 entry
  - **验收**: 残基完整性检查逻辑正确

- [ ] 1.10.5 标记数据集适用性
  - 对每条 entry 标记:
    - `valid_for_ds2`: 分辨率 ≤ 2.5Å 且催化残基完整 → True
    - `valid_for_ds3_scene_a`: valid_for_ds2 + 有底物/辅因子配体 → True
    - `valid_for_ds3_scene_b`: valid_for_ds2 + 无底物配体但有蛋白质结构 → True
  - **验收**: 每条 entry 有三个标记字段

- [ ] 1.10.6 输出过滤结果
  - 路径: `data/cache/quality_filtered_entries.json`
  - 结构: `{total: N, filtered: [{mcsa_id, pdb_id, resolution, bfactor_mean, residue_completeness, valid_for_ds2, valid_for_ds3_scene_a, valid_for_ds3_scene_b, exclude_reason}]}`
  - **验收**: 过滤后约 600-700 条 entries 通过分辨率过滤

---

## 输出文件清单

- `cgd/quality/filters.py`
- `data/cache/quality_filtered_entries.json`

---

## 常见陷阱

1. **分辨率提取位置**: PDB 文件中分辨率信息在 REMARK 2 行，格式不统一。部分 PDB 使用 "RESOLUTION." 关键字，部分使用其他格式
2. **多 PDB 同一 entry**: 一条 M-CSA entry 可能关联多个 PDB，每个 PDB 独立过滤，取质量最好的通过
3. **B-factor 异常值**: 部分原子的 B-factor 为 0 或 999.99 (占位符)，需作为无效值排除
4. **配体存在性判断**: Scene A 需要"有底物/辅因子配体"，但这取决于 HET_to_ChEBI_mapping 的分类结果。此阶段可先用简单启发式 (HET code 不在排除白名单)，后续结合 phase-1-9 的精确分类修正
5. **过滤阈值硬编码**: 分辨率、B-factor 等阈值建议从配置文件读取，方便后续调整

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-1-11.md` 继续
