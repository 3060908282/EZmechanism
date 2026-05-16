# Phase 5-1: LLM接口封装

**Phase**: 5  
**任务编号**: 5.1  
**前置依赖**: Phase 4 完成 (CGPS评分可用, 可判定灰色区间)  
**阻塞后续**: phase-5-2 (Agent①), phase-5-3 (Agent②), phase-5-5 (争议检测), phase-5-6 (Agent③④⑤), phase-5-7 (Agent⑥)  
**预计耗时**: 1.5天  

---

## 任务清单

- [ ] 5.1.1 编写 `agents/llm_client.py` 框架
  - 核心类: `LLMClient`
  - 支持: OpenAI API / Anthropic API / 本地模型
  - 配置: model_name, api_key, temperature, max_tokens
  - **验收**: 类可实例化，配置可加载

- [ ] 5.1.2 实现 prompt 模板系统
  - 定义 prompt 模板基类: `PromptTemplate`
  - 每个Agent有专用模板:
    - Agent①化学审查模板
    - Agent②规则翻译模板
    - Agent③催化化学模板
    - Agent④结构生物模板
    - Agent⑤文献验证模板
    - Agent⑥综合评审模板
  - 模板变量: {substrate}, {product}, {mechanism}, {residues}, {distances}, ...
  - **验收**: 模板可渲染，变量替换正确

- [ ] 5.1.3 实现 JSON 解析 + 重试
  - LLM 输出解析: 从 markdown code block 或纯文本中提取 JSON
  - 结构验证: 检查 JSON 是否包含必需字段
  - 重试策略: 解析失败 → 重试 (最多3次, temperature递增)
  - 降级: 3次失败 → 返回 None + 记录错误
  - **验收**: LLM returns structured JSON

- [ ] 5.1.4 实现 API 调用 + 错误处理
  - 超时: 单次请求超时 30s
  - 限速: API rate limiting → 指数退避重试
  - 降级: API 不可用 → 返回 fallback 值 (各Agent定义自己的fallback)
  - 日志: 记录每次 API 调用的 prompt/response/token 用量
  - **验收**: 错误情况不 crash，有合理的降级行为

- [ ] 5.1.5 实现缓存层
  - 相同 prompt → 返回缓存结果 (避免重复调用)
  - 缓存键: hash(prompt_text)
  - 缓存存储: 本地 JSON 文件 `data/cache/llm_responses/`
  - **验收**: 重复请求走缓存

---

## 输出文件清单

- `agents/llm_client.py`
- `agents/prompts/` (模板目录)
- `agents/__init__.py`
- `tests/test_llm_client.py`

---

## 常见陷阱

1. **JSON 解析脆弱**: LLM 输出格式不稳定，可能包含额外文字、markdown 标记、非标准 JSON，解析需鲁棒
2. **Token 限制**: 长机制描述 + 多步反应可能超出 context window，需截断或分段
3. **成本控制**: 多Agent并行调用 LLM 成本可能很高，缓存和 prompt 压缩很重要
4. **温度参数**: 不同Agent需要不同 temperature: 审查类 → 低 (0.1), 创造类 → 中 (0.5)

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5-2.md` 继续
