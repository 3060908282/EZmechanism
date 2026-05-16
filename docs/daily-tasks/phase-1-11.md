# Phase 1-11: 覆盖度报告

**Phase**: 1  
**任务编号**: 1.11  
**前置依赖**: phase-1-7 (DS1), phase-1-8 (DS2)  
**阻塞后续**: phase-1-13 (样本量缺口报告依赖此报告的框架)  
**预计耗时**: 0.5天  

---

## 任务清单

- [ ] 1.11.1 编写 `cgd/quality/coverage_report.py` 模块
  - 创建覆盖度报告生成模块
  - 读取 DS1 和 DS2 数据集
  - 读取质量过滤结果
  - **验收**: 模块框架可导入运行

- [ ] 1.11.2 DS1 覆盖度统计
  - 唯一 role_pairs 数量 (目标: >50)
  - 唯一 residue_type_pairs 数量
  - 每个 role_pair 的 frequency 分布
  - EC class 覆盖度: 各 EC class (1-6) 的 entry 数量
  - **验收**: DS1 覆盖度指标完整

- [ ] 1.11.3 DS2 覆盖度统计
  - 唯一 (role_pair, residue_type_pair) 分组数量
  - n_obs ≥ 20 的分组数量 (目标: >30)
  - n_obs 分布: [1-5), [5-10), [10-20), [20-50), [50+)
  - source_type 分布: direct vs homolog
  - **验收**: DS2 覆盖度指标完整

- [ ] 1.11.4 场景分布统计
  - Scene A (有 PDB + 有配体) entries 数量
  - Scene B (有 PDB + 无配体) entries 数量
  - Scene C (无 PDB) entries 数量
  - 基于 `quality_filtered_entries.json` 中的标记统计
  - **验收**: 三个场景的 entry 数量统计正确

- [ ] 1.11.5 PDB 质量统计
  - 通过分辨率过滤的 entries 数量
  - 通过 B-factor 质量检查的 entries 数量
  - 残基完整的 entries 数量
  - 各过滤阶段的淘汰率
  - **验收**: PDB 质量统计完整

- [ ] 1.11.6 输出覆盖度报告
  - 路径: `data/reports/phase1_coverage.json`
  - 结构: `{ds1: {...}, ds2: {...}, scene_distribution: {...}, pdb_quality: {...}, summary: {...}}`
  - **验收**: 报告显示 DS1 >50 role_pairs, DS2 >30 groups with n_obs≥20

---

## 输出文件清单

- `cgd/quality/coverage_report.py`
- `data/reports/phase1_coverage.json`

---

## 常见陷阱

1. **DS1/DS2 数据未就绪**: 如果 phase-1-7 或 phase-1-8 未完成，此任务无法执行。确保前置依赖完成
2. **场景分类不确定性**: Scene A/B 的精确分类依赖 HET_to_ChEBI_mapping (phase-1-9)，此阶段可能只有近似值。标注为 "preliminary"
3. **统计口径一致性**: DS2 的 n_obs ≥ 20 计数应与实际 DS2 数据中的记录一致，避免因读取/解析错误导致数值不一致
4. **报告可读性**: JSON 格式虽机器可读，但建议同时生成一个人类可读的摘要文本

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-1-12.md` 继续
