<template>
  <div ref="chartRef" class="w-full h-48"></div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  criteriaScores: {
    type: Object,
    default: () => ({})
  }
})

const chartRef = ref(null)
let chart = null

const CRITERIA_NAMES = {
  structuralStability: '结构稳定性',
  ecologicalHealth: '生态健康性',
  ecologicalSafety: '生态安全性',
  ecologicalService: '生态服务性'
}

const initChart = () => {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  updateChart()
}

const updateChart = () => {
  if (!chart) return
  
  const indicators = Object.keys(CRITERIA_NAMES).map(key => ({
    name: CRITERIA_NAMES[key],
    max: 100
  }))
  
  const values = Object.keys(CRITERIA_NAMES).map(key => {
    return props.criteriaScores[key]?.score || 0
  })
  
  const option = {
    radar: {
      indicator: indicators,
      shape: 'polygon',
      splitNumber: 4,
      axisName: {
        color: '#6b7280',
        fontSize: 10
      },
      splitLine: {
        lineStyle: {
          color: ['#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280']
        }
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(59, 130, 246, 0.05)', 'rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.2)']
        }
      }
    },
    series: [{
      type: 'radar',
      data: [{
        value: values,
        name: '当前河段',
        areaStyle: {
          color: 'rgba(59, 130, 246, 0.3)'
        },
        lineStyle: {
          color: '#3b82f6',
          width: 2
        },
        itemStyle: {
          color: '#3b82f6'
        },
        symbol: 'circle',
        symbolSize: 6
      }]
    }]
  }
  
  chart.setOption(option)
}

onMounted(() => {
  initChart()
})

watch(() => props.criteriaScores, () => {
  updateChart()
}, { deep: true })

onUnmounted(() => {
  if (chart) {
    chart.dispose()
  }
})

// Handle resize
window.addEventListener('resize', () => {
  if (chart) {
    chart.resize()
  }
})
</script>
