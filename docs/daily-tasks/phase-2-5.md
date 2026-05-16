# Phase 2-5: 同源结构查找

**Phase**: 2
**任务编号**: 2.5
**前置依赖**: Phase 1完成 (M-CSA entries、PDB缓存), phase-2-2 (LigandClassifier)
**阻塞后续**: phase-2-6 (TM-align集成), phase-2-7 (残基保守性验证)
**预计耗时**: 2天

---

## 任务清单

- [ ] 2.5.1 编写 `cgd/homolog/finder.py` 框架
  - 创建同源结构查找模块，定义 `HomologFinder` 类
  - 接口: `find_homologs(uniprot_id, seq_identity_min=70, resolution_max=2.5) → List[HomologInfo]`
  - 返回: PDB ID、chain ID、序列一致性、分辨率、是否有配体
  - **验收**: 类可实例化，接口定义清晰

- [ ] 2.5.2 RCSB Search API 查询
  - 使用 RCSB Search API (https://search.rcsb.org/rcsbsearch/v2/query)
  - 查询方式: 按 UniProt ID 搜索序列同源结构
  - 构建查询 JSON:
    ```json
    {
      "query": {
        "type": "terminal",
        "service": "sequence",
        "parameters": {
          "evalue_cutoff": 0.01,
          "identity_cutoff": 0.7,
          "sequence_type": "protein",
          "value": "<uniprot_sequence>"
        }
      },
      "return_type": "entry"
    }
    ```
  - 处理分页: API 每页最多返回 1000 条
  - **验收**: API 查询可返回同源结构列表

- [ ] 2.5.3 UniProt ID 获取
  - 从 M-CSA entries 中提取关联的 UniProt ID
  - M-CSA entry 的 `enzyme_name` → 查 RCSB 的 `rcsb_entry_container_identifiers.uniprot_ids`
  - 或从 PDB 文件的 DBREF 记录提取 UniProt ID
  - 备选: 直接从 M-CSA API 的 `proteins[]` 字段获取 UniProt accession
  - **验收**: UniProt ID 提取逻辑正确

- [ ] 2.5.4 下载候选 PDB 文件
  - 对查询结果中的每个 PDB ID:
    1. 检查缓存 `data/cache/pdb_files/` 是否已存在
    2. 不存在则下载 (复用 phase-1-2 的 PDB 下载逻辑)
    3. 提取分辨率信息 (REMARK 2 或 header)
  - 使用 HTTP 缓存模块避免重复下载 (复用 phase-0-8)
  - **验收**: 候选 PDB 文件可正确下载和缓存

- [ ] 2.5.5 过滤: 配体 + 分辨率
  - 解析候选 PDB 的 HETATM 记录
  - 过滤条件:
    1. 有配体 (排除只含 HOH 和离子的结构) — 调用 LigandClassifier 检查是否有 substrate/cofactor
    2. 分辨率 ≤ 2.5Å — 排除低分辨率结构
  - 记录被过滤掉的结构及原因
  - ⚠️ 子任务中的配体过滤依赖 phase-2-2 (LigandClassifier); 若 2.2 未完成，可暂用简单白名单替代。
  - **验收**: 过滤逻辑正确，保留的结构有配体且分辨率达标

- [ ] 2.5.6 1BTL 验证
  - 1BTL UniProt ID: P62593 (TEM-1 beta-lactamase)
  - 查询同源结构，期望找到 ≥3 个含配体的同源 PDB
  - 验证 seq_identity、分辨率、配体信息完整
  - **验收**: 1BTL 找到 ≥3 个同源结构 (含配体、分辨率 ≤ 2.5Å)

---

## 输出文件清单

- `cgd/homolog/finder.py`
- `cgd/homolog/__init__.py` (如不存在)
- `data/cache/homolog_search/` (查询结果缓存目录)

---

## 常见陷阱

1. **RCSB API 限速**: RCSB Search API 有限速策略，批量查询时需添加延时 (建议 0.5-1s 间隔)
2. **UniProt ID 不在 M-CSA**: 部分 M-CSA 条目可能没有关联 UniProt ID，需从 PDB 的 DBREF 行获取
3. **序列一致性计算差异**: RCSB 返回的 identity_cutoff 是局部比对一致性，非全局一致性；70% 局部一致性已足够保守
4. **同一PDB多条chain**: 同一 PDB 文件可能包含目标蛋白的多条链 (如同源二聚体)，每条链都需独立处理
5. **配体定义过宽**: "有配体"不能仅检查 HETATM 是否存在，还需过滤 HOH/SO4 等非功能配体
6. **分辨率缺失**: 少数 PDB 条目无分辨率信息 (如 NMR 结构)，应排除
7. **API 响应格式变更**: RCSB API 可能更新响应格式，需做字段存在性检查

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2-6.md` 继续
