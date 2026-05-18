# Phase 2.5-11: 管线编排

**Phase**: 2.5  
**任务编号**: 2.5.11  
**前置依赖**: phase-2.5-1 (场景判定+types.py+D19兼容性判定), phase-2.5-2 (PDB定位+D19预选locate_by_mcsa_id+check_residue_compatibility), phase-2.5-3 (配体Mol构建), phase-2.5-4 (规则映射), phase-2.5-5 (Scene A验证), phase-2.5-6 (验证结果格式), phase-2.5-7 (S_geo运行时), phase-2.5-8 (EZ执行循环), phase-2.5-9 (中间体构象), phase-2.5-10 (置信度分量)  
**阻塞后续**: Phase 3 (DS5集成验证需管线可运行), Phase 6 (主管线编排)  
**预计耗时**: 2.5天 (+0.5天 for D19扩展)  

---

## 任务清单

- [ ] 2.5.11.1 编写 `pipeline/pipeline_orchestrator.py` 框架
  - 定义核心类: `PipelineOrchestrator`
  - 主入口: `orchestrate(substrate_smiles, product_smiles, ec_code?, pdb_id?, uniprot_id?, top_n=5) → List[VerificationResult]`
  - 流程: 输入 → MechFind → ⭐PDB预选 → 场景判定 → Top-N候选评估 → 排序 → 输出
  - **验收**: 类框架可实例化，主入口可调用

- [ ] 2.5.11.2 实现 _group_paths_by_mcsa(paths)
  - D19路径分组: 按M-CSA ID分组候选路径
  - 包含 `_extract_top_mcsa_id()` 辅助函数: 从路径的similarity_details提取top-1 mcsa_id
  - 分组结果: `Dict[Optional[int], List[int]]` (mcsa_id → path indices)
  - 无mcsa_id的路径归入None组
  - **验收**: 路径可按M-CSA ID正确分组

- [ ] 2.5.11.3 实现 _auto_select_pdbs(path_groups)
  - D19 PDB自动预选
  - 4步流程: locate_by_mcsa_id → query_rule_mapping → check_residue_compatibility → 综合结果
  - 降级处理: mcsa_id缓存缺失→用户EC/UniProt; 无mcsa_id→Scene C
  - **验收**: 每组路径自动确定PDB和推荐场景

- [ ] 2.5.11.4 实现 _build_confirmation_card(path_groups_with_pdbs)
  - D19确认卡片: 生成用户确认界面数据
  - 包含5个dataclass定义:
    - ConfirmationCard: 总确认卡片
    - PDBGroupCard: 每个M-CSA组的PDB信息(mcsa_id, enzyme_name, ec_code, selected_pdb, candidate_pdbs, paths, unmatched_paths)
    - PDBInfo: PDB详情(pdb_id, resolution, has_ligand, ligand_name, ligand_type)
    - PathCard: 路径卡片(path_idx, score, residue_info, recommended_scene, selected)
    - ResidueStatus: 残基状态(residue, site, status, resid)
  - **验收**: 确认卡片数据结构完整

- [ ] 2.5.11.5 实现 Top-N 候选并行评估
  - MechFind 返回 Top-N 候选机制
  - 对每个候选独立执行验证管线:
    - Scene A: `scene_a_validator.validate_scene_a()`
    - Scene B: `scene_b_validator.validate_scene_b()` (PAP放置+验证, 2.5.12产出)
    - Scene C: `scene_c_validator.validate_scene_c()` (CGPS统计, 2.5.13产出)
  - 并行策略: `concurrent.futures.ThreadPoolExecutor` (PDB 下载是 I/O 密集)
  - 部分失败处理: 某候选验证 crash → 记录错误，不影响其他候选
  - ⭐ 同组路径共享PDB下载结果
  - **验收**: Top-3 候选可并行评估

- [ ] 2.5.11.6 实现共享缓存
  - PDB 下载缓存: 同一 PDB 文件只下载一次
  - 规则查询缓存: 同一 rule_id 只查 DS5 一次
  - DS2/DS3 阈值缓存: 加载一次常驻内存
  - 缓存键: `(pdb_id,)` / `(rule_id,)` / `(role_pair, distance_category)`
  - ⭐ M-CSA→PDB缓存: 同一mcsa_id的PDB搜索结果只查一次
  - 缓存键: `(mcsa_id,)`
  - **验收**: 重复请求走缓存，无冗余网络请求

- [ ] 2.5.11.7 实现降级逻辑 (A→B→C)
  - Scene A 验证失败 → 尝试 Scene B (PAP 放置)
  - Scene B 放置失败 → 降级到 Scene C (CGPS 评分)
  - 降级时: 更新 VerificationResult.scene 和 source_type
  - 降级时: 调整 confidence (逐级降低)
  - ⭐ 与D19集成: 降级逻辑与check_residue_compatibility的推荐场景一致
  - **验收**: A→B→C 降级链路完整

- [ ] 2.5.11.8 实现最终排序和输出
  - 排序依据: `VerificationResult.confidence` 降序
  - 同分时: `s_geo` 降序 (几何验证优先)
  - 输出: Top-N VerificationResult 列表 + 评分摘要
  - 摘要包含: 每个候选的 mechanism_id, scene, confidence, s_co, s_geo, s_path
  - **验收**: 排序结果合理，摘要信息完整

- [ ] 2.5.11.9 单候选 Scene A 端到端测试
  - 测试案例: 1BTL (Class A beta-lactamase)
  - 输入: 底物 SMILES + 产物 SMILES + PDB ID="1BTL"
  - 期望流程: 场景判定→Scene A → PDB定位→配体构建→验证→评分→输出
  - 检查: VerificationResult.scene="A", confidence>0
  - **验收**: 单候选 Scene A 端到端测试通过 on 1BTL

- [ ] 2.5.11.10 Top-3 候选评估测试
  - Mock MechFind 返回 3 个候选
  - 验证: 3 个候选均被评估，结果按 confidence 排序
  - 验证: 共享缓存工作正常
  - **验收**: Top-3 candidates evaluated, ranked

- [ ] 2.5.11.11 多路径PDB预选端到端测试
  - Mock MechFind返回5个候选(3个同M-CSA #1, 1个M-CSA #2, 1个无匹配)
  - 验证5个方面:
    1. 分组正确: 3+1+1
    2. PDB选定: 每组有推荐PDB
    3. 确认卡片: 格式正确，残基状态标注
    4. 共享缓存: 同组PDB只查一次
    5. 批量验证: 全部路径可批量运行
  - **验收**: 5个验证点全部通过

- [ ] 2.5.11.12 ⭐ 回填 Scene B/C 调度逻辑 (需 2.5.12/2.5.13 完成后执行)
  - 在 `pipeline_orchestrator.py` 中补充 Scene B 和 Scene C 的调用路径:
    - Scene B: `scene_b_validator.validate_scene_b()` (2.5.12产出)
    - Scene C: `scene_c_validator.validate_scene_c()` (2.5.13产出)
  - 降级链验证: Scene A验证失败→调用Scene B→Scene B失败→调用Scene C
  - ⚠️ 本子任务依赖 phase-2.5-12 和 phase-2.5-13 的完成，需在它们之后执行
  - **验收**: 管线编排器可正确调度 Scene A/B/C 三种验证模式

---

## 输出文件清单

- `pipeline/pipeline_orchestrator.py` (含 D19 路径分组+PDB预选+确认卡片)
- `pipeline/__init__.py`
- `tests/test_pipeline_orchestrator.py`

---

## 常见陷阱

1. **纯架构胶水层**: 本任务无复用代码，核心是正确组合其他模块，注意接口对齐
2. **并行安全**: 共享缓存在多线程环境下需加锁，`concurrent.futures` + `threading.Lock`
3. **部分失败不传播**: 某候选验证异常时需 try/except 包裹，记录到日志但不中断其他候选评估
4. **降级幂等性**: 同一候选不应反复降级 (A→B→C→C)，需记录当前场景避免重复降级
5. **MechFind 依赖**: 本 Phase 开发时 MechFind 服务可能不稳定，需 mock 接口做测试
6. **M-CSA分组粒度**: 同一EC二级分类的M-CSA条目可能对应同一PDB，可合并搜索；但不同EC一级分类一定不同PDB
7. **确认卡片→前端桥接**: 确认卡片是后端数据结构，Phase 6需要设计前端组件消费此数据
8. **用户覆盖PDB后需重新运行兼容性检查**: check_residue_compatibility需重新调用

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. ⚠️ 本任务编排 Scene A 管线；Scene B/C 验证器在 2.5-12/2.5-13 中完成后，需回填 pipeline_orchestrator.py 的 Scene B/C 调度逻辑
4. 打开 `phase-2.5-12.md` 继续 Scene B 验证器
