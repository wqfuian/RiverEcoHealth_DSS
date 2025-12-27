# 河湖岸线生态健康诊断系统 - 部署指南

## 方案A：Vercel + Render 免费部署（推荐）

### 1. 部署后端到 Render

1. 访问 https://render.com 并注册账号
2. 点击 "New" → "Web Service"
3. 连接 GitHub 仓库（需先将代码推送到GitHub）
4. 配置：
   - **Name**: river-eco-backend
   - **Root Directory**: backend_node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. 部署后获取URL，如：`https://river-eco-backend.onrender.com`

### 2. 部署前端到 Vercel

1. 访问 https://vercel.com 并注册账号
2. 导入 GitHub 仓库
3. 配置：
   - **Root Directory**: frontend
   - **Framework Preset**: Vue.js
   - **Build Command**: `npm run build`
   - **Output Directory**: dist
4. 设置环境变量：
   - `VITE_API_URL`: 后端Render地址

### 3. 修改前端API地址

在 `frontend/src/App.vue` 中替换所有 `http://localhost:8000` 为：
```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
```

---

## 方案B：Docker 容器化部署

### docker-compose.yml

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  backend:
    build: ./backend_node
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
```

### 后端 Dockerfile (backend_node/Dockerfile)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8000
CMD ["npm", "start"]
```

### 前端 Dockerfile (frontend/Dockerfile)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## 快速推送到GitHub

```bash
cd RiverEcoHealth_DSS
git init
git add .
git commit -m "Initial commit: River Eco-Health DSS v2.0"
git remote add origin https://github.com/YOUR_USERNAME/RiverEcoHealth_DSS.git
git push -u origin main
```

---

## 注意事项

1. **冷启动**: Render免费版有冷启动延迟(10-30秒)，首次访问需等待
2. **数据持久化**: 免费版重启后数据会重置，生产环境需接入数据库
3. **CORS**: 已配置允许跨域，部署后无需额外设置
