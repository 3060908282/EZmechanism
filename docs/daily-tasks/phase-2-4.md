# Phase 2-4: DS4 辅因子共现构建

**Phase**: 2
**任务编号**: 2.4
**前置依赖**: phase-1-1 (M-CSA entries), phase-1-9 (HET_to_ChEBI_mapping), phase-2-2 (LigandClassifier用于辅因子识别)
**阻塞后续**: Phase 4 (CGPS S_co 需 DS4 辅因子维度), Phase 5 (Agent验证)
**预计耗时**: 2天

---

## 任务清单

- [ ] 2.4.1 编写 `cgd/builders/ds4_builder.py` 框架
  - 创建 DS4 构建器模块，定义 `DS4Builder` 类
  - 数据流: M-CSA entries + PDB文件 + HET_to_ChEBI → 辅因子共现三元组 → 频率统计
  - 逻辑类似 DS1 (残基共现)，但增加了 cofactor 维度
  - **验收**: 模块框架可导入运行

- [ ] 2.4.2 提取三元组 (role, residue_type, cofactor_type, cofactor_chebi)
  - 对每条 M-CSA entry:
    1. 获取催化残基列表 + primary roles
    2. 从关联 PDB 的 HETATM 中识别辅因子 (使用 phase-2-2 的 LigandClassifier 或 HET_to_ChEBI 辅因子白名单)
    3. 对每个催化残基 + 每个辅因子，生成三元组:
       - (role, residue_type, cofactor_type, cofactor_chebi)
    4. cofactor_type 从 HET code 映射 (如 PLP → "pyridoxal_phosphate")
    5. cofactor_chebi 从 HET_to_ChEBI_mapping 查表
  - **验收**: 三元组提取逻辑正确

- [ ] 2.4.3 计数与频率统计
  - 按 `(ec_class, role, residue_type, cofactor_type, cofactor_chebi)` 分组计数
  - 对每个 ec_class，计算辅因子共现频率:
    - `freq = count(role, residue_type, cofactor) / count(role, residue_type)` 在该 ec_class 中
  - ec_class 取 M-CSA entry 的 EC 第1位 (如 1.x.x.x, 2.x.x.x, ... 6.x.x.x)
  - **验收**: 频率计算公式正确

- [ ] 2.4.4 输出 DS4 数据集
  - 路径: `data/datasets/DS4_cofactor_cooccurrence.json`
  - 每条记录: ec_class, role, residue_type, cofactor_type, cofactor_chebi, count, total, frequency, source_type="direct"
  - **验收**: JSON 格式与 CGD_MASTER_PLAN §2.4 定义一致

- [ ] 2.4.5 验收验证
  - PLP (pyridoxal phosphate) 应与转氨酶 (EC 2.x.x.x) 的 LYS 残基高频共现
  - NAD/NADP 应与氧化还原酶 (EC 1.x.x.x) 的残基共现
  - 统计量合理，无异常值 (如 frequency > 1.0 或负值)
  - **验收**: PLP 出现在合理的角色和残基组合中

---

## 输出文件清单

- `cgd/builders/ds4_builder.py`
- `data/datasets/DS4_cofactor_cooccurrence.json`

---

## 常见陷阱

1. **辅因子识别遗漏**: 部分 PDB 中的辅因子可能不在 HET_to_ChEBI_mapping 中，需记录未识别的 HET code 供后续补充
2. **ec_class 粒度**: EC 分类取第1位 (1-6) 还是前2位 (1.1, 2.6 等) 影响统计粒度；第1位粒度粗但样本多，前2位粒度细但样本少；建议两层都计算
3. **同一PDB多个辅因子**: 一个酶可能同时含 PLP 和金属离子作为辅因子，两者都需记录为独立三元组
4. **HET_to_ChEBI 缺失 ChEBI ID**: 部分辅因子可能只有 HET code 没有 ChEBI ID，cofactor_chebi 字段记为 null
5. **与 DS1 的区别**: DS1 是 role_pair 共现频率，DS4 是 (role, residue_type, cofactor) 三元组频率，维度更多但逻辑类似
6. **频率分母**: 分母是该 ec_class 中 (role, residue_type) 的总出现次数 (无论是否有辅因子)，而非条目总数

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2-5.md` 继续
