# Phase 2-14: 覆盖度报告 + Phase 2 收尾

**Phase**: 2
**任务编号**: 2.14 + 2.16 + 2.15
**前置依赖**: 所有 Phase 2 任务完成 (2.1-2.13)
**阻塞后续**: Phase 2.5 (EZ验证运行时需Phase 2全部产出)
**预计耗时**: 3天

---

## ⚠️ 执行顺序说明

> **2.16 必须先于 2.15 完成！** 角度计算(A1-A3)需要配体 Mol 的原子连接信息，而配体 Mol 构建是 2.16 的产出。因此先完成 2.16 再做 2.15 的回填。

---

## 任务清单

- [ ] 2.14.1 编写覆盖度报告 `data/reports/phase2_coverage.json` (0.5天)
  - DS3 覆盖度:
    - Scene A: 有配体的 M-CSA 条目数 / 总条目数
    - Scene B: 有同源替代数据的条目数 / 无配体的条目数
    - n_obs 分布: Level 0 和 Level 1 各分组的 n_obs 直方图
    - n_obs ≥ 10 的分组数 / 总分组数
  - DS4 覆盖度:
    - 有辅因子共现数据的 EC 类别数 / 总 EC 类别数
    - 频率分布直方图
  - PAP 覆盖度:
    - 对比实验结果摘要
    - 各置信度等级的分布
  - 角度 A1-A3 覆盖度:
    - 已计算角度的条目数 / 需要角度的条目数
  - **验收**: 覆盖度报告数据完整，格式与 phase1_coverage.json 一致

- [ ] 2.16.1 编写 `cgd/parsers/ligand_builder.py` — CGD 版 (1天，合并于此)
  - 创建配体 Mol 构建模块 (CGD 构建阶段专用)
  - 功能: PDB HETATM → PDBe ChemComp 键定义 → RDKit Mol
  - 步骤:
    1. 从 PDB 提取 HETATM 行 → 原子坐标
    2. 查询 PDBe ChemComp API 获取键信息: `https://www.ebi.ac.uk/pdbe/api/pdb/entry/ligand_monomers/{pdb_id}`
    3. 构建键连接表 (bond_order, atom1, atom2)
    4. 创建 RDKit Mol: `Chem.RWMol()` → 添加原子 → 添加键 → 设置坐标
    5. 3D 坐标从 HETATM 注入: `Chem.AllChem.Compute2DCoords()` 不需要，直接设置 3D 坐标
  - 与 EZ 运行时版的区别:
    - **CGD 版** (`cgd/parsers/ligand_builder.py`, 本任务): 批量构建，容忍少量失败，不需要实时性能；使用 PDBe ChemComp API 获取键定义
    - **EZ 运行时版** (`ez_validator/ligand_builder.py`, phase-2.5-3): 单次构建，需要快速响应；薄封装复用 `parse_pdb_ligand_atoms()`，依赖 RDKit 自动感知 + CONECT + 距离推断 fallback
    - ⚠️ 两者路径不同、API不同，不可混用。CGD 版产出用于 DS3 构建；EZ 版产出用于运行时验证
  - **验收**: 从 PDB HETATM 可正确构建配体 Mol

- [ ] 2.16.2 配体 Mol 构建验证
  - 测试: BZG (benzylpenicillin) 在 1BTL 中的配体构建
  - 验证:
    - 原子数与 HETATM 行一致
    - 键数与 ChemComp 定义一致
    - 3D 坐标与 PDB 原始坐标一致 (误差 < 0.01Å)
    - 可进行 SMARTS 匹配
  - **验收**: BZG 配体 Mol 构建正确

- [ ] 2.16.3 ⭐ DS3数据重建验证 (配体Mol临时方案 vs 正式方案对比)
  - 目的: Phase 2-3使用临时方案(SMILES→Mol→3D conformer+坐标对齐)构建DS3，本任务提供正式的配体Mol构建。需验证临时方案数据是否可靠
  - 方法:
    1. 选取10个有配体的M-CSA entry
    2. 用正式方案(CGD ligand_builder)重新计算反应原子坐标
    3. 与临时方案的反应原子坐标对比，计算偏差
    4. 如果偏差系统性>0.5Å → 触发DS3重建
  - 判定:
    - 偏差<0.5Å → 临时方案可接受，标注"DS3数据质量确认"
    - 偏差≥0.5Å → 必须用正式方案重建DS3 (需+1天额外工作)
  - 输出: `data/reports/ds3_rebuild_assessment.json` (含每条entry的偏差和重建建议)
  - **验收**: 10条entry的临时vs正式方案对比完成; 若需重建, 重建完成

- [ ] 2.15.1 编写 `cgd/geometry/angle_calculator.py` (1.5天)
  - ⚠️ **依赖 2.16**: 角度计算需要配体 Mol 的原子连接信息，必须先完成 2.16
  - 创建角度计算模块，定义 `AngleCalculator` 类
  - A1: Bürgi-Dunitz 攻击角
    - 定义: nucleophile → electrophilic_C → C_neighbor 的角度
    - 需要识别: 亲核残基活性原子、配体亲电碳、亲电碳的相邻碳原子
    - 典型值: 105°-110° (亲核加成)
  - A2: 质子转移角
    - 定义: acid/base_O → H → proton_acceptor 的角度
    - MVP 近似: 用 donor-acceptor 距离代替 (Phase 5.5 用精确 H 坐标)
    - 典型值: 150°-180° (近线性)
  - A3: 离去基团角
    - 定义: leaving_group → C → nucleophile 的角度
    - 需要识别: 离去基团原子
    - 典型值: 180° (反式消除)
  - 计算方法:
    - 三点角度: `cos(θ) = (v1·v2) / (|v1|×|v2|)`，v1 和 v2 为从中心点到两端点的向量
    - 使用 `numpy.arccos()`，结果转换为度数
  - **验收**: A1-A3 角度计算逻辑正确

- [ ] 2.15.2 回填 DS3 中的 A1-A3 角度值
  - 对 phase-2-3 中标记为 null 的 A1-A3 字段:
    1. 使用 `AngleCalculator` 计算角度
    2. 更新 `DS3_residue_ligand_distance.json` 中的角度值
  - 部分条目可能无法计算 (缺少邻接原子信息) → 保留 null
  - 记录: 可计算角度的条目比例
  - **验收**: DS3 中 A1-A3 字段被更新 (非 null 的比例显著增加)

- [ ] 2.14.2 Phase 2 验收检查清单
  - 逐项检查 Phase 2 里程碑:
    - [ ] DS3 Scene A+B 完成 (含置信度标注)
    - [ ] DS4 完成
    - [ ] PAP放置+DS3筛选overlay 验证有效 (对比实验通过)
    - [ ] 5个数据集中4个完成
    - [ ] 配体Mol构建完成 (CGD构建阶段版)
    - [ ] 角度计算 A1-A3 完成
    - [ ] DS3数据重建验证完成 (若需重建, DS3已更新)
  - 如果有未通过项: 记录原因，制定修复计划
  - **验收**: Phase 2 所有里程碑检查通过

---

## 输出文件清单

- `data/reports/phase2_coverage.json`
- `data/reports/ds3_rebuild_assessment.json`
- `cgd/parsers/ligand_builder.py`
- `cgd/geometry/angle_calculator.py`
- `cgd/geometry/__init__.py` (如不存在)
- `data/datasets/DS3_residue_ligand_distance.json` (更新，含A1-A3角度值)

---

## 常见陷阱

1. **⚠️ 2.16 必须先于 2.15 完成**: 角度计算(A1-A3)需要识别邻接原子 (如亲电碳的相邻碳)，这依赖 `ligand_builder.py` 的正确构建；务必先完成 2.16 再做 2.15 的回填
2. **Bürgi-Dunitz 角定义**: 不同文献对 Bürgi-Dunitz 角的定义略有差异 (是否包含孤对电子方向)；需明确采用哪种定义并与 CGD_MASTER_PLAN 一致
3. **A2 质子转移角的 H 原子**: PDB 通常不含 H 原子坐标；MVP 阶段用 donor-acceptor 向量的反方向近似 H 位置，Phase 5.5 用 RDKit AddHs 精确计算
4. **PDBe ChemComp API 缺失键信息**: 少数配体的 ChemComp 定义可能不完整 (缺键或键级错误)；需记录失败案例
5. **配体 Mol 构建的键级推断**: ChemComp 提供的键级 (SINGLE/DOUBLE/AROMATIC) 需正确映射到 RDKit 的 BondType
6. **覆盖度报告的分组统计**: Level 0 和 Level 1 的 n_obs 分布可能高度偏斜 (少数热门分组很多观测，多数分组很少)；报告需展示分位数而非仅均值
7. **部分条目无法回填**: 即使有了 ligand_builder，部分配体的 SMARTS 匹配可能仍然失败，A1-A3 保持 null；这是可接受的
8. **⭐ DS3临时方案可能需重建**: Phase 2-3的配体Mol构建使用临时方案(SMILES→3D conformer+Kabsch对齐)，与正式的CGD ligand_builder可能有系统性偏差。若偏差>0.5Å，DS3数据(距离分布、P5/P95阈值)需用正式方案重建，否则PAP筛选和CGPS评分的基础数据不可靠

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 确认 Phase 2 所有里程碑检查通过
4. 打开 Phase 2.5 的第一个任务文件继续
