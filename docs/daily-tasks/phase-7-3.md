# Phase 7-3: LLM消融 + 论文

**Phase**: 7  
**周次**: Week 23-24
**任务编号**: 7.5+7.6+7.7  
**前置依赖**: phase-7-2 (跨EC泛化+CGD约束对比), phase-7-2.5 (渐进降级交叉验证), phase-7-4 (IDR验证)  
**阻塞后续**: 项目完成  
**预计耗时**: 3.5天 (7.5 LLM消融≈1.5天 + 7.6 论文图表≈1天 + 7.7 论文章节≈1天)  

---

## 任务清单

### 7.5: LLM消融实验 (D23: 4组精简消融)

- [ ] 7.5.1 设计消融实验 (4组配置)
  - **核心优化**: 计算管线(MechFind + EZ + CGPS)运行1次，结果缓存复用，仅变化LLM Agent调用
  - 对比组 (4组):
    1. **full**: MF + EZ + CGPS + Agent①②③④⑤⑥ — 完整系统基线
    2. **compute_only**: MF + EZ + CGPS — 纯计算管线，无任何Agent (量化Agent整体价值)
    3. **no_review**: MF + EZ + CGPS + Agent①② — 移除评审团③④⑤⑥ (量化评审团价值)
    4. **no_A6**: MF + EZ + CGPS + Agent①②③④⑤ — 移除仲裁者⑥ (量化仲裁者价值)
  - 在同一测试集上对比 (Phase 7.1留出验证集 ~200 entries)
  - > ⚠️ 消融实验注意: 移除 Agent 后 final_confidence 权重重归一化(按剩余分量原始比例分配)
  - **验收**: 消融实验设计合理，4组配置覆盖审稿人核心关切

- [ ] 7.5.2 执行消融实验 (缓存优化)
  - **成本估算** (GPT-4o + 自然管线模式):
    - 计算管线: 1次运行(结果缓存) ≈ 2-3h
    - LLM调用: ~2,940次 ≈ $30
    - 总开发+运行: 2-3天
  - 执行流程:
    1. 运行完整管线(full配置)，缓存MechFind/EZ/CGPS中间结果
    2. 对其他3组配置，复用缓存结果，仅重跑Agent相关步骤
    3. 每个配置运行自然管线模式(Agent触发条件正常生效)
  - 输出: `data/reports/ablation_study.json`
    ```json
    {
      "configs": {
        "full": {"top1": ..., "top3": ..., "top5": ..., "mrr": ...},
        "compute_only": {"top1": ..., "top3": ..., "top5": ..., "mrr": ...},
        "no_review": {"top1": ..., "top3": ..., "top5": ..., "mrr": ...},
        "no_A6": {"top1": ..., "top3": ..., "top5": ..., "mrr": ...}
      },
      "marginal_contribution": {
        "agent_overall": "full.top1 - compute_only.top1",
        "review_group": "full.top1 - no_review.top1",
        "arbiter": "full.top1 - no_A6.top1"
      },
      "cost_efficiency": {
        "agent_overall": {"contribution_pct": ..., "llm_calls": ..., "cost_usd": ...},
        "review_group": {"contribution_pct": ..., "llm_calls": ..., "cost_usd": ...},
        "arbiter": {"contribution_pct": ..., "llm_calls": ..., "cost_usd": ...}
      }
    }
    ```
  - **验收**: Ablation report generated, 4组配置结果完整

- [ ] 7.5.3 分析消融结果 (含多维度分析)
  - **主分析**:
    - 各组件的边际贡献 (准确率提升)
    - 边际贡献率 = (Acc_full - Acc_ablated) / Acc_full × 100%
    - 成本效益比 = 边际贡献率 / LLM调用成本
  - **⭐ 分场景Agent贡献分析** (零额外成本，后处理分组统计):
    - 对测试集按Scene A/B/C分组
    - 计算每组: Agent贡献 = Acc_full - Acc_compute_only
    - 预期发现:
      - Scene A: Agent贡献较小 (3D数据充分，CGPS已足够)
      - Scene B: Agent贡献中等 (PAP放置不确定性，需化学审查)
      - Scene C: Agent贡献最大 (无3D数据，依赖LLM推理)
  - **⭐ 分争议级别仲裁效果** (零额外成本，后处理分析):
    - 按dispute_level分组: none / low / medium / high
    - 计算仲裁前后准确率变化: post_arbiter_acc - pre_arbiter_acc
    - 注意: high争议样本可能<20个，结论仅作"趋势观察"
  - **⭐ Agent一致性分析** (Supplementary Material):
    - 计算Agent③④⑤两两评审一致性:
      - Cohen's κ (verdict分类: accept/reject/needs_revision)
      - Pearson r (confidence评分相关性)
    - 识别"异议者"Agent (一致性显著低于平均)
    - 分析高不一致案例的共性特征
    - 输出: `data/reports/agent_agreement_matrix.json`
  - **降级模式分析**: 无LLM时系统的保底性能(compute_only)
  - **验收**: 消融分析完整，含分场景+分争议级别+Agent一致性

### 7.6: 论文图表

- [ ] 7.6.1 架构图
  - 系统架构总览图 (对应 IMPLEMENTATION_PLAN §一)
  - CGD 数据构建管线流程图
  - 运行时验证管线流程图
  - **验收**: 架构图清晰，适合论文

- [ ] 7.6.2 数据分布图
  - DS1: 残基共现频率分布
  - DS2: 距离分布示例 (选定 role_pair)
  - DS3: Scene A/B 分布 + 距离/角度分布
  - DS5: 规则映射覆盖率 (Layer 0 vs Layer 1)
  - quality_score: 分布直方图 + 阈值 T_Q 标注
  - **验收**: 分布图可展示数据特征

- [ ] 7.6.3 结果对比图 (含消融图表)
  - 留出验证: Top-1/3/5 柱状图
  - LOECO: 各 EC 类准确率雷达图
  - CGD 约束对比: 有/无约束准确率柱状图
  - ⭐ **消融柱状图**: 4组配置的Top-1/3/5准确率 (论文主文)
  - ⭐ **Agent边际贡献瀑布图**: 从compute_only开始，逐步加回Agent组件，显示每步准确率提升 (论文主文)
  - ⭐ **分场景Agent贡献分组柱状图**: X轴Scene A/B/C, Y轴Agent贡献度(full-compute_only) (论文主文)
  - ⭐ **IDR降级曲线**: Scene A→B→C排名一致率 + Agent on/off差异标注 (论文主文)
  - **PAP RMSD 分布**: PAP 底物放置精度验证
  - 质量评分阈值: 成本曲线 + T_Q 标注
  - **Supplementary Material**:
    - Agent一致性热图 (Cohen's κ矩阵, 3×3)
    - 分争议级别仲裁效果折线图
    - 边际贡献率 vs LLM调用成本散点图
  - **验收**: 结果图可清晰展示系统性能，4张主文图+3张补充图

### 7.7: 论文章节

- [ ] 7.7.1 方法章节 3.1-3.3
  - 3.1 CGD 构建方法: 数据来源、质量过滤、统计聚合
  - 3.2 EZ 验证管线: 场景判定、3D 验证、SMARTS 执行
  - 3.3 CGPS 评分函数: S_co/S_geo/S_path 定义和权重校准
  - 3.4 质量评估框架: quality_score + grey_zone_penalty + IDR 定义
  - **验收**: 方法描述准确、可复现

- [ ] 7.7.2 方法章节 3.4-3.5
  - 3.4 LLM Agent 管线: Agent①②③④⑤⑥ 职责和交互
  - 3.5 氧化还原扩展: D7-D10, 金属中心, 辅因子几何
  - **验收**: 方法描述完整

- [ ] 7.7.3 结果章节 3.6-3.9
  - 3.6 验证结果: 留出验证、跨EC泛化、CGD约束对比
  - 3.7 ⭐ 渐进降级分析: 信息缺失对系统评估一致性的影响 (D16定位声明)
  - 3.8 质量评估: quality_score 阈值优化 + IDR 降级曲线
  - 3.9 ⭐ 消融分析: 4组消融结果 + 分场景Agent贡献 + 关键叙事
    - **关键叙事模板**:
      > "我们通过消融实验量化了每个Agent组件的贡献。总体而言，Agent系统将Top-1准确率从X%(纯计算)提升至Y%(完整系统)，其中评审团(Agent③④⑤)贡献了Z%的提升。值得注意的是，Agent的贡献在不同信息层级下差异显著：在Scene A(完整3D数据)中Agent仅贡献a%，而在Scene C(无结构数据)中Agent贡献了b%——这表明LLM推理在信息缺失时发挥了不可替代的补偿作用。"
  - **验收**: Paper draft sections 3.1-3.9 (输出至 `paper/sections/3_1_through_3_9.md`)

---

## 输出文件清单

- `validation/ablation_study.py`
- `data/reports/ablation_study.json`
- `data/reports/agent_agreement_matrix.json`
- `data/reports/figures/architecture.png`
- `data/reports/figures/data_distributions.png`
- `data/reports/figures/results_comparison.png`
- `data/reports/figures/ablation_results.png`
- `data/reports/figures/agent_marginal_contribution.png`
- `data/reports/figures/scene_agent_contribution.png`
- `data/reports/figures/agent_agreement_heatmap.png`
- `data/reports/figures/dispute_arbitration_effect.png`
- `paper/sections/3_1_through_3_9.md`

---

## 常见陷阱

1. **消融实验非独立**: 移除Agent后final_confidence权重需重归一化(按剩余分量原始比例分配)，不能简单置零
2. **论文写作时间**: 写作可能比预期慢，需优先完成关键图表
3. **图表质量**: 论文图表需矢量格式 (PDF/SVG)，位图 (PNG) 不够清晰
4. **方法可复现性**: 需记录所有超参数、随机种子、数据版本
5. **分场景统计功效**: Scene C样本可能较少(<30)，分场景结论需标注统计功效限制
6. **争议级别样本偏斜**: high争议样本可能<20个，结论仅作"趋势观察"而非统计结论

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 🎉 Phase 7 全部完成！项目结束！
