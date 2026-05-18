# Phase 7-4: IDR验证实验 (信息衰减稳健性评分)

**Phase**: 7  
**任务编号**: 7.4  
**前置依赖**: phase-7-1 (需要留出验证的quality_score数据), phase-7-2.5 (需要A-B/A-C排名一致率和Kendall τ数据 — 本任务是7.2.5的后续处理+阈值优化，非独立实验)
**阻塞后续**: phase-7-3 (论文需要IDR验证结果)
**预计耗时**: 1.0天

> ⚠️ **定位说明**: 本任务(7.4)是7.2.5(渐进降级交叉验证)的后续处理步骤，输入来自7.2.5的A-B/A-C排名一致率和Kendall τ，本任务在此基础上计算IDR评分、绘制降级曲线、优化阈值。7.2.5的核心指标(A-B排名一致率、PAP RMSD、Kendall τ)就是IDR的计算输入。

---

## 任务清单

- [ ] 7.4.1 加载7.2.5产出的降级数据 (⭐ 不重复实验)
  - 读取 `data/reports/progressive_degradation.json` (phase-7-2.5产出)
  - 此文件已包含full_pool子集的Scene A/B/C排名数据和Kendall τ
  - 从中提取IDR计算所需的三场景排名数据
  - ⚠️ **不重新执行三场景对比实验**: 7.2.5已执行，重复运行浪费计算资源且可能引入数据不一致
  - **验收**: 成功加载7.2.5产出的降级数据，数据格式正确

- [ ] 7.4.2 计算IDR指标 (基于7.2.5数据)
  - IDR定义: `IDR(A,B) = Kendall_τ(rank_A, rank_B)`
  - 从7.2.5的Kendall τ数据直接提取/重组为IDR指标
  - 计算三组IDR:
    - IDR(A,B): Scene A vs Scene B
    - IDR(A,C): Scene A vs Scene C
    - IDR(B,C): Scene B vs Scene C
  - 按EC主类分组计算 (⚠️ 若某EC类<10条则标注"样本不足，仅参考")
  - 计算IDR均值和标准差
  - **验收**: IDR指标表产出，数据来源为7.2.5产出

- [ ] 7.4.3 绘制IDR降级曲线
  - 图1: IDR(A,B) vs quality_score 分布散点图
  - 图2: IDR(A,C) vs quality_score 分布散点图  
  - 图3: 三场景IDR降级趋势图 (A→B→C)
  - 标注关键entry的case study
  - **验收**: 3张IDR降级曲线图

- [ ] 7.4.4 分析IDR结果
  - IDR(A,B) > IDR(A,C) **检验**: 信息缺失越多，一致性越低 (⚠️ 这是观测性结论，非因果验证; IDR度量一致性降低，不能排除PAP算法偏差或CGPS权重偏差等混淆因素)
  - ⭐ IDR vs quality_score分析需按Scene分层(控制信息量混淆变量)，避免伪相关
  - 低IDR entry分析: 哪些entry在不同场景下排名差异大? 原因是什么?
  - 高IDR entry分析: 哪些entry对信息缺失鲁棒? 特征是什么?
  - 与quality_score的相关性: IDR与quality_score是否正相关?
  - **验收**: IDR分析报告

- [ ] 7.4.5 生成IDR报告
  - 输出: `data/reports/idr_validation.json`
  - 包含:
    - IDR指标汇总: IDR(A,B), IDR(A,C), IDR(B,C) 均值±标准差
    - 分EC类IDR指标
    - IDR降级曲线数据
    - 低/高IDR entry分析
    - 学术定义文本(论文Methods可用):
      "为了量化我们的方法在结构信息缺失时的可靠性边界，我们设计了信息衰减稳健性评分（Information Degradation Robustness, IDR）。对于同一酶反应，我们分别在三种信息层次下运行验证管线——完整结构数据（场景A）、仅有蛋白质骨架（场景B）、无结构数据（场景C）——并计算各场景排名结果与最丰富信息场景（场景A）的排序相关性（Kendall τ）。IDR取值范围为-1到1，越高表示方法对信息缺失越不敏感。"
  - **验收**: IDR报告完整，学术定义文本可用于论文

---

## 输出文件清单

- `validation/idr_validation.py`
- `data/reports/idr_validation.json`
- `data/reports/figures/idr_degradation_curve.png`
- `data/reports/figures/idr_ab_scatter.png`
- `data/reports/figures/idr_ac_scatter.png`

---

## 常见陷阱

1. **Scene C公平性**: 必须使用Scene A的残基组合，否则IDR(A,C)低可能是因为残基识别错误而非结构信息缺失
2. **样本量**: 50个entry是IDR统计显著性的下限，如果full_pool不足50个，用全部可用数据
3. **排名完全一致**: 如果Scene B/C的排名与Scene A完全相同(IDR=1.0)，可能是管线未正确降级，需检查
4. **Kendall τ计算**: 确保使用τ-b(处理并列排名)，而非τ-a
5. **⭐ 不重复7.2.5的实验**: 7.2.5已对full_pool(~80-120条)执行三模式运行并计算Kendall τ。本任务读取7.2.5产出做数据重组和分析，不重新运行管线。如果7.2.5产出不包含所需字段，需回7.2.5补充而非在本任务重跑

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-7-3.md` 继续
