<template>
  <div class="p-6 h-full overflow-auto bg-gray-50">
    <div class="max-w-6xl mx-auto">
      <!-- 页面标题 -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">📊 数据管理中心</h1>
          <p class="text-sm text-gray-500">管理岸线数据、批量诊断、数据导入导出</p>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
      </div>

      <!-- 快捷操作 -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <button @click="runBatchDiagnosis" 
                :disabled="batchLoading"
                class="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 rounded-xl hover:from-blue-600 hover:to-indigo-600 transition flex flex-col items-center space-y-2">
          <span class="text-2xl">🩺</span>
          <span class="font-medium">{{ batchLoading ? '诊断中...' : '批量诊断' }}</span>
        </button>
        <button @click="exportData" class="bg-white border-2 border-gray-200 p-4 rounded-xl hover:border-blue-400 transition flex flex-col items-center space-y-2">
          <span class="text-2xl">📤</span>
          <span class="font-medium text-gray-700">导出数据</span>
        </button>
        <label class="bg-white border-2 border-gray-200 p-4 rounded-xl hover:border-green-400 transition flex flex-col items-center space-y-2 cursor-pointer">
          <span class="text-2xl">📥</span>
          <span class="font-medium text-gray-700">导入数据</span>
          <input type="file" accept=".json,.geojson" @change="importData" class="hidden">
        </label>
        <button @click="refreshData" class="bg-white border-2 border-gray-200 p-4 rounded-xl hover:border-purple-400 transition flex flex-col items-center space-y-2">
          <span class="text-2xl">🔄</span>
          <span class="font-medium text-gray-700">刷新数据</span>
        </button>
      </div>

      <!-- 批量诊断结果 -->
      <div v-if="batchResult" class="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 class="text-lg font-bold text-gray-800 mb-4">🩺 批量诊断结果</h2>
        
        <!-- 汇总统计 -->
        <div class="grid grid-cols-5 gap-4 mb-6">
          <div class="bg-blue-50 p-3 rounded-lg text-center">
            <div class="text-2xl font-bold text-blue-700">{{ batchResult.summary.totalSegments }}</div>
            <div class="text-xs text-gray-500">总河段数</div>
          </div>
          <div class="bg-green-50 p-3 rounded-lg text-center">
            <div class="text-2xl font-bold text-green-600">{{ batchResult.summary.avgScore }}</div>
            <div class="text-xs text-gray-500">平均健康分</div>
          </div>
          <div class="bg-emerald-50 p-3 rounded-lg text-center">
            <div class="text-2xl font-bold text-emerald-600">{{ batchResult.summary.goodSegments?.length || 0 }}</div>
            <div class="text-xs text-gray-500">健康河段</div>
          </div>
          <div class="bg-red-50 p-3 rounded-lg text-center">
            <div class="text-2xl font-bold text-red-600">{{ batchResult.summary.criticalSegments?.length || 0 }}</div>
            <div class="text-xs text-gray-500">问题河段</div>
          </div>
          <div class="bg-purple-50 p-3 rounded-lg text-center">
            <div class="text-2xl font-bold text-purple-600">{{ batchResult.summary.totalLength?.toFixed(1) }}</div>
            <div class="text-xs text-gray-500">总长度(km)</div>
          </div>
        </div>

        <!-- 健康等级分布 -->
        <div class="mb-4">
          <div class="text-sm text-gray-600 mb-2">健康等级分布</div>
          <div class="flex space-x-2">
            <div v-for="(count, level) in batchResult.summary.byHealthLevel" :key="level"
                 class="flex-1 p-2 rounded-lg text-center text-sm"
                 :class="level === '优秀' ? 'bg-green-100 text-green-700' : 
                         level === '良好' ? 'bg-blue-100 text-blue-700' : 
                         level === '一般' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'">
              <div class="font-bold">{{ count }}</div>
              <div class="text-xs">{{ level }}</div>
            </div>
          </div>
        </div>

        <!-- 诊断列表 -->
        <div class="max-h-64 overflow-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="p-2 text-left">河段名称</th>
                <th class="p-2 text-left">分类</th>
                <th class="p-2 text-center">得分</th>
                <th class="p-2 text-center">等级</th>
                <th class="p-2 text-center">问题数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in batchResult.results" :key="r.id" class="border-t hover:bg-gray-50">
                <td class="p-2 font-medium">{{ r.name }}</td>
                <td class="p-2 text-gray-500 text-xs">{{ r.level2 }} / {{ r.level3 }}</td>
                <td class="p-2 text-center font-bold" 
                    :class="r.diagnosis.score >= 70 ? 'text-green-600' : r.diagnosis.score >= 50 ? 'text-yellow-600' : 'text-red-600'">
                  {{ r.diagnosis.score }}
                </td>
                <td class="p-2 text-center">
                  <span class="px-2 py-0.5 rounded text-xs"
                        :class="r.diagnosis.level === '优秀' ? 'bg-green-100 text-green-700' : 
                                r.diagnosis.level === '良好' ? 'bg-blue-100 text-blue-700' : 
                                r.diagnosis.level === '一般' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'">
                    {{ r.diagnosis.level }}
                  </span>
                </td>
                <td class="p-2 text-center">
                  <span v-if="r.problemCount > 0" class="text-red-500 font-medium">{{ r.problemCount }}</span>
                  <span v-else class="text-green-500">✓</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 数据列表 -->
      <div class="bg-white rounded-xl shadow-sm border p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold text-gray-800">📋 河段数据列表</h2>
          <div class="text-sm text-gray-500">共 {{ segments.length }} 条记录</div>
        </div>

        <div v-if="loading" class="text-center py-8 text-gray-500">
          <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          加载中...
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="p-3 text-left">ID</th>
                <th class="p-3 text-left">河段名称</th>
                <th class="p-3 text-left">一级分类</th>
                <th class="p-3 text-left">二级分类</th>
                <th class="p-3 text-left">三级分类</th>
                <th class="p-3 text-center">长度(km)</th>
                <th class="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="seg in segments" :key="seg.id" class="border-t hover:bg-gray-50">
                <td class="p-3 text-gray-400">{{ seg.id }}</td>
                <td class="p-3 font-medium">{{ seg.properties.name }}</td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded text-xs"
                        :class="seg.properties.level1 === '生态岸线' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                    {{ seg.properties.level1 }}
                  </span>
                </td>
                <td class="p-3 text-gray-600">{{ seg.properties.level2 }}</td>
                <td class="p-3 text-gray-500 text-xs">{{ seg.properties.level3 }}</td>
                <td class="p-3 text-center">{{ seg.properties.length_km }}</td>
                <td class="p-3 text-center">
                  <button @click="deleteSegment(seg.id)" 
                          class="text-red-500 hover:text-red-700 text-xs">
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

defineEmits(['close'])

// API基础地址
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const segments = ref([])
const loading = ref(false)
const batchLoading = ref(false)
const batchResult = ref(null)

const fetchSegments = async () => {
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/api/shorelines`)
    const data = await res.json()
    segments.value = data.features || []
  } catch (e) {
    console.error('Failed to fetch segments', e)
  } finally {
    loading.value = false
  }
}

const runBatchDiagnosis = async () => {
  batchLoading.value = true
  try {
    const res = await fetch(`${API_BASE}/api/diagnose/batch`)
    batchResult.value = await res.json()
  } catch (e) {
    console.error('Batch diagnosis failed', e)
  } finally {
    batchLoading.value = false
  }
}

const exportData = () => {
  window.open(`${API_BASE}/api/export`, '_blank')
}

const importData = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const text = await file.text()
  try {
    const geojson = JSON.parse(text)
    const mode = confirm('选择导入模式：\n\n确定 = 替换全部数据\n取消 = 追加到现有数据') ? 'replace' : 'append'
    
    const res = await fetch(`${API_BASE}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geojson, mode })
    })
    const result = await res.json()
    alert(`导入成功！${result.message}\n当前共 ${result.totalSegments} 条数据`)
    fetchSegments()
  } catch (e) {
    alert('导入失败：' + e.message)
  }
}

const deleteSegment = async (id) => {
  if (!confirm(`确定删除河段 #${id} 吗？`)) return
  
  try {
    await fetch(`${API_BASE}/api/segments/${id}`, { method: 'DELETE' })
    fetchSegments()
  } catch (e) {
    alert('删除失败')
  }
}

const refreshData = () => {
  fetchSegments()
  batchResult.value = null
}

onMounted(() => {
  fetchSegments()
})
</script>
