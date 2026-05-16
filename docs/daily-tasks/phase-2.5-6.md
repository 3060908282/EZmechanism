# Phase 2.5-6: 统一验证结果格式

**Phase**: 2.5  
**任务编号**: 2.5.6  
**前置依赖**: 无 (可先行)  
**阻塞后续**: phase-2.5-5 (Scene A验证使用此格式), phase-2.5-10 (置信度计算), phase-2.5-11 (管线编排)  
**预计耗时**: 0.5天  

---

## 任务清单

- [ ] 2.5.6.1 编写 `ez_validator/scoring/verification_result.py`
  - 定义 VerificationResult dataclass:
    ```python
    @dataclass
    class VerificationResult:
        scene: str                          # "A" / "B" / "C"
        mechanism_id: str                   # 候选机制ID
        passed: bool                        # 是否通过验证
        confidence: float                   # 0.0-1.0 综合置信度
        
        # 分项评分
        s_co: Optional[float]               # DS1 共现评分
        s_geo: Optional[float]              # DS2+DS3 几何评分 (Scene C=None)
        s_path: Optional[float]             # DS5 路径评分
        
        # 详细信息
        distance_scores: Dict[str, float]   # D1-D6, A1-A3 逐维度评分
        scene_specific: Dict[str, Any]      # Scene B: PAP详情; Scene A: 直接详情
        
        # 来源追溯
        pdb_id: Optional[str]               # 使用的PDB ID
        source_type: str                    # "direct" / "homolog" / "overlay" / "statistical"
        
        # ⭐ 扩展字段: Phase 4/6/7逐步填充
        degradation_reason: Optional[str] = None  # 降级原因(如A→B降级)
        cgps_score: Optional[float] = None  # CGPS综合评分(Phase 4填充)
        residue_info: Optional[Dict] = None  # 三路径残基映射结果
        rule_mapping: Optional[Dict] = None  # 规则映射详情(路径+SMARTS)
        step25_outputs: Optional[Dict] = None  # Step 2.5产出(2D SVG, 化学描述, 可行性评估)
        ligand_coords: Optional[List[Dict]] = None  # 真实配体坐标(Scene A)
        pap_substrate_coords: Optional[List[Dict]] = None  # PAP生成底物坐标(Scene B)
    ```
  - **验收**: dataclass 定义完整，所有字段类型正确

- [ ] 2.5.6.2 实现 Scene A 实例化
  - 创建工厂方法: `VerificationResult.for_scene_a(mechanism_id, pdb_id, ...)`
  - 自动设置 scene="A", source_type="direct"
  - distance_scores 包含 D1-D6 + A1-A3 共 9 个维度
  - **验收**: Scene A 结果可正确实例化，distance_scores 有 9 个键

- [ ] 2.5.6.3 实现 Scene B 实例化
  - 创建工厂方法: `VerificationResult.for_scene_b(mechanism_id, pdb_id, ...)`
  - scene="B", source_type="overlay"
  - distance_scores 包含 D2-D6 + A1-A3 共 8 个维度 (D1 退化)
  - scene_specific 包含 PAP 详情 (placement_coords, rotation_angles, clash_count)
  - **验收**: Scene B 结果可正确实例化，D1 缺失标注

- [ ] 2.5.6.4 实现 Scene C 实例化
  - 创建工厂方法: `VerificationResult.for_scene_c(mechanism_id, ...)`
  - scene="C", source_type="statistical", s_geo=None
  - distance_scores 为空 dict (无 PDB 数据)
  - **验收**: Scene C 结果可正确实例化，s_geo=None

- [ ] 2.5.6.5 实现序列化/反序列化
  - `to_dict()` → JSON 可序列化的 dict
  - `from_dict(data)` → VerificationResult 实例
  - 支持嵌套 scene_specific 的序列化
  - **验收**: 往返序列化无损

- [ ] 2.5.6.6 编写三个场景的测试用例
  - 测试1: Scene A 实例化 + 序列化/反序列化
  - 测试2: Scene B 实例化 + D1 缺失标注
  - 测试3: Scene C 实例化 + s_geo=None
  - **验收**: Dataclass instantiates correctly for all 3 scenes

---

## 输出文件清单

- `ez_validator/scoring/__init__.py`
- `ez_validator/scoring/verification_result.py`
- `tests/test_verification_result.py`

---

## 常见陷阱

1. **Optional 字段默认值**: `s_geo` 在 Scene C 为 None, `s_path` 在未映射时为 None，需使用 `Optional[float] = None`
2. **Dict 键一致性**: `distance_scores` 的键名需与 DS2/DS3 定义一致 ("D1", "D2", ..., "A1", "A2", "A3")
3. **scene_specific 异构**: 三个场景的 scene_specific 内容结构不同，需在文档中明确各场景的 schema
4. **序列化 float 精度**: JSON 序列化 float 时注意 NaN/Inf 的处理，RDKit 计算可能产生这些值

---

## 完成后

1. 逐项检查验收标准
2. 将所有 `[ ]` 改为 `[x]`
3. 打开 `phase-2.5-7.md` 继续
