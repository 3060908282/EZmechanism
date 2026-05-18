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

- [ ] 5.5.1.3 实现辅因子中心识别 (⭐ M20修正: 分类为氧化还原辅因子+有机辅因子)
  - 氧化还原辅因子 (涉及电子/氢负转移):
    - NAD/NADP: 涉及氢负转移 (EC 1.x)
    - FAD: 涉及电子转移 (EC 1.x)
    - FMN: 涉及氧化还原 (EC 1.x)
  - ⭐ 有机辅因子 (非氧化还原，但可3D验证，D22 cofactor_organic):
    - PLP (磷酸吡哆醛): 涉及转氨(EC 2.x)/脱羧(EC 4.x)，**非氧化还原反应**
    - TPP (硫胺素): 供质子/电子转移
    - Biotin (生物素): CO₂载体
  - 特殊辅因子 (含金属中心):
    - Heme: 含Fe中心，涉及单电子转移 → 按D22归入金属价态变化处理
  - 从 PDB HETATM 识别辅因子 (查 HET_to_ChEBI → 分类=cofactor)
  - ⚠️ **M20修正**: PLP不是氧化还原辅因子，将其归入cofactor_organic类别。识别时不应仅按EC 1过滤，还需覆盖EC 2.x/4.x中依赖PLP的酶
  - **验收**: PLP/NAD/FAD 辅因子可识别，PLP正确分类为organic而非redox

- [ ] 5.5.1.4 实现 EC 过滤 (⭐ M20修正: 扩展至EC 1+2+4)
  - ⚠️ **M20修正**: 不仅EC 1(氧化还原酶)需要辅因子验证，EC 2(转移酶)和EC 4(裂解酶)中依赖PLP等有机辅因子的酶也需要
  - EC 1.x.x.x (氧化还原酶) — 氧化还原辅因子验证:
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
  - ⭐ EC 2.x.x.x (转移酶) — 有机辅因子验证 (D22 cofactor_organic):
    - 2.6: 转氨酶 (PLP依赖)
    - 2.3: 酰基转移酶 (CoA依赖)
  - ⭐ EC 4.x.x.x (裂解酶) — 有机辅因子验证:
    - 4.1: 羧基裂解酶 (PLP依赖)
  - **验收**: EC 1.x.x.x redox centers identified; EC 2.6/4.1 PLP centers identified

- [ ] 5.5.1.5 编写测试用例 (⭐ M20修正: 新增EC 2/4测试)
  - 测试1: EC 1.8 (铁硫蛋白) → 识别 Fe-S 簇
  - 测试2: EC 1.1 (脱氢酶) → 识别 NAD 辅因子 (cofactor_hydride_transfer)
  - 测试3: EC 1.11 (过氧化物酶) → 识别 heme (含Fe→metal_valence_change)
  - ⭐ 测试4: EC 2.6.1 (转氨酶) → 识别 PLP 辅因子 (cofactor_organic, 非氧化还原)
  - ⭐ 测试5: EC 4.1.1 (脱羧酶) → 识别 PLP 辅因子 (cofactor_organic)
  - **验收**: 5个测试用例正确识别中心，PLP被识别为organic而非redox

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
5. **⭐ M20修正: PLP不是氧化还原辅因子**: PLP涉及转氨(EC 2.6)和脱羧(EC 4.1)，属于cofactor_organic类别。旧版将其归入"氧化还原辅因子"是错误的。识别模块必须区分redox cofactor(NAD/FAD/FMN)和organic cofactor(PLP/TPP/Biotin)，否则下游5.5-2分类器将产生错误的step_type

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5.5-2.md` 继续
