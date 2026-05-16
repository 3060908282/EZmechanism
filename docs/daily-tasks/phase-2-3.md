# Phase 2-3: Scene A DS3 残基-配体距离构建

**Phase**: 2
**任务编号**: 2.3
**前置依赖**: phase-2-2 (配体分类), phase-1-8 (DS2框架/距离计算), phase-1-13 (样本量缺口报告/层级化策略), phase-1-3 (active_atom_definitions), phase-1-4 (ligand_reactive_atom_smarts)
**阻塞后续**: phase-2-8 (同源替代DS3), phase-2-10 (CGD筛选overlay需DS3 Scene A阈值)
**预计耗时**: 5.5天

---

## 任务清单

- [ ] 2.3.1 编写 `cgd/builders/ds3_builder.py` 框架
  - 创建 DS3 构建器模块，定义 `DS3Builder` 类
  - 数据流: M-CSA entries + PDB文件 + 配体分类 + reactive_atom_smarts → 残基-配体距离 → 统计聚合
  - 区分 Scene A (直接计算) 和 Scene B (同源替代，phase-2-8实现) 的构建接口
  - 本任务只实现 Scene A 部分
  - **验收**: 模块框架可导入运行

- [ ] 2.3.2 配体过滤: 排除 excluded 配体
  - 对每条 M-CSA entry 的每个 PDB:
    1. 提取所有 HETATM 配体
    2. 调用 `LigandClassifier.classify()` 过滤
    3. 跳过 excluded 配体 (NAG, SO4 等)
    4. 仅保留 substrate 和 cofactor 配体
  - **验收**: 排除名单中的配体被正确跳过

- [ ] 2.3.3 配体反应原子 SMARTS 匹配
  - 加载 `ligand_reactive_atom_smarts.json` (~25个模式)
  - 对每个保留的配体:
    1. 从 PDB HETATM 构建配体 3D 坐标 (暂用简单方法，精细构建在2.16完成)
    2. 用 RDKit 将 HET code 对应的 SMILES 转为 Mol
    3. 匹配 reactive_atom_smarts，标记反应原子索引
    4. 将反应原子索引映射到 PDB HETATM 坐标
  - 处理匹配失败: 记录到 `data/cache/ds3_smart_failures.json`
  - **验收**: 已知配体 (如BZG的β-内酰胺碳) 反应原子被正确标记

- [ ] 2.3.4 计算残基-配体距离 (D1-D6)
  - 按 CGD_MASTER_PLAN §2.3 定义的距离类别:
    - D1: nucleophile → electrophilic_C (亲核残基到配体亲电碳)
    - D2: acid/base → proton_acceptor (酸碱残基到质子受体)
    - D3: electrostatic → charged_atom (静电残基到带电原子)
    - D4: hydrophobic → hydrophobic_atom (疏水残基到疏水原子)
    - D5: metal_ligand → ligand_atom (金属配位残基到配体原子)
    - D6: any_catalytic → reactive_atom (任意催化残基到反应原子)
  - 对每个 (PDB, ligand, residue) 三元组:
    1. 确定残基的 primary role → 确定应计算哪些 D 类别
    2. 确定活性原子坐标 (从 active_atom_definitions 查表)
    3. 确定配体反应原子坐标 (从 2.3.3 获取)
    4. 计算欧几里得距离
  - **验收**: D1-D6 距离计算逻辑正确

- [ ] 2.3.5 角度计算 (A1-A3 占位)
  - 按 CGD_MASTER_PLAN 定义的角度类别:
    - A1: Bürgi-Dunitz 攻击角 (nucleophile→electrophilic_C→C_neighbor)
    - A2: 质子转移角 (acid/base_O-H→proton_acceptor)
    - A3: 离去基团角 (leaving_group→C→nucleophile)
  - 本任务仅实现角度占位 (值为 null)，完整实现在 task 2.15 (in phase-2-14.md)
  - 角度计算需要配体更完整的原子连接信息，留到 task 2.15 (in phase-2-14.md) 与配体Mol构建协同完成
  - **验收**: A1-A3 字段存在于输出 JSON 中 (值为 null)，不阻塞后续任务

- [ ] 2.3.6 构建 Level 0 层级 (粗粒度)
  - Level 0 分组: `(distance_category, role)` — 例如 (D1, nucleophile), (D2, acid_base)
  - 对每个分组:
    - 收集所有距离观测值
    - 计算: p5, p25, p50, p75, p95, mean, std, n_obs
    - 记录: source_type="direct", pdb_ids 列表
  - 参考 phase-1-13 样本量缺口报告的策略:
    - Level 0 是粗粒度汇总，n_obs 通常较大 (>10)
    - 用于 PAP 初版筛选 (粗过滤)
  - **验收**: Level 0 层级结构正确，n_obs≥10 的分组可被统计

- [ ] 2.3.7 构建 Level 1 层级 (细粒度)
  - Level 1 分组: `(distance_category, role, residue_type)` — 例如 (D1, nucleophile, SER), (D2, acid_base, GLU)
  - 对每个分组:
    - 收集距离观测值
    - 计算统计量 (同 Level 0)
    - n_obs 可能较少 (<10)，标注 "low_sample" 标记
  - 层级化策略 (per phase-1-13):
    - Level 1 n_obs ≥ 10: 使用 Level 1 阈值 (更精确)
    - Level 1 n_obs < 10: 回退到 Level 0 阈值 (更稳健)
  - **验收**: Level 1 层级结构正确，低样本分组有回退标记

- [ ] 2.3.8 处理边界情况
  - 多配体: 同一PDB中有多个 substrate 配体 (如二聚体) → 每个配体独立计算
  - 缺失原子: 配体反应原子在PDB中缺失 → 跳过该配体，记录到 missing_atoms 日志
  - alternate conformations: 取 occupancy 最高的构象
  - 配体在多条chain: 同一HET code 出现在不同 chain → 按 (chain, ligand) 独立处理
  - 反应原子SMARTS无匹配: 记录失败，该配体仅计算 D6 (any→reactive) 距离
  - **验收**: 边界情况均有处理逻辑，无未捕获异常

- [ ] 2.3.9 输出 DS3 Scene A 数据
  - 路径: `data/datasets/DS3_residue_ligand_distance.json`
  - 结构: 二级层级 (Level 0 + Level 1)，每个分组含统计量
  - 元数据: source_type="direct", build_date, n_entries_processed, n_entries_failed
  - **验收**: JSON 格式与 CGD_MASTER_PLAN §2.3 定义一致

- [ ] 2.3.10 验收验证
  - n_obs ≥ 10 的 D1 类别数 > 15
  - Level 0/1 层级结构正确 (Level 1 是 Level 0 的细化)
  - 1BTL (beta-lactamase) 的 SER70(OG) → BZG(β-内酰胺碳) 距离在合理范围 (2.5-4.0Å)
  - **验收**: 统计覆盖度和层级结构满足要求

---

## 输出文件清单

- `cgd/builders/ds3_builder.py`
- `data/datasets/DS3_residue_ligand_distance.json`
- `data/cache/ds3_smart_failures.json`
- `data/cache/ds3_missing_atoms.json`

---

## 常见陷阱

1. **HETATM→Mol 构建困难**: PDB 中的配体原子坐标需要正确映射到 RDKit Mol 的原子索引，这是DS3最大技术难点之一；MVP阶段可用 SMILES→Mol→3D conformer 再做坐标对齐
2. **SMARTS 匹配多命中**: 一个配体可能匹配多个反应原子SMARTS模式，需结合 M-CSA 的反应步骤选择最相关的一个
3. **配体编号混乱**: PDB中配体残基编号可能与 M-CSA 记录不一致，需通过 HET code + chain 定位
4. **Level 1 样本量不足**: 部分罕见 (distance_category, role, residue_type) 组合可能只有 1-2 个观测，必须回退到 Level 0
5. **cofactor 距离也需记录**: 辅因子虽然不是底物，但其与残基的距离对 Scene B 有参考价值
6. **D6 是兜底类别**: 当无法确定配体具体功能原子时，D6 (any→reactive) 确保仍能记录距离信息
7. **角度占位不能阻塞**: A1-A3 为 null 不应导致 JSON 解析错误或下游任务崩溃

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2-4.md` 继续
