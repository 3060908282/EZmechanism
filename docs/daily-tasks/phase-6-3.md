# Phase 6-3: Web UI

**Phase**: 6  
**任务编号**: 6.3  
**前置依赖**: phase-6-2 (API服务)  
**阻塞后续**: phase-6-4 (CGD管理界面+性能优化)  
**预计耗时**: 3天  

---

## 任务清单

- [ ] 6.3.1 搭建 Next.js 前端框架
  - 路径: `src/` (已有 Next.js 16 项目骨架)
  - 技术栈: Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui
  - 集成: NGL Viewer (3D 蛋白质可视化)
  - **验收**: Next.js 应用可启动

- [ ] 6.3.2 实现 MechFind 输入页面
  - 输入表单:
    - 底物 SMILES (带 RDKit 2D 渲染)
    - 产物 SMILES (带 RDKit 2D 渲染)
    - EC 编号 (可选, 自动补全)
    - PDB ID (可选, 验证存在性)
    - 高级选项: top_n, use_llm
  - SMILES 验证: 实时 RDKit 解析反馈
  - **验收**: 输入表单可正确提交

- [ ] 6.3.3 实现验证流程进度页面
  - 展示管线各阶段状态:
    - ⏳ 场景判定
    - ⏳ MechFind 求解
    - ⏳ EZ 验证
    - ⏳ Agent 评审
    - ✅/❌ 完成/失败
  - 实时更新: SSE (Server-Sent Events) 订阅 /events/{task_id} 进度推送
  - **验收**: 进度页面可实时展示管线状态

- [ ] 6.3.4 实现结果展示页面
  - Top-N 候选排序展示:
    - 机制摘要 (残基+步骤)
    - CGPS 评分 (S_co/S_geo/S_path)
    - 置信度 + 裁决 (accept/reject/grey)
    - 距离/角度详情 (D1-D10, A1-A3)
  - 点击候选 → 展开 3D 可视化
  - **验收**: 结果页面可展示完整验证结果

- [ ] 6.3.5 实现 NGL 3D 可视化
  - 展示: PDB 结构 + 催化残基高亮 + 配体位置
  - 场景 B: 叠加 PAP 放置的虚拟配体
  - 距离标注: 残基-配体关键距离
  - 交互: 旋转/缩放/选择
  - **验收**: 3D 可视化可正确展示蛋白质和配体

- [ ] 6.3.6 迁移遗留组件
  - 从旧前端迁移:
    - 2D 反应图渲染
    - SMARTS 高亮
    - 机制步骤展示
  - 新增验证组件:
    - 距离/角度热图
    - 置信度仪表盘
    - 争议标记
  - **验收**: Full web UI functional

---

## 输出文件清单

- `src/app/` (页面路由, 扩展现有)
- `src/components/verification/` (新增验证组件)
- `src/components/mechanism/` (迁移+适配组件)
- `src/lib/` (API 客户端, 扩展现有)

---

## 常见陷阱

1. **NGL Viewer 性能**: 大 PDB 文件加载可能卡顿，需做分块加载或 LOD
2. **SMILES 渲染**: 前端无 RDKit，需用 RDKit.js 或预渲染为 SVG
3. **实时更新**: 使用 SSE 推送预测进度(替代轮询), 前端通过 EventSource 订阅 /events/{task_id}, 后端在管线各阶段完成后推送事件
4. **响应式设计**: 3D 可视化在移动端体验差，需适配或降级

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-6-4.md` 继续
