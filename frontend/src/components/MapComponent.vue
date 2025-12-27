<template>
  <div class="relative w-full h-full">
    <div id="map" class="w-full h-full"></div>
    
    <!-- 分层图例 -->
    <div class="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg text-xs border border-gray-100 max-w-[220px]">
      <div class="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center space-x-2">
        <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
        </svg>
        <span>岸线分类图例</span>
      </div>
      
      <!-- 一级分类 -->
      <div class="mb-3">
        <div class="text-[10px] text-gray-400 uppercase tracking-wider mb-2">一级分类</div>
        <div class="flex items-center mb-1">
          <span class="w-8 h-1 bg-gradient-to-r from-green-400 to-yellow-400 mr-2 rounded"></span>
          <span class="text-gray-600">生态岸线</span>
        </div>
        <div class="flex items-center">
          <span class="w-8 h-1 bg-red-500 mr-2 rounded"></span>
          <span class="text-gray-600">非生态岸线</span>
        </div>
      </div>
      
      <!-- 二级分类 -->
      <div class="mb-3">
        <div class="text-[10px] text-gray-400 uppercase tracking-wider mb-2">二级分类</div>
        <div class="flex items-center mb-1">
          <span class="w-3 h-3 bg-green-500 mr-2 rounded-full border-2 border-green-300"></span>
          <span class="text-gray-600">原始自然岸线</span>
        </div>
        <div class="flex items-center mb-1">
          <span class="w-3 h-3 bg-yellow-500 mr-2 rounded-full border-2 border-yellow-300"></span>
          <span class="text-gray-600">近自然岸线</span>
        </div>
        <div class="flex items-center">
          <span class="w-3 h-3 bg-red-500 mr-2 rounded-full border-2 border-red-300"></span>
          <span class="text-gray-600">硬质岸线</span>
        </div>
      </div>
      
      <!-- NPP图例 -->
      <div v-if="showNPP" class="border-t pt-2">
        <div class="text-[10px] text-gray-400 uppercase tracking-wider mb-2">NPP热力图 (gC/m²/a)</div>
        <div class="flex items-center justify-between">
          <div class="w-full h-2 rounded" style="background: linear-gradient(to right, #fee2e2, #fef08a, #bbf7d0, #22c55e);"></div>
        </div>
        <div class="flex justify-between text-[9px] text-gray-400 mt-1">
          <span>0</span>
          <span>150</span>
          <span>300</span>
          <span>450+</span>
        </div>
      </div>
      
      <!-- 三级分类提示 -->
      <div class="text-[10px] text-gray-400 italic border-t pt-2 mt-2">
        点击岸段查看详细微生境类型
      </div>
    </div>
    
    <!-- 图层控制 -->
    <div class="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg text-xs border border-gray-100">
      <div class="font-bold text-gray-700 mb-2">图层控制</div>
      <label class="flex items-center space-x-2 cursor-pointer mb-2">
        <input type="checkbox" v-model="showShorelines" class="rounded text-blue-600">
        <span class="text-gray-600">岸线矢量</span>
      </label>
      <label class="flex items-center space-x-2 cursor-pointer mb-2">
        <input type="checkbox" v-model="showLabels" class="rounded text-blue-600">
        <span class="text-gray-600">名称标注</span>
      </label>
      <label class="flex items-center space-x-2 cursor-pointer mb-2">
        <input type="checkbox" v-model="showNPP" class="rounded text-green-600">
        <span class="text-gray-600">NPP热力图</span>
      </label>
      <div v-if="showNPP" class="mt-2 pt-2 border-t">
        <label class="text-[10px] text-gray-500 block mb-1">透明度</label>
        <input type="range" v-model="nppOpacity" min="0.1" max="1" step="0.1" class="w-full h-1">
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, defineEmits, ref, watch } from 'vue';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import ImageLayer from 'ol/layer/Image';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import ImageCanvasSource from 'ol/source/ImageCanvas';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Stroke, Text, Fill } from 'ol/style';

const emit = defineEmits(['segment-selected']);

const showShorelines = ref(true);
const showLabels = ref(true);
const showNPP = ref(false);
const nppOpacity = ref(0.6);

// API基础地址
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let map;
let vectorLayer;
let nppLayer;

// 生成模拟NPP数据（基于位置的perlin-like噪声）
const generateMockNPP = (x, y, width, height, extent) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  
  // 简单的模拟NPP分布（中心区域较高，边缘较低）
  const centerLon = 113.65;
  const centerLat = 34.81;
  
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      // 将像素坐标转换为地理坐标
      const lon = extent[0] + (extent[2] - extent[0]) * (px / width);
      const lat = extent[3] - (extent[3] - extent[1]) * (py / height);
      
      // 计算距离中心的距离
      const distLon = (lon - centerLon) * 100;
      const distLat = (lat - centerLat) * 100;
      const dist = Math.sqrt(distLon * distLon + distLat * distLat);
      
      // 添加一些噪声
      const noise = Math.sin(lon * 50) * Math.cos(lat * 50) * 0.3 +
                    Math.sin(lon * 120 + lat * 80) * 0.2;
      
      // NPP值：中心高，边缘低，加上噪声
      let npp = Math.max(0, 400 - dist * 30 + noise * 100);
      npp = Math.min(450, npp);
      
      // 根据NPP值设置颜色
      let r, g, b, a;
      if (npp < 100) {
        // 红色到黄色
        const t = npp / 100;
        r = 254;
        g = Math.floor(226 + t * 14);
        b = Math.floor(226 - t * 100);
        a = 180;
      } else if (npp < 250) {
        // 黄色到浅绿
        const t = (npp - 100) / 150;
        r = Math.floor(254 - t * 67);
        g = Math.floor(240 + t * 7);
        b = Math.floor(126 + t * 82);
        a = 180;
      } else {
        // 浅绿到深绿
        const t = Math.min(1, (npp - 250) / 200);
        r = Math.floor(187 - t * 153);
        g = Math.floor(247 - t * 50);
        b = Math.floor(208 - t * 117);
        a = 180;
      }
      
      const idx = (py * width + px) * 4;
      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
      imageData.data[idx + 3] = a;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

// 根据二级分类获取颜色
const getColorByLevel2 = (level2) => {
  const colorMap = {
    '原始自然岸线': '#22c55e',
    '近自然岸线': '#eab308',
    '硬质岸线': '#ef4444'
  };
  return colorMap[level2] || '#6b7280';
};

// 根据三级分类获取线型
const getDashByLevel3 = (level3) => {
  const dashMap = {
    '基岩型': undefined,
    '砂砾质': undefined,
    '泥质': undefined,
    '草甸型': undefined,
    '抛石护岸': [10, 5],
    '铅丝石笼': [8, 4, 2, 4],
    '生态砖': [6, 3],
    '挂壁植被': [4, 2],
    '木桩护岸': [12, 4],
    '混凝土直立式': undefined,
    '浆砌石': [15, 5],
    '钢筋混凝土框架': [5, 5]
  };
  return dashMap[level3];
};

const getStyle = (feature) => {
  const props = feature.getProperties();
  const level2 = props.level2;
  const level3 = props.level3;
  const name = props.name;
  
  const color = getColorByLevel2(level2);
  const lineDash = getDashByLevel3(level3);

  const styles = [
    new Style({
      stroke: new Stroke({
        color: color,
        width: 6,
        lineDash: lineDash
      })
    })
  ];

  if (showLabels.value) {
    styles.push(new Style({
      text: new Text({
        text: name,
        font: '11px "Microsoft YaHei", sans-serif',
        fill: new Fill({ color: '#1f2937' }),
        stroke: new Stroke({ color: '#ffffff', width: 3 }),
        offsetY: -12,
        placement: 'line',
        overflow: true
      })
    }));
  }

  return styles;
};

const selectStyle = [
  new Style({
    stroke: new Stroke({
      color: '#3b82f6',
      width: 10
    })
  }),
  new Style({
    stroke: new Stroke({
      color: '#ffffff',
      width: 4
    })
  })
];

onMounted(() => {
  const zhengzhouCenter = fromLonLat([113.65, 34.81]);

  const vectorSource = new VectorSource({
    url: `${API_BASE}/api/shorelines`,
    format: new GeoJSON()
  });

  vectorLayer = new VectorLayer({
    source: vectorSource,
    style: getStyle,
    zIndex: 10
  });

  // NPP热力图层
  const nppSource = new ImageCanvasSource({
    canvasFunction: (extent, resolution, pixelRatio, size, projection) => {
      const width = Math.round(size[0]);
      const height = Math.round(size[1]);
      
      // 转换extent到经纬度
      const bl = toLonLat([extent[0], extent[1]]);
      const tr = toLonLat([extent[2], extent[3]]);
      const lonLatExtent = [bl[0], bl[1], tr[0], tr[1]];
      
      return generateMockNPP(0, 0, width, height, lonLatExtent);
    },
    ratio: 1
  });

  nppLayer = new ImageLayer({
    source: nppSource,
    opacity: nppOpacity.value,
    visible: showNPP.value,
    zIndex: 5
  });

  map = new Map({
    target: 'map',
    layers: [
      new TileLayer({
        source: new OSM(),
        zIndex: 0
      }),
      nppLayer,
      vectorLayer
    ],
    view: new View({
      center: zhengzhouCenter,
      zoom: 12
    })
  });

  // Handle selection
  map.on('click', (event) => {
    map.forEachFeatureAtPixel(event.pixel, (feature) => {
      const props = feature.getProperties();
      emit('segment-selected', props);
      
      vectorSource.getFeatures().forEach(f => f.setStyle(null));
      feature.setStyle(selectStyle);
      
      return true;
    });
  });
});

watch(showLabels, () => {
  if (vectorLayer) {
    vectorLayer.setStyle(getStyle);
  }
});

watch(showShorelines, (val) => {
  if (vectorLayer) {
    vectorLayer.setVisible(val);
  }
});

watch(showNPP, (val) => {
  if (nppLayer) {
    nppLayer.setVisible(val);
  }
});

watch(nppOpacity, (val) => {
  if (nppLayer) {
    nppLayer.setOpacity(parseFloat(val));
  }
});
</script>

<style scoped>
#map {
  width: 100%;
  height: 100%;
}
</style>
