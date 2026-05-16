# Phase 0-1: 目录结构 + M-CSA API 验证

**Phase**: 0  
**任务编号**: 0.1, 0.2  
**前置依赖**: 无 (Phase 0 首个任务)  
**阻塞后续**: 0.3 PDB下载、0.4 PDBe API、0.5 RCSB Search 均依赖目录结构和API客户端基础  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 0.1 创建项目目录结构
  - 创建 `mini-services/prediction-service/` 根目录
  - 创建一级子目录: `mechfind/`, `step25/`, `ez_validator/`, `cgd/`, `cgps/`, `agents/`, `pipeline/`, `shared/`, `legacy/`, `datasets/`
  - 创建 `ez_validator/` 二级子目录: `geometry/`, `scoring/`, `redox/`
  - 创建 `cgd/` 二级子目录: `builders/`, `parsers/`, `pap/`, `geometry/`, `homolog/`, `water/`, `statistics/`, `quality/`
  - 创建 `shared/` 二级子目录: `pdb/`, `chemistry/`
  - 创建 `data/` 二级子目录: `datasets/`, `auxiliary/`, `derived/`, `cache/mcsa_entries/`, `cache/pdb_files/`, `reports/`
  - 每个 Python 子目录放置 `__init__.py`（含 `ez_validator/geometry/`, `ez_validator/scoring/`, `ez_validator/redox/`, `cgd/builders/`, `cgd/parsers/`, `cgd/pap/`, `cgd/geometry/`, `cgd/homolog/`, `cgd/water/`, `cgd/statistics/`, `cgd/quality/`, `shared/pdb/`, `shared/chemistry/` 等）
  - 根目录也放 `__init__.py` 以支持 `import cgd`
  - **验收**: 25+ 目录存在；每个 Python 子目录含 `__init__.py`；`import cgd` 无报错

- [ ] 0.2 M-CSA API连通性验证
  - 编写 `cgd/parsers/mcsa_api_client.py`，封装 M-CSA API 调用
  - API 端点: `https://www.ebi.ac.uk/thornton-srv/m-csa/api/entries/?format=json`
  - 获取 Entry #1 (glutamate racemase) 完整 JSON
  - 获取 Entry #2 (beta-lactamase) 完整 JSON
  - 验证关键字段存在且非空: `mcsa_id`, `enzyme_name`, `all_ecs`, `residues[]`, `residues[].roles[]`
  - 将结果缓存到 `data/cache/mcsa_entries/entry_1.json` 和 `data/cache/mcsa_entries/entry_2.json`
  - **验收**: 两个 JSON 文件可成功写入且字段完整；API 客户端可被其他模块 `from cgd.parsers.mcsa_api_client import McsaApiClient` 调用

---

## 输出文件清单

[mini-services/prediction-service/__init__.py] [mini-services/prediction-service/mechfind/__init__.py] [mini-services/prediction-service/step25/__init__.py] [mini-services/prediction-service/ez_validator/__init__.py] [mini-services/prediction-service/ez_validator/geometry/__init__.py] [mini-services/prediction-service/ez_validator/scoring/__init__.py] [mini-services/prediction-service/ez_validator/redox/__init__.py] [mini-services/prediction-service/cgd/__init__.py] [mini-services/prediction-service/cgd/builders/__init__.py] [mini-services/prediction-service/cgd/parsers/__init__.py] [mini-services/prediction-service/cgd/parsers/mcsa_api_client.py] [mini-services/prediction-service/cgd/pap/__init__.py] [mini-services/prediction-service/cgd/geometry/__init__.py] [mini-services/prediction-service/cgd/homolog/__init__.py] [mini-services/prediction-service/cgd/water/__init__.py] [mini-services/prediction-service/cgd/statistics/__init__.py] [mini-services/prediction-service/cgd/quality/__init__.py] [mini-services/prediction-service/cgps/__init__.py] [mini-services/prediction-service/agents/__init__.py] [mini-services/prediction-service/pipeline/__init__.py] [mini-services/prediction-service/shared/__init__.py] [mini-services/prediction-service/shared/pdb/__init__.py] [mini-services/prediction-service/shared/chemistry/__init__.py] [mini-services/prediction-service/legacy/__init__.py] [mini-services/prediction-service/datasets/__init__.py] [mini-services/prediction-service/data/cache/mcsa_entries/entry_1.json] [mini-services/prediction-service/data/cache/mcsa_entries/entry_2.json]  

---

## 常见陷阱

1. **API 分页陷阱**: M-CSA API 默认分页返回，单条 entry 需用 `?format=json&id=1` 而非列表端点；需确认单条与列表端点的 URL 差异
2. **`__init__.py` 遗漏**: `data/` 下的子目录（`cache/`, `reports/` 等）不是 Python 包，不需要 `__init__.py`；但 `cgd/`, `ez_validator/` 等所有 Python 子目录必须放置
3. **`import cgd` 失败**: 需确保 `mini-services/prediction-service/` 在 `PYTHONPATH` 中，或在项目根目录安装为 editable package
4. **JSON 字段路径错误**: M-CSA API 返回嵌套结构，`residues[].roles[]` 的实际路径需验证，可能为 `residues[].reaction_roles[]` 或其他名称
5. **网络超时**: EBI API 偶尔响应慢，建议设置 30 秒超时 + 重试逻辑

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-0-2.md` 继续
