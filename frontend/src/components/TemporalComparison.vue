<template>
  <div class="bg-white rounded-xl shadow-sm border p-4">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-sm font-bold text-gray-700">📅 多时相模拟对比</h3>
      <div class="flex items-center space-x-2">
        <span class="text-xs text-gray-500">年份:</span>
        <select v-model="selectedYear" class="text-sm border rounded px-2 py-1 bg-white">
          <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>
    </div>
    
    <!-- 年份滑块 -->
    <div class="mb-4">
      <input type="range" 
             v-model="selectedYear" 
             :min="years[0]" 
             :max="years[years.length-1]" 
             :step="1"
             class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
      <div class="flex justify-between text-[10px] text-gray-400 mt-1">
        <span v-for="year in years" :key="year">{{ year }}</span>
      </div>
    </div>
    
    <!-- 模拟变化趋势 -->
    <div class="grid grid-cols-3 gap-3 mb-4">
      <div class="bg-blue-50 p-3 rounded-lg text-center">
        <div class="text-lg font-bold" :class="getTrendColor('ecoRate')">
          {{ getSimulatedValue('ecoRate') }}%
        </div>
        <div class="text-[10px] text-gray-500">生态岸线率</div>
        <div class="text-[9px]" :class="getTrendClass('ecoRate')">
          {{ getTrendText('ecoRate') }}
        </div>
      </div>
      <div class="bg-green-50 p-3 rounded-lg text-center">
        <div class="text-lg font-bold" :class="getTrendColor('avgHealth')">
          {{ getSimulatedValue('avgHealth') }}
        </div>
        <div class="text-[10px] text-gray-500">平均健康分</div>
        <div class="text-[9px]" :class="getTrendClass('avgHealth')">
          {{ getTrendText('avgHealth') }}
        </div>
      </div>
      <div class="bg-purple-50 p-3 rounded-lg text-center">
        <div class="text-lg font-bold" :class="getTrendColor('avgNPP')">
          {{ getSimulatedValue('avgNPP') }}
        </div>
        <div class="text-[10px] text-gray-500">平均NPP</div>
        <div class="text-[9px]" :class="getTrendClass('avgNPP')">
          {{ getTrendText('avgNPP') }}
        </div>
      </div>
    </div>
    
    <!-- 趋势图 -->
    <div ref="chartRef" class="w-full h-32"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  baseStatistics: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['year-change'])

const years = [2021, 2022, 2023, 2024, 2025]
const selectedYear = ref(2025)
const chartRef = ref(null)
let chart = null

// 模拟各年份数据（基于2025年数据添加随机变化）
const simulatedData = computed(() => {
  const base = {
    ecoRate: props.baseStatistics.ecoShorelineRate || 67,
    avgHealth: props.baseStatistics.avgHealthScore || 58,
    avgNPP: 220
  }
  
  return years.map(year => {
    const yearDiff = year - 2025
    return {
      year,
      ecoRate: Math.round(base.ecoRate + yearDiff * 3 + Math.sin(year) * 2),
      avgHealth: Math.round((base.avgHealth + yearDiff * 4 + Math.cos(year) * 3) * 10) / 10,
      avgNPP: Math.round(base.avgNPP + yearDiff * 15 + Math.sin(year * 2) * 10)
    }
  })
})

const currentYearData = computed(() => {
  return simulatedData.value.find(d => d.year === parseInt(selectedYear.value)) || simulatedData.value[4]
})

const getSimulatedValue = (key) => {
  return currentYearData.value[key]
}

const getTrendColor = (key) => {
  const current = currentYearData.value[key]
  const prev = simulatedData.value.find(d => d.year === parseInt(selectedYear.value) - 1)
  if (!prev) return 'text-gray-700'
  
  const diff = current - prev[key]
  if (key === 'ecoRate' || key === 'avgHealth' || key === 'avgNPP') {
    return diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-600'
  }
  return 'text-gray-700'
}

const getTrendClass = (key) => {
  const current = currentYearData.value[key]
  const prev = simulatedData.value.find(d => d.year === parseInt(selectedYear.value) - 1)
  if (!prev) return 'text-gray-400'
  
  const diff = current - prev[key]
  return diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-gray-400'
}

const getTrendText = (key) => {
  const current = currentYearData.value[key]
  const prev = simulatedData.value.find(d => d.year === parseInt(selectedYear.value) - 1)
  if (!prev) return '基准年'
  
  const diff = current - prev[key]
  if (diff > 0) return `↑ +${diff.toFixed(1)}`
  if (diff < 0) return `↓ ${diff.toFixed(1)}`
  return '→ 持平'
}

const initChart = () => {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  updateChart()
}

const updateChart = () => {
  if (!chart) return
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['生态岸线率', '健康得分'],
      bottom: 0,
      textStyle: { fontSize: 10 }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '25%',
      top: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: years,
      axisLabel: { fontSize: 10 }
    },
    yAxis: [
      {
        type: 'value',
        name: '%',
        max: 100,
        axisLabel: { fontSize: 9 }
      }
    ],
    series: [
      {
        name: '生态岸线率',
        type: 'line',
        data: simulatedData.value.map(d => d.ecoRate),
        smooth: true,
        lineStyle: { color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
          ])
        }
      },
      {
        name: '健康得分',
        type: 'line',
        data: simulatedData.value.map(d => d.avgHealth),
        smooth: true,
        lineStyle: { color: '#22c55e' },
        itemStyle: { color: '#22c55e' }
      }
    ]
  }
  
  chart.setOption(option)
  
  // 标记当前年份
  chart.dispatchAction({
    type: 'showTip',
    seriesIndex: 0,
    dataIndex: years.indexOf(parseInt(selectedYear.value))
  })
}

watch(selectedYear, (val) => {
  emit('year-change', parseInt(val))
  updateChart()
})

watch(() => props.baseStatistics, () => {
  updateChart()
}, { deep: true })

onMounted(() => {
  initChart()
})
</script>
