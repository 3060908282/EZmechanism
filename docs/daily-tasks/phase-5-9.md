# Phase 5-9: DS5 Layer 1 + 端到端测试

**Phase**: 5  
**任务编号**: 5.10+5.11  
**前置依赖**: phase-5-3 (Agent②规则翻译), phase-5-8 (置信度+降级+PAP回流), phase-2.5-12 (Scene B验证器), phase-2.5-13 (Scene C验证器)  
**阻塞后续**: Phase 5.5 (氧化还原验证), Phase 6 (系统集成)  
**预计耗时**: 3天  

---

## 任务清单

- [ ] 5.10.1 完成 DS5 1:N 映射 (Layer 1)
  - 在 phase-5-3 的基础上，完成全部 unmapped 规则的 LLM 消歧
  - 批量处理: 对 DS5 Layer 0 中所有 unmapped 规则运行 Agent②
  - 记录: 每条规则的消歧结果 (成功/失败/LLM拒绝)
  - 更新: `data/datasets/DS5_rule_crossmapping.json` (Layer 1 完整版)
  - 更新: `data/derived/rule_mapping_table.json` (Layer 1 完整版)
  - ⭐ **更新 mapping_table.py 加载逻辑**: Layer 1 映射覆盖 Layer 0
    - `step25/mapping_table.py` 的 `load_mapping_table()` 需支持 Layer 0→Layer 1 增量合并
    - 合并策略: Layer 1 中的规则覆盖 Layer 0 中的同名规则 (1:N 映射替代 1:1 映射)
    - Layer 1 中未涉及的规则保留 Layer 0 的映射
    - **验收**: 加载 Layer 1 后，同名规则的映射被更新，非同名规则保持不变
  - **验收**: DS5 Layer 1 complete, 覆盖率比 Layer 0 提升

- [ ] 5.10.2 统计 Layer 1 覆盖率
  - Layer 0 覆盖率 vs Layer 1 覆盖率
  - LLM 消歧成功率: (LLM-confirmed 数) / (LLM 尝试数)
  - LLM 消歧质量: 抽样验证准确率
  - 仍无法映射的规则: 分析原因 (moiety→SMARTS 语义鸿沟)
  - **验收**: Layer 1 覆盖率 ≥55%

- [ ] 5.11.1 Scene A 端到端测试
  - 测试案例: 选择1个 Scene A 案例 (如 1BTL)
  - 完整流程: 输入 → 场景判定(Scene A) → MechFind → Agent①② → EZ验证 → 争议检测 → (如触发) Agent③④⑤⑥ → 置信度 → 输出
  - 验证: VerificationResult.scene="A", confidence>0, 评分合理
  - **验收**: Scene A e2e test passes

- [ ] 5.11.2 Scene B 端到端测试
  - 测试案例: 选择1个 Scene B 案例 (PDB+无配体)
  - 完整流程: 输入 → 场景判定(Scene B) → PAP放置 → EZ验证(overlay) → 评分 → 输出
  - 验证: VerificationResult.scene="B", source_type="overlay", 置信度含降权
  - **验收**: Scene B e2e test passes

- [ ] 5.11.3 Scene C 端到端测试
  - 测试案例: 选择1个 Scene C 案例 (无PDB的EC编号)
  - 完整流程: 输入 → 场景判定(Scene C) → CGPS评分 → 输出
  - 验证: VerificationResult.scene="C", s_geo=None, CGPS = w1·S_co + w3·S_path
  - **验收**: Scene C e2e test passes

- [ ] 5.11.4 降级模式端到端测试
  - 模拟 LLM 不可用 → 系统应自动降级
  - 验证: 无 LLM 时仍可产出结果 (CGPS + EZ only)
  - 验证: 结果中标注 "degraded_mode=True"
  - **验收**: 降级模式 e2e test passes

---

## 输出文件清单

- `data/datasets/DS5_rule_crossmapping.json` (Layer 1 完整版)
- `data/derived/rule_mapping_table.json` (Layer 1 完整版)
- `data/reports/phase5_completion.json`
- `tests/test_e2e_scene_a.py`
- `tests/test_e2e_scene_b.py`
- `tests/test_e2e_scene_c.py`

---

## 常见陷阱

1. **LLM 批量调用成本**: 消歧所有 unmapped 规则可能需要数百次 LLM 调用，需控制成本
2. **端到端测试稳定性**: LLM 输出不确定性导致端到端测试可能不稳定，需关注核心判定而非精确数值
3. **Scene B 测试数据**: 需要一个已知 PDB+无配体的酶，需提前筛选
4. **Scene C 测试数据**: 需要一个无 PDB 的 EC 编号，可在 RCSB 搜索验证

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. Phase 5 全部完成！进入 Phase 5.5
