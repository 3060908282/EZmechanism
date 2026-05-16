# Phase 2-9: 口袋锚定放置(MVP)

**Phase**: 2
**任务编号**: 2.9
**前置依赖**: phase-1-8 (distance_thresholds.json), phase-1-3 (active_atom_definitions)
**阻塞后续**: phase-2-10 (CGD筛选overlay 需口袋锚定放置基础)
**预计耗时**: 1.5天

---

## 任务清单

- [ ] 2.9.1 编写 `cgd/pap/pocket_anchor.py` 框架
  - 创建口袋锚定放置模块，定义 `PocketAnchorPlacer` 类
  - Per CGD_MASTER_PLAN §4.7 Phase 1 (无 DS3 过滤，仅放置+评分)
  - 数据流: 活性原子坐标 + 底物SMILES → 口袋锚点 → 构象生成 → 锚定 → 旋转采样 → 距离评分
  - **验收**: 模块框架可导入运行

- [ ] 2.9.2 计算口袋锚点 (pocket anchor)
  - 口袋锚点 = 催化残基活性原子的等权质心 (MVP阶段，per IMPLEMENTATION_PLAN 风险1)
  - 步骤:
    1. 从 active_atom_definitions 查表获取每个催化残基的活性原子名称
    2. 从 PDB 坐标提取活性原子 3D 坐标
    3. 计算质心: `anchor = Σ(coord_i) / n`
  - 后续优化项: 加权质心 (w_nucleophile=1.5 等)
  - **验收**: 口袋锚点坐标计算正确

- [ ] 2.9.3 生成底物 3D 构象
  - 复用 `overlay_substrate.py` 中的 `generate_3d_conformer()` 函数
  - 使用 ETKDGv3 参数，生成 100 个构象
  - 每个构象做 MMFF 力场优化 (最多 200 步)
  - 去重: RMSD 阈值 0.5Å 以内的构象只保留 1 个
  - **验收**: 构象生成和去重逻辑正确

- [ ] 2.9.4 识别底物反应原子
  - 加载 `ligand_reactive_atom_smarts.json`
  - 对每个构象的 Mol 对象进行 SMARTS 匹配
  - 标记反应原子索引 (如 β-内酰胺的羰基碳)
  - 处理: 多个匹配取第一个 (或根据 M-CSA 的反应步骤选择)
  - **验收**: 反应原子被正确识别

- [ ] 2.9.5 锚定: 反应原子对齐口袋锚点
  - 对每个构象:
    1. 获取反应原子的 3D 坐标
    2. 计算平移向量: `translation = anchor - reactive_atom_coord`
    3. 平移整个构象使反应原子位于锚点
  - 平移后反应原子坐标应恰好等于锚点坐标
  - **验收**: 锚定后反应原子坐标 = 锚点坐标

- [ ] 2.9.6 Fibonacci 球面旋转采样
  - 以反应原子(锚点)为固定点，进行旋转采样:
    - Fibonacci 球面采样 50 个方向 (θ, φ)
    - 每个方向: 绕通过锚点的对应轴旋转构象
  - Fibonacci 球面算法:
    ```
    for i in range(n_directions):
        theta = arccos(1 - 2*(i+0.5)/n_directions)
        phi = pi * (1 + sqrt(5)) * i
        axis = (sin(theta)*cos(phi), sin(theta)*sin(phi), cos(theta))
        rotation_matrix = rotation_about_axis(axis, angle_at_anchor)
    ```
  - 实际旋转: 对构象中每个原子，绕锚点旋转
  - **验收**: 旋转采样覆盖球面均匀，锚点位置不变

- [ ] 2.9.7 距离评分 (MVP，无DS3过滤)
  - 对每个候选放置 (构象 × 旋转方向):
    1. 计算催化残基活性原子到配体各关键原子的距离
    2. 评分: 与 DS2 P50 距离的接近程度 (MVP简化)
    3. `score = 1 - |d - d_ref| / d_ref`，其中 d_ref 为 DS2 P50
  - 按 score 降序排列，返回 top-k 候选
  - **验收**: 距离评分逻辑正确

- [ ] 2.9.8 测试验证
  - 选择 1BTL (beta-lactamase) + benzylpenicillin 作为测试案例
  - 生成口袋锚定放置结果
  - 检查: 放置的配体在催化残基 3Å 范围内
  - **验收**: 放置的配体在催化残基活性原子 3Å 范围内

---

## 输出文件清单

- `cgd/pap/pocket_anchor.py`
- `cgd/pap/__init__.py` (如不存在)

---

## 常见陷阱

1. **等权质心 vs 加权质心**: MVP 使用等权质心，可能导致 D1 距离退化 (见 IMPLEMENTATION_PLAN 注释)；这是设计特征而非bug
2. **Fibonacci 采样精度**: 50 个方向在球面上是粗采样，可能错过最优方向；phase-2-10 会增加到 50×10=500 (含自旋)
3. **旋转后原子重叠**: 旋转可能导致配体原子与蛋白质原子重叠；MVP 不做碰撞检测 (phase-2-10 加入)
4. **ETKDGv3 构象多样性**: 部分刚性底物 (如苯环类) 的构象差异很小，100 个构象中可能很多重复；去重很重要
5. **反应原子索引漂移**: SMARTS 匹配返回的原子索引在构象生成后可能变化；需在生成构象后重新匹配
6. **坐标单位**: PDB 坐标单位为 Å，RDKit 默认也是 Å，确保一致
7. **锚定后质心不等于活性原子**: 等权质心是所有催化残基活性原子的中心，不等于任何一个活性原子；底物反应原子对齐到质心而非某个残基

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2-10.md` 继续
