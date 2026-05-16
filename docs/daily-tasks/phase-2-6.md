# Phase 2-6: TM-align 集成

**Phase**: 2
**任务编号**: 2.6
**前置依赖**: phase-2-5 (同源结构查找)
**阻塞后续**: phase-2-7 (残基保守性验证需TM-score分层), phase-2-8 (同源替代DS3需TM-score加权)
**预计耗时**: 2天

---

## 任务清单

- [ ] 2.6.1 编写 `cgd/homolog/tm_align.py` 框架
  - 创建 TM-align 集成模块，定义 `TMAlignRunner` 类
  - 接口: `align(pdb_ref_path, pdb_homolog_path) → TMAlignResult`
  - TMAlignResult: tm_score, rmsd, aligned_length, rotation_matrix, translation_vector
  - **验收**: 类可实例化，接口定义清晰

- [ ] 2.6.2 TM-align 可执行文件安装与验证
  - 从 https://zhanggroup.org/TM-align/ 下载 TM-align 源码
  - 编译: `g++ -O3 -o TMalign TMalign.cpp`
  - 验证可执行文件运行: `./TMalign test.pdb test.pdb` (自比对 TM-score 应为 1.0)
  - 如果编译失败 (缺少 g++ 或依赖)，检查 conda 环境或使用预编译二进制
  - **验收**: TM-align 可执行文件可正常运行

- [ ] 2.6.3 调用 TM-align 进行结构比对
  - 对每对 (参考PDB, 同源PDB):
    1. 准备输入文件 (确保是 ATOM 记录的蛋白链)
    2. 调用 TM-align: `./TMalign ref.pdb homolog.pdb > output.txt`
    3. 解析输出:
       - TM-score (normalized by reference length)
       - RMSD
       - 对齐残基数
       - 旋转矩阵 + 平移向量
  - 解析 TM-align 标准输出格式 (正则提取数值)
  - **验收**: TM-align 输出可正确解析

- [ ] 2.6.4 TM-score 分层加权
  - 按 IMPLEMENTATION_PLAN 风险1的分层方案:
    - High: TM-score ≥ 0.95 → weight = 1.0 (几乎相同结构)
    - Medium: 0.85 ≤ TM-score < 0.95 → weight = TM-score (线性衰减)
    - Low: TM-score < 0.85 → discard (差异过大，不可用)
  - TM-score 取 normalized by reference length 的值 (TM-align 输出的第2个 TM-score)
  - 分层结果影响:
    - phase-2-7: 只有 High/Medium 层进入保守性验证
    - phase-2-8: 同源距离按 weight 加权聚合
  - **验收**: 分层逻辑正确，Low 层被丢弃

- [ ] 2.6.5 批量处理与缓存
  - 对 phase-2-5 找到的所有同源结构，批量运行 TM-align
  - 缓存结果到 `data/cache/tm_align_results/` (避免重复计算)
  - 缓存格式: `{ref_pdb}_{homolog_pdb}.json`，含 TM-score、RMSD、分层
  - 设置超时: 单次 TM-align 运行不超过 60 秒
  - **验收**: 批量处理完成，结果可缓存复用

- [ ] 2.6.6 1BTL 同源验证
  - 对 1BTL 的同源结构运行 TM-align
  - 验证:
    - 高相似度同源 (如 1XPB, 1SHV) 的 TM-score ≥ 0.95
    - 低相似度同源的 TM-score < 0.85
    - 分层分配正确
  - **验收**: TM-score 计算正确，分层分配合理

---

## 输出文件清单

- `cgd/homolog/tm_align.py`
- `data/cache/tm_align_results/` (TM-align 结果缓存目录)

---

## 常见陷阱

1. **TM-score 归一化**: TM-align 输出两个 TM-score (分别按 query 和 target 长度归一化)，需统一使用按参考结构长度归一化的值
2. **PDB 格式兼容性**: TM-align 对 PDB 格式要求严格，HETATM 行可能导致解析错误；需准备仅含 ATOM 记录的输入文件
3. **链选择**: TM-align 默认处理整个 PDB 文件；如果 PDB 含多条链或多聚体，需先提取目标链
4. **编译环境问题**: TM-align 用 C++ 编写，部分系统可能缺少编译器；备选方案: 使用 BioPython 的 `Bio.PDB.Superimposer` 做简化比对 (但 TM-score 不等价)
5. **大文件超时**: 大分子 (如核糖体) 的比对可能很慢，需设置超时保护
6. **反向比对不对称**: TM-align (A, B) 和 TM-align (B, A) 的 TM-score 可能不同 (因归一化长度不同)，需统一按参考→同源方向计算
7. **TM-score 阈值来源**: 0.95 和 0.85 是经验阈值，参考 TM-align 论文: >0.5 通常为同一折叠，>0.9 为高度相似

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2-7.md` 继续
