# Phase 5-4: RunReactants闭环验证

**Phase**: 5  
**任务编号**: 5.4  
**前置依赖**: phase-5-3 (Agent②规则翻译产出SMARTS映射)  
**阻塞后续**: phase-5-5 (争议检测)  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 5.4.1 编写闭环验证模块
  - 路径: `agents/runreactants_verifier.py`
  - 核心函数: `verify_product_matching(substrate_mol, product_mol, rule_smarts) → VerificationResult`
  - `VerificationResult` 增加 `status: "pass" | "fail" | "inapplicable"` 字段
  - `VerificationResult` 增加 `reason: Optional[str]` 字段 (如 "metal_smarts_detected", "no_products_generated")
  - 流程: SMARTS匹配 → RunReactants → 产物对比 → pass/fail/inapplicable
  - **验收**: 模块可导入运行

- [ ] 5.4.2 实现 SMARTS 匹配 → RunReactants 执行
  - `AllChem.ReactionFromSmarts(rule_smarts)` → 构建反应对象
  - `reaction.RunReactants((substrate_mol,))` → 生成产物元组
  - 处理: 多产物 (多个元组) → 逐一比较
  - 处理: 无产物 (SMARTS 不匹配) → fail
  - 区分: 无产物因SMARTS不匹配 vs 因工具不适用(如含金属原子的SMARTS) → 返回 "inapplicable" 而非 "fail"
  - ⭐ 金属SMARTS预检测: 检查rule_smarts中是否包含[Fe],[Cu],[Zn],[Mo],[Mn],[Co]等金属原子模式，若包含 → 直接返回 inapplicable (D22: RunReactants无法模拟金属价态变化)
  - **验收**: RunReactants 可执行并返回产物

- [ ] 5.4.3 实现产物匹配验证
  - 比较方法: SMILES 等价 (忽略立体化学)
  - `Chem.MolToSmiles(product)` == `Chem.MolToSmiles(expected_product)`
  - 处理: SMILES 规范化 (原子顺序、立体标记)
  - 处理: 互变异构体 (可能 SMILES 不同但结构等价)
  - **验收**: 产物匹配判定正确

- [ ] 5.4.4 实现多步串联验证
  - 多步机制: 每步产物作为下一步反应物
  - 管线: substrate → step1 → intermediate1 → step2 → intermediate2 → ... → product
  - 最终产物 SMILES 需与期望产物匹配
  - 任一步骤失败(fail) → 整条路径验证失败; 任一步骤不适用(inapplicable) → 跳过该步骤，路径继续 (⭐ D22: 金属步骤不可验证 ≠ 机制错误)
  - **验收**: 多步串联验证可运行

- [ ] 5.4.5 验证测试
  - 测试1: 单步验证 — 正确SMARTS → pass
  - 测试2: 单步验证 — 错误SMARTS → fail
  - 测试3: 两步串联 — 步骤正确 → 最终产物匹配
  - 测试4: 两步串联 — 第二步错误 → 失败
  - 测试5: 含金属SMARTS ([Fe]相关) → 返回 inapplicable, 非 fail
  - **验收**: Closed-loop verification works

---

## 输出文件清单

- `agents/runreactants_verifier.py`
- `tests/test_runreactants_verifier.py`

---

## 常见陷阱

1. **SMILES 规范化**: RDKit 生成的 SMILES 可能因原子顺序不同而不同，需用 `Chem.CanonSmiles()` 规范化
2. **立体化学**: MVP 阶段可忽略立体化学，但需标注后续需增加立体匹配
3. **RunReactants 多产物**: 单个 SMARTS 反应可能产生多个产物 (位置异构等)，需检查是否有任一匹配
4. **SMARTS 无效**: 部分从 DS5 查到的 SMARTS 可能语法错误，需先验证 `ReactionFromSmarts` 不抛异常
5. **⭐ fail ≠ inapplicable**: RunReactants对金属价态变化步骤无产物输出，这不是"验证失败"(机制错误)，而是"工具不适用"(验证范围外)。混用会导致金属氧化还原机制被错误判定为"化学不正确"。VerificationResult.status 必须区分 "fail" 和 "inapplicable"

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5-5.md` 继续
