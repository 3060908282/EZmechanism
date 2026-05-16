# Phase 2.5-13: Scene C 验证器骨架

**Phase**: 2.5
**任务编号**: 2.5.13
**前置依赖**: phase-2.5-4 (规则映射，S_path计算需要), phase-2.5-6 (VerificationResult格式), Phase 4 (CGPS评分函数可用)
**阻塞后续**: Phase 5 (Scene C端到端验证需要本模块)
**预计耗时**: 0.5天

---

## 任务清单

- [ ] 2.5.13.1 编写 `ez_validator/scene_c_validator.py` 骨架
  - 定义核心函数: `validate_scene_c(mechanism, cgd_datasets) → VerificationResult`
  - Scene C 无 PDB → 无几何验证 (S_geo = 0)
  - 评分公式: CGPS = w1·S_co + w3·S_path (w2 = 0)
  - **验收**: 模块可导入运行，函数签名正确

- [ ] 2.5.13.2 实现 S_co 纯统计评分
  - 查询 DS1: 获取 role_pair 共现频率 → 归一化 [0,1]
  - 查询 DS4: 辅因子共现频率 (如有辅因子)
  - 无 PDB → 无距离/角度约束，仅依赖统计先验
  - **验收**: S_co 计算正确，仅依赖 DS1+DS4

- [ ] 2.5.13.3 实现 S_path 规则匹配评分
  - 查询 DS5: 获取规则映射 → 计算匹配比例
  - 残基组合来源:
    - 默认: 路径3化学推断 (confidence ≤ 0.5)
    - ⚠️ 渐进降级实验中: 直接注入 Scene A 确认的残基组合 (隔离变量)
  - 实现参数: `override_residue_combination: Optional[List[str]]`
  - **验收**: S_path 计算正确，支持残基组合覆盖

- [ ] 2.5.13.4 实现 Scene C 置信度标注
  - Scene C 的 VerificationResult 中:
    - `scene = "C"`
    - `s_geo = None` (无几何评分)
    - `confidence` 相比 Scene A 降低 0.2-0.4 (无结构信息)
  - **验收**: Scene C 的 confidence 显著低于 Scene A/B

- [ ] 2.5.13.5 编写 Scene C 测试用例
  - 测试: 无 PDB 的 EC 编号 → Scene C 验证可运行
  - 验证: VerificationResult.scene="C", s_geo=None
  - ⚠️ 此为骨架实现，完整端到端测试在 Phase 5 (5.9.5) 执行
  - **验收**: Scene C stub test passes

---

## 输出文件清单

- `ez_validator/scene_c_validator.py`
- `tests/test_scene_c_validator.py`

---

## 常见陷阱

1. **Scene C 无几何约束**: 缺少 S_geo 使得 CGPS 评分区分度降低，多候选可能评分接近 → 需争议检测处理
2. **残基组合推断**: 默认使用路径3 (confidence ≤ 0.5)，推断的残基可能不准确 → 置信度已反映此不确定性
3. **S_path 权重**: Scene C 中 S_path 权重相对增大 (w2=0)，规则映射质量对排序影响更大
4. **与 Phase 4 的依赖**: Scene C 需要 CGPS 评分函数 (Phase 4 产出)，但本任务为骨架 → 可先用 mock scorer

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. Scene A/B/C 三个验证器骨架完成！⭐ 回到 `phase-2.5-11.md` 补充 pipeline_orchestrator.py 的 Scene B/C 调度逻辑
4. Phase 2.5 全部完成！进入 Phase 3
