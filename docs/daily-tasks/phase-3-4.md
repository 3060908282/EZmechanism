# Phase 3-4: 规则映射表衍生 (含 residue_info)

**Phase**: 3  
**任务编号**: 3.4  
**前置依赖**: phase-3-3 (DS5 Layer 0构建完成, 含residue_info)  
**阻塞后续**: Phase 2.5-4 运行时查询 (开发期用mock数据，Phase 3完成后切换真实数据), Phase 5 (Agent② 消歧)  
**预计耗时**: 0.5天  

---

## 任务清单

- [ ] 3.4.1 从 DS5 提取分类列表
  - 读取 `data/datasets/DS5_rule_crossmapping.json`
  - 按 mapping_type 分类:
    - `1:1`: 精确映射，一条 MechFind 规则 → 一条 EZ SMARTS
    - `1:N`: 一条 MechFind 规则 → 多条候选 EZ SMARTS (Layer 0 暂不产出，预留字段)
    - `unmapped`: 无法映射的规则
  - 按 residue_info.source 分类:
    - `protonation_rule`: 路径1已识别残基
    - `mcsa_query`: 路径2已识别残基
    - `chemical_inference`: 路径3推断
    - `null`: 无残基信息
  - **验收**: 两个维度分类正确

- [ ] 3.4.2 构建规则映射表 (含 residue_info)
  - 输出: `data/derived/rule_mapping_table.json`
  - 结构:
    ```json
    {
      "version": "1.1",
      "layer": 0,
      "generated_at": "2026-...",
      "schema_extensions": ["residue_info"],
      "statistics": {
        "total_rules": N,
        "mapped_1to1": N1,
        "mapped_1toN": 0,
        "unmapped": N2,
        "coverage_rate": N1/N,
        "residue_info_stats": {
          "protonation_rule_count": N3,
          "mcsa_query_count": N4,
          "chemical_inference_count": N5,
          "no_residue_info_count": N6,
          "protonation_coverage": N3/total_protonation_rules,
          "mcsa_coverage": N4/total_mcsa_rules
        }
      },
      "mappings": {
        "Ser_pro": {
          "ez_rule_id": "R0042",
          "smarts": "[OD1:1]>>[OD2:1]",
          "type": "1:1",
          "confidence": "exact",
          "residue_info": {
            "source": "protonation_rule",
            "entries": [
              {"residue": "Ser", "site": "OG", "atom": "O", "type": "residue", "confidence": 1.0}
            ]
          }
        },
        "2_2_1": {
          "ez_rule_id": "R0042",
          "smarts": "[OD1:1]>>[OD2:1]",
          "type": "1:1",
          "confidence": "exact",
          "residue_info": {
            "source": "mcsa_query",
            "entries": [
              {"residue": "Ser", "site": "OG", "atom": "O", "type": "residue", "confidence": 0.95, "mcsa_residue_id": 12345}
            ]
          }
        },
        "unknown_rule_42": {
          "ez_rule_id": null,
          "smarts": null,
          "type": "unmapped",
          "confidence": "none",
          "residue_info": {
            "source": "chemical_inference",
            "entries": [
              {"residue": null, "role": "nucleophile", "atom": "O", "type": "unknown", "confidence": 0.4}
            ]
          }
        },
        "5_1_3": {
          "ez_rule_id": null,
          "smarts": null,
          "type": "unmapped",
          "confidence": "none",
          "residue_info": {
            "source": null,
            "entries": []
          }
        }
      }
    }
    ```
  - 键为 MechFind rule_id，值为映射信息 + residue_info
  - ⭐ 版本升级: v1.0 → v1.1 (新增 residue_info 字段)
  - **验收**: 映射表格式正确，含 residue_info，可直接被 rule_mapper.py 查询

- [ ] 3.4.3 生成衍生统计
  - 按残基角色统计映射率
  - 按 M-CSA 条目统计映射率
  - 未映射规则的 moiety_change 类型分布
  - ⭐ 新增: residue_info 统计:
    - 三路径使用分布饼图数据
    - 双候选规则数 (如 Asp/Glu_pro)
    - 底物/辅因子/水/金属类型分布
    - confidence 分布直方图数据
  - 输出: `data/derived/rule_mapping_stats.json`
  - **验收**: Mapping table categorized correctly with residue_info stats

---

## 输出文件清单

- `data/derived/rule_mapping_table.json` (v1.1, 含 residue_info)
- `data/derived/rule_mapping_stats.json` (含 residue_info 统计)

---

## 常见陷阱

1. **1:N 预留**: Layer 0 不会有 1:N 映射，但数据结构需预留该字段，避免 Phase 5 补充时需改格式
2. **映射表查询性能**: 映射表是 rule_id → mapping 的 dict，内存中查询 O(1)，无需数据库
3. **版本标注**: 映射表需标注 layer=0 和生成时间，Phase 5 补充 Layer 1 后需重新生成
4. **residue_info 向下兼容**: Phase 2.5 运行时的 rule_mapper.py 需处理 v1.0 (无residue_info) 和 v1.1 (有residue_info) 两种映射表；推荐: 缺失 residue_info 时运行时动态计算
5. **双候选 entries 的下游消费**: 运行时查询到双候选时，需结合3D距离检查消歧，映射表不做消歧

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-3-5.md` 继续
