# Phase 5-8: 置信度综合 + 降级 + PAP回流

**Phase**: 5  
**任务编号**: 5.8+5.9+5.12  
**前置依赖**: phase-5-7 (Agent⑥综合评审)  
**阻塞后续**: phase-5-9 (端到端测试需要完整置信度管线)  
**预计耗时**: 2.5天  

---

## 任务清单

- [ ] 5.8.1 编写 `agents/confidence.py` — 置信度综合计算
  - 整合 Phase 2.5 的 `confidence_calculator.py` 与 Agent 评审结果
  - 公式: `0.25×MF + 0.50×EZ + 0.15×Agent + 0.10×Arbiter`
  - Agent 分量: `n_accept / n_total` (Agent③④⑤中accept的比例)
  - Arbiter 分量: Agent⑥ 的裁决分数 (accept=1.0, needs_revision=0.5, reject=0.0)
  - 权重重归一化: 无LLM时缺失分量按比例重分配
  - **验收**: 置信度综合计算正确

- [ ] 5.9.1 编写 `agents/fallback.py` — LLM降级策略
  - LLM 不可用时的降级行为:
    - Agent①化学审查 → `residue_info.py` 硬编码规则
    - Agent②规则翻译 → DS5映射表首条匹配 (不消歧)
    - Agent③④⑤⑥ → 不执行，直接用EZ+CGPS输出
  - 降级检测: LLM API 超时/错误 → 自动切换
  - 降级恢复: LLM 恢复后自动切回 (无需重启)
  - **验收**: System works with LLM off

- [ ] 5.12.1 编写 `agents/pap_ez_bridge.py` — PAP→EZ回流接口
  - 核心函数: `bridge_pap_to_ez(pap_placement, pdb_structure, mechanism) → EZVerificationInput`
  - 流程:
    1. PAP 输出: 最优放置坐标 (best_placement_coords)
    2. 构建虚拟配体 Mol (从放置坐标 + SMILES)
    3. 注入 EZ 验证管线 (视同真实配体)
    4. 进入 Scene A 验证逻辑
    5. 置信度降权: overlay 数据 vs 直接观测数据
  - 降权因子:
    - PAP High confidence → 0.8
    - PAP Medium confidence → 0.5
    - PAP Low confidence → 0.2
  - **验收**: PAP→EZ bridge functional

- [ ] 5.12.2 实现 PAP 坐标→虚拟配体 Mol
  - 从 PAP 放置坐标重建配体 3D Mol:
    - 底物 SMILES → RDKit Mol → AddHs → 生成初始构象
    - 用 PAP 旋转参数对齐构象
    - 或: 直接从 PAP 坐标 + 原子类型构建 Mol
  - 复用: `overlay_smiles_to_pdb()` 的反向逻辑
  - **验收**: 虚拟配体 Mol 坐标与 PAP 放置一致

- [ ] 5.12.3 实现边界情况
  - PAP 放置失败 → 降级到 Scene C (CGPS评分)
  - 虚拟配体构建失败 → 降级到 Scene C
  - EZ 验证管线接收虚拟配体 → 需标注 source_type="overlay"
  - **验收**: 边界情况不 crash

---

## 输出文件清单

- `agents/confidence.py`
- `agents/fallback.py`
- `agents/pap_ez_bridge.py`
- `tests/test_confidence.py`
- `tests/test_fallback.py`
- `tests/test_pap_ez_bridge.py`

---

## 常见陷阱

1. **三任务合并**: 本文件合并了任务 5.8(置信度)+5.9(降级)+5.12(PAP回流)，三者紧密耦合
2. **PAP 降权**: overlay 数据比直接观测数据可信度低，EZ 评分需乘以降权因子，不能与 Scene A 直接等同
3. **降级透明性**: 系统需在输出中明确标注使用了降级模式，用户需知道哪些结果是LLM辅助的
4. **循环降级**: 避免降级→失败→再降级的无限循环，最多降级一次 (A→B→C，不会 C→?)

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5-9.md` 继续
