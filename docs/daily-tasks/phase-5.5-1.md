# Phase 5.5-1: 氧化还原中心识别

**Phase**: 5.5  
**任务编号**: 5.5.1  
**前置依赖**: Phase 2.5 完成 (验证运行时可运行); Phase 4 完成 (CGPS评分框架可用); ⚠️ 可与Phase 5并行启动 (HANDBOOK §Phase 5.5约束: 氧化还原验证不依赖LLM Agent)  
**阻塞后续**: phase-5.5-2 (电子转移验证), phase-5.5-3 (辅因子几何验证)  
**预计耗时**: 1天  

---

## 任务清单

- [ ] 5.5.1.1 编写 `ez_validator/redox/redox_center_identifier.py` 框架
  - 核心函数: `identify_redox_center(pdb_structure, ec_code, mcsa_data) → RedoxCenter`
  - `RedoxCenter`: center_type ("metal"/"cofactor"/"disulfide"), atoms, residues, coordination
  - **验收**: 模块可导入运行

- [ ] 5.5.1.2 实现金属中心识别
  - 从 PDB 的 HETATM 记录识别金属离子:
    - 常见催化金属: Fe, Zn, Mg, Mn, Cu, Mo, Co, Ni
    - 判断标准: 非水分子、非标准残基、配位距离内 (2.0-3.0Å)
  - 提取配位残基 (金属周围的氨基酸)
  - **验收**: Fe-S 簇、Zn²⁺ 等金属中心可识别

- [ ] 5.5.1.3 实现辅因子氧化还原中心识别
  - 常见氧化还原辅因子:
    - PLP (磷酸吡哆醛): 涉及转氨/脱羧
    - NAD/NADP: 涉及氢负转移
    - FAD: 涉及电子转移
    - Heme: 涉及单电子转移
    - FMN: 涉及氧化还原
  - 从 PDB HETATM 识别辅因子 (查 HET_to_ChEBI → 分类=cofactor)
  - **验收**: PLP/NAD/FAD 辅因子可识别

- [ ] 5.5.1.4 实现 EC 1.x.x.x 过滤
  - 仅 EC 第1类 (氧化还原酶) 需要氧化还原验证
  - EC 1.x.x.x 的子分类:
    - 1.1: 作用于 CH-OH 基团 (NAD/NADP 受体)
    - 1.2: 作用于醛/氧代基团
    - 1.3: 作用于 CH-CH 基团
    - 1.4: 作用于 CH-NH₂ 基团
    - 1.5: 作用于 CH-NH 基团
    - 1.7: 作用于其他氮化合物
    - 1.8: 作用于硫基团 (含 Fe-S 簇)
    - 1.9: 作用于血红素基团
    - 1.10: 作用于二苯酚 (含 Cu)
    - 1.11: 作用于过氧化物 (含 heme)
    - 1.13-1.14: 加氧酶 (含 Fe/heme/Cu)
  - **验收**: EC 1.x.x.x redox centers identified

- [ ] 5.5.1.5 编写测试用例
  - 测试1: EC 1.8 (铁硫蛋白) → 识别 Fe-S 簇
  - 测试2: EC 1.1 (脱氢酶) → 识别 NAD 辅因子
  - 测试3: EC 1.11 (过氧化物酶) → 识别 heme
  - **验收**: 3 个 EC 1.x 测试用例正确识别中心

---

## 输出文件清单

- `ez_validator/redox/__init__.py`
- `ez_validator/redox/redox_center_identifier.py`
- `tests/test_redox_center_identifier.py`

---

## 常见陷阱

1. **金属 vs 结构离子**: PDB 中可能含非催化金属 (如结晶缓冲液的 Mg²⁺)，需结合 M-CSA 注释区分
2. **辅因子 vs 底物**: 部分辅因子 (如 PLP) 在 PDB 中可能被标注为底物，需用 ChEBI 分类辅助判断
3. **多种辅因子**: 同一酶可能含多种辅因子 (如 Fe-S + FAD)，需全部识别
4. **EC 通配符**: EC 1.-.-.- 表示未知子类，需用结构信息而非 EC 分类推断中心

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5.5-2.md` 继续
