# ThreeJS Web Editor

这是一个基于 Vue 3 + Vite + Three.js 开发的 Web 端 3D 模型编辑器。它允许用户在浏览器中导入、编辑和预览 3D 模型，支持材质修改、灯光调整、动画编辑、场景搭建等功能。

## ✨ 功能特性

- **模型编辑**：支持 GLTF/GLB 等格式模型的导入与展示。
- **材质管理**：修改模型材质属性，支持多种材质类型。
- **灯光系统**：添加和调整场景灯光（环境光、平行光、点光源等）。
- **动画控制**：播放和控制模型自带的动画。
- **场景编辑**：设置背景、环境贴图等。
- **交互事件**：支持模型点击等交互事件配置。
- **着色器编辑**：支持自定义 Shader 编辑。
- **VR 预览**：支持 VR 模式预览。
- **图表集成**：集成 ECharts 用于数据可视化展示。
- **标签系统**：支持在 3D 场景中添加标签。

## 🛠️ 技术栈

- **核心框架**: [Vue 3](https://vuejs.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **3D 引擎**: [Three.js](https://threejs.org/)
- **UI 组件库**: [Element Plus](https://element-plus.org/)
- **状态管理**: [Pinia](https://pinia.vuejs.org/)
- **路由管理**: [Vue Router](https://router.vuejs.org/)
- **图表库**: [ECharts](https://echarts.apache.org/)

## 🚀 快速开始

### 环境要求

- Node.js (推荐 v16+)
- npm 或 yarn

### 安装依赖

```bash
npm install
# 或者
yarn install
```

### 启动开发服务器

```bash
npm run dev
# 或者
npm run serve
```

访问 `http://localhost:5173` (默认端口) 查看项目。

## 📦 构建与部署

### 开发环境构建

```bash
npm run build
```

### 生产环境构建

```bash
npm run build:pro
```

## 📂 目录结构

```
src/
├── assets/          # 静态资源
├── components/      # 公共组件
│   ├── ModelEditPanel/ # 模型编辑面板组件
│   └── ...
├── config/          # 配置文件
├── layouts/         # 布局组件
├── router/          # 路由配置
├── store/           # Pinia 状态管理
├── style/           # 全局样式
├── utils/           # 工具函数
│   ├── modelEditClass/ # 编辑器核心逻辑类
│   └── ...
├── views/           # 页面视图
│   ├── modelEdit/   # 编辑器主页面
│   ├── modelPreview/# 预览页面
│   └── vrPage/      # VR 页面
└── App.vue          # 根组件
```

## 📄 License

[MIT](LICENSE)