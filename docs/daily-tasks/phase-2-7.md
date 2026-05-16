# Phase 2-7: 残基保守性验证

**Phase**: 2
**任务编号**: 2.7
**前置依赖**: phase-2-6 (TM-align分层), phase-2-5 (同源结构列表), phase-1-1 (M-CSA entries)
**阻塞后续**: phase-2-8 (同源替代DS3需保守性验证通过), phase-2-11 (催化水5维需同源保守性)
**预计耗时**: 3天

---

## 任务清单

- [ ] 2.7.1 编写 `cgd/homolog/conservation.py` 框架
  - 创建残基保守性验证模块，定义 `ConservationVerifier` 类
  - 双层验证: Level 1 (序列) + Level 2 (空间)
  - 必须同时通过两层验证才可贡献数据 (同源残基才可信)
  - 接口: `verify(ref_entry, homolog_pdb, tm_score) → ConservationResult`
  - **验收**: 类可实例化，接口定义清晰

- [ ] 2.7.2 Level 1: 序列比对验证
  - 目标: 确认同源结构中对应位置的残基与参考结构一致或保守替换
  - 步骤:
    1. 从 RCSB API 获取同源 PDB 的序列信息 (或直接从 PDB ATOM 记录提取)
    2. 通过 UniProt ID 锚定参考蛋白和同源蛋白的序列对应关系
    3. 找到参考催化残基在同源结构中的等价位点
  - 保守替换判定 (使用标准分组):
    - 完全一致: 同一氨基酸 → pass_strong
    - 保守替换: 同组内替换 → pass_weak
    - 非保守替换: 不同组 → fail
  - 保守替换分组:
    - 疏水: {A, V, L, I, M, F, W, P}
    - 极性不带电: {S, T, N, Q, C, Y}
    - 正电: {K, R, H}
    - 负电: {D, E}
    - 特殊: {G} (甘氨酸通常不可保守替换)
  - **验收**: 序列比对验证逻辑正确，保守替换分组合理

- [ ] 2.7.3 Level 1: RCSB API 序列比对
  - 使用 RCSB 的序列比对 API 或 SIFTS 映射
  - RCSB API 端点: `https://www.rcsb.org/pdb/rest/das/pdb_uniprot/alignment?query=<pdb_id>`
  - 或使用 SIFTS 映射: PDB residue number ↔ UniProt position
  - 处理: 插入码 (insertion codes)、链断链、残基编号偏移
  - 备选: 如果 RCSB API 有限速，用 BioPython `pairwise2` 做本地序列比对
  - **验收**: 残基等价位点映射正确

- [ ] 2.7.4 Level 2: 活性原子空间验证
  - 目标: 确认同源残基的活性原子在空间中与参考结构对齐
  - 利用 TM-align 的旋转矩阵+平移向量，将同源结构变换到参考坐标系
  - 计算变换后同源活性原子与参考活性原子的距离:
    - < 1.0Å → High conservation (空间高度保守)
    - 1.0-2.5Å → Medium conservation (空间中度保守)
    - > 2.5Å → Discard (空间位置差异过大)
  - 需要的活性原子: 从 `active_atom_definitions.json` 查表
  - **验收**: 空间验证阈值判定正确

- [ ] 2.7.5 综合验证结果
  - 双层验证组合规则:
    - Level 1 pass_strong + Level 2 High → verified_strong (权重1.0)
    - Level 1 pass_strong + Level 2 Medium → verified_moderate (权重0.8)
    - Level 1 pass_weak + Level 2 High → verified_moderate (权重0.8)
    - Level 1 pass_weak + Level 2 Medium → verified_weak (权重0.5)
    - 任何一层 fail → discard
  - 输出每个同源残基的: conservation_level, weight, level1_result, level2_result, spatial_distance
  - **验收**: 组合验证逻辑正确，discard 条件明确

- [ ] 2.7.6 批量处理与结果缓存
  - 对所有 M-CSA entries 的同源结构批量执行双层验证
  - 缓存到 `data/cache/conservation_results/`
  - 记录统计: 通过率、各层级的分布
  - **验收**: 批量处理完成，结果可缓存

- [ ] 2.7.7 验收验证
  - 1BTL (TEM-1 beta-lactamase): SER70 和 GLU166 是高度保守的催化残基
  - 在同源结构中，等价残基应为 SER/GLU 或保守替换
  - 活性原子空间距离 < 1.0Å
  - **验收**: 已知保守残基被正确验证

---

## 输出文件清单

- `cgd/homolog/conservation.py`
- `data/cache/conservation_results/` (保守性验证结果缓存)

---

## 常见陷阱

1. **BioPython 比对精度**: `pairwise2` 的全局比对可能对长序列不够精确，建议使用 RCSB 预计算的 SIFTS 映射 (更可靠)
2. **RCSB API 限速**: SIFTS/序列比对 API 有限速，批量查询需添加延时；建议一次性下载 SIFTS 映射文件 (ftp://ftp.ebi.ac.uk/pub/databases/msd/sifts/)
3. **残基编号映射错误**: 同源结构的残基编号可能与参考结构不同 (插入码、偏移)，必须通过序列比对建立等价关系
4. **活性原子在 TM-align 后的位置**: TM-align 的旋转矩阵是全局变换，应用于整条链；确保变换后的活性原子坐标计算正确
5. **保守替换分组争议**: 甘氨酸 (G) 和脯氨酸 (P) 的保守性判定有争议——G 无侧链允许更多构象自由度，P 刚性限制构象；对催化残基应更严格
6. **CYS 特殊性**: 半胱氨酸可能形成二硫键，其保守性需额外考虑；在氧化还原酶中 CYS 通常是强保守
7. **Level 2 对 TM-align 精度依赖**: 如果 TM-align 的全局比对不准确，局部活性位点可能偏差较大；可考虑局部重对齐 (Kabsch)

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2-8.md` 继续
