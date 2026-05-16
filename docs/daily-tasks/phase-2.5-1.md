# Phase 2.5-1: 场景判定+降级

**Phase**: 2.5  
**任务编号**: 2.5.1  
**前置依赖**: Phase 2 完成 (DS2/DS3 数据集可用, PDB解析模块就绪)  
**阻塞后续**: phase-2.5-2 (PDB定位), phase-2.5-4 (规则映射), phase-2.5-5 (Scene A验证), phase-2.5-11 (管线编排)  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 2.5.1.1 编写 `ez_validator/scene_resolver.py` 框架
  - 定义输入: `(substrate_smiles, product_smiles, ec_code?, pdb_id?, uniprot_id?)`
  - 定义输出: `SceneResult(scene: str, pdb_id: Optional[str], ligand_info: Optional[dict], confidence: float, degradation_reason: Optional[str])`
  - scene 取值: `"A"` / `"B"` / `"C"`
  - **验收**: 模块可导入，SceneResult dataclass 可实例化

- [ ] 2.5.1.2 实现 Step 1 — 用户提供的 PDB ID 直接使用
  - 若用户提供了 `pdb_id` → 跳过搜索，直接进入 Step 3
  - 调用 `fetch_pdb_info()` 下载 PDB
  - 验证 PDB 是否存在 (RCSB 返回 404 → Scene C)
  - **验收**: 给定 pdb_id="1BTL" → 正确下载并进入 Step 3

- [ ] 2.5.1.3 实现 Step 2 — 按 EC/UniProt 查询 RCSB
  - 无用户 PDB 时，用 `ec_code` 或 `uniprot_id` 调用 RCSB Search API
  - 查询条件: `rcsb_entry_info.resolution_combined[0] <= 3.0`
  - 排序: 分辨率升序 + 有配体优先
  - 无 PDB → 返回 Scene C
  - 有 PDB → 选择最优(分辨率+配体) → 进入 Step 3
  - **验收**: 给定 EC=3.5.2.6 → 找到 PDB ID 列表并选最优

- [ ] 2.5.1.4 实现 Step 3 — 检查 HETATM 判定 Scene A/B
  - 调用 `parse_pdb_text()` 解析 PDB
  - 提取 HETATM 配体列表
  - 查 `HET_to_ChEBI_mapping.json` 分类: substrate/cofactor → Scene A
  - 仅含 excluded 配体或水 → Scene B
  - 复用: `WATER_RESNAMES`, `EXCLUDED_HETATM` 常量
  - **验收**: 1BTL (有配体) → Scene A; 无配体 PDB → Scene B

- [ ] 2.5.1.5 实现 G16 — Scene A→B 降级逻辑
  - 检查配体质量指标:
    - B-factor > 50 → 降级因子
    - occupancy < 1.0 → 降级因子
    - 分辨率 > 2.5Å → 降级因子
  - 任一降级因子触发 → Scene A 降级为 Scene B
  - 降级时设置 `degradation_reason` 和降低 `confidence`
  - **验收**: 高 B-factor 配体 → Scene A 降级为 Scene B

- [ ] 2.5.1.6 编写 5 个测试用例
  - 测试1: 1BTL (有底物配体) → Scene A
  - 测试2: 无配体 PDB → Scene B
  - 测试3: 无 PDB 的 EC 编号 → Scene C
  - 测试4: 配体 B-factor>50 → Scene A 降级为 Scene B
  - 测试5: 用户直接提供 PDB ID → 跳过搜索
  - **验收**: 5 个测试全部通过

- [ ] 2.5.1.7 定义 MechFind 输出 JSON Schema
  - 编写 `step25/mechfind_schema.py`，定义 MechFind 输出的 Pydantic 模型
  - 核心字段:
    - `candidate_mechanisms: List[CandidateMechanism]` — 候选机制列表
    - `CandidateMechanism`: mechanism_id, rule_ids (List[str]), smarts_patterns, confidence
    - `rule_id` 格式: `{mcsa_id}_{mech_idx}_{step_idx}` (质子化规则) 或 `j_i_s` (M-CSA格式)
  - 验证: 给定 MechFind API 实际响应 → 可正确解析为 Pydantic 对象
  - **验收**: MechFind 输出 schema 定义完整，类型安全

---

## 输出文件清单

- `ez_validator/scene_resolver.py`
- `ez_validator/__init__.py`
- `step25/mechfind_schema.py`
- `tests/test_scene_resolver.py`

---

## 常见陷阱

1. **RCSB API 限速**: 搜索请求频率受限，需复用 Phase 0 的缓存模块，避免重复请求
2. **HET 分类依赖**: Step 3 的配体分类依赖 `HET_to_ChEBI_mapping.json` (Phase 1 产出)，若该文件未完成需先用白名单占位
3. **多 PDB 选择**: 同一 EC 可能有数十个 PDB，需明确排序策略: 分辨率优先，有底物配体次之，残基完整性再次
4. **降级边界**: B-factor 阈值 50、occupancy < 1.0、分辨率 2.5Å 这些阈值目前为经验值，后续可能需要根据数据调整
5. **EC 编号格式**: EC 可能是 "3.5.2.6" 或 "3.5.2.-" (通配)，RCSB 搜索需处理通配符

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2.5-2.md` 继续
