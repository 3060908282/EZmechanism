# Phase 7-2.5: 渐进降级交叉验证

**Phase**: 7  
**周次**: Week 22-23
**任务编号**: 7.2.5  
**前置依赖**: phase-7-1 (M-CSA留出验证), phase-7-2 (跨EC泛化)  
**阻塞后续**: phase-7-3 (LLM消融+论文需降级曲线图); ⚠️ task 7.3 (CGD约束对比)已在phase-7-2.md中完成，非本任务阻塞项  
**预计耗时**: 3天  
**预警检查点**: E1 (双阈值分类), E3 (full-pool子集上 PAP RMSD中位数 ≤ 3.0Å)  

---

## ⚠️ 实验定位声明

> **这是内部一致性评估，不是外部准确性基准。**
>
> Scene A 是"银标准"（系统输入信息最丰富时的输出），不是"金标准"（非QM/MM或实验验证的绝对真理）。
>
> 本实验量化"信息缺失时系统输出的衰减程度和一致性"，**不能证明Scene B或C的绝对准确性**，只能证明它们与最丰富信息下系统输出的一致性。

### 论文表述范式 (必须严格遵循)

❌ **禁止**: "We used Scene A as ground truth to validate Scene B and C accuracy."

✅ **必须**: "To quantify the impact of information loss on our system's assessments, we performed a progressive degradation analysis. For {N} entries where full PDB + ligand data were available (Scene A), we artificially withheld the ligand or the entire PDB to simulate Scene B and C conditions. Scene A's output served as a reference baseline, allowing us to measure the consistency of our validation framework under diminishing structural information."
> ⚠️ `{N}` 为占位符，实际数值将在 E1 双阈值分类后确定 (预估 full_pool ~80-120 条)，不可硬编码

---

## 任务清单

- [ ] 7.2.5.1 筛选 Scene A 候选集 + E1 双阈值分类
  - 从 M-CSA 测试集 (~200 entries) 中筛选有 PDB + 配体的 entries
  - **第一层: 三重过滤** (结构质量):
    1. PDB 分辨率 ≤ 2.5Å
    2. 配体 B-factor ≤ 50 (配体原子平均B-factor)
    3. ⭐ **配体必须是真正底物/底物类似物** (非抑制剂/缓冲液/表面活性剂)
       - 过滤方法: 查 `HET_to_ChEBI_mapping.json` (Phase 1 产出)
       - 保留: ChEBI 分类为 substrate / substrate analogue / intermediate
       - 排除: inhibitor, buffer, detergent, crystallization aid
       - 无法确定时: 标记为 "ambiguous"，保守排除
  - **第二层: E1 双阈值分类** (候选池质量):
    - 阈值1: MechFind 报告 "search success"
      - ✅ 通过 → 进入候选池
      - ❌ 未通过 → 标记为 `mechfind_failure`，排除
    - 阈值2: 候选路径数 ≥ 5
      - ✅ → 标记为 `full_pool` (纳入量化评估)
      - ❌ (<5) → 标记为 `limited_pool` (仅定性分析)
  - **输出三类集合**:
    - `full_pool`: 预估 ~80-120 条 → 纳入 E2-E5 量化评估 + 渐进降级实验
    - `limited_pool`: 预估 ~15-30 条 → 仅执行管线 + 产出定性报告
    - `mechfind_failure`: 排除，仅记录失败原因
  - 输出: `data/reports/degradation_candidates.json` (含 pool_tag 字段)
  - **验收**: full_pool 集合 ≥ 80 条，全部满足三重过滤 + E1 双阈值
  - **HANDBOOK 验收标准**:
    - A-B 排名一致率 > 65%
    - A-C 排名一致率 > 45%
    - Top-1 准确率 > 60% (full_pool子集)
    - PAP RMSD 预期 1.5-3.0Å

- [ ] 7.2.5.2 实现管线三模式运行 (full-pool + limited-pool 分别处理)
  - 编写 `validation/progressive_degradation.py`
  - **对 full-pool 条目** (~80-120条): 依次执行三种模式

  | 运行模式 | 输入参数 | 管线行为 | 产出 |
  |---------|---------|---------|------|
  | Scene A | `substrate, product, ec, pdb_id, ligand_het` | 完整3D验证 | `Result_A` |
  | Scene B | `substrate, product, ec, pdb_id` (**不传ligand_het**) | PAP放置 + 3D验证 | `Result_B` |
  | Scene C | `substrate, product, ec` (**不传pdb_id**) + **强制注入A的残基组合** | CGPS纯统计 | `Result_C` |

  - **Scene C 关键控制**: 为隔离变量（仅测试结构信息缺失的影响），Scene C 的 CGPS 输入残基组合**直接采用 Scene A 已确认的残基组合**，而非路径3推断结果
  - 实现方式: 管线新增参数 `override_residue_combination: Optional[List[str]]`
  - **对 limited-pool 条目** (~15-30条): 仅执行 Scene A 单模式
    > 注: 渐进降级实验中 limited-pool 仅执行 Scene A (因不纳入降级分析); 通用管线中 limited-pool 条目仍执行所有适用场景。
    - 目的: 证明验证管线在少量候选时也能正常工作
    - 产出: `LimitedPoolReport` (定性报告，不纳入量化指标)
  - **验收**: full-pool 三模式均可正确运行，limited-pool 单模式可正确运行，Scene C 使用 A 的残基组合

- [ ] 7.2.5.3 ⭐ 实现 PAP 底物位置 RMSD 计算 (full-pool 子集上)
  - **目的**: 对 PAP 放置算法做最直接、最核心的验证
  - **作用域**: 仅在 **full-pool 子集**上计算 (E3 预警点)
  - 计算逻辑:
    1. 从 Scene A 结果获取: PDB 中真实配体反应中心原子坐标 (从 `Result_A.ligand_coords` 提取)
    2. 从 Scene B 结果获取: PAP 生成的底物反应中心原子坐标 (从 `Result_B.pap_substrate_coords` 提取)
    3. 对齐: Kabsch 对齐 (按催化残基 Cα 原子)
    4. 计算: 反应中心原子 RMSD
  - 预期值:
    - **1.5-3.0Å**: PAP 放置合理
    - **>3.0Å**: PAP 实用性受严重挑战，需分析失败原因
  - 统计: 中位数 RMSD, P90 RMSD, RMSD 分布直方图
  - **⚠️ E3 预警检查**: full-pool 子集上 RMSD 中位数 ≤ 3.0Å
    - > 3.0Å → PAP 算法需改进
  - **验收**: RMSD 计算逻辑正确；full-pool 子集中位数 RMSD ≤ 3.0Å 为目标

- [ ] 7.2.5.4 计算渐进降级核心指标 (full-pool 子集上)
  - 对 **full-pool 子集**中每条候选 entry，计算:

  | 指标 | 计算方式 | 作用域 |
  |------|---------|--------|
  | 排名一致率 (A-B) | `rank_A == rank_B` 的比例 | full-pool |
  | 排名一致率 (A-C) | `rank_A == rank_C` 的比例 | full-pool |
  | Top-k 重叠率 | `set(top_k_A) ∩ set(top_k_B) / k` (k=3,5) | full-pool |
  | 置信度衰减 | `conf_A`, `conf_B`, `conf_C` 的均值和分布 | full-pool |
  | S_geo 衰减 | `s_geo_A` vs `s_geo_B` (Scene C 无 S_geo) | full-pool |
  | Kendall τ | 排名_A vs 排名_B/C 的排序相关性 | full-pool |
  | PAP 底物 RMSD | 任务 7.2.5.3 产出 | full-pool |

  - 按 EC 主类分组: EC 1-7 分别计算上述指标
  - **limited-pool 子集**: 不计算量化指标，仅记录定性信息
  - **验收**: full-pool 全部指标计算正确，按 EC 分组统计完成；limited-pool 定性信息记录完整

- [ ] 7.2.5.5 生成降级曲线图 (论文核心图表，full-pool 子集)
  - 图1: **降级曲线** — X轴 Scene (A→B→C), Y轴 排名一致率
    - 两条线: A-B 一致率, A-C 一致率
    - 误差棒: 95% CI
    - 图注标注: "Computed on full-pool subset (N=XX entries)"
  - 图2: **PAP RMSD 分布** — 直方图 + 中位数标注
    - 图注标注: "Full-pool subset only"
  - 图3: **置信度衰减箱线图** — 三组 (A/B/C) 并列
  - 图4: **Kendall τ 热图** — 按 EC 类分块
  - 输出格式: PDF 矢量图 (论文用) + PNG (演示用)
  - **验收**: 四张图清晰可发表，所有量化图表明确标注 full-pool 子集

- [ ] 7.2.5.6 分析异常案例 (含 limited-pool 定性报告)
  - **full-pool 异常**:
    - Scene B 异常: A-B 排名不一致 → 分析 PAP 放置偏差 (RMSD 是否 >3.0Å?)
    - Scene C 异常: A-C 排名不一致 → 分析 S_geo 缺失对排序的影响
    - PAP RMSD >3.0Å 的案例: 分析失败原因 (口袋形状? 催化残基位置? 底物柔性?)
  - **limited-pool 定性报告**:
    - 对每条 limited-pool entry，记录:
      - `known_mechanism_found`: true/false (已知机制是否出现在候选中)
      - `pipeline_status`: 各模块执行状态 (rule_mapping / ez_validation / cgps_scoring / agent_review)
      - `ranking_assessment`: 已知机制在少量候选中的排名 + 化学合理性检查
    - 论文价值: 证明验证管线在少量候选时仍能正常工作 + 定位 MechFind 规则库覆盖不足的反应类型
  - 输出: `data/reports/degradation_anomalies.json` (含 limited_pool_reports 字段)
  - **验收**: full-pool 异常案例分析完成，limited-pool 定性报告产出

- [ ] 7.2.5.7 生成降级验证报告
  - 输出: `data/reports/progressive_degradation.json`
  - 包含:
    - E1 分类统计: full_pool / limited_pool / mechfind_failure 各自数量及占比
    - full-pool 候选集统计 (总数, 按 EC 分布, 筛选排除数及原因)
    - full-pool 三模式结果汇总
    - full-pool 全部核心指标 (总 + 按 EC 分组)
    - full-pool PAP RMSD 统计 (中位数, P90, 分布) + E3 检查结果
    - limited-pool 定性报告汇总
    - 异常案例列表及分析
    - 论文推荐表述段落
  - **验收**: Degradation analysis documented with proper framing, 三类子集分别报告

---

## 输出文件清单

- `validation/progressive_degradation.py`
- `data/reports/degradation_candidates.json`
- `data/reports/progressive_degradation.json`
- `data/reports/degradation_anomalies.json`
- `data/reports/figures/degradation_curve.pdf`
- `data/reports/figures/pap_rmsd_distribution.pdf`
- `data/reports/figures/confidence_boxplot.pdf`
- `data/reports/figures/kendall_tau_heatmap.pdf`

---

## 常见陷阱

1. **⚠️ 循环论证风险**: 严禁将 Scene A 称为"ground truth"或"真值"。Scene A 是系统自身在信息最丰富时的输出，用它验证 B/C 是**内部一致性检验**，不是**外部准确性验证**。论文中任何暗示 Scene A 为"标准答案"的表述都会被审稿人攻击
2. **Scene C 残基组合控制**: 若 Scene C 使用路径3推断的残基组合而非 A 的确认组合，则 A-C 排名差异将无法区分是"结构信息缺失"还是"残基识别错误"造成的——变量混淆将使结论无效
3. **配体分类错误**: 部分抑制剂在 PDB 中标注为与底物相同的 HET code，需额外检查 M-CSA 的 `compounds` 字段确认是否为底物
4. **PAP RMSD 对齐**: 计算 RMSD 前必须按催化残基 Cα 对齐，否则蛋白整体位移会引入偏差
5. **统计功效**: full-pool 子集约 80-120 条可能不足以在细分 EC 类中得出显著结论；总体结论足够，EC 分组结论需标注 "exploratory"
6. **PAP RMSD 反应中心定义**: 需明确"反应中心原子"的定义 (SMARTS 映射标签 [:1][:2] 对应的原子)，不同定义会导致 RMSD 差异
7. **limited-pool 不纳入量化的理由**: 候选 <5 条时 Top-1 随机基线约 33% (5条) 或更高 (更少)，量化指标无统计意义；但定性分析仍有价值，可证明管线鲁棒性

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-7-3.md` 继续
