<template>
  <div ref="chartRef" class="w-full h-40"></div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  statistics: {
    type: Object,
    default: () => ({})
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
  if (!chart || !props.statistics.byLevel2) return
  
  const data = Object.entries(props.statistics.byLevel2).map(([name, value]) => ({
    name,
    value
  }))
  
  const colorMap = {
    '原始自然岸线': '#22c55e',
    '近自然岸线': '#eab308',
    '硬质岸线': '#ef4444'
  }
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 段 ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 4,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}\n{d}%',
        fontSize: 10,
        color: '#374151'
      },
      labelLine: {
        show: true,
        length: 10,
        length2: 8
      },
      data: data.map(item => ({
        ...item,
        itemStyle: {
          color: colorMap[item.name] || '#6b7280'
        }
      }))
    }]
  }
  
  chart.setOption(option)
}

onMounted(() => {
  initChart()
})

watch(() => props.statistics, () => {
  updateChart()
}, { deep: true })

onUnmounted(() => {
  if (chart) {
    chart.dispose()
  }
})
</script>
