# Phase 3-7: 全数据集审计 + Phase 3收尾

**Phase**: 3  
**任务编号**: 3.7  
**前置依赖**: phase-3-1, phase-3-2, phase-3-3, phase-3-4, phase-3-5, phase-3-6 (全部Phase 3任务)  
**阻塞后续**: Phase 4 (CGPS评分需要全部数据集就绪)  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 3.7.1 编写全数据集审计脚本
  - 路径: `cgd/quality/full_audit.py`
  - 对全部 5 个数据集做质量检查:
    - DS1: role_pair 数量 >50, 频率分布合理
    - DS2: n_obs≥20 分组 >30 个, 百分位计算正确
    - DS3: Scene A/B 数据完整, P5-P95 区间合理
    - DS4: 辅因子共现频率合理
    - DS5: Layer 0 覆盖率 >40%
  - **验收**: 审计脚本可运行

- [ ] 3.7.2 执行全数据集审计
  - 运行审计脚本，输出: `data/reports/full_audit.json`
  - 结构:
    ```json
    {
      "audit_date": "2026-...",
      "datasets": {
        "DS1": {"status": "pass", "n_role_pairs": N, "issues": []},
        "DS2": {"status": "pass", "n_groups_n20": N, "issues": []},
        "DS3": {"status": "pass", "n_scene_a": N, "n_scene_b": N, "issues": []},
        "DS4": {"status": "pass", "n_entries": N, "issues": []},
        "DS5": {"status": "pass", "coverage_rate": 0.45, "issues": []}
      },
      "derived": {
        "distance_thresholds": {"status": "pass"},
        "rule_mapping_table": {"status": "pass", "coverage_rate": 0.45}
      }
    }
    ```
  - **验收**: 审计报告完整，无 critical issues

- [ ] 3.7.3 Phase 3 验收检查清单
  - [ ] DS5 Layer 0: 1:1 映射率 >40%
  - [ ] 统计消歧: 正确率提升 >10%
  - [ ] 规则映射表可供 rule_mapper.py 查询
  - [ ] DS3 优化后分布有改善
  - [ ] 全数据集审计通过
  - **验收**: Phase 3 acceptance checklist 全部通过

- [ ] 3.7.4 生成 Phase 3 完成报告
  - 路径: `data/reports/phase3_completion.json`
  - 包含: 各任务完成状态、数据集统计、已知限制
  - 特别标注: DS5 Layer 0 覆盖率、未映射规则的处理计划 (Phase 5)
  - **验收**: 报告完整，Phase 3 可正式关闭

---

## 输出文件清单

- `cgd/quality/full_audit.py`
- `data/reports/full_audit.json`
- `data/reports/phase3_completion.json`

---

## 常见陷阱

1. **审计严格度**: 审计应发现真正的问题，而非仅仅 "pass"。若某数据集有明显缺陷，需标注而非忽略
2. **DS5 覆盖率边界**: 40% 是最低要求，若实际 <40% 需分析原因并决定是否调整策略
3. **跨数据集一致性**: DS2/DS3 的 role_pair 命名需与 DS1 一致，否则评分函数会查不到数据
4. **审计脚本可复用**: 审计脚本应在后续 Phase 结束时也可运行，设计为通用工具

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. Phase 3 全部完成！进入 Phase 4
