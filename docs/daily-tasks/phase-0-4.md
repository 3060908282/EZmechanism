# Phase 0-4: MechFind 连通 + 数据导出验证

**Phase**: 0  
**任务编号**: 0.7, 0.9  
> 注: 任务 0.8 (缓存模块) 延后至 phase-0-5.md，因其依赖所有 API 验证完成  
**前置依赖**: 0.1 目录结构已创建  
**阻塞后续**: Phase 3 DS5 Layer 0 规则映射（依赖 Unique_Rules_1.csv 数据格式确认）、Phase 2.5 G7 运行时规则映射  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 0.7 MechFind服务连通
  - 确认 MechFind 服务运行在 `localhost:3002`
  - 发送测试预测请求（使用简单底物/产物 SMILES 对，如乙醇→乙醛）
  - 验证响应格式: JSON 包含候选机制列表
  - 验证每个候选机制含: 机制步骤序列、规则 ID、moiety 变化向量
  - 记录 API 端点路径和请求/响应格式
  - **验收**: port 3002 可连通；测试请求返回合法 JSON 响应；响应包含候选机制列表

- [ ] 0.9 MechFind数据导出验证
  - 从 MechFind 服务目录定位 `Unique_Rules_1.csv` 文件
  - 读取样本数据（前 50 行），验证列名和格式
  - 确认规则 ID 格式为 `{mcsa_id}_{mech_idx}_{step_idx}`（如 `2_1_1`, `5_3_2`）
  - 统计总规则数和唯一 M-CSA ID 数
  - 验证每行数据含: 规则 ID、moiety 变化描述、关联的 M-CSA 条目
  - 将样本数据复制到 `mini-services/prediction-service/datasets/Unique_Rules_1_sample.csv`
  - 记录数据格式到注释/文档，供 Phase 3 任务 3.1 规则解析使用
  - **验收**: Unique_Rules_1.csv 可读取；列名格式确认；规则 ID 格式 `{mcsa_id}_{mech_idx}_{step_idx}` 已验证；样本文件已复制到 datasets/ 目录

---

## 输出文件清单

[mini-services/prediction-service/datasets/Unique_Rules_1_sample.csv]  

---

## 常见陷阱

1. **MechFind 服务未启动**: 服务可能需要手动启动（如 `npm start` 或 `python server.py`）；需确认启动命令和工作目录
2. **端口被占用**: 3002 端口可能被其他进程占用；用 `lsof -i :3002` 或 `netstat -tlnp | grep 3002` 检查
3. **Unique_Rules_1.csv 位置不确定**: 文件可能在 MechFind 项目根目录、`output/` 子目录或 `data/` 子目录；需在服务目录中递归查找
4. **CSV 编码问题**: 文件可能使用非 UTF-8 编码（如 Latin-1）；Python 读取时需指定 `encoding` 参数
5. **规则 ID 格式变体**: 实际格式可能为 `2-1-1`（连字符分隔）而非 `2_1_1`（下划线分隔）；需确认后统一
6. **CSV 分隔符**: 可能是逗号、制表符或分号；用 `csv.Sniffer` 检测

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-0-5.md` 继续
