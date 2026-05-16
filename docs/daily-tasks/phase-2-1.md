# Phase 2-1: 催化水识别(MVP)

**Phase**: 2
**任务编号**: 2.1
**前置依赖**: Phase 1完成 (PDB文件缓存、active_atom_definitions、distance_thresholds.json)
**阻塞后续**: phase-2-11 (催化水识别完整5维)、Phase 2.5 (Scene A验证管线中水处理)
**预计耗时**: 3天

---

## 任务清单

- [ ] 2.1.1 编写 `cgd/water/scorer.py` 框架
  - 创建催化水评分模块，定义 `CatalyticWaterScorer` 类
  - 输入: PDB ID → 从缓存加载PDB文件 → 提取所有 HOH/WAT 水分子坐标
  - 输出: 每个水分子的5维评分 (本任务只实现3维)
  - 定义评分维度接口，预留 `dim4_homolog_conservation` 和 `dim5_chemical_context` 占位
  - **验收**: 模块可导入，类可实例化

- [ ] 2.1.2 维度1: 距离评分
  - 计算水分子到催化残基活性原子的距离
  - 活性原子从 `active_atom_definitions.json` 查表获取
  - 距离评分规则:
    - 2.5-3.5Å → 1.0 (最优催化水距离)
    - 3.5-4.5Å → 0.5 (边缘距离)
    - >4.5Å → 0.0 (太远，非催化水)
  - 取水分子到所有催化残基活性原子中最近距离作为该维度得分
  - **验收**: 距离区间到评分的映射正确

- [ ] 2.1.3 维度2: B-factor/occupancy 评分
  - 从PDB文件提取水分子的 B-factor 和 occupancy
  - 评分规则:
    - B-factor < 30 且 occupancy = 1.0 → 1.0 (高质量定位)
    - B-factor 30-50 或 occupancy < 1.0 → 0.5 (中等质量)
    - B-factor > 50 → 0.0 (定位不确定)
  - 处理 alternate conformations: 取 occupancy 最高的构象
  - **验收**: B-factor/occupancy 阈值判断正确

- [ ] 2.1.4 维度3: 金属排除评分
  - 识别PDB中的金属离子 (Zn²⁺, Mg²⁺, Ca²⁺, Fe²⁺/³⁺, Mn²⁺, Cu²⁺ 等)
  - 金属离子HET code: ZN, MG, CA, FE, FE2, MN, CU, CU1, CO, NI 等
  - 计算水分子到最近金属离子的距离
  - 评分规则:
    - 距离 > 2.5Å → 1.0 (非金属配位水)
    - 距离 ≤ 2.5Å → 0.0 (金属配位水，非催化水)
  - **验收**: 金属离子识别正确，金属配位水被正确排除

- [ ] 2.1.5 综合评分与阈值判定
  - 3维MVP等权: `score = (dim1 + dim2 + dim3) / 3`
  - 阈值判定:
    - score ≥ 0.6 → "catalytic" (催化水)
    - 0.3 ≤ score < 0.6 → "pending" (待定，等完整5维再判定)
    - score < 0.3 → "ignore" (非催化水)
  - 输出每个水分子的: 坐标、各维度得分、总分、分类
  - **验收**: 阈值分类逻辑正确

- [ ] 2.1.6 1BTL 验证
  - 1BTL (Class A beta-lactamase): 已知催化水为 HOH 处于 SER70 和 GLU166 之间
  - 运行评分器，确认催化水被识别为 "catalytic" 分类
  - 确认非催化水被分类为 "pending" 或 "ignore"
  - **验收**: 1BTL 催化水被正确识别 (score ≥ 0.6)

---

## 输出文件清单

- `cgd/water/scorer.py`
- `cgd/water/__init__.py` (如不存在)

---

## 常见陷阱

1. **水分子命名不一致**: PDB中水分子残基名可能是 HOH、WAT、DOD (重水) 等，需全部覆盖
2. **occupancy 缺失**: 部分老旧PDB文件水分子的 occupancy 字段可能为空，默认视为 1.0
3. **B-factor 异常值**: 部分水分子的 B-factor 可能是 0.00 或 99.99 (占位符)，需特殊处理
4. **金属离子判断遗漏**: 除了常见金属，还需注意过渡金属 (Mo, W, Se 等) 和非标准命名
5. **活性原子查询失败**: 如果 active_atom_definitions 中没有对应 (residue_type, role) 的映射，距离维度应返回 0.0 并记录警告
6. **等权 vs 加权**: MVP阶段使用等权 (各1/3)，Phase 2-11 切换到5维时重新定义权重

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2-2.md` 继续
