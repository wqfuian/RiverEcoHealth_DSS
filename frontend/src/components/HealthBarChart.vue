<template>
  <div ref="chartRef" class="w-full h-36"></div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  healthScores: {
    type: Array,
    default: () => []
  }
})

const chartRef = ref(null)
let chart = null

const initChart = () => {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  updateChart()
}

const updateChart = () => {
  if (!chart || !props.healthScores.length) return
  
  // 按得分排序
  const sortedData = [...props.healthScores].sort((a, b) => b.score - a.score)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const d = params[0]
        return `${d.name}<br/>健康得分: <b>${d.value}</b> (${sortedData[d.dataIndex].level})`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: sortedData.map(d => d.name.replace(/贾鲁河|索须河|金水河/g, '')),
      axisLabel: {
        fontSize: 9,
        rotate: 30,
        color: '#6b7280'
      }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        fontSize: 10,
        color: '#9ca3af'
      }
    },
    series: [{
      type: 'bar',
      data: sortedData.map(d => ({
        value: d.score,
        itemStyle: {
          color: d.score >= 70 ? '#22c55e' : d.score >= 50 ? '#eab308' : '#ef4444',
          borderRadius: [4, 4, 0, 0]
        }
      })),
      barWidth: '60%'
    }]
  }
  
  chart.setOption(option)
}

onMounted(() => {
  initChart()
})

watch(() => props.healthScores, () => {
  updateChart()
}, { deep: true })

onUnmounted(() => {
  if (chart) {
    chart.dispose()
  }
})
</script>
