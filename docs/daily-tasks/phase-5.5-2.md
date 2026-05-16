# Phase 5.5-2: 电子转移验证

**Phase**: 5.5  
**任务编号**: 5.5.2  
**前置依赖**: phase-5.5-1 (氧化还原中心识别)  
**阻塞后续**: phase-5.5-4 (金属中心+扩展距离)  
**预计耗时**: 1.5天  

---

## 任务清单

- [ ] 5.5.2.1 编写 `ez_validator/redox/electron_transfer_validator.py` 框架
  - 核心函数: `validate_electron_transfer(redox_center, substrate_atoms, mechanism_steps) → ElectronTransferResult`
  - `ElectronTransferResult`: distances_valid, angles_valid, transfer_pathway, confidence
  - **验收**: 模块可导入运行

- [ ] 5.5.2.2 实现电子转移距离验证
  - 计算关键距离:
    - 供体→受体距离 (D7): 直接电子转移 ≤ 14Å (隧道效应上限)
    - 供体→金属→受体距离 (D8): 通过金属介导
    - 辅因子活性原子→底物反应原子距离 (D9): 氢负转移 ≤ 4Å
    - 辅因子→蛋白质残基距离 (D10): 电子隧道
  - 与 DS2/DS3 扩展阈值对比 (D7-D10)
  - **验收**: 电子转移距离计算正确

- [ ] 5.5.2.3 实现电子转移路径验证
  - 内球电子转移: 直接金属-底物键合 → 距离 < 3Å
  - 外球电子转移: 通过氢键网络 → 距离 3-7Å
  - 隧道效应: 远距离电子转移 → 距离 7-14Å
  - 每种路径的合理性判定
  - **验收**: 转移路径分类正确

- [ ] 5.5.2.4 实现 Fe-S 簇特殊验证
  - Fe-S 簇 (2Fe-2S, 4Fe-4S) 的电子转移验证:
    - Fe-Fe 距离: ~2.7Å (2Fe-2S), ~2.8Å (4Fe-4S)
    - Fe-S 距离: ~2.3Å
    - 簇→底物距离: 电子转移距离
  - **验收**: Fe-S 簇距离验证正确

- [ ] 5.5.2.5 编写测试用例
  - 测试1: 铁氧还蛋白 (Fe-S) → 电子转移距离在合理范围
  - 测试2: 细胞色素 (heme) → 外球电子转移路径合理
  - 测试3: 乙醇脱氢酶 (Zn²⁺) → 内球转移
  - **验收**: Electron transfer distances validated

---

## 输出文件清单

- `ez_validator/redox/electron_transfer_validator.py`
- `tests/test_electron_transfer_validator.py`

---

## 常见陷阱

1. **电子转移距离上限**: 生物体系中的电子隧道效应上限约 14Å，超过此距离的转移极不可能
2. **Fe-S 簇建模**: PDB 中 Fe-S 簇的原子标注可能不一致，需同时查 HETATM 和 RESIDUE 记录
3. **辅因子氧化态**: PDB 结构中的辅因子氧化态不确定，需结合反应方向推断
4. **多步电子转移**: 部分机制涉及多步连续电子转移，需追踪每步的供体/受体

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-5.5-3.md` 继续
