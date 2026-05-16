# Phase 7-3: LLM消融 + 论文

**Phase**: 7  
**周次**: Week 23-24
**任务编号**: 7.4+7.5+7.6  
**前置依赖**: phase-7-2 (跨EC泛化+CGD约束对比), phase-7-2.5 (渐进降级交叉验证)  
**阻塞后续**: 项目完成  
**预计耗时**: 3.5天 (7.4 LLM消融≈1.5天 + 7.5 论文图表≈1天 + 7.6 论文章节≈1天)  

---

## 任务清单

### 7.4: LLM消融实验

- [ ] 7.4.1 设计消融实验
  - 对比组:
    - 完整系统: MF + EZ + Agent①② + 争议检测 + Agent③④⑤⑥
    - 无Agent③④⑤⑥: MF + EZ + Agent①② + CGPS (无争议仲裁)
    - 无全部Agent: MF + EZ + CGPS only (纯计算管线)
    - 无EZ: MF + CGPS only (无3D验证)
  - 在同一测试集上对比
  - > ⚠️ 消融实验注意: 移除 EZ 分量后 CGPS 权重可能失配。当前设计不做重新校准(控制变量)，结果需注明"未重校准CGPS权重"作为局限性。
  - **验收**: 消融实验设计合理

- [ ] 7.4.2 执行消融实验
  - 每个配置运行测试集 → 计算指标
  - 关注:
    - Agent 的贡献: 完整 vs 无Agent③④⑤⑥ 的准确率差
    - EZ 的贡献: 有EZ vs 无EZ 的准确率差
    - Agent①② vs 无: 规则映射和化学审查的价值
  - **验收**: Ablation report generated

- [ ] 7.4.3 分析消融结果
  - 各组件的边际贡献 (准确率提升)
  - 成本效益: Agent 的准确率提升 vs LLM 调用成本
  - 降级模式: 无 LLM 时系统的保底性能
  - **验收**: 消融分析完整

### 7.5: 论文图表

- [ ] 7.5.1 架构图
  - 系统架构总览图 (对应 IMPLEMENTATION_PLAN §一)
  - CGD 数据构建管线流程图
  - 运行时验证管线流程图
  - **验收**: 架构图清晰，适合论文

- [ ] 7.5.2 数据分布图
  - DS1: 残基共现频率分布
  - DS2: 距离分布示例 (选定 role_pair)
  - DS3: Scene A/B 分布 + 距离/角度分布
  - DS5: 规则映射覆盖率 (Layer 0 vs Layer 1)
  - **验收**: 分布图可展示数据特征

- [ ] 7.5.3 结果对比图
  - 留出验证: Top-1/3/5 柱状图
  - LOECO: 各 EC 类准确率雷达图
  - CGD 约束对比: 有/无约束准确率柱状图
  - LLM 消融: 各配置准确率柱状图
  - ⭐ **渐进降级曲线**: Scene A→B→C 排名一致率降级曲线 (论文最核心图表之一)
  - ⭐ **PAP RMSD 分布**: PAP 底物放置精度验证
  - **验收**: 结果图可清晰展示系统性能

### 7.6: 论文章节

- [ ] 7.6.1 方法章节 3.1-3.3
  - 3.1 CGD 构建方法: 数据来源、质量过滤、统计聚合
  - 3.2 EZ 验证管线: 场景判定、3D 验证、SMARTS 执行
  - 3.3 CGPS 评分函数: S_co/S_geo/S_path 定义和权重校准
  - **验收**: 方法描述准确、可复现

- [ ] 7.6.2 方法章节 3.4-3.5
  - 3.4 LLM Agent 管线: Agent①②③④⑤⑥ 职责和交互
  - 3.5 氧化还原扩展: D7-D10, 金属中心, 辅因子几何
  - **验收**: 方法描述完整

- [ ] 7.6.3 结果章节 3.6-3.7
  - 3.6 验证结果: 留出验证、跨EC泛化、CGD约束对比
  - 3.7 ⭐ 渐进降级分析: 信息缺失对系统评估一致性的影响 (D16定位声明)
  - 3.8 消融分析: 各组件贡献
  - **验收**: Paper draft sections 3.1-3.8 (输出至 `paper/sections/3_1_through_3_8.md`)

---

## 输出文件清单

- `validation/ablation_study.py`
- `data/reports/ablation_study.json`
- `data/reports/figures/architecture.png`
- `data/reports/figures/data_distributions.png`
- `data/reports/figures/results_comparison.png`
- `data/reports/figures/ablation_results.png`
- `paper/sections/3_1_through_3_8.md`

---

## 常见陷阱

1. **消融实验非独立**: 移除一个组件可能影响其他组件的表现 (如移除 EZ 后 CGPS 权重需重新校准)
2. **论文写作时间**: 写作可能比预期慢，需优先完成关键图表
3. **图表质量**: 论文图表需矢量格式 (PDF/SVG)，位图 (PNG) 不够清晰
4. **方法可复现性**: 需记录所有超参数、随机种子、数据版本

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 🎉 Phase 7 全部完成！项目结束！
