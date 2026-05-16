# Phase 2.5-12: Scene B 验证器骨架

**Phase**: 2.5
**任务编号**: 2.5.12
**前置依赖**: phase-2.5-5 (Scene A验证器，Scene B继承其PDB定位+残基坐标提取逻辑), phase-2.5-4 (规则映射), phase-2.5-6 (VerificationResult格式)
**阻塞后续**: Phase 5 (Scene B端到端验证需要本模块)
**预计耗时**: 0.5天

---

## 任务清单

- [ ] 2.5.12.1 编写 `ez_validator/scene_b_validator.py` 骨架
  - 定义核心函数: `validate_scene_b(mechanism, pdb_structure, cgd_datasets) → VerificationResult`
  - Scene B 与 Scene A 的核心区别: 无配体 → 需 PAP 放置底物
  - 复用 Scene A 的残基坐标提取 + DS2 查询逻辑
  - **验收**: 模块可导入运行，函数签名正确

- [ ] 2.5.12.2 实现 PAP 底物放置调用接口
  - 调用 `cgd/pap/pocket_anchor.py` 的 PAP 放置函数
  - 输入: 催化残基坐标 + SMILES → 输出: 放置后底物 3D 坐标
  - ⚠️ PAP 放置精度有限，放置后底物 RMSD 预期 1.5-3.0Å
  - **验收**: PAP 接口调用正确，返回底物坐标

- [ ] 2.5.12.3 实现 DS3 overlay 验证 (后验版)
  - 用 PAP 放置的底物坐标替代真实配体坐标
  - 查询 DS3 Scene B 阈值 (同源替代统计分布)
  - 距离/角度判定逻辑同 Scene A，但阈值来源不同
  - **验收**: DS3 overlay 查询返回 Scene B 阈值

- [ ] 2.5.12.4 实现 Scene B 置信度降权
  - Scene B 的 VerificationResult 中:
    - `source_type = "overlay"` (标注数据来源为 PAP 放置)
    - `s_geo` 计算权重降低 (PAP 放置精度 < 真实配体)
    - `confidence` 相比 Scene A 降低 0.1-0.2
  - **验收**: Scene B 的 confidence 低于同等 Scene A 结果

- [ ] 2.5.12.5 编写 Scene B 测试用例
  - 测试: 有 PDB 但无配体的酶 → Scene B 验证可运行
  - 验证: VerificationResult.scene="B", source_type="overlay"
  - ⚠️ 此为骨架实现，完整端到端测试在 Phase 5 (5.9.4) 执行
  - **验收**: Scene B stub test passes

---

## 输出文件清单

- `ez_validator/scene_b_validator.py`
- `tests/test_scene_b_validator.py`

---

## 常见陷阱

1. **PAP 放置失败**: 部分口袋形状不适合 PAP 放置，需 fallback 到 Scene C (纯统计评分)
2. **Scene B 阈值缺失**: DS3 Scene B 的统计分布可能样本不足 (n_obs < 10)，需降级到 Level 0
3. **MVP 策略**: 本任务是骨架实现，PAP 放置精度优化在 Phase 5 + Phase 7 (7.2.5.3 PAP RMSD 验证)
4. **Scene A→B 降级链**: Scene B 验证失败时应标记降级原因，但不自动降级到 Scene C (由管线编排决定)

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2.5-13.md` 继续
