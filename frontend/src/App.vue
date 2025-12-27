<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import MapComponent from './components/MapComponent.vue'
import RadarChart from './components/RadarChart.vue'
import PieChart from './components/PieChart.vue'
import HealthBarChart from './components/HealthBarChart.vue'
import TemporalComparison from './components/TemporalComparison.vue'
import DiagnosisHistory from './components/DiagnosisHistory.vue'
import DataManagement from './components/DataManagement.vue'

const selectedSegment = ref(null)
const diagnosisResult = ref(null)
const recommendations = ref([])
const loading = ref(false)
const statistics = ref(null)
const showStatsPanel = ref(true)
const showDataMgmt = ref(false)
const showAdvanced = ref(false)

// 诊断历史记录
const currentDiagnosisForHistory = computed(() => {
  if (!selectedSegment.value || !diagnosisResult.value) return null
  return {
    name: selectedSegment.value.name,
    level2: selectedSegment.value.level2,
    level3: selectedSegment.value.level3,
    score: diagnosisResult.value.score,
    level: diagnosisResult.value.level,
    timestamp: new Date().toISOString()
  }
})

// API基础地址（支持环境变量配置）
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// 获取统计数据
const fetchStatistics = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/statistics`)
    statistics.value = await res.json()
  } catch (e) {
    console.error('Failed to fetch statistics', e)
  }
}

onMounted(() => {
  fetchStatistics()
})

const handleSegmentSelected = async (properties) => {
  selectedSegment.value = properties
  
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/api/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        criteria: properties.criteria,
        properties: properties
      })
    })
    const data = await res.json()
    diagnosisResult.value = data.diagnosis
    recommendations.value = data.recommendations
  } catch (e) {
    console.error("诊断失败", e)
  } finally {
    loading.value = false
  }
}

// 处理历史记录点击
const handleHistorySelect = async (historyItem) => {
  // 从后端获取完整的河段数据
  try {
    const res = await fetch(`${API_BASE}/api/shorelines`)
    const data = await res.json()
    const segment = data.features.find(f => f.properties.name === historyItem.name)
    if (segment) {
      handleSegmentSelected(segment.properties)
    }
  } catch (e) {
    console.error('Failed to load segment', e)
  }
}

// 生成PDF报告
const generatePDFReport = () => {
  if (!selectedSegment.value || !diagnosisResult.value) {
    alert('请先选择河段进行诊断')
    return
  }

  // 构建报告HTML
  const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>岸线生态健康诊断报告 - ${selectedSegment.value.name}</title>
  <style>
    body { font-family: "Microsoft YaHei", sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #1e40af; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; border-left: 4px solid #3b82f6; padding-left: 10px; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .score-box { background: linear-gradient(135deg, #eff6ff, #dbeafe); padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0; }
    .score { font-size: 48px; font-weight: bold; color: #1e40af; }
    .level { font-size: 24px; color: ${diagnosisResult.value.score >= 70 ? '#22c55e' : diagnosisResult.value.score >= 50 ? '#eab308' : '#ef4444'}; }
    .criteria-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .criteria-item { background: #fff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; }
    .criteria-score { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .rec-item { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 10px 0; border-radius: 0 8px 8px 0; }
    .rec-high { background: #fee2e2; border-left-color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
    th { background: #f9fafb; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <h1>🌊 河湖岸线生态健康诊断报告</h1>
  
  <div class="info-box">
    <strong>河段名称：</strong>${selectedSegment.value.name}<br>
    <strong>河段长度：</strong>${selectedSegment.value.length_km} km<br>
    <strong>一级分类：</strong>${selectedSegment.value.level1}<br>
    <strong>二级分类：</strong>${selectedSegment.value.level2}<br>
    <strong>三级分类：</strong>${selectedSegment.value.level3}<br>
    <strong>诊断时间：</strong>${new Date().toLocaleString('zh-CN')}
  </div>

  <h2>📊 综合健康评价结果</h2>
  <div class="score-box">
    <div class="score">${diagnosisResult.value.score}</div>
    <div class="level">${diagnosisResult.value.level} (${diagnosisResult.value.levelEn})</div>
  </div>

  <h2>📈 准则层得分</h2>
  <div class="criteria-grid">
    ${Object.entries(diagnosisResult.value.criteriaScores || {}).map(([key, data]) => `
      <div class="criteria-item">
        <div class="criteria-score">${data.score?.toFixed(1)}</div>
        <div>${CRITERIA_NAMES[key]}</div>
      </div>
    `).join('')}
  </div>

  <h2>📋 生态指标详情</h2>
  <table>
    <tr><th>准则层</th><th>指标名称</th><th>实测值</th></tr>
    ${Object.entries(selectedSegment.value.criteria || {}).map(([criteriaKey, criteriaData]) => 
      Object.entries(criteriaData).map(([key, val]) => {
        const info = INDICATOR_INFO[key]
        if (!info) return ''
        let displayVal = val
        if (info.multiplier) displayVal = (val * info.multiplier).toFixed(0)
        return `<tr><td>${CRITERIA_NAMES[criteriaKey]}</td><td>${info.icon} ${info.name}</td><td>${displayVal} ${info.unit}</td></tr>`
      }).join('')
    ).join('')}
  </table>

  <h2>💊 修复策略建议</h2>
  ${recommendations.value.map(rec => `
    <div class="rec-item ${rec.priority === 1 ? 'rec-high' : ''}">
      <strong>[P${rec.priority}] ${rec.category}</strong><br>
      <em>诊断：${rec.diagnosis}</em>
      <ul>
        ${rec.recommendations.map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>
  `).join('')}

  <div class="footer">
    本报告由「河湖岸线生态健康诊断辅助决策支持系统」自动生成<br>
    郑州山前平原区河湖岸线调查项目 © ${new Date().getFullYear()}
  </div>
</body>
</html>
  `

  // 打开新窗口打印
  const printWindow = window.open('', '_blank')
  printWindow.document.write(reportHTML)
  printWindow.document.close()
  printWindow.focus()
  
  // 延迟打印以确保样式加载
  setTimeout(() => {
    printWindow.print()
  }, 500)
}

// 健康等级颜色映射
const getLevelColor = (level) => {
  const map = {
    '优秀': 'text-green-600',
    '良好': 'text-blue-600',
    '一般': 'text-yellow-600',
    '较差': 'text-red-600'
  }
  return map[level] || 'text-gray-600'
}

// 准则层中文名称
const CRITERIA_NAMES = {
  structuralStability: '结构稳定性',
  ecologicalHealth: '生态健康性',
  ecologicalSafety: '生态安全性',
  ecologicalService: '生态服务性'
}

// 指标中文名称和单位
const INDICATOR_INFO = {
  slope: { name: '岸坡坡度', unit: '', icon: '📐', multiplier: null },
  vegCoverage_FVC: { name: '植被覆盖度', unit: '%', multiplier: 100, icon: '🌿' },
  vegNPP: { name: '净初级生产力', unit: 'gC/m²/a', icon: '🌱', multiplier: null },
  LAI: { name: '叶面积指数', unit: '', icon: '🍃', multiplier: null },
  soilOrganicMatter: { name: '土壤有机质', unit: 'g/kg', icon: '🪨', multiplier: null },
  biodiversityIndex: { name: '生物多样性指数', unit: '', icon: '🦋', multiplier: null },
  connectivityIndex: { name: '纵向连通指数', unit: '', icon: '🔗', multiplier: null },
  disturbanceIntensity: { name: '人为干扰强度', unit: '', icon: '⚠️', multiplier: null },
  floodRiskLevel: { name: '洪水风险等级', unit: '级', icon: '🌊', multiplier: null },
  landscapeAesthetics: { name: '景观美学价值', unit: '', icon: '🎨', multiplier: null },
  recreationFunction: { name: '休闲游憩功能', unit: '', icon: '🚶', multiplier: null }
}

const getIndicatorDisplay = (key, value) => {
  const info = INDICATOR_INFO[key]
  if (!info) return { name: key, value: value }
  
  let displayValue = value
  if (info.multiplier) {
    displayValue = (value * info.multiplier).toFixed(0)
  } else if (typeof value === 'number' && value < 10) {
    displayValue = value.toFixed(2)
  }
  
  return {
    name: info.name,
    value: displayValue + (info.unit ? ' ' + info.unit : ''),
    icon: info.icon
  }
}

const getIndicatorStatus = (key, value) => {
  const positiveKeys = ['vegCoverage_FVC', 'vegNPP', 'LAI', 'soilOrganicMatter', 'biodiversityIndex', 'connectivityIndex', 'landscapeAesthetics', 'recreationFunction']
  const negativeKeys = ['slope', 'disturbanceIntensity', 'floodRiskLevel']
  
  if (positiveKeys.includes(key)) {
    if (value >= 0.7 || (key === 'vegNPP' && value >= 250) || (key === 'soilOrganicMatter' && value >= 20)) {
      return 'bg-green-500'
    } else if (value >= 0.4 || (key === 'vegNPP' && value >= 120) || (key === 'soilOrganicMatter' && value >= 10)) {
      return 'bg-yellow-500'
    }
    return 'bg-red-500'
  } else if (negativeKeys.includes(key)) {
    if (value <= 0.2 || (key === 'floodRiskLevel' && value <= 2)) {
      return 'bg-green-500'
    } else if (value <= 0.5 || (key === 'floodRiskLevel' && value <= 3)) {
      return 'bg-yellow-500'
    }
    return 'bg-red-500'
  }
  return 'bg-gray-400'
}

const getPriorityColor = (priority) => {
  const map = {
    1: 'bg-red-500',
    2: 'bg-yellow-500',
    3: 'bg-blue-500',
    4: 'bg-green-500'
  }
  return map[priority] || 'bg-gray-500'
}
</script>

<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden font-sans text-gray-800 bg-gray-50">
    <!-- 顶部导航栏 -->
    <header class="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-4 shadow-lg z-20 flex justify-between items-center">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <span class="text-blue-700 font-black text-xl">生</span>
        </div>
        <div>
            <h1 class="text-lg font-bold tracking-tight">河湖岸线生态健康诊断辅助决策支持系统</h1>
            <p class="text-[10px] opacity-80 uppercase tracking-widest">郑州山前平原区 · WebGIS Decision Support System</p>
        </div>
      </div>
      <div class="flex space-x-3 text-sm">
        <button @click="showDataMgmt = true" class="border border-white/30 px-4 py-1.5 rounded-lg hover:bg-white/10 transition flex items-center space-x-1">
          <span>📊</span><span>数据管理</span>
        </button>
        <button @click="showStatsPanel = !showStatsPanel" class="border border-white/30 px-4 py-1.5 rounded-lg hover:bg-white/10 transition flex items-center space-x-1">
          <span>📈</span><span>{{ showStatsPanel ? '隐藏' : '显示' }}统计</span>
        </button>
        <button class="bg-white text-blue-700 font-bold px-4 py-1.5 rounded-lg shadow-sm hover:bg-gray-100 transition flex items-center space-x-1">
          <span>🩺</span><span>健康诊断</span>
        </button>
        <button @click="generatePDFReport" 
                :class="['px-4 py-1.5 rounded-lg transition flex items-center space-x-1',
                        selectedSegment ? 'bg-green-500 hover:bg-green-400' : 'border border-white/30 opacity-50 cursor-not-allowed']">
          <span>📄</span><span>生成报告</span>
        </button>
      </div>
    </header>

    <div class="flex-grow flex relative overflow-hidden">
      <!-- 左侧: 地图区域 -->
      <section class="flex-grow relative border-r border-gray-200">
        <MapComponent @segment-selected="handleSegmentSelected" />
        
        <!-- 统计概览悬浮框 -->
        <div v-if="statistics && showStatsPanel" 
             class="absolute top-4 left-4 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-white/20 transition-all duration-300"
             :class="showAdvanced ? 'w-80 p-4' : 'w-64 p-4'">
            <div class="flex justify-between items-center mb-3">
              <h4 class="text-xs font-bold text-gray-500 uppercase flex items-center space-x-1">
                <span>📈</span><span>项目概况统计</span>
              </h4>
              <button @click="showAdvanced = !showAdvanced" class="text-[10px] text-blue-500 hover:text-blue-700">
                {{ showAdvanced ? '收起' : '展开' }}
              </button>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="bg-blue-50 p-2 rounded-lg">
                    <div class="text-xl font-bold text-blue-700">{{ statistics.totalLength?.toFixed(1) }} <span class="text-xs font-normal">km</span></div>
                    <div class="text-[10px] text-gray-500">调查总长度</div>
                </div>
                <div class="bg-green-50 p-2 rounded-lg">
                    <div class="text-xl font-bold text-green-600">{{ statistics.ecoShorelineRate }} <span class="text-xs font-normal">%</span></div>
                    <div class="text-[10px] text-gray-500">生态岸线率</div>
                </div>
                <div class="bg-purple-50 p-2 rounded-lg">
                    <div class="text-xl font-bold text-purple-600">{{ statistics.totalSegments }}</div>
                    <div class="text-[10px] text-gray-500">调查河段数</div>
                </div>
                <div class="bg-amber-50 p-2 rounded-lg">
                    <div class="text-xl font-bold text-amber-600">{{ statistics.avgHealthScore || '-' }}</div>
                    <div class="text-[10px] text-gray-500">平均健康分</div>
                </div>
            </div>
            <!-- 分类统计饼图 -->
            <div class="border-t pt-3">
              <div class="text-[10px] text-gray-400 uppercase mb-2">二级分类统计</div>
              <PieChart :statistics="statistics" />
            </div>
            <!-- 展开后显示健康得分条形图 -->
            <div v-if="showAdvanced && statistics.healthScores" class="border-t pt-3 mt-3">
              <div class="text-[10px] text-gray-400 uppercase mb-2">各河段健康得分</div>
              <HealthBarChart :healthScores="statistics.healthScores" />
            </div>
        </div>
        
        <!-- 多时相对比面板（左下角） -->
        <div v-if="showAdvanced" class="absolute bottom-4 left-4 w-80">
          <TemporalComparison :baseStatistics="statistics" />
        </div>
      </section>

      <!-- 右侧: 诊断面板 -->
      <aside class="w-[420px] bg-white shadow-2xl flex flex-col z-10 transition-all duration-300">
        <!-- 未选择状态 -->
        <div v-if="!selectedSegment" class="flex-grow flex flex-col p-6 bg-gradient-to-b from-gray-50 to-white overflow-auto">
            <div class="text-center mb-6">
              <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <span class="text-3xl">🗺️</span>
              </div>
              <h3 class="text-lg font-bold text-gray-700">选择河段进行诊断</h3>
              <p class="text-sm text-gray-500 mt-1">点击地图上的岸线段落进行健康诊断</p>
            </div>
            
            <div class="p-4 bg-blue-50 rounded-lg text-xs text-blue-700 mb-4">
              <div class="font-bold mb-2">💡 诊断指标体系 (13项)</div>
              <ul class="space-y-1 text-blue-600">
                <li>• 结构稳定性（坡度、材质、护岸形式）</li>
                <li>• 生态健康性（FVC、NPP、LAI、有机质、多样性）</li>
                <li>• 生态安全性（连通性、干扰强度、洪水风险）</li>
                <li>• 生态服务性（景观美学、游憩功能）</li>
              </ul>
            </div>
            
            <!-- 诊断历史记录 -->
            <DiagnosisHistory 
              :currentDiagnosis="currentDiagnosisForHistory"
              @select="handleHistorySelect" />
        </div>

        <!-- 已选择状态 -->
        <div v-else class="flex flex-col h-full">
            <!-- 河段信息头部 -->
            <div class="p-5 border-b bg-gradient-to-r from-gray-50 to-white">
                <div class="flex justify-between items-start mb-2">
                    <h2 class="text-xl font-bold text-gray-800">{{ selectedSegment.name }}</h2>
                    <button @click="selectedSegment = null; diagnosisResult = null" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                </div>
                <div class="flex flex-wrap gap-2 text-[10px]">
                    <span class="px-2 py-1 rounded bg-gray-100 text-gray-600">
                      📏 {{ selectedSegment.length_km }} km
                    </span>
                    <span :class="['px-2 py-1 rounded font-medium', 
                        selectedSegment.level1 === '生态岸线' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
                        {{ selectedSegment.level1 }}
                    </span>
                    <span :class="['px-2 py-1 rounded font-medium',
                        selectedSegment.level2 === '原始自然岸线' ? 'bg-green-100 text-green-700' : 
                        selectedSegment.level2 === '近自然岸线' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700']">
                        {{ selectedSegment.level2 }}
                    </span>
                    <span class="px-2 py-1 rounded bg-purple-100 text-purple-700 font-medium">
                        {{ selectedSegment.level3 }}
                    </span>
                </div>
            </div>

            <!-- 诊断内容 -->
            <div class="flex-grow overflow-y-auto p-5 space-y-6">
                <!-- 加载中 -->
                <div v-if="loading" class="flex items-center justify-center py-12">
                  <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  <span class="ml-3 text-gray-500">正在诊断...</span>
                </div>

                <template v-else-if="diagnosisResult">
                  <!-- 健康评分 -->
                  <div class="bg-gradient-to-br from-gray-50 to-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">🩺 综合健康诊断</h4>
                      <div class="flex items-end space-x-3">
                          <span class="text-5xl font-black text-gray-800 tracking-tighter">{{ diagnosisResult.score }}</span>
                          <div class="mb-1">
                            <span :class="['text-lg font-bold', getLevelColor(diagnosisResult.level)]">{{ diagnosisResult.level }}</span>
                            <span class="text-xs text-gray-400 ml-1">({{ diagnosisResult.levelEn }})</span>
                          </div>
                      </div>
                      <div class="mt-4 w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div class="h-full transition-all duration-1000 rounded-full" 
                               :class="diagnosisResult.score >= 80 ? 'bg-green-500' : diagnosisResult.score >= 60 ? 'bg-blue-500' : diagnosisResult.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'"
                               :style="{ width: diagnosisResult.score + '%' }"></div>
                      </div>
                  </div>

                  <!-- 雷达图 -->
                  <div class="bg-white p-4 rounded-xl border border-gray-100">
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">📊 准则层雷达图</h4>
                    <RadarChart :criteriaScores="diagnosisResult.criteriaScores" />
                  </div>

                  <!-- 指标详情 -->
                  <div>
                      <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">📋 生态指标详情</h4>
                      
                      <div v-for="(criteriaData, criteriaKey) in selectedSegment.criteria" :key="criteriaKey" class="mb-4">
                        <div class="text-xs font-medium text-gray-600 mb-2 flex items-center space-x-1">
                          <span class="w-2 h-2 rounded-full" :class="diagnosisResult.criteriaScores?.[criteriaKey]?.score >= 60 ? 'bg-green-500' : 'bg-yellow-500'"></span>
                          <span>{{ CRITERIA_NAMES[criteriaKey] }}</span>
                          <span class="text-gray-400">({{ diagnosisResult.criteriaScores?.[criteriaKey]?.score?.toFixed(1) }}分)</span>
                        </div>
                        <div class="space-y-2 pl-3 border-l-2 border-gray-100">
                          <div v-for="(val, key) in criteriaData" :key="key" class="flex items-center justify-between text-xs">
                            <template v-if="INDICATOR_INFO[key]">
                              <span class="flex items-center space-x-1 text-gray-600">
                                <span>{{ INDICATOR_INFO[key]?.icon }}</span>
                                <span>{{ INDICATOR_INFO[key]?.name }}</span>
                              </span>
                              <div class="flex items-center space-x-2">
                                <span class="font-mono font-medium text-gray-800">{{ getIndicatorDisplay(key, val).value }}</span>
                                <span class="w-2 h-2 rounded-full" :class="getIndicatorStatus(key, val)"></span>
                              </div>
                            </template>
                            <template v-else>
                              <span class="text-gray-500">{{ key }}</span>
                              <span class="font-mono text-gray-700">{{ val }}</span>
                            </template>
                          </div>
                        </div>
                      </div>
                  </div>

                  <!-- 修复策略推荐 -->
                  <div v-if="recommendations.length > 0">
                      <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">💊 修复策略推荐</h4>
                      <div class="space-y-3">
                          <div v-for="(rec, idx) in recommendations" :key="idx" 
                               class="p-4 rounded-xl border" 
                               :class="rec.priority === 1 ? 'bg-red-50 border-red-200' : rec.priority === 2 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'">
                              <div class="flex items-center justify-between mb-2">
                                <span class="text-xs font-bold" :class="rec.priority === 1 ? 'text-red-700' : rec.priority === 2 ? 'text-yellow-700' : 'text-blue-700'">
                                  {{ rec.category }}
                                </span>
                                <span :class="['text-[10px] px-2 py-0.5 rounded-full text-white', getPriorityColor(rec.priority)]">
                                  P{{ rec.priority }}
                                </span>
                              </div>
                              <div class="text-sm font-medium text-gray-800 mb-2">🔍 {{ rec.diagnosis }}</div>
                              <ul class="space-y-1">
                                  <li v-for="(r, i) in rec.recommendations" :key="i" 
                                      class="text-xs text-gray-600 flex items-start space-x-2">
                                      <span class="text-gray-400">•</span>
                                      <span>{{ r }}</span>
                                  </li>
                              </ul>
                          </div>
                      </div>
                  </div>

                  <!-- 导出按钮 -->
                  <div class="pt-4 border-t">
                    <button @click="generatePDFReport" 
                            class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition flex items-center justify-center space-x-2">
                      <span>📄</span>
                      <span>导出诊断报告 (PDF)</span>
                    </button>
                  </div>
                </template>
            </div>
        </div>
      </aside>
    </div>

    <!-- 数据管理弹窗 -->
    <div v-if="showDataMgmt" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showDataMgmt = false"></div>
      <div class="relative w-[90vw] h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <DataManagement @close="showDataMgmt = false; fetchStatistics()" />
      </div>
    </div>
  </div>
</template>

<style>
body {
  font-family: 'Microsoft YaHei', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
