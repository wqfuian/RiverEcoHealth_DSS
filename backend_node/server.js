const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8000;

// ============================================
// 河湖岸线生态健康诊断系统 - AHP-FCE模型
// ============================================

// 评价等级定义
const GRADES = ["优秀", "良好", "一般", "较差"];
const GRADE_SCORES = [95, 75, 55, 35];
const GRADE_EN = ["Excellent", "Good", "Fair", "Poor"];

// 四准则层权重（通过AHP专家打分确定）
const CRITERIA_WEIGHTS = {
    structuralStability: 0.20,   // 结构稳定性
    ecologicalHealth: 0.35,      // 生态健康性
    ecologicalSafety: 0.25,      // 生态安全性
    ecologicalService: 0.20     // 生态服务性
};

// 13个指标层权重
const INDICATOR_WEIGHTS = {
    // 结构稳定性 (3个指标)
    slope: 0.40,
    bankMaterial: 0.30,
    protectionType: 0.30,

    // 生态健康性 (5个指标)
    vegCoverage_FVC: 0.25,
    vegNPP: 0.20,
    LAI: 0.15,
    soilOrganicMatter: 0.25,
    biodiversityIndex: 0.15,

    // 生态安全性 (3个指标)
    connectivityIndex: 0.45,
    disturbanceIntensity: 0.35,
    floodRiskLevel: 0.20,

    // 生态服务性 (2个指标)
    landscapeAesthetics: 0.55,
    recreationFunction: 0.45
};

// 指标标准化阈值（用于隶属度计算）
const INDICATOR_THRESHOLDS = {
    slope: { excellent: 0.15, good: 0.30, fair: 0.50, type: 'negative' },
    vegCoverage_FVC: { excellent: 0.80, good: 0.60, fair: 0.40, type: 'positive' },
    vegNPP: { excellent: 300, good: 200, fair: 100, type: 'positive' },
    LAI: { excellent: 2.5, good: 1.8, fair: 1.0, type: 'positive' },
    soilOrganicMatter: { excellent: 25, good: 15, fair: 8, type: 'positive' },
    biodiversityIndex: { excellent: 0.75, good: 0.55, fair: 0.35, type: 'positive' },
    connectivityIndex: { excellent: 0.85, good: 0.65, fair: 0.45, type: 'positive' },
    disturbanceIntensity: { excellent: 0.15, good: 0.35, fair: 0.55, type: 'negative' },
    floodRiskLevel: { excellent: 1, good: 2, fair: 3, type: 'negative' },
    landscapeAesthetics: { excellent: 0.80, good: 0.60, fair: 0.40, type: 'positive' },
    recreationFunction: { excellent: 0.75, good: 0.55, fair: 0.35, type: 'positive' }
};

// 修复策略知识库
const RESTORATION_KNOWLEDGE_BASE = {
    // 结构稳定性问题
    highSlope: {
        condition: (c) => c.structuralStability?.slope > 0.50,
        priority: 1,
        category: "结构稳定性",
        diagnosis: "岸坡坡度过陡",
        recommendations: [
            "采用柔性护岸改造，降低坡度至1:2.5以下",
            "实施生态缓坡改造工程",
            "设置多级台阶式生态护坡"
        ]
    },
    // 生态健康性问题
    lowVegetation: {
        condition: (c) => c.ecologicalHealth?.vegCoverage_FVC < 0.40,
        priority: 1,
        category: "生态健康性",
        diagnosis: "植被覆盖度严重不足",
        recommendations: [
            "选用本地适生的乡土滨水植物进行补植",
            "采用芦苇、菖蒲等挺水植物构建滨水植被带",
            "实施植被恢复工程，目标覆盖度≥60%"
        ]
    },
    lowNPP: {
        condition: (c) => c.ecologicalHealth?.vegNPP < 100,
        priority: 2,
        category: "生态健康性",
        diagnosis: "植被净初级生产力低下",
        recommendations: [
            "改善土壤肥力条件以提升植被生产力",
            "补种生长旺盛的乡土物种",
            "建立植被监测与养护机制"
        ]
    },
    poorSoil: {
        condition: (c) => c.ecologicalHealth?.soilOrganicMatter < 10,
        priority: 1,
        category: "生态健康性",
        diagnosis: "土壤有机质含量严重偏低",
        recommendations: [
            "实施土壤改良工程，添加有机基质",
            "种植豆科固氮植物改善土壤肥力",
            "施用腐熟有机肥，目标有机质含量≥15g/kg"
        ]
    },
    lowBiodiversity: {
        condition: (c) => c.ecologicalHealth?.biodiversityIndex < 0.40,
        priority: 2,
        category: "生态健康性",
        diagnosis: "生物多样性水平偏低",
        recommendations: [
            "构建乔-灌-草多层次复合植被群落",
            "设置人工鸟巢、生态浮岛等微生境",
            "减少单一物种种植，增加物种丰富度"
        ]
    },
    // 生态安全性问题
    poorConnectivity: {
        condition: (c) => c.ecologicalSafety?.connectivityIndex < 0.50,
        priority: 1,
        category: "生态安全性",
        diagnosis: "纵向连通性受阻明显",
        recommendations: [
            "实施闸坝生态调度，保障最小生态流量",
            "建设过鱼设施或生态鱼道",
            "拆除或改造阻断性拦河构筑物"
        ]
    },
    highDisturbance: {
        condition: (c) => c.ecologicalSafety?.disturbanceIntensity > 0.60,
        priority: 2,
        category: "生态安全性",
        diagnosis: "人为干扰强度过大",
        recommendations: [
            "划定岸线保护区，限制人类活动",
            "设置生态警示标识和隔离设施",
            "加强日常巡查监管力度"
        ]
    },
    highFloodRisk: {
        condition: (c) => c.ecologicalSafety?.floodRiskLevel >= 4,
        priority: 1,
        category: "生态安全性",
        diagnosis: "洪水风险等级较高",
        recommendations: [
            "构建生态滞洪空间",
            "优化岸线断面设计，增强行洪能力",
            "建立洪水预警监测系统"
        ]
    },
    // 生态服务性问题
    poorLandscape: {
        condition: (c) => c.ecologicalService?.landscapeAesthetics < 0.40,
        priority: 3,
        category: "生态服务性",
        diagnosis: "景观美学价值不足",
        recommendations: [
            "实施岸线景观提升工程",
            "增设观景平台和亲水节点",
            "采用自然材质美化硬质护岸"
        ]
    },
    poorRecreation: {
        condition: (c) => c.ecologicalService?.recreationFunction < 0.40,
        priority: 3,
        category: "生态服务性",
        diagnosis: "休闲游憩功能缺失",
        recommendations: [
            "建设滨水慢行步道系统",
            "设置休闲座椅和观景设施",
            "打造滨河公园节点"
        ]
    },
    // 硬质岸线特殊处理
    hardenedShoreline: {
        condition: (c, props) => props.level2 === '硬质岸线',
        priority: 1,
        category: "岸线类型转化",
        diagnosis: "硬质岸线生态功能退化",
        recommendations: [
            "优先考虑拆硬还软的生态修复改造",
            "采用挂壁植被、生态砖等近自然化改造技术",
            "在满足防洪前提下逐步恢复岸线自然形态"
        ]
    }
};

// 计算单个指标的模糊隶属度向量
const calculateMembershipVector = (value, indicatorKey) => {
    const threshold = INDICATOR_THRESHOLDS[indicatorKey];
    if (!threshold) return [0.25, 0.25, 0.25, 0.25]; // 默认均匀分布

    const { excellent, good, fair, type } = threshold;
    let vector = [0, 0, 0, 0]; // [优秀, 良好, 一般, 较差]

    if (type === 'positive') {
        if (value >= excellent) {
            vector = [0.9, 0.1, 0, 0];
        } else if (value >= good) {
            const ratio = (value - good) / (excellent - good);
            vector = [ratio * 0.7, 0.7 - ratio * 0.3, 0.2, 0.1];
        } else if (value >= fair) {
            const ratio = (value - fair) / (good - fair);
            vector = [0.1, ratio * 0.5, 0.6 - ratio * 0.3, 0.2];
        } else {
            vector = [0, 0.1, 0.3, 0.6];
        }
    } else { // negative
        if (value <= excellent) {
            vector = [0.9, 0.1, 0, 0];
        } else if (value <= good) {
            const ratio = (good - value) / (good - excellent);
            vector = [ratio * 0.7, 0.7 - ratio * 0.3, 0.2, 0.1];
        } else if (value <= fair) {
            const ratio = (fair - value) / (fair - good);
            vector = [0.1, ratio * 0.5, 0.6 - ratio * 0.3, 0.2];
        } else {
            vector = [0, 0.1, 0.3, 0.6];
        }
    }

    // 归一化
    const sum = vector.reduce((a, b) => a + b, 0);
    return vector.map(v => v / sum);
};

// 计算准则层评价结果
const evaluateCriterion = (criterionData, criterionKey) => {
    const indicatorKeys = {
        structuralStability: ['slope'],
        ecologicalHealth: ['vegCoverage_FVC', 'vegNPP', 'LAI', 'soilOrganicMatter', 'biodiversityIndex'],
        ecologicalSafety: ['connectivityIndex', 'disturbanceIntensity', 'floodRiskLevel'],
        ecologicalService: ['landscapeAesthetics', 'recreationFunction']
    };

    const keys = indicatorKeys[criterionKey] || [];
    let resultVector = [0, 0, 0, 0];
    let totalWeight = 0;

    keys.forEach(key => {
        const value = criterionData[key];
        if (value !== undefined) {
            const weight = INDICATOR_WEIGHTS[key] || 0.2;
            const membershipVector = calculateMembershipVector(value, key);
            for (let i = 0; i < 4; i++) {
                resultVector[i] += weight * membershipVector[i];
            }
            totalWeight += weight;
        }
    });

    // 归一化
    if (totalWeight > 0) {
        resultVector = resultVector.map(v => v / totalWeight);
    }

    return resultVector;
};

// 综合健康诊断
const calculateHealth = (criteria) => {
    // 计算各准则层的评价结果
    const criteriaResults = {};
    let finalVector = [0, 0, 0, 0];

    Object.keys(CRITERIA_WEIGHTS).forEach(criterionKey => {
        if (criteria[criterionKey]) {
            const vector = evaluateCriterion(criteria[criterionKey], criterionKey);
            criteriaResults[criterionKey] = {
                vector,
                score: vector.reduce((sum, v, i) => sum + v * GRADE_SCORES[i], 0)
            };

            const weight = CRITERIA_WEIGHTS[criterionKey];
            for (let i = 0; i < 4; i++) {
                finalVector[i] += weight * vector[i];
            }
        }
    });

    // 确定最终等级
    const maxIdx = finalVector.indexOf(Math.max(...finalVector));
    const level = GRADES[maxIdx];
    const levelEn = GRADE_EN[maxIdx];

    // 计算综合得分
    const score = finalVector.reduce((sum, v, i) => sum + v * GRADE_SCORES[i], 0);

    return {
        score: Math.round(score * 10) / 10,
        level,
        levelEn,
        vector: finalVector.map(v => Math.round(v * 100) / 100),
        criteriaScores: criteriaResults
    };
};

// 智能推荐修复策略
const getRecommendations = (criteria, properties) => {
    const results = [];

    Object.keys(RESTORATION_KNOWLEDGE_BASE).forEach(ruleKey => {
        const rule = RESTORATION_KNOWLEDGE_BASE[ruleKey];
        try {
            if (rule.condition(criteria, properties)) {
                results.push({
                    priority: rule.priority,
                    category: rule.category,
                    diagnosis: rule.diagnosis,
                    recommendations: rule.recommendations
                });
            }
        } catch (e) {
            // 规则条件检查失败，跳过
        }
    });

    // 按优先级排序
    results.sort((a, b) => a.priority - b.priority);

    // 如果没有问题，返回维护建议
    if (results.length === 0) {
        results.push({
            priority: 4,
            category: "日常维护",
            diagnosis: "岸线生态状况良好",
            recommendations: [
                "保持现有生态状态，定期开展监测评估",
                "建立长效管护机制，防止人为破坏",
                "记录生态本底数据，为后续对比提供基准"
            ]
        });
    }

    return results;
};

// API: 获取岸线数据
app.get('/api/shorelines', (req, res) => {
    const dataPath = path.join(__dirname, '../data/shorelines_mock.json');
    if (fs.existsSync(dataPath)) {
        res.json(JSON.parse(fs.readFileSync(dataPath, 'utf8')));
    } else {
        res.status(404).send('Data not found');
    }
});

// API: 单个河段健康诊断
app.post('/api/diagnose', (req, res) => {
    const { criteria, properties } = req.body;

    if (!criteria) {
        return res.status(400).json({ error: 'criteria is required' });
    }

    const diagnosis = calculateHealth(criteria);
    const recommendations = getRecommendations(criteria, properties || {});

    res.json({
        diagnosis,
        recommendations,
        timestamp: new Date().toISOString()
    });
});

// API: 批量诊断所有河段
app.get('/api/diagnose/batch', (req, res) => {
    const dataPath = path.join(__dirname, '../data/shorelines_mock.json');
    if (!fs.existsSync(dataPath)) {
        return res.status(404).send('Data not found');
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const features = data.features || [];

    const results = features.map(f => {
        const props = f.properties;
        const diagnosis = calculateHealth(props.criteria);
        const recommendations = getRecommendations(props.criteria, props);

        return {
            id: f.id,
            name: props.name,
            level1: props.level1,
            level2: props.level2,
            level3: props.level3,
            length_km: props.length_km,
            diagnosis,
            recommendations,
            problemCount: recommendations.filter(r => r.priority <= 2).length
        };
    });

    // 汇总统计
    const summary = {
        totalSegments: results.length,
        totalLength: results.reduce((sum, r) => sum + r.length_km, 0),
        avgScore: Math.round(results.reduce((sum, r) => sum + r.diagnosis.score, 0) / results.length * 10) / 10,
        byHealthLevel: {},
        criticalSegments: results.filter(r => r.diagnosis.score < 50),
        goodSegments: results.filter(r => r.diagnosis.score >= 70)
    };

    GRADES.forEach(grade => {
        summary.byHealthLevel[grade] = results.filter(r => r.diagnosis.level === grade).length;
    });

    res.json({
        results,
        summary,
        timestamp: new Date().toISOString()
    });
});

// API: 获取统计摘要（增强版）
app.get('/api/statistics', (req, res) => {
    const dataPath = path.join(__dirname, '../data/shorelines_mock.json');
    if (!fs.existsSync(dataPath)) {
        return res.status(404).send('Data not found');
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const features = data.features || [];

    // 计算每个河段的健康得分
    const healthScores = features.map(f => {
        const diagnosis = calculateHealth(f.properties.criteria);
        return {
            id: f.id,
            name: f.properties.name,
            score: diagnosis.score,
            level: diagnosis.level
        };
    });

    const stats = {
        totalSegments: features.length,
        totalLength: features.reduce((sum, f) => sum + (f.properties.length_km || 0), 0),
        byLevel1: {},
        byLevel2: {},
        byLevel3: {},
        byHealthLevel: {},
        avgHealthScore: Math.round(healthScores.reduce((sum, h) => sum + h.score, 0) / healthScores.length * 10) / 10,
        healthScores
    };

    features.forEach(f => {
        const p = f.properties;
        stats.byLevel1[p.level1] = (stats.byLevel1[p.level1] || 0) + 1;
        stats.byLevel2[p.level2] = (stats.byLevel2[p.level2] || 0) + 1;
        stats.byLevel3[p.level3] = (stats.byLevel3[p.level3] || 0) + 1;
    });

    GRADES.forEach(grade => {
        stats.byHealthLevel[grade] = healthScores.filter(h => h.level === grade).length;
    });

    // 计算生态岸线率
    const ecoCount = (stats.byLevel1['生态岸线'] || 0);
    stats.ecoShorelineRate = Math.round(ecoCount / stats.totalSegments * 100);

    res.json(stats);
});

// ============================================
// 数据管理 API
// ============================================

// API: 获取单个河段
app.get('/api/segments/:id', (req, res) => {
    const dataPath = path.join(__dirname, '../data/shorelines_mock.json');
    if (!fs.existsSync(dataPath)) {
        return res.status(404).send('Data not found');
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const segment = data.features.find(f => f.id === parseInt(req.params.id));

    if (!segment) {
        return res.status(404).json({ error: 'Segment not found' });
    }

    res.json(segment);
});

// API: 创建新河段
app.post('/api/segments', (req, res) => {
    const dataPath = path.join(__dirname, '../data/shorelines_mock.json');
    const data = fs.existsSync(dataPath)
        ? JSON.parse(fs.readFileSync(dataPath, 'utf8'))
        : { type: 'FeatureCollection', features: [] };

    const newId = Math.max(0, ...data.features.map(f => f.id)) + 1;
    const newSegment = {
        type: 'Feature',
        id: newId,
        properties: req.body.properties,
        geometry: req.body.geometry
    };

    data.features.push(newSegment);
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    res.status(201).json(newSegment);
});

// API: 更新河段
app.put('/api/segments/:id', (req, res) => {
    const dataPath = path.join(__dirname, '../data/shorelines_mock.json');
    if (!fs.existsSync(dataPath)) {
        return res.status(404).send('Data not found');
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const idx = data.features.findIndex(f => f.id === parseInt(req.params.id));

    if (idx === -1) {
        return res.status(404).json({ error: 'Segment not found' });
    }

    data.features[idx].properties = { ...data.features[idx].properties, ...req.body.properties };
    if (req.body.geometry) {
        data.features[idx].geometry = req.body.geometry;
    }

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    res.json(data.features[idx]);
});

// API: 删除河段
app.delete('/api/segments/:id', (req, res) => {
    const dataPath = path.join(__dirname, '../data/shorelines_mock.json');
    if (!fs.existsSync(dataPath)) {
        return res.status(404).send('Data not found');
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const idx = data.features.findIndex(f => f.id === parseInt(req.params.id));

    if (idx === -1) {
        return res.status(404).json({ error: 'Segment not found' });
    }

    const deleted = data.features.splice(idx, 1)[0];
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    res.json({ message: 'Deleted', segment: deleted });
});

// API: 导入GeoJSON数据
app.post('/api/import', (req, res) => {
    const dataPath = path.join(__dirname, '../data/shorelines_mock.json');
    const { geojson, mode } = req.body; // mode: 'replace' or 'append'

    if (!geojson || !geojson.features) {
        return res.status(400).json({ error: 'Invalid GeoJSON' });
    }

    let data;
    if (mode === 'replace') {
        data = geojson;
    } else {
        data = fs.existsSync(dataPath)
            ? JSON.parse(fs.readFileSync(dataPath, 'utf8'))
            : { type: 'FeatureCollection', features: [] };

        const maxId = Math.max(0, ...data.features.map(f => f.id));
        geojson.features.forEach((f, i) => {
            f.id = maxId + i + 1;
            data.features.push(f);
        });
    }

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    res.json({
        message: mode === 'replace' ? 'Data replaced' : 'Data appended',
        totalSegments: data.features.length
    });
});

// API: 导出GeoJSON数据
app.get('/api/export', (req, res) => {
    const dataPath = path.join(__dirname, '../data/shorelines_mock.json');
    if (!fs.existsSync(dataPath)) {
        return res.status(404).send('Data not found');
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=shorelines_export.geojson');
    res.json(data);
});

app.listen(PORT, () => {
    console.log(`\n🌊 河湖岸线生态健康诊断系统后端已启动`);
    console.log(`   服务地址: http://localhost:${PORT}`);
    console.log(`   API接口:`);
    console.log(`     - GET  /api/shorelines      获取岸线数据`);
    console.log(`     - POST /api/diagnose        单个河段诊断`);
    console.log(`     - GET  /api/diagnose/batch  批量诊断所有河段`);
    console.log(`     - GET  /api/statistics      统计摘要`);
    console.log(`     - CRUD /api/segments/:id    数据管理`);
    console.log(`     - POST /api/import          导入GeoJSON`);
    console.log(`     - GET  /api/export          导出GeoJSON\n`);
});

