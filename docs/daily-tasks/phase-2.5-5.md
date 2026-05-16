# Phase 2.5-5: Scene A 完整验证管线

**Phase**: 2.5  
**任务编号**: 2.5.5  
**前置依赖**: phase-2.5-2 (PDB定位), phase-2.5-3 (配体Mol构建), phase-2.5-4 (规则映射, S_path评分需要), phase-2.5-6 (VerificationResult格式, 接口优先定义)  
⚠️ **重要**: 请先完成 phase-2.5-6 (VerificationResult格式定义), 尽管其文件编号在后。2.5.5的验证流程依赖VerificationResult数据结构。  
**阻塞后续**: phase-2.5-7 (S_geo组合), phase-2.5-8 (EZ执行循环), phase-2.5-10 (置信度), phase-2.5-11 (管线编排)  
**预计耗时**: 1.5天  

---

## 任务清单

- [ ] 2.5.5.1 编写 `ez_validator/scene_a_validator.py` 框架
  - 定义核心函数: `validate_scene_a(mechanism, pdb_structure, ligand_mol, cgd_datasets) → VerificationResult`
  - 完整验证管线步骤: 获取坐标 → 计算距离/角度 → 查阈值 → 评分 → 置信度
  - **验收**: 模块框架可导入，函数签名正确

- [ ] 2.5.5.2 Step 1 — 获取残基活性原子坐标 + 配体反应原子坐标
  - 残基活性原子: 查 `active_atom_definitions.json` → 提取 atom_name → 从 PDB 取坐标
  - ⭐ 复用 `extract_pdb_residue_fragment()` (~60行节省)
  - 配体反应原子: 查 `ligand_reactive_atom_smarts.json` → SMARTS 匹配配体 Mol → 取匹配原子坐标
  - 复用 G13 产出的 ligand Mol
  - **验收**: 坐标提取正确，活性原子/反应原子均可定位

- [ ] 2.5.5.3 Step 2 — 计算 residue-residue 距离 → 查询 DS2
  - 计算催化残基对间活性原子距离 (D1-D3 类别)
  - 查询 DS2: 获取该 role_pair 的 P5-P95 区间
  - 判定: 距离在 P5-P95 内 → pass; 超出 → fail + 计算偏离度
  - 层级化查询: Level 1 (细粒度) n_obs<10 → 降级到 Level 0 (粗粒度)
  - **验收**: 距离判定结果正确，层级化降级逻辑工作

- [ ] 2.5.5.4 Step 3 — 计算 residue-ligand 距离/角度 → 查询 DS3
  - 距离: D1(nucleophile→electrophilic_C), D2-D6 (其他残基-配体距离)
  - 角度: A1(Bürgi-Dunitz), A2(质子转移, MVP用距离近似), A3(离去基团)
  - ⭐ 复用 `compute_ligand_distances()` (需适配为活性原子距离, ~30行节省)
  - 查询 DS3: 获取 distance_category × role 的 P5-P95 → pass/fail
  - **验收**: 距离/角度计算正确，DS3 查询返回合理阈值

- [ ] 2.5.5.5 Step 4 — 组合 S_geo 评分 + 置信度
  - 逐维度评分: 距离在 P5-P95 内 → score=1; 偏离越大 score 越低 (线性插值到 0)
  - 多维度组合: 调用 `s_geo_runtime.py` (phase-2.5-7 产出)
  - 置信度: 考虑数据源质量 (direct/homolog/overlay) + 样本量
  - **验收**: S_geo 评分在 [0,1] 范围内

- [ ] 2.5.5.6 Step 5 — 与 S_co, S_path 加权
  - 加权公式: final_score = w1·S_co + w2·S_geo + w3·S_path
  - S_co: 查 DS1 频率 → 归一化 [0,1]
  - S_path: 查 DS5 映射 → 规则匹配比例 → [0,1]
  - **验收**: 最终评分合理，已知机制分数高于随机

- [ ] 2.5.5.7 1BTL 端到端验证
  - 用 1BTL (Class A beta-lactamase) 作为测试案例
  - 输入: 1BTL PDB + 候选机制 + DS2/DS3 数据
  - 输出: VerificationResult (scene="A", passed, scores, distance_scores)
  - **验收**: Scene A verification runs end-to-end on 1BTL test case

---

## 输出文件清单

- `ez_validator/scene_a_validator.py`
- `tests/test_scene_a_validator.py`

---

## 常见陷阱

1. **38% 复用**: `extract_pdb_residue_fragment()` 和 `compute_ligand_distances()` 可直接复用，但后者需适配为活性原子距离(非几何中心距离)
2. **DS2/DS3 查询格式**: 数据集 JSON 的键结构需要与查询参数精确匹配 (role_pair, distance_category, residue_type 等)
3. **A2 角度 MVP**: 质子转移角度 A2 在 MVP 阶段用距离近似 (donor→acceptor < 3.5Å → 假设 ~180°)，精确版在 Phase 5.5
4. **层级化降级**: DS2/DS3 查询时 n_obs < 10 → 降级到 Level 0 (粗粒度)，需在 VerificationResult 中标注 confidence_level
5. **距离类别匹配**: D1-D6 和 A1-A3 的 distance_category 需根据残基角色自动判定，不能硬编码

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2.5-6.md` 继续
