# Phase 6-3: Web UI

**Phase**: 6  
**任务编号**: 6.3  
**前置依赖**: phase-6-2 (API服务)  
**阻塞后续**: phase-6-4 (CGD管理界面+性能优化)  
**预计耗时**: 4天 (+1天 for D19确认卡片)  

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

- [ ] 6.3.3 实现 PDB预选确认页面
  - 完整UI布局: 每个路径组一个PDBConfirmationCard
  - 卡片布局:
    - PDB信息行: PDB ID, 酶名, EC, 分辨率, 配体, 推荐场景
    - 候选PDB下拉菜单: 可切换PDB
    - 路径勾选列表: 每条路径显示评分、残基状态(✅/⚠️/❌)、推荐场景
    - 无PDB匹配组: 手动指定PDB输入框
    - 底部验证按钮
  - 交互功能5项:
    1. 默认选中: 评分≥阈值的路径自动勾选
    2. 取消选择: 可取消不想验证的路径
    3. 切换PDB: 下拉切换后重新运行兼容性检查
    4. 手动指定PDB: 覆盖系统推荐
    5. 场景标注: 每条路径显示推荐场景标签
  - 数据来源: API `/predict/confirmation-card`
  - **验收**: PDB确认页面功能完整，5项交互正常

- [ ] 6.3.4 实现验证流程进度页面
  - 展示管线各阶段状态:
    - ⏳ ⭐ PDB预选 + 用户确认 (D19新增阶段)
    - ⏳ 场景判定
    - ⏳ ⭐ D22氧化还原分类 (金属价态变化→自动降级Scene C)
    - ⏳ MechFind 求解
    - ⏳ EZ 验证
    - ⏳ Agent 评审
    - ✅/❌ 完成/失败
  - 实时更新: SSE (Server-Sent Events) 订阅 /events/{task_id} 进度推送
  - **验收**: 进度页面可实时展示管线状态

- [ ] 6.3.5 实现结果展示页面
  - Top-N 候选排序展示:
    - 机制摘要 (残基+步骤)
    - CGPS 评分 (S_co/S_geo/S_path)
    - 置信度 + 裁决 (accept/reject/grey)
    - 距离/角度详情 (D1-D10, A1-A3)
  - 点击候选 → 展开 3D 可视化
  - **验收**: 结果页面可展示完整验证结果

- [ ] 6.3.6 实现 NGL 3D 可视化
  - 展示: PDB 结构 + 催化残基高亮 + 配体位置
  - 场景 B: 叠加 PAP 放置的虚拟配体
  - 距离标注: 残基-配体关键距离
  - 交互: 旋转/缩放/选择
  - **验收**: 3D 可视化可正确展示蛋白质和配体

- [ ] 6.3.7 迁移遗留组件
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
- `src/components/pdb/` (D19新增PDB确认组件)
- `src/components/pdb/PDBConfirmationCard.tsx` (D19新增)
- `src/components/pdb/PathSelector.tsx` (D19新增)
- `src/components/pdb/ResidueStatusBadge.tsx` (D19新增)
- `src/lib/` (API 客户端, 扩展现有)

---

## 常见陷阱

1. **NGL Viewer 性能**: 大 PDB 文件加载可能卡顿，需做分块加载或 LOD
2. **SMILES 渲染**: 前端无 RDKit，需用 RDKit.js 或预渲染为 SVG
3. **实时更新**: 使用 SSE 推送预测进度(替代轮询), 前端通过 EventSource 订阅 /events/{task_id}, 后端在管线各阶段完成后推送事件
4. **响应式设计**: 3D 可视化在移动端体验差，需适配或降级
5. **确认卡片→管线衔接**: 确认后需将选定PDB和路径列表传回管线，数据格式需与pipeline_orchestrator兼容
6. **PDB切换刷新**: 切换PDB时需重新运行check_residue_compatibility，需防抖和加载状态
7. **手动PDB覆盖**: 需验证PDB存在性+重新运行兼容性检查，不能直接使用

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-6-4.md` 继续
