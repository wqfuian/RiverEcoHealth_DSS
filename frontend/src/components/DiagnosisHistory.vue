<template>
  <div class="bg-white rounded-xl shadow-sm border p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-sm font-bold text-gray-700">📝 诊断历史记录</h3>
      <button @click="clearHistory" v-if="history.length > 0" 
              class="text-xs text-red-500 hover:text-red-700">清空</button>
    </div>
    
    <div v-if="history.length === 0" class="text-center py-4 text-gray-400 text-sm">
      暂无诊断记录
    </div>
    
    <div v-else class="space-y-2 max-h-48 overflow-auto">
      <div v-for="(item, idx) in history" :key="idx" 
           @click="$emit('select', item)"
           class="p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition border border-transparent hover:border-blue-200">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-medium text-gray-800 text-sm">{{ item.name }}</div>
            <div class="text-[10px] text-gray-500">{{ item.level2 }} / {{ item.level3 }}</div>
          </div>
          <div class="text-right">
            <div class="font-bold text-lg" 
                 :class="item.score >= 70 ? 'text-green-600' : item.score >= 50 ? 'text-yellow-600' : 'text-red-600'">
              {{ item.score }}
            </div>
            <div class="text-[10px]" 
                 :class="item.level === '优秀' ? 'text-green-500' : item.level === '良好' ? 'text-blue-500' : item.level === '一般' ? 'text-yellow-500' : 'text-red-500'">
              {{ item.level }}
            </div>
          </div>
        </div>
        <div class="text-[9px] text-gray-400 mt-1">
          {{ formatTime(item.timestamp) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  currentDiagnosis: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['select'])

const history = ref([])
const STORAGE_KEY = 'diagnosis_history'
const MAX_HISTORY = 20

// 加载历史记录
const loadHistory = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      history.value = JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load history', e)
  }
}

// 保存历史记录
const saveHistory = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
  } catch (e) {
    console.error('Failed to save history', e)
  }
}

// 添加新记录
const addToHistory = (diagnosis) => {
  if (!diagnosis || !diagnosis.name) return
  
  // 检查是否已存在相同记录（同一河段同一得分）
  const exists = history.value.find(h => 
    h.name === diagnosis.name && 
    Math.abs(new Date(h.timestamp) - new Date(diagnosis.timestamp)) < 60000
  )
  if (exists) return
  
  history.value.unshift(diagnosis)
  
  // 限制历史记录数量
  if (history.value.length > MAX_HISTORY) {
    history.value = history.value.slice(0, MAX_HISTORY)
  }
  
  saveHistory()
}

// 清空历史
const clearHistory = () => {
  if (confirm('确定清空所有诊断历史记录？')) {
    history.value = []
    saveHistory()
  }
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 监听新诊断结果
watch(() => props.currentDiagnosis, (newDiag) => {
  if (newDiag && newDiag.name) {
    addToHistory(newDiag)
  }
}, { deep: true })

onMounted(() => {
  loadHistory()
})

// 暴露方法给父组件
defineExpose({
  addToHistory
})
</script>
