import * as THREE from "three"; //导入整个 three.js核心库
import { toRaw } from "vue";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"; //导入控制器模块，轨道控制器
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"; //导入GLTF模块，模型解析器,根据文件格式来定
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import { USDZExporter } from "three/addons/exporters/USDZExporter.js";
import { ElMessage } from "element-plus";
import { onlyKey, getAssetsFile } from "@/utils/utilityFunction";
import modulesPrototype from "./modelEditClass/index";
import TWEEN from "@tweenjs/tween.js";
import { vertexShader, fragmentShader } from "@/config/constant.js";
import { findObjectInScene } from "@/utils/utilityFunction";
import shaderModules from "./modelEditClass/shaderModules";
import backgroundModules from "./modelEditClass/backgroundModules";
import lightModules from "./modelEditClass/lightModules";
import materialModules from "./modelEditClass/materialModules";
import eventModules from "./modelEditClass/eventModules";
import { useMeshEditStore } from "@/store/meshEditStore";

const colors = ["#FF4500", "#90EE90", "#00CED1", "#1E90FF", "#C71585", "#FF4500", "#FAD400", "#1F93FF", "#90F090", "#C71585"];
class renderModel {
  constructor(selector) {
    this.container = document.querySelector(selector);
    // 相机
    this.camera;
    // 场景
    this.scene = null;
    //渲染器
    this.renderer;
    // 控制器
    this.controls;
    // 模型
    this.model;
    // 几何体模型数组
    this.geometryGroup = new THREE.Group();
    // 多模型数组
    this.manyModelGroup = new THREE.Group();
    // 已加载模型列表（用于预览和导出）
    this.loadedModels = [];
    // 加载进度监听
    this.loadingManager = new THREE.LoadingManager();
    //文件加载器类型
    this.fileLoaderMap = {
      glb: new GLTFLoader(),
      fbx: new FBXLoader(this.loadingManager),
      gltf: new GLTFLoader(),
      obj: new OBJLoader(this.loadingManager),
      stl: new STLLoader()
    };
    //模型动画列表
    this.modelAnimation = [];
    //模型动画对象
    this.animationMixer;
    this.animationClock = new THREE.Clock();
    //动画帧
    this.animationFrame = null;
    // 轴动画帧
    this.rotationAnimationFrame = null;
    // 动画构造器
    this.animateClipAction = null;
    // 动画循环方式枚举
    this.loopMap = {
      LoopOnce: THREE.LoopOnce,
      LoopRepeat: THREE.LoopRepeat,
      LoopPingPong: THREE.LoopPingPong
    };
    // 网格辅助线
    this.gridHelper;
    // 坐标轴辅助线
    this.axesHelper;
    // 环境光
    this.ambientLight;
    //平行光
    this.directionalLight;
    // 平行光辅助线
    this.directionalLightHelper;
    // 点光源
    this.pointLight;
    //点光源辅助线
    this.pointLightHelper;
    //聚光灯
    this.spotLight;
    //聚光灯辅助线
    this.spotLightHelper;
    //模型平面
    this.planeGeometry;
    //模型材质列表
    this.modelMaterialList = [];
    // 模型材质原始数据缓存
    this.originalMaterials = new Map();
    // 效果合成器
    this.effectComposer;
    this.outlinePass;
    // 动画渲染器
    this.renderAnimation = null;
    // 碰撞检测
    this.raycaster = new THREE.Raycaster();
    // 鼠标位置
    this.mouse = new THREE.Vector2();
    // 辉光效果合成器
    this.glowComposer;
    this.glowRenderPass;
    // 辉光渲染器
    this.unrealBloomPass;
    // 辉光着色器
    this.shaderPass;
    // 需要辉光的材质
    this.glowMaterialList;
    this.materials = {};
    // 拖拽对象控制器
    this.transformControls;
    // 是否开启辉光
    this.glowUnrealBloomPass = false;
    // 窗口变化监听事件
    this.onWindowResizesListener;
    // 鼠标点击事件
    this.onMouseClickListener;
    // 模型上传进度条回调函数
    this.modelProgressCallback = e => e;
    // 当前拖拽的几何模型
    this.dragGeometryModel = {};
    // 当前模型加载状态
    this.loadingStatus = true;
    // 3d文字渲染器
    this.css3DRenderer = null;
    // 3d文字控制器
    this.css3dControls = null;
    // 当前拖拽标签信息
    this.dragTag = {};
    //当前标签列表
    this.dragTagList = [];
    // 自定义数据标注（按对象 uuid 存储），结构：{ [uuid]: [{ id, name, value, unit }] }
    this.customDataMap = {};
    // 自定义数据对应的 3D 文本对象（uuid -> CSS3DObject）
    this.customDataLabelMap = {};
    // 自定义数据标签的显示配置（按对象 uuid 存储），结构：{ [uuid]: { fontSize, offsetX, offsetY, offsetZ, scale } }
    this.customDataLabelConfigMap = {};
    // 自定义数据标签的引线对象（uuid -> THREE.Line）
    this.customDataLabelLineMap = {};
    // 当前选中的用于显示自定义数据的对象 uuid（通常是子模型）
    this.activeCustomDataUuid = null;
    // 是否一直显示所有自定义数据标签（不依赖选中状态）
    this.alwaysShowCustomDataLabels = false;
    // 当前拖拽模型信息
    this.activeDragManyModel = {};
    // 背景模块实例
    this.backgroundModules = new backgroundModules();
    // 着色器模块实例
    this.shaderModules = new shaderModules();
    // 灯光模块实例
    this.lightModules = new lightModules();
    // 材质模块实例
    this.materialModules = new materialModules();

    // 拖拽移动相关
    this.isDragging = false;
    this.dragPlane = new THREE.Plane();
    this.dragOffset = new THREE.Vector3();
    this.dragIntersection = new THREE.Vector3();
    // 当前拖拽目标（可能是主模型或 manyModelGroup 的子模型）
    this.dragTarget = null;
  }

  /**
   * ======================
   * 自定义数据标注相关方法
   * ======================
   */

  /**
   * 确保 CSS3DRenderer 已挂载到容器（用于自定义数据标签）
   */
  ensureCss3DRendererMountedForCustomData() {
    if (!this.css3DRenderer || !this.container) return;
    if (!this.css3DRenderer.domElement.parentNode) {
      this.container.appendChild(this.css3DRenderer.domElement);
    }
  }

  /**
   * 内部：根据当前 customDataMap 为指定对象创建/更新 3D 标签
   * @param {string} uuid
   */
  updateCustomDataLabel(uuid) {
    if (!uuid) return;
    // 如果不是一直显示模式，仅对当前选中的对象显示标签
    if (!this.alwaysShowCustomDataLabels && this.activeCustomDataUuid && uuid !== this.activeCustomDataUuid) {
      // 如果不是当前活动对象，则移除其标签
      const oldLabel = this.customDataLabelMap[uuid];
      if (oldLabel) {
        this.scene.remove(oldLabel);
        if (oldLabel.element && oldLabel.element.parentNode) {
          oldLabel.element.parentNode.removeChild(oldLabel.element);
        }
        delete this.customDataLabelMap[uuid];
      }
      // 同时移除引线
      const oldLine = this.customDataLabelLineMap[uuid];
      if (oldLine) {
        this.scene.remove(oldLine);
        oldLine.geometry.dispose();
        oldLine.material.dispose();
        delete this.customDataLabelLineMap[uuid];
      }
      return;
    }
    const list = this.customDataMap[uuid] || [];

    // 如果没有数据且已有标签，则移除
    if (!list.length) {
      const oldLabel = this.customDataLabelMap[uuid];
      if (oldLabel) {
        this.scene.remove(oldLabel);
        if (oldLabel.element && oldLabel.element.parentNode) {
          oldLabel.element.parentNode.removeChild(oldLabel.element);
        }
        delete this.customDataLabelMap[uuid];
      }
      // 同时移除引线
      const oldLine = this.customDataLabelLineMap[uuid];
      if (oldLine) {
        this.scene.remove(oldLine);
        oldLine.geometry.dispose();
        oldLine.material.dispose();
        delete this.customDataLabelLineMap[uuid];
      }
      return;
    }

    const obj = this.scene.getObjectByProperty("uuid", uuid);
    if (!obj) return;

    this.ensureCss3DRendererMountedForCustomData();

    // 计算对象中心位置
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // 获取标签显示配置（默认值）
    const config = this.customDataLabelConfigMap[uuid] || {};
    const fontSize = config.fontSize != null ? config.fontSize : 11;
    const offsetX = config.offsetX != null ? config.offsetX : 0;
    const offsetY = config.offsetY != null ? config.offsetY : size.y * 0.6 || 0.5;
    const offsetZ = config.offsetZ != null ? config.offsetZ : 0;
    const scale = config.scale != null ? config.scale : 0.01;
    const showLine = config.showLine != null ? config.showLine : true;
    const lineColor = config.lineColor != null ? config.lineColor : "#ffffff";

    // 生成显示文本：一行一个“名称: 值 单位”
    const lines = list.map(item => {
      const name = item.name || "参数";
      const value = item.value != null ? item.value : "";
      const unit = item.unit || "";
      return `${name}: ${value}${unit ? " " + unit : ""}`;
    });

    // 复用或创建 DOM
    let labelObject = this.customDataLabelMap[uuid];
    let element;
    if (labelObject) {
      element = labelObject.element;
      element.innerHTML = "";
    } else {
      element = document.createElement("div");
      element.className = "custom-data-label";
      Object.assign(element.style, {
        minWidth: "120px",
        maxWidth: "220px",
        padding: "6px 10px",
        borderRadius: "4px",
        background: "rgba(0, 0, 0, 0.75)",
        color: "#e5eaf3",
        lineHeight: "1.4",
        boxShadow: "0 0 6px rgba(0,0,0,0.6)",
        pointerEvents: "none",
        backdropFilter: "blur(2px)",
        whiteSpace: "pre-line",
        textAlign: "left"
      });
    }

    // 应用字体大小
    element.style.fontSize = `${fontSize}px`;

    lines.forEach(text => {
      const lineDom = document.createElement("div");
      lineDom.textContent = text;
      element.appendChild(lineDom);
    });

    if (!labelObject) {
      labelObject = new CSS3DObject(element);
      labelObject.element = element;
      this.customDataLabelMap[uuid] = labelObject;
      this.scene.add(labelObject);
    }

    // 应用位置偏移和缩放
    const labelPosition = center.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));
    labelObject.position.copy(labelPosition);
    labelObject.scale.set(scale, scale, scale);

    // 创建或更新引线
    if (showLine && (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0)) {
      let line = this.customDataLabelLineMap[uuid];
      if (!line) {
        // 创建引线几何体和材质
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ color: lineColor, linewidth: 1 });
        line = new THREE.Line(geometry, material);
        this.customDataLabelLineMap[uuid] = line;
        this.scene.add(line);
      } else {
        // 更新引线颜色
        line.material.color.set(lineColor);
      }
      
      // 更新引线位置：从模型中心到标签位置
      const points = [center, labelPosition];
      line.geometry.setFromPoints(points);
    } else {
      // 如果不需要显示引线或偏移为0，则移除引线
      const oldLine = this.customDataLabelLineMap[uuid];
      if (oldLine) {
        this.scene.remove(oldLine);
        oldLine.geometry.dispose();
        oldLine.material.dispose();
        delete this.customDataLabelLineMap[uuid];
      }
    }
  }

  /**
   * 由外部（如材质点击逻辑）调用，当选中 mesh 变化时更新可见的自定义数据标签
   * @param {string|null} uuid 选中的对象 uuid；null/空则隐藏所有自定义数据标签
   */
  onSelectedMeshChanged(uuid) {
    this.activeCustomDataUuid = uuid || null;
    
    // 如果开启了一直显示模式，更新所有有数据的对象的标签
    if (this.alwaysShowCustomDataLabels) {
      Object.keys(this.customDataMap).forEach(key => {
        if (this.customDataMap[key] && this.customDataMap[key].length > 0) {
          this.updateCustomDataLabel(key);
        }
      });
      return;
    }
    
    // 清理所有已有标签
    Object.keys(this.customDataLabelMap).forEach(key => {
      const label = this.customDataLabelMap[key];
      if (label) {
        this.scene.remove(label);
        if (label.element && label.element.parentNode) {
          label.element.parentNode.removeChild(label.element);
        }
      }
      delete this.customDataLabelMap[key];
      // 同时清理引线
      const line = this.customDataLabelLineMap[key];
      if (line) {
        this.scene.remove(line);
        line.geometry.dispose();
        line.material.dispose();
        delete this.customDataLabelLineMap[key];
      }
    });

    // 若当前有选中对象且存在自定义数据，则为其重新创建标签
    if (this.activeCustomDataUuid && this.customDataMap[this.activeCustomDataUuid]?.length) {
      this.updateCustomDataLabel(this.activeCustomDataUuid);
    }
  }

  /**
   * 获取指定对象的自定义数据列表
   * @param {string} uuid three 对象 uuid
   * @returns {Array<{id:string,name:string,value:string,unit:string}>}
   */
  getCustomDataForObject(uuid) {
    if (!uuid) return [];
    return this.customDataMap[uuid] ? [...this.customDataMap[uuid]] : [];
  }

  /**
   * 为指定对象新增一条自定义数据
   * @param {string} uuid three 对象 uuid
   * @param {{name?:string,value?:string,unit?:string}} payload
   * @returns {{id:string,name:string,value:string,unit:string}|null}
   */
  addCustomDataForObject(uuid, payload = {}) {
    if (!uuid) return null;
    if (!this.customDataMap[uuid]) {
      this.customDataMap[uuid] = [];
    }
    const id = `${uuid}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const item = {
      id,
      name: payload.name || "",
      value: payload.value || "",
      unit: payload.unit || ""
    };
    this.customDataMap[uuid].push(item);

    // 同步写入 three 对象 userData，便于后续导出/运行时使用
    const obj = this.scene.getObjectByProperty("uuid", uuid);
    if (obj) {
      if (!obj.userData) obj.userData = {};
      obj.userData.customData = this.customDataMap[uuid];
    }
    // 创建/更新可视化标签
    this.updateCustomDataLabel(uuid);
    return item;
  }

  /**
   * 删除指定对象的一条自定义数据
   * @param {string} uuid three 对象 uuid
   * @param {string} id 数据项 id
   */
  removeCustomDataForObject(uuid, id) {
    if (!uuid || !this.customDataMap[uuid]) return;
    this.customDataMap[uuid] = this.customDataMap[uuid].filter(item => item.id !== id);
    const obj = this.scene.getObjectByProperty("uuid", uuid);
    if (obj) {
      if (!obj.userData) obj.userData = {};
      obj.userData.customData = this.customDataMap[uuid];
    }
    this.updateCustomDataLabel(uuid);
  }

  /**
   * 批量更新指定对象的自定义数据列表
   * @param {string} uuid three 对象 uuid
   * @param {Array<{id:string,name:string,value:string,unit:string}>} list
   */
  updateCustomDataForObject(uuid, list = []) {
    if (!uuid) return;
    this.customDataMap[uuid] = (list || []).map(item => ({
      id: item.id || `${uuid}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name: item.name || "",
      value: item.value || "",
      unit: item.unit || ""
    }));
    const obj = this.scene.getObjectByProperty("uuid", uuid);
    if (obj) {
      if (!obj.userData) obj.userData = {};
      obj.userData.customData = this.customDataMap[uuid];
    }
    this.updateCustomDataLabel(uuid);
  }

  /**
   * 获取指定对象的标签显示配置
   * @param {string} uuid three 对象 uuid
   * @returns {{fontSize:number,offsetX:number,offsetY:number,offsetZ:number,scale:number}}
   */
  getCustomDataLabelConfig(uuid) {
    if (!uuid) return null;
    const config = this.customDataLabelConfigMap[uuid];
    if (config) {
      return { ...config };
    }
    // 返回默认配置
    const obj = this.scene.getObjectByProperty("uuid", uuid);
    if (!obj) return null;
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    return {
      fontSize: 11,
      offsetX: 0,
      offsetY: size.y * 0.6 || 0.5,
      offsetZ: 0,
      scale: 0.01,
      showLine: true,
      lineColor: "#ffffff"
    };
  }

  /**
   * 更新指定对象的标签显示配置
   * @param {string} uuid three 对象 uuid
   * @param {{fontSize?:number,offsetX?:number,offsetY?:number,offsetZ?:number,scale?:number}} config
   */
  updateCustomDataLabelConfig(uuid, config = {}) {
    if (!uuid) return;
    if (!this.customDataLabelConfigMap[uuid]) {
      this.customDataLabelConfigMap[uuid] = {};
    }
    // 合并配置
    Object.assign(this.customDataLabelConfigMap[uuid], config);
    // 同步到 three 对象 userData
    const obj = this.scene.getObjectByProperty("uuid", uuid);
    if (obj) {
      if (!obj.userData) obj.userData = {};
      if (!obj.userData.customDataLabelConfig) obj.userData.customDataLabelConfig = {};
      Object.assign(obj.userData.customDataLabelConfig, this.customDataLabelConfigMap[uuid]);
    }
    // 更新标签显示
    this.updateCustomDataLabel(uuid);
  }

  /**
   * 设置是否一直显示所有自定义数据标签
   * @param {boolean} alwaysShow 是否一直显示
   */
  setAlwaysShowCustomDataLabels(alwaysShow) {
    this.alwaysShowCustomDataLabels = alwaysShow;
    
    if (alwaysShow) {
      // 开启一直显示模式：为所有有数据的对象创建/更新标签
      Object.keys(this.customDataMap).forEach(uuid => {
        if (this.customDataMap[uuid] && this.customDataMap[uuid].length > 0) {
          this.updateCustomDataLabel(uuid);
        }
      });
    } else {
      // 关闭一直显示模式：只显示当前选中对象的标签
      // 清理所有标签
      Object.keys(this.customDataLabelMap).forEach(key => {
        const label = this.customDataLabelMap[key];
        if (label) {
          this.scene.remove(label);
          if (label.element && label.element.parentNode) {
            label.element.parentNode.removeChild(label.element);
          }
        }
        delete this.customDataLabelMap[key];
      });
      
      // 如果当前有选中对象且存在自定义数据，则为其创建标签
      if (this.activeCustomDataUuid && this.customDataMap[this.activeCustomDataUuid]?.length) {
        this.updateCustomDataLabel(this.activeCustomDataUuid);
      }
    }
  }

  /**
   * 获取是否一直显示所有自定义数据标签
   * @returns {boolean}
   */
  getAlwaysShowCustomDataLabels() {
    return this.alwaysShowCustomDataLabels;
  }

  /**
   * 从 three 对象的 userData 恢复自定义数据和标签配置（用于加载已保存的场景）
   * @param {THREE.Object3D} obj three 对象
   */
  restoreCustomDataFromUserData(obj) {
    if (!obj || !obj.uuid) return;
    // 恢复自定义数据
    if (obj.userData?.customData && Array.isArray(obj.userData.customData)) {
      this.customDataMap[obj.uuid] = obj.userData.customData.map(item => ({
        id: item.id || `${obj.uuid}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        name: item.name || "",
        value: item.value != null ? String(item.value) : "",
        unit: item.unit || ""
      }));
    }
    // 恢复标签显示配置
    if (obj.userData?.customDataLabelConfig) {
      this.customDataLabelConfigMap[obj.uuid] = { ...obj.userData.customDataLabelConfig };
    }
  }

  init() {
    return new Promise(async resolve => {
      this.initRender();
      this.initCamera();
      this.initScene();
      this.initControls();
      this.initViewPoints();  // 保持已添加
      // 创建辅助线
      this.createHelper();
      // 创建灯光
      this.createLight();
      this.addEvenListMouseListener();
      const load = await this.loadModel({ filePath: "/threeFile/glb/glb-7.glb", fileType: "glb" });
      // 创建效果合成器
      this.createEffectComposer();
      //场景渲染
      this.sceneAnimation();
      resolve(load);
    });
  }
  // 创建场景
  async initScene() {
    this.scene = new THREE.Scene();
    const texture = new THREE.TextureLoader().load(getAssetsFile("image/view-4.png"));
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.SRGBColorSpace = THREE.SRGBColorSpace;
    this.scene.background = texture;
    this.scene.environment = texture;
    this.scene.backgroundIntensity = 1;
    this.scene.backgroundBlurriness = 1;
    texture.dispose();
  }
  // 创建相机
  initCamera() {
    const { clientHeight, clientWidth } = this.container;
    this.camera = new THREE.PerspectiveCamera(50, clientWidth / clientHeight, 0.05, 10000);
  }
  // 创建渲染器
  initRender() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); //设置抗锯齿
    //设置屏幕像素比
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    //渲染的尺寸大小
    const { clientHeight, clientWidth } = this.container;
    this.renderer.setSize(clientWidth, clientHeight);
    //色调映射
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.autoClear = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    //曝光
    this.renderer.toneMappingExposure = 2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 创建一个CSS3DRenderer
    this.css3DRenderer = new CSS3DRenderer();
    this.css3DRenderer.setSize(clientWidth, clientHeight);
    this.css3DRenderer.domElement.style.position = "absolute";
    this.css3DRenderer.domElement.style.pointerEvents = "none";
    this.css3DRenderer.domElement.style.top = 0;
    this.container.appendChild(this.css3DRenderer.domElement);
  }
  // 更新场景
  sceneAnimation() {
    this.renderAnimation = requestAnimationFrame(() => this.sceneAnimation());
    // 等模型加载和相关数据处理完成在执行
    if (this.loadingStatus) {
      //辉光效果开关开启时执行
      if (this.glowUnrealBloomPass) {
        // 将不需要处理辉光的材质进行存储备份
        this.setMeshFlow();
      } else {
        this.effectComposer.render();
        this.controls.update();
      }
      TWEEN.update();  // ✅ 这一行很重要，驱动所有 TWEEN 动画
      this.shaderModules.updateAllShaderTime();
      // 3d标签渲染器（包含：拖拽标签 + 自定义数据标签 + 图表）
      if (this.dragTagList.length || Object.keys(this.customDataLabelMap || {}).length || Object.keys(this.chartRegistry || {}).length) {
        this.css3DRenderer.render(this.scene, this.camera);
        this.css3dControls.update();
      }
    }
  }
  // 监听事件
  addEvenListMouseListener() {
    //监听场景大小改变，跳转渲染尺寸
    this.onWindowResizesListener = this.onWindowResizes.bind(this);
    window.addEventListener("resize", this.onWindowResizesListener);
    // 鼠标点击
    this.onMouseClickListener = this.materialModules.onMouseClickModel.bind(this);
    this.container.addEventListener("click", this.onMouseClickListener);
    // 鼠标移动（处理光标样式）
    this.onMouseMoveListener = this.onMouseMove.bind(this);
    this.container.addEventListener("mousemove", this.onMouseMoveListener);

    // 鼠标按下（处理拖拽）
    this.onMouseDownListener = this.onMouseDown.bind(this);
    this.container.addEventListener("mousedown", this.onMouseDownListener);

    // 鼠标抬起（结束拖拽）
    this.onMouseUpListener = this.onMouseUp.bind(this);
    window.addEventListener("mouseup", this.onMouseUpListener);

    // 鼠标滚轮（处理缩放）
    this.onWheelListener = this.onWheel.bind(this);
    this.container.addEventListener("wheel", this.onWheelListener, { passive: false, capture: true });
  }

  // 鼠标按下事件
  onMouseDown(event) {
    if (event.shiftKey && this.scene) {
      const { clientHeight, clientWidth, offsetLeft, offsetTop } = this.container;
      this.mouse.x = ((event.clientX - offsetLeft) / clientWidth) * 2 - 1;
      this.mouse.y = -((event.clientY - offsetTop) / clientHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      let intersects = [];
      let dragRoot = null;

      // 收集所有可拖拽的根对象
      // 修改为：只要是在场景中的模型（manyModelGroup子项、geometryGroup子项、主model），都纳入检测范围
      let candidates = [];
      
      const addCandidate = (obj) => {
          if (obj) candidates.push(toRaw(obj));
      };

      // 1. 多模型组的子模型
      if (this.manyModelGroup) {
          toRaw(this.manyModelGroup).children.forEach(addCandidate);
      }

      // 2. 几何体组的子模型
      if (this.geometryGroup) {
          toRaw(this.geometryGroup).children.forEach(addCandidate);
      }

      // 3. 主模型 (如果它不是上述组本身，且未被包含)
      if (this.model) {
          const rawModel = toRaw(this.model);
          const isGeometryGroup = this.geometryGroup && rawModel === toRaw(this.geometryGroup);
          
          if (!isGeometryGroup) {
              // 如果主模型不在 candidates 中（例如它直接挂在 scene 下，或者尚未被归类到组中）
              if (!candidates.includes(rawModel)) {
                  candidates.push(rawModel);
              }
          }
      }
      
      // 去重
      candidates = [...new Set(candidates)];

      if (candidates.length > 0) {
          intersects = this.raycaster.intersectObjects(candidates, true);
          if (intersects.length > 0) {
              let picked = intersects[0].object;
              let root = picked;
              // 向上查找直到找到 candidates 中的对象
              while (root) {
                  if (candidates.includes(toRaw(root))) {
                      dragRoot = root;
                      break;
                  }
                  root = root.parent;
              }
          }
      }

      if (dragRoot) {
        this.isDragging = true;
        this.controls.enabled = false;
        this.dragTarget = dragRoot;

        // 设置拖拽平面，使其面向相机，并经过点击点
        this.dragPlane.setFromNormalAndCoplanarPoint(
          this.camera.getWorldDirection(this.dragPlane.normal).negate(),
          intersects[0].point
        );

        // 计算偏移量（使用世界坐标）
        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersection)) {
          const worldPos = new THREE.Vector3();
          dragRoot.getWorldPosition(worldPos);
          this.dragOffset.subVectors(worldPos, this.dragIntersection);
        }
      }
    }
  }

  // 鼠标抬起事件
  onMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.controls.enabled = true;
      this.dragTarget = null;
    }
  }

  // 鼠标滚轮事件
  onWheel(event) {
    if (this.model) {
      // 无论鼠标是否在模型上，只要有选中模型，就拦截滚轮事件进行缩放
      event.preventDefault();
      event.stopPropagation();

      // 向上滑(deltaY < 0)放大，向下滑(deltaY > 0)缩小
      const scaleFactor = 0.1;
      const delta = event.deltaY < 0 ? (1 + scaleFactor) : (1 - scaleFactor);

      this.model.scale.multiplyScalar(delta);
    }
  }

  // 鼠标移动事件处理
  onMouseMove(event) {
    const { clientHeight, clientWidth, offsetLeft, offsetTop } = this.container;
    this.mouse.x = ((event.clientX - offsetLeft) / clientWidth) * 2 - 1;
    this.mouse.y = -((event.clientY - offsetTop) / clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 处理拖拽移动（支持拖拽 manyModelGroup 的子模型或主模型）
    if (this.isDragging && this.dragTarget) {
      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersection)) {
        const worldTarget = this.dragIntersection.clone().add(this.dragOffset);
        if (this.dragTarget.parent) {
          const localTarget = this.dragTarget.parent.worldToLocal(worldTarget.clone());
          this.dragTarget.position.copy(localTarget);
        } else {
          this.dragTarget.position.copy(worldTarget);
        }
      }
      return;
    }

    let model = this.model;
    if (this.geometryGroup.children.length) {
      model = this.geometryGroup;
    }
    if (!model) return;

    // 检查是否悬停在有事件的模型上
    const intersects = this.raycaster
      .intersectObjects(model.children || [], true)
      .filter(item => item.object.isMesh);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      const eventData = eventModules.getMeshEventData(object.uuid);
      if (eventData && eventData.clickEvent !== "none") {
        this.container.style.cursor = "pointer";
      } else {
        this.container.style.cursor = "default";
      }
    } else {
      this.container.style.cursor = "default";
    }
  }

  // 创建控制器
  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = true;
    this.controls.enableDamping = false;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    //标签控制器
    this.css3dControls = new OrbitControls(this.camera, this.css3DRenderer.domElement);
    this.css3dControls.enablePan = false;
    this.css3dControls.enableDamping = false;
    this.css3dControls.target.set(0, 0, 0);
    this.css3dControls.update();
  }
  // 加载模型
  loadModel({ filePath, fileType, decomposeName }, clearScene = true) {
    return new Promise(resolve => {
      this.loadingStatus = false;
      let loader;
      if (["glb", "gltf"].includes(fileType)) {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath(`/draco/`);
        dracoLoader.setDecoderConfig({ type: "js" });
        dracoLoader.preload();
        loader = new GLTFLoader().setDRACOLoader(dracoLoader);
      } else {
        loader = this.fileLoaderMap[fileType];
      }
      if (clearScene) {
        this.model?.dispose();
        this.manyModelGroup.clear();
        this.loadedModels = [];
      }
      loader.load(
        filePath,
        result => {
          let newModel;
          switch (fileType) {
            case "glb":
              newModel = result.scene;
              if (result.animations) newModel.animations = result.animations;
              break;
            case "fbx":
              newModel = result;
              if (result.animations) newModel.animations = result.animations;
              break;
            case "gltf":
              newModel = result.scene;
              if (result.animations) newModel.animations = result.animations;
              break;
            case "obj":
              newModel = result;
              if (result.animations) newModel.animations = result.animations;
              break;
            case "stl":
              const material = new THREE.MeshStandardMaterial();
              const mesh = new THREE.Mesh(result, material);
              newModel = mesh;
              break;
            default:
              break;
          }

          // 记录模型信息
          const modelInfo = { filePath, fileType, decomposeName, object: newModel };

          if (clearScene) {
            this.model = newModel;
            this.scene.add(this.model);
            this.loadedModels = [modelInfo];
            // 确保 manyModelGroup 在场景中
            if (!this.scene.getObjectByProperty('uuid', this.manyModelGroup.uuid)) {
                this.scene.add(this.manyModelGroup);
            }
          } else {
            this.manyModelGroup.add(newModel);
            this.model = newModel;
            this.loadedModels.push(modelInfo);
            // 确保 manyModelGroup 在场景中
            if (!this.scene.getObjectByProperty('uuid', this.manyModelGroup.uuid)) {
                this.scene.add(this.manyModelGroup);
            }
          }

          this.model.decomposeName = decomposeName;
          this.materialModules.getModelMaterialList();
          this.materialModules.setModelPositionSize();

          // 需要辉光的材质
          this.glowMaterialList = this.modelMaterialList.map(v => v.name);
          this.loadingStatus = true;
          resolve(true);
          this.getModelAnimationList(result);
        },
        xhr => {
          this.modelProgressCallback(xhr.loaded, xhr.total);
        },
        err => {
          ElMessage.error("文件错误");
          console.log(err);
          resolve(true);
        }
      );
    });
  }
  // 设置材质辉光
  setMeshFlow() {
    this.scene.traverse(v => {
      if (v instanceof THREE.GridHelper) {
        this.materials.gridHelper = v.material;
        v.material = new THREE.MeshStandardMaterial({ color: "#000" });
      }
      if (v instanceof THREE.Scene) {
        this.materials.scene = v.background;
        this.materials.environment = v.environment;
        v.background = null;
        v.environment = null;
      }
      if (!this.glowMaterialList.includes(v.name) && v.isMesh) {
        this.materials[v.uuid] = v.material;
        v.material = new THREE.MeshStandardMaterial({ color: "#000" });
      }
    });
    this.glowComposer.render();
    // 辉光渲染器执行完之后在恢复材质原效果
    this.scene.traverse(v => {
      if (this.materials[v.uuid]) {
        v.material = this.materials[v.uuid];
        delete this.materials[v.uuid];
      }
      if (v instanceof THREE.GridHelper) {
        v.material = this.materials.gridHelper;
        delete this.materials.gridHelper;
      }
      if (v instanceof THREE.Scene) {
        v.background = this.materials.scene;
        v.environment = this.materials.environment;
        delete this.materials.scene;
        delete this.materials.environment;
      }
    });
    this.effectComposer.render();
    this.controls.update();
  }
  // 加载几何体模型
  setGeometryModel(model) {
    return new Promise((resolve) => {
      const { clientHeight, clientWidth, offsetLeft, offsetTop } = this.container;
      // 计算鼠标在屏幕上的坐标
      this.mouse.x = ((model.clientX - offsetLeft) / clientWidth) * 2 - 1;
      this.mouse.y = -((model.clientY - offsetTop) / clientHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      if (intersects.length > 0) {
        // 在控制台输出鼠标在场景中的位置
        const { type } = model;
        // 不需要赋值的key
        const notGeometryKey = ["id", "name", "modelType", "type"];
        const geometryData = Object.keys(model)
          .filter(key => !notGeometryKey.includes(key))
          .map(v => model[v]);
        // 创建几何体
        const geometry = new THREE[type](...geometryData);

        // 随机颜色
        const meshColor = colors[Math.ceil(Math.random() * 10)];
        const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(meshColor), side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geometry, material);
        const { x, y, z } = intersects[0].point;
        mesh.position.set(x, y, z);

        const newMesh = mesh.clone();
        Object.assign(mesh.userData, {
          rotation: newMesh.rotation,
          scale: newMesh.scale,
          position: newMesh.position
        });

        mesh.name = type + "_" + onlyKey(4, 5);
        mesh.userData.geometry = true;
        this.geometryGroup.add(mesh);
        this.model = this.geometryGroup;
        this.materialModules.onSetGeometryMeshList(mesh);

        this.glowMaterialList = this.modelMaterialList.map(v => v.name);
        this.setModelMeshDrag({ transformType: true });
        this.scene.add(this.model);
        //计算控制器缩放大小
        const box = new THREE.Box3().setFromObject(this.model);
        const size = box.getSize(new THREE.Vector3());
        this.controls.maxDistance = size.length() * 10;
        this.loadingStatus = true;
        resolve(true);
      } else {
        ElMessage.warning("当前角度无法获取鼠标位置请调整“相机角度”在添加");
      }
    });
  }

  // 模型加载进度条回调函数
  onProgress(callback) {
    if (typeof callback == "function") {
      this.modelProgressCallback = callback;
    }
  }
  // 创建辅助线
  createHelper() {
    //网格辅助线
    this.gridHelper = new THREE.GridHelper(6, 18, "#fff", "rgb(193,193,193)");
    this.gridHelper.position.set(0, -0.59, -0.1);
    this.gridHelper.visible = false;
    this.scene.add(this.gridHelper);
    // 坐标轴辅助线
    this.axesHelper = new THREE.AxesHelper(2);
    this.axesHelper.visible = false;
    this.scene.add(this.axesHelper);
    // 开启阴影
    this.renderer.shadowMap.enabled = true;
  }
  // 创建光源
  createLight() {
    // 创建环境光
    this.ambientLight = new THREE.AmbientLight("#fff", 0.8);
    this.ambientLight.visible = true;
    this.scene.add(this.ambientLight);
    // 创建平行光
    this.directionalLight = new THREE.DirectionalLight("#fff", 5);
    this.directionalLight.position.set(-1.44, 2.2, 1);
    this.directionalLight.castShadow = true;
    this.directionalLight.visible = false;
    this.scene.add(this.directionalLight);
    // 创建平行光辅助线
    this.directionalLightHelper = new THREE.DirectionalLightHelper(this.directionalLight, 0.3);
    this.directionalLightHelper.visible = false;
    this.scene.add(this.directionalLightHelper);

    // 创建点光源
    this.pointLight = new THREE.PointLight(0xff0000, 5, 100);
    this.pointLight.visible = false;
    this.scene.add(this.pointLight);
    // 创建点光源辅助线
    this.pointLightHelper = new THREE.PointLightHelper(this.pointLight, 0.5);
    this.pointLightHelper.visible = false;
    this.scene.add(this.pointLightHelper);

    //  创建聚光灯
    this.spotLight = new THREE.SpotLight("#00BABD", 900);
    this.spotLight.visible = false;
    this.spotLight.map = new THREE.TextureLoader().load(getAssetsFile("image/model-bg-1.jpg"));
    this.spotLight.map = new THREE.TextureLoader().load(getAssetsFile("image/model-bg-1.jpg"));
    this.spotLight.decay = 2;
    this.spotLight.shadow.mapSize.width = 1920;
    this.spotLight.shadow.mapSize.height = 1080;
    this.spotLight.shadow.camera.near = 1;
    this.spotLight.shadow.camera.far = 10;
    this.scene.add(this.spotLight);
    //创建聚光灯辅助线
    this.spotLightHelper = new THREE.SpotLightHelper(this.spotLight);
    this.spotLightHelper.visible = false;
    this.scene.add(this.spotLightHelper);

    const geometry = new THREE.PlaneGeometry(2000, 2000);
    const planeMaterial = new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.5 });

    this.planeGeometry = new THREE.Mesh(geometry, planeMaterial);
    this.planeGeometry.rotation.x = -Math.PI / 2;

    this.planeGeometry.position.set(0, -1.2, 0);
    this.planeGeometry.receiveShadow = true;
    this.planeGeometry.material.side = THREE.DoubleSide;
    this.planeGeometry.material.color.set("#23191F");
    this.planeGeometry.geometry.verticesNeedUpdate = true;
    this.scene.add(this.planeGeometry);
  }
  // 创建效果合成器
  createEffectComposer() {
    if (!this.container) return false;
    const { clientHeight, clientWidth } = this.container;
    this.effectComposer = new EffectComposer(
      this.renderer,
      new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
        samples: 4 // 增加采样次数来提高抗锯齿效果
      })
    );
    const renderPass = new RenderPass(this.scene, this.camera);

    this.effectComposer.addPass(renderPass);

    this.outlinePass = new OutlinePass(new THREE.Vector2(clientWidth, clientHeight), this.scene, this.camera);
    this.outlinePass.visibleEdgeColor = new THREE.Color("#FF8C00"); // 可见边缘的颜色
    this.outlinePass.hiddenEdgeColor = new THREE.Color("#8a90f3"); // 不可见边缘的颜色
    this.outlinePass.edgeGlow = 2; // 发光强度
    this.outlinePass.usePatternTexture = false; // 是否使用纹理图案
    this.outlinePass.edgeThickness = 1; // 边缘浓度
    this.outlinePass.edgeStrength = 4; // 边缘的强度，值越高边框范围越大
    this.outlinePass.pulsePeriod = 200; // 闪烁频率，值越大频率越低
    this.effectComposer.addPass(this.outlinePass);
    let outputPass = new OutputPass();
    this.effectComposer.addPass(outputPass);

    // 增强FXAA抗锯齿效果
    let effectFXAA = new ShaderPass(FXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    effectFXAA.uniforms.resolution.value.set(1 / (clientWidth * pixelRatio), 1 / (clientHeight * pixelRatio));
    effectFXAA.renderToScreen = true;
    effectFXAA.needsSwap = true;
    // 调整FXAA参数以增强抗锯齿效果
    effectFXAA.material.uniforms.tDiffuse.value = 1.0;
    effectFXAA.enabled = true;
    this.effectComposer.addPass(effectFXAA);

    //创建辉光效果
    this.unrealBloomPass = new UnrealBloomPass(new THREE.Vector2(clientWidth, clientHeight), 1.5, 0.4, 0.85);
    // 辉光合成器
    const renderTargetParameters = {
      minFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
      samples: 4 // 为辉光效果也添加抗锯齿
    };
    const glowRender = new THREE.WebGLRenderTarget(clientWidth * 2, clientHeight * 2, renderTargetParameters);
    this.glowComposer = new EffectComposer(this.renderer, glowRender);
    this.glowComposer.renderToScreen = false;
    this.glowRenderPass = new RenderPass(this.scene, this.camera);
    this.glowComposer.addPass(this.glowRenderPass);
    this.glowComposer.addPass(this.unrealBloomPass);
    // 着色器
    this.shaderPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this.glowComposer.renderTarget2.texture },
          tDiffuse: { value: null },
          glowColor: { value: null }
        },
        vertexShader,
        fragmentShader,
        defines: {}
      }),
      "baseTexture"
    );

    this.shaderPass.material.uniforms.glowColor.value = new THREE.Color();
    this.shaderPass.renderToScreen = true;
    this.shaderPass.needsSwap = true;
    this.shaderPass.name = "ShaderColor";
  }
  // 注册模型切换回调
  onSwitchModelCallback(callback) {
    this.switchModelCallback = callback;
  }

  // 切换模型
  onSwitchModel(model, clearScene = true) {
    return new Promise(async (resolve, reject) => {
      try {
        // 加载几何模型
        if (model.modelType && model.modelType == "geometry") {
          this.modelAnimation = [];
          this.camera.fov = 80;
          this.camera.updateProjectionMatrix();
          console.log(model);
          await this.setGeometryModel(model);
          this.outlinePass.renderScene = this.geometryGroup;
          resolve();
        } else {
          if (clearScene) {
            this.clearSceneModel();
          }
          // 加载模型
          const load = await this.loadModel(model, clearScene);
          this.outlinePass.renderScene = this.model;
          // 模型加载成功返回 true
          resolve({ load, filePath: model.filePath });
        }
      } catch (err) {
        console.log(err);
        reject();
      }
    });
  }

  // 获取所有已加载模型的信息
  getLoadedModelsInfo() {
      return (this.loadedModels || []).map(item => {
          const { object } = item;
          if (object) {
              return {
                  ...item,
                  object: undefined, // 不导出对象本身
                  position: object.position.toArray(),
                  rotation: object.rotation.toArray().slice(0, 3), // 只取 x, y, z
                  scale: object.scale.toArray()
              };
          }
          return item;
      });
  }

  // 新增：返回场景中可作为视角目标的对象列表（用于 UI）
  getViewTargets() {
    const list = [];
    if (this.model) {
      list.push({
        uuid: this.model.uuid,
        name: this.model.name || "当前模型",
        type: "model"
      });
    }
    // 多模型组内的每个子模型（包括拆出的子模型）
    this.manyModelGroup.children.forEach(child => {
      list.push({
        uuid: child.uuid,
        name: child.name || `子模型-${child.uuid.slice(0, 6)}`,
        type: "manyModel"
      });
    });
    // 如果需要也可以列出主模型下可识别的子对象（第一层）
    if (this.model && this.model.children && this.model.children.length) {
      this.model.children.forEach(child => {
        // 仅列出显著命名或网格对象
        if (child.isMesh || child.name) {
          list.push({
            uuid: child.uuid,
            name: child.name || `部件-${child.uuid.slice(0,6)}`,
            type: "part"
          });
        }
      });
    }
    return list;
  }

// 新增：把场景中选中的子对象从原父体中拆解，成为独立小模型（添加到 manyModelGroup）
  // 增强：支持拆解后“弹出”且带弧线的优雅动画（world 坐标位移 + 轻微缩放 + 轻微旋转）
  // options:
  //  - popOut: 是否播放弹出动画
  //  - distanceFactor: 位移距离系数
  //  - duration: 动画时长
  //  - arcHeightFactor: 轨迹弧度高度系数（相对位移距离）
  //  - rotationAngle: 最大旋转角度（弧度）
  extractSubModel(
    uuid,
    options = {
      popOut: true,
      distanceFactor: 1.2,
      duration: 800,
      arcHeightFactor: 0.25,
      rotationAngle: Math.PI / 18 // 10°
    }
  ) {
    const obj = this.scene.getObjectByProperty("uuid", uuid);
    if (!obj) return null;

    // 确保 manyModelGroup 存在于场景中
    if (!this.scene.getObjectByProperty('uuid', this.manyModelGroup.uuid)) {
      this.scene.add(this.manyModelGroup);
    }

    // 记录对象当前位置（世界坐标）以便计算动画起止点
    const worldPos = new THREE.Vector3();
    obj.getWorldPosition(worldPos);

    // 计算参考中心（优先使用主模型 world 位置）
    const centerWorld = new THREE.Vector3();
    if (this.model) {
      this.model.getWorldPosition(centerWorld);
    } else if (obj.parent) {
      obj.parent.getWorldPosition(centerWorld);
    } else {
      centerWorld.set(0, 0, 0);
    }

    // 计算弹出方向（从中心指向对象），若方向长度非常小则默认沿 +Y
    const dir = worldPos.clone().sub(centerWorld);
    if (dir.length() < 1e-4) dir.set(0, 1, 0);
    dir.normalize();

    // 基于对象包围盒大小决定位移距离，保证不同尺寸模型弹出距离合理
    const bbox = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const offsetDistance = Math.max(maxDim, 0.5) * (options.distanceFactor || 1.2);

    const endWorldPos = worldPos.clone().add(dir.multiplyScalar(offsetDistance));

    // 使用 attach 保持世界变换不变地重新父级化
    this.manyModelGroup.attach(obj);

    // 确保本地起点与 worldPos 对齐（attach 一般会保持世界变换，但这里显式确保）
    const localStart = this.manyModelGroup.worldToLocal(worldPos.clone());
    obj.position.copy(localStart);

    // 标记为子模型并允许移动，方便区分
    obj.userData = Object.assign({}, obj.userData, { type: 'subModel', movable: true });

    // 执行弹出动画（使用 TWEEN，sceneAnimation 中已有 TWEEN.update 驱动）
    if (options.popOut) {
      const localEnd = this.manyModelGroup.worldToLocal(endWorldPos.clone());
      const origScale = obj.scale.clone();
      const origRot = obj.rotation.clone();

      // 为了让轨迹更优雅：在起点和终点之间做一条“抛物线”弧线
      const distanceLocal = localEnd.clone().sub(localStart);
      const baseDistance = distanceLocal.length();
      const arcHeight =
        (options.arcHeightFactor != null ? options.arcHeightFactor : 0.25) *
        baseDistance;
      // 以 world 的竖直方向为主，提高空间感
      const worldUp = new THREE.Vector3(0, 1, 0);
      const upInLocal = this.manyModelGroup.worldToLocal(
        worldUp.clone().add(this.manyModelGroup.position.clone())
      ).sub(this.manyModelGroup.position);
      upInLocal.normalize();
      const midPoint = localStart
        .clone()
        .addScaledVector(distanceLocal, 0.5)
        .addScaledVector(upInLocal, arcHeight);

      const duration = options.duration || 800;
      const tweenObj = { t: 0 };
      new TWEEN.Tween(tweenObj)
        .to({ t: 1 }, duration)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
          // t 分三段：起步（0~0.15）略带预拉伸，中段（0.15~0.85）沿弧线平滑移动，收尾（0.85~1）轻微回弹
          const t = tweenObj.t;

          // 位置：使用二次贝塞尔曲线做弧线轨迹
          const u = t;
          const oneMinusU = 1 - u;
          const bezierPos = new THREE.Vector3()
            .addScaledVector(localStart, oneMinusU * oneMinusU)
            .addScaledVector(midPoint, 2 * oneMinusU * u)
            .addScaledVector(localEnd, u * u);
          obj.position.copy(bezierPos);

          // 轻微缩放以增强“弹出感”：前半程略大、后半程回到原始尺度
          const scaleFactor = 1 + 0.1 * Math.sin(Math.PI * t);
          obj.scale.set(origScale.x * scaleFactor, origScale.y * scaleFactor, origScale.z * scaleFactor);

          // 轻微旋转：随着 t 逐渐旋转到一个小角度，然后在收尾前回到原始姿态
          const maxAngle = options.rotationAngle != null ? options.rotationAngle : Math.PI / 18;
          const swing = Math.sin(Math.PI * t) * maxAngle; // 中段最大，首尾为 0
          obj.rotation.set(
            origRot.x + swing * 0.4,
            origRot.y + swing,
            origRot.z + swing * 0.2
          );
        })
        .onComplete(() => {
          obj.position.copy(localEnd);
          obj.scale.copy(origScale);
          obj.rotation.copy(origRot);
        })
        .start();
    }

    return obj;
  }

  // 监听窗口变化
  onWindowResizes() {
    if (!this.container) return false;
    const { clientHeight, clientWidth } = this.container;
    //调整屏幕大小
    this.camera.aspect = clientWidth / clientHeight; // 摄像机宽高比例
    this.camera.updateProjectionMatrix(); //相机更新矩阵，将3d内容投射到2d面上转换
    this.renderer.setSize(clientWidth, clientHeight);
    this.css3DRenderer.setSize(clientWidth, clientHeight);
    if (this.effectComposer) {
      // 假设抗锯齿效果是EffectComposer中的第一个pass
      let pass = this.effectComposer.passes[3];
      const pixelRatio = this.renderer.getPixelRatio();
      pass.uniforms.resolution.value.set(1 / (clientWidth * pixelRatio), 1 / (clientHeight * pixelRatio));
      this.effectComposer.setSize(clientWidth, clientHeight);
    }

    if (this.glowComposer) this.glowComposer.setSize(clientWidth, clientHeight);
  }
  // 下载场景封面
  onDownloadSceneCover() {
    let link = document.createElement("a");
    let canvas = this.renderer.domElement;
    link.href = canvas.toDataURL("image/png");
    link.download = `${new Date().toLocaleString()}.png`;
    link.click();
    ElMessage.success("下载成功");
  }
  // 导出模型
  onExporterModel(type) {
    if (type == "usdz") {
      const exporter = new USDZExporter();
      exporter.parse(this.scene, usdz => {
        // 将导出的 USDZ 数据保存为文件或进行其他操作
        const blob = new Blob([usdz], { type: "model/vnd.usdz+zip" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${new Date().toLocaleString()}.usdz`;
        link.click();
        URL.revokeObjectURL(url);
        ElMessage.success("导出成功");
      });
    } else {
      const exporter = new GLTFExporter();
      const options = {
        trs: true, // 是否保留位置、旋转、缩放信息
        animations: this.modelAnimation, // 导出的动画
        binary: type == "glb" ? true : false, // 是否以二进制格式输出
        embedImages: true, //是否嵌入贴图
        onlyVisible: true, //是否只导出可见物体
        includeCustomExtensions: true
      };

      // 收集所有需要导出的对象
      const exportObjects = [];
      if (this.model) exportObjects.push(toRaw(this.model));
      if (this.manyModelGroup && this.manyModelGroup.children.length > 0) exportObjects.push(toRaw(this.manyModelGroup));
      if (this.geometryGroup && this.geometryGroup.children.length > 0) exportObjects.push(toRaw(this.geometryGroup));
      
      // 导出灯光
      if (this.ambientLight) exportObjects.push(toRaw(this.ambientLight));
      if (this.directionalLight) exportObjects.push(toRaw(this.directionalLight));
      if (this.pointLight) exportObjects.push(toRaw(this.pointLight));
      if (this.spotLight) exportObjects.push(toRaw(this.spotLight));

      exporter.parse(
        exportObjects.length > 0 ? exportObjects : toRaw(this.scene),
        result => {
          if (result instanceof ArrayBuffer) {
            // 将结果保存为GLB二进制文件
            saveArrayBuffer(result, `${new Date().toLocaleString()}.glb`);
          } else {
            // 将结果保存为GLTF JSON文件
            saveString(JSON.stringify(result), `${new Date().toLocaleString()}.gltf`);
          }
          function saveArrayBuffer(buffer, filename) {
            // 将二进制数据保存为文件
            const blob = new Blob([buffer], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
            ElMessage.success("导出成功");
          }
          function saveString(text, filename) {
            // 将字符串数据保存为文件
            const blob = new Blob([text], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
            ElMessage.success("导出成功");
          }
        },
        err => {
          ElMessage.error(err);
        },
        options
      );
    }
  }

  // 清除模型数据
  onClearModelData() {
    cancelAnimationFrame(this.rotationAnimationFrame);
    cancelAnimationFrame(this.renderAnimation);
    cancelAnimationFrame(this.animationFrame);
    this.container.removeEventListener("click", this.onMouseClickListener);
    this.container.removeEventListener("mousemove", this.onMouseMoveListener);
    this.container.removeEventListener("mousedown", this.onMouseDownListener);
    this.container.removeEventListener("wheel", this.onWheelListener);
    window.removeEventListener("mouseup", this.onMouseUpListener);
    window.removeEventListener("resize", this.onWindowResizesListener);
    this.scene.traverse(v => {
      if (v.type === "Mesh") {
        v.geometry.dispose();
        v.material.dispose();
      }
      if (v.isMesh) {
        v.geometry.dispose();
        v.material.dispose();
      }
    });
    this.scene.clear();
    this.renderer.dispose();
    this.renderer.clear();
    this.container = null;
    // 相机
    this.camera = null;
    // 场景
    this.scene = null;
    //渲染器
    this.renderer = null;
    // 控制器
    this.controls = null;
    // 模型
    this.model = null;
    //文件加载器类型
    this.fileLoaderMap = null;
    //模型动画列表
    this.modelAnimation = null;
    //模型动画对象
    this.animationMixer = null;
    this.animationClock = null;
    //动画帧
    this.animationFrame = null;
    // 轴动画帧
    this.rotationAnimationFrame = null;
    // 动画构造器
    this.animateClipAction = null;
    // 动画循环方式枚举
    this.loopMap = null;
    // 网格辅助线
    this.gridHelper = null;
    // 坐标轴辅助线
    this.axesHelper = null;
    // 环境光
    this.ambientLight = null;
    //平行光
    this.directionalLight = null;
    // 平行光辅助线
    this.directionalLightHelper = null;
    // 点光源
    this.pointLight = null;
    //点光源辅助线
    this.pointLightHelper = null;
    //聚光灯
    this.spotLight = null;
    //聚光灯辅助线
    this.spotLightHelper = null;
    //模型平面
    this.planeGeometry = null;
    //模型材质列表
    this.modelMaterialList = [];
    this.originalMaterials.clear();
    // 效果合成器
    this.effectComposer = null;
    this.outlinePass = null;
    // 动画渲染器
    this.renderAnimation = null;
    // 碰撞检测
    this.raycaster = null;
    // 鼠标位置
    this.mouse = null;
    // 辉光效果合成器
    if (this.glowComposer) {
      this.glowComposer.renderer.clear();
    }
    this.glowComposer = null;
    // 辉光渲染器
    this.unrealBloomPass = null;
    //辉光着色器
    this.shaderPass = null;
    // 需要辉光的材质
    this.glowMaterialList = null;
    this.materials = null;
    // 拖拽对象控制器
    this.transformControls = null;
    this.dragGeometryModel = null;
    this.glowUnrealBloomPass = false;
    // 3d文字渲染器
    this.css3DRenderer = null;
    // 3d文字控制器
    this.css3dControls = null;
    // 当前拖拽标签信息
    this.dragTag = {};
    //当前标签列表
    this.dragTagList = [];
    // 当前拖拽模型信息
    this.activeDragManyModel = {};
    // 清除事件数据
    this.clearEventData();
  }

  // 移除指定模型
  removeModel(model) {
    if (!model) return;
    console.log("Removing model:", model);

    // 递归释放资源
    model.traverse(v => {
      if (v.isMesh) {
        if (v.geometry) v.geometry.dispose();
        if (v.material) {
          if (Array.isArray(v.material)) {
            v.material.forEach(m => m.dispose());
          } else {
            v.material.dispose();
          }
        }
      }
    });

    // 从父对象中移除
    if (model.parent) {
      model.parent.remove(model);
    }

    // 如果是当前选中的模型，清除选中状态
    // 使用 toRaw 确保比较的是原始对象
    const rawModel = toRaw(model);
    const rawCurrentModel = toRaw(this.model);

    if (rawCurrentModel === rawModel) {
      this.model = null;
      this.modelMaterialList = [];
      this.originalMaterials.clear();
      this.modelAnimation = [];
      if (this.transformControls) {
        this.transformControls.detach();
      }
      this.outlinePass.selectedObjects = [];
    }

    // 如果选中的是该模型的子网格，也需要清除选中状态
    if (this.outlinePass.selectedObjects.length > 0) {
        let selected = this.outlinePass.selectedObjects[0];
        let root = selected;
        while(root.parent && root !== model && root.parent !== null) {
            root = root.parent;
        }
        if (root === model) {
            this.outlinePass.selectedObjects = [];
            if (this.transformControls) this.transformControls.detach();
        }
    }
  }

  // 清除场景模型数据
  clearSceneModel() {
    this.camera.fov = 50;
    // 先移除模型 材质释放内存
    this.scene.traverse(v => {
      if (["Mesh"].includes(v.type)) {
        v.geometry.dispose();
        v.material.dispose();
      }
    });
    this.dragGeometryModel = {};
    this.activeDragManyModel = {};
    this.geometryGroup.clear();
    this.scene.remove(this.geometryGroup);
    this.scene.remove(this.manyModelGroup);
    this.manyModelGroup.clear();

    // 移除添加的多模型
    const removeModelList = this.scene.children.filter(v => v.userData.type == "manyModel");
    removeModelList.forEach(v => {
      this.scene.remove(v);
    });
    this.scene.remove(this.model);
    this.model = null;

    //取消动画帧
    cancelAnimationFrame(this.animationFrame);
    cancelAnimationFrame(this.rotationAnimationFrame);

    this.glowUnrealBloomPass = false;
    this.glowMaterialList = [];
    this.modelMaterialList = [];
    this.originalMaterials.clear();

    this.materials = {};
    if (this.transformControls) {
      this.transformControls.detach();
      const transformControlsPlane = findObjectInScene(this.scene, { type: "TransformControlsPlane" });
      if (transformControlsPlane) {
        this.scene.remove(transformControlsPlane);
      }
      this.scene.remove(this.transformControls);
      this.transformControls = null;
    }

    if (this.effectComposer) {
      this.effectComposer.removePass(this.shaderPass);
    }

    this.renderer.toneMappingExposure = 2;
    this.outlinePass.selectedObjects = [];

    Object.assign(this.unrealBloomPass, {
      threshold: 0,
      strength: 0,
      radius: 0
    });
    this.shaderPass.material.uniforms.glowColor.value = new THREE.Color();

    const config = {
      gridHelper: false,
      x: 0,
      y: -0.59,
      z: -0.1,
      positionX: 0,
      positionY: -1,
      positionZ: 0,
      divisions: 18,
      size: 6,
      color: "rgb(193,193,193)",
      axesHelper: false,
      axesSize: 1.8
    };
    this.lightModules.onResettingLight({ ambientLight: true });

    this.onSetModelGridHelper(config);
    this.onSetModelGridHelperSize(config);
    this.onSetModelAxesHelper(config);
    this.clearSceneTags();
    this.clearEventData();
  }
  // 设置当前被拖拽的几何模型
  setDragGeometryModel(model) {
    this.dragGeometryModel = model;
  }
  // 设置当前被拖拽的多模型
  setDragManyModel(model) {
    this.activeDragManyModel = model;
  }
  // 加载多模型
  onLoadManyModel(model) {
    return new Promise((resolve, reject) => {
      const { clientHeight, clientWidth, offsetLeft, offsetTop } = this.container;
      const { filePath, fileType, name } = model;
      // 计算鼠标在屏幕上的坐标
      this.mouse.x = ((model.clientX - offsetLeft) / clientWidth) * 2 - 1;
      this.mouse.y = -((model.clientY - offsetTop) / clientHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      if (intersects.length > 0) {
        this.loadingStatus = false;
        let loader;
        if (["glb", "gltf"].includes(fileType)) {
          const dracoLoader = new DRACOLoader();
          dracoLoader.setDecoderPath(`/draco/`);
          dracoLoader.setDecoderConfig({ type: "js" });
          dracoLoader.preload();
          loader = new GLTFLoader().setDRACOLoader(dracoLoader);
        } else {
          loader = this.fileLoaderMap[fileType];
        }
        let manyModel;
        loader.load(
          filePath,
          result => {
            switch (fileType) {
              case "glb":
                manyModel = result.scene;
                if (result.animations) manyModel.animations = result.animations;
                break;
              case "fbx":
                manyModel = result;
                if (result.animations) manyModel.animations = result.animations;
                break;
              case "gltf":
                manyModel = result.scene;
                if (result.animations) manyModel.animations = result.animations;
                break;
              case "obj":
                manyModel = result;
                if (result.animations) manyModel.animations = result.animations;
                break;
              case "stl":
                const material = new THREE.MeshStandardMaterial();
                const mesh = new THREE.Mesh(result, material);
                manyModel = mesh;
                break;
              default:
                break;
            }
            this.getManyModelAnimationList(result.animations);

            // 设置模型位置
            const { x, y, z } = intersects[0].point;
            manyModel.position.set(x, y, z);
            const box = new THREE.Box3().setFromObject(manyModel);
            const size = box.getSize(new THREE.Vector3());
            const maxSize = Math.max(size.x, size.y, size.z);
            const targetSize = 1.2;
            const scale = targetSize / (maxSize > 1 ? maxSize : 0.5);
            manyModel.scale.set(scale, scale, scale);
            manyModel.name = name;
            manyModel.userData = {
              type: "manyModel",
              ...manyModel.userData
            };
            this.manyModelGroup.add(manyModel);

            // 确保多模型组在场景中
            if (!this.scene.getObjectByProperty('uuid', this.manyModelGroup.uuid)) {
                this.scene.add(this.manyModelGroup);
            }

            // 记录到 loadedModels，确保可以被选中和拖拽
            if (!this.loadedModels) this.loadedModels = [];
            this.loadedModels.push({
                filePath,
                fileType,
                decomposeName: name,
                object: manyModel
            });

            this.loadingStatus = true;

            resolve({ load: true });
          },
          xhr => {
            this.modelProgressCallback(xhr.loaded, xhr.total);
          },
          err => {
            ElMessage.error(err);
            reject();
          }
        );
      } else {
        reject();
        ElMessage.warning("当前角度无法获取鼠标位置请调整“相机角度”在添加");
      }
    });
  }
}

Object.assign(renderModel.prototype, {
  ...modulesPrototype
});

export default renderModel;

// import * as THREE from "three";
// import { toRaw } from "vue";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
// import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
// import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
// import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
// import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
// import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
// import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
// import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
// import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
// import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
// import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
// import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
// import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
// import { CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
// import { USDZExporter } from "three/addons/exporters/USDZExporter.js";
// import { ElMessage } from "element-plus";
// import { onlyKey, getAssetsFile } from "@/utils/utilityFunction";
// import modulesPrototype from "./modelEditClass/index";
// import TWEEN from "@tweenjs/tween.js";
// import { vertexShader, fragmentShader } from "@/config/constant.js";
// import { findObjectInScene } from "@/utils/utilityFunction";
// import shaderModules from "./modelEditClass/shaderModules";
// import backgroundModules from "./modelEditClass/backgroundModules";
// import lightModules from "./modelEditClass/lightModules";
// import materialModules from "./modelEditClass/materialModules";
// import eventModules from "./modelEditClass/eventModules";
// import { useMeshEditStore } from "@/store/meshEditStore";
//
// const colors = ["#FF4500", "#90EE90", "#00CED1", "#1E90FF", "#C71585", "#FF4500", "#FAD400", "#1F93FF", "#90F090", "#C71585"];
//
// class renderModel {
//   constructor(selector) {
//     this.container = document.querySelector(selector);
//
//     // 相机
//     this.camera;
//     // 场景
//     this.scene = null;
//     // 渲染器
//     this.renderer;
//     // 控制器
//     this.controls;
//     // 模型
//     this.model;
//     // 几何体模型数组
//     this.geometryGroup = new THREE.Group();
//     // 多模型数组
//     this.manyModelGroup = new THREE.Group();
//     // 加载进度监听
//     this.loadingManager = new THREE.LoadingManager();
//     // 文件加载器类型
//     this.fileLoaderMap = {
//       glb: new GLTFLoader(),
//       fbx: new FBXLoader(this.loadingManager),
//       gltf: new GLTFLoader(),
//       obj: new OBJLoader(this.loadingManager),
//       stl: new STLLoader()
//     };
//     // 模型动画列表
//     this.modelAnimation = [];
//     // 模型动画对象
//     this.animationMixer;
//     this.animationClock = new THREE.Clock();
//     // 动画帧
//     this.animationFrame = null;
//     // 轴动画帧
//     this.rotationAnimationFrame = null;
//     // 动画构造器
//     this.animateClipAction = null;
//     // 动画循环方式枚举
//     this.loopMap = {
//       LoopOnce: THREE.LoopOnce,
//       LoopRepeat: THREE.LoopRepeat,
//       LoopPingPong: THREE.LoopPingPong
//     };
//     // 网格辅助线
//     this.gridHelper;
//     // 坐标轴辅助线
//     this.axesHelper;
//     // 环境光
//     this.ambientLight;
//     // 平行光
//     this.directionalLight;
//     // 平行光辅助线
//     this.directionalLightHelper;
//     // 点光源
//     this.pointLight;
//     // 点光源辅助线
//     this.pointLightHelper;
//     // 聚光灯
//     this.spotLight;
//     // 聚光灯辅助线
//     this.spotLightHelper;
//     // 模型平面
//     this.planeGeometry;
//     // 模型材质列表
//     this.modelMaterialList = [];
//     // 模型材质原始数据缓存
//     this.originalMaterials = new Map();
//     // 效果合成器
//     this.effectComposer;
//     this.outlinePass;
//     // 动画渲染器
//     this.renderAnimation = null;
//     // 碰撞检测
//     this.raycaster = new THREE.Raycaster();
//     // 鼠标位置
//     this.mouse = new THREE.Vector2();
//     // 辉光效果合成器
//     this.glowComposer;
//     this.glowRenderPass;
//     // 辉光渲染器
//     this.unrealBloomPass;
//     // 辉光着色器
//     this.shaderPass;
//     // 需要辉光的材质
//     this.glowMaterialList;
//     this.materials = {};
//     // 拖拽对象控制器
//     this.transformControls;
//     // 是否开启辉光
//     this.glowUnrealBloomPass = false;
//     // 窗口变化监听事件
//     this.onWindowResizesListener;
//     // 鼠标点击事件
//     this.onMouseClickListener;
//     // 模型上传进度条回调函数
//     this.modelProgressCallback = e => e;
//     // 当前拖拽的几何模型
//     this.dragGeometryModel = {};
//     // 当前模型加载状态
//     this.loadingStatus = true;
//     // 3d文字渲染器
//     this.css3DRenderer = null;
//     // 3d文字控制器
//     this.css3dControls = null;
//     // 当前拖拽标签信息
//     this.dragTag = {};
//     // 当前标签列表
//     this.dragTagList = [];
//     // 当前拖拽模型信息
//     this.activeDragManyModel = {};
//     // 背景模块实例
//     this.backgroundModules = new backgroundModules();
//     // 着色器模块实例
//     this.shaderModules = new shaderModules();
//     // 灯光模块实例
//     this.lightModules = new lightModules();
//     // 材质模块实例
//     this.materialModules = new materialModules();
//
//     // 拖拽移动相关
//     this.isDragging = false;
//     this.dragPlane = new THREE.Plane();
//     this.dragOffset = new THREE.Vector3();
//     this.dragIntersection = new THREE.Vector3();
//     // 当前拖拽目标（可能是主模型或 manyModelGroup 的子模型）
//     this.dragTarget = null;
//
//     // 多相机系统相关
//     this.multiViewportSystem = null;
//     this.viewPointsByTarget = null;
//     this.currentViewIndexByTarget = null;
//     this.isPlayingViewSequenceByTarget = null;
//     this.viewTween = null;
//     this.isPlayingSynchronized = null;
//
//     // 同步更新标记
//     this.syncUpdateInterval = null;
//   }
//
//   init() {
//     return new Promise(async resolve => {
//       this.initRender();
//       this.initCamera();
//       this.initScene();
//       this.initControls();
//       this.initViewPoints();
//       // 创建辅助线
//       this.createHelper();
//       // 创建灯光
//       this.createLight();
//       this.addEvenListMouseListener();
//       const load = await this.loadModel({ filePath: "threeFile/glb/glb-7.glb", fileType: "glb" });
//       // 创建效果合成器
//       this.createEffectComposer();
//       // 场景渲染
//       this.sceneAnimation();
//       resolve(load);
//     });
//   }
//
//   // 创建场景
//   async initScene() {
//     this.scene = new THREE.Scene();
//     const texture = new THREE.TextureLoader().load(getAssetsFile("image/view-4.png"));
//     texture.mapping = THREE.EquirectangularReflectionMapping;
//     this.scene.SRGBColorSpace = THREE.SRGBColorSpace;
//     this.scene.background = texture;
//     this.scene.environment = texture;
//     this.scene.backgroundIntensity = 1;
//     this.scene.backgroundBlurriness = 1;
//     texture.dispose();
//   }
//
//   // 创建相机
//   initCamera() {
//     const { clientHeight, clientWidth } = this.container;
//     this.camera = new THREE.PerspectiveCamera(50, clientWidth / clientHeight, 0.05, 10000);
//   }
//
//   // 创建渲染器
//   initRender() {
//     this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
//     // 设置屏幕像素比
//     this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//     // 渲染的尺寸大小
//     const { clientHeight, clientWidth } = this.container;
//     this.renderer.setSize(clientWidth, clientHeight);
//     // 色调映射
//     this.renderer.toneMapping = THREE.ReinhardToneMapping;
//     this.renderer.autoClear = true;
//     this.renderer.outputColorSpace = THREE.SRGBColorSpace;
//     // 曝光
//     this.renderer.toneMappingExposure = 2;
//     this.renderer.shadowMap.enabled = true;
//     this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
//     this.container.appendChild(this.renderer.domElement);
//
//     // 创建一个CSS3DRenderer
//     this.css3DRenderer = new CSS3DRenderer();
//     this.css3DRenderer.setSize(clientWidth, clientHeight);
//     this.css3DRenderer.domElement.style.position = "absolute";
//     this.css3DRenderer.domElement.style.pointerEvents = "none";
//     this.css3DRenderer.domElement.style.top = 0;
//     this.container.appendChild(this.css3DRenderer.domElement);
//   }
//
//   // 更新场景
//   sceneAnimation() {
//     this.renderAnimation = requestAnimationFrame(() => this.sceneAnimation());
//
//     // 等模型加载和相关数据处理完成再执行
//     if (this.loadingStatus) {
//       // 辉光效果开关开启时执行
//       if (this.glowUnrealBloomPass) {
//         // 将不需要处理辉光的材质进行存储备份
//         this.setMeshFlow();
//       } else {
//         this.effectComposer.render();
//         this.controls.update();
//       }
//
//       TWEEN.update(); // 驱动所有 TWEEN 动画
//       this.shaderModules.updateAllShaderTime();
//
//       // ✅ 新增：更新多视角渲染
//       if (this.updateMultiViewports) {
//         this.updateMultiViewports();
//       }
//
//       // 3d标签渲染器
//       if (this.dragTagList.length) {
//         this.css3DRenderer.render(this.scene, this.camera);
//         this.css3dControls.update();
//       }
//     }
//   }
//
//   // 监听事件
//   addEvenListMouseListener() {
//     // 监听场景大小改变，调整渲染尺寸
//     this.onWindowResizesListener = this.onWindowResizes.bind(this);
//     window.addEventListener("resize", this.onWindowResizesListener);
//
//     // 鼠标点击
//     this.onMouseClickListener = this.materialModules.onMouseClickModel.bind(this);
//     this.container.addEventListener("click", this.onMouseClickListener);
//
//     // 鼠标移动（处理光标样式）
//     this.onMouseMoveListener = this.onMouseMove.bind(this);
//     this.container.addEventListener("mousemove", this.onMouseMoveListener);
//
//     // 鼠标按下（处理拖拽）
//     this.onMouseDownListener = this.onMouseDown.bind(this);
//     this.container.addEventListener("mousedown", this.onMouseDownListener);
//
//     // 鼠标抬起（结束拖拽）
//     this.onMouseUpListener = this.onMouseUp.bind(this);
//     window.addEventListener("mouseup", this.onMouseUpListener);
//
//     // 鼠标滚轮（处理缩放）
//     this.onWheelListener = this.onWheel.bind(this);
//     this.container.addEventListener("wheel", this.onWheelListener, { passive: false, capture: true });
//   }
//
//   // 鼠标按下事件
//   onMouseDown(event) {
//     if (event.shiftKey && this.scene) {
//       const { clientHeight, clientWidth, offsetLeft, offsetTop } = this.container;
//       this.mouse.x = ((event.clientX - offsetLeft) / clientWidth) * 2 - 1;
//       this.mouse.y = -((event.clientY - offsetTop) / clientHeight) * 2 + 1;
//
//       this.raycaster.setFromCamera(this.mouse, this.camera);
//
//       // 优先检测 manyModelGroup 的子模型（若存在），否则在没有子模型时允许拖动主模型
//       let intersects = [];
//       let dragRoot = null;
//
//       if (this.manyModelGroup && this.manyModelGroup.children.length > 0) {
//         intersects = this.raycaster.intersectObjects(this.manyModelGroup.children, true);
//         if (intersects.length > 0) {
//           // 找到被选中的子对象，向上找到直接被 manyModelGroup 持有的根对象
//           let picked = intersects[0].object;
//           let root = picked;
//           while (root.parent && root.parent !== this.manyModelGroup) {
//             root = root.parent;
//           }
//           dragRoot = root;
//         }
//       } else if (this.model) {
//         // 仅当没有拆解出子模型时允许拖动主模型
//         intersects = this.raycaster.intersectObject(this.model, true);
//         if (intersects.length > 0) dragRoot = this.model;
//       }
//
//       if (dragRoot) {
//         this.isDragging = true;
//         this.controls.enabled = false;
//         this.dragTarget = dragRoot;
//
//         // 设置拖拽平面，使其面向相机，并经过点击点
//         this.dragPlane.setFromNormalAndCoplanarPoint(
//           this.camera.getWorldDirection(this.dragPlane.normal).negate(),
//           intersects[0].point
//         );
//
//         // 计算偏移量（使用世界坐标）
//         if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersection)) {
//           const worldPos = new THREE.Vector3();
//           dragRoot.getWorldPosition(worldPos);
//           this.dragOffset.subVectors(worldPos, this.dragIntersection);
//         }
//       }
//     }
//   }
//
//   // 鼠标抬起事件
//   onMouseUp() {
//     if (this.isDragging) {
//       this.isDragging = false;
//       this.controls.enabled = true;
//       this.dragTarget = null;
//     }
//   }
//
//   // 鼠标滚轮事件
//   onWheel(event) {
//     if (this.model) {
//       // 无论鼠标是否在模型上，只要有选中模型，就拦截滚轮事件进行缩放
//       event.preventDefault();
//       event.stopPropagation();
//
//       // 向上滑(deltaY < 0)放大，向下滑(deltaY > 0)缩小
//       const scaleFactor = 0.1;
//       const delta = event.deltaY < 0 ? (1 + scaleFactor) : (1 - scaleFactor);
//
//       this.model.scale.multiplyScalar(delta);
//     }
//   }
//
//   // 鼠标移动事件处理
//   onMouseMove(event) {
//     const { clientHeight, clientWidth, offsetLeft, offsetTop } = this.container;
//     this.mouse.x = ((event.clientX - offsetLeft) / clientWidth) * 2 - 1;
//     this.mouse.y = -((event.clientY - offsetTop) / clientHeight) * 2 + 1;
//
//     this.raycaster.setFromCamera(this.mouse, this.camera);
//
//     // 处理拖拽移动（支持拖拽 manyModelGroup 的子模型或主模型）
//     if (this.isDragging && this.dragTarget) {
//       if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersection)) {
//         const worldTarget = this.dragIntersection.clone().add(this.dragOffset);
//         if (this.dragTarget.parent) {
//           const localTarget = this.dragTarget.parent.worldToLocal(worldTarget.clone());
//           this.dragTarget.position.copy(localTarget);
//         } else {
//           this.dragTarget.position.copy(worldTarget);
//         }
//       }
//       return;
//     }
//
//     let model = this.model;
//     if (this.geometryGroup.children.length) {
//       model = this.geometryGroup;
//     }
//     if (!model) return;
//
//     // 检查是否悬停在有事件的模型上
//     const intersects = this.raycaster
//       .intersectObjects(model.children || [], true)
//       .filter(item => item.object.isMesh);
//
//     if (intersects.length > 0) {
//       const object = intersects[0].object;
//       const eventData = eventModules.getMeshEventData(object.uuid);
//       if (eventData && eventData.clickEvent !== "none") {
//         this.container.style.cursor = "pointer";
//       } else {
//         this.container.style.cursor = "default";
//       }
//     } else {
//       this.container.style.cursor = "default";
//     }
//   }
//
//   // 创建控制器
//   initControls() {
//     this.controls = new OrbitControls(this.camera, this.renderer.domElement);
//     this.controls.enablePan = false;
//     this.controls.enableDamping = true;
//     this.controls.target.set(0, 0, 0);
//     this.controls.update();
//
//     // 标签控制器
//     this.css3dControls = new OrbitControls(this.camera, this.css3DRenderer.domElement);
//     this.css3dControls.enablePan = false;
//     this.css3dControls.enableDamping = true;
//     this.css3dControls.target.set(0, 0, 0);
//     this.css3dControls.update();
//   }
//
//   // 加载模型
//   loadModel({ filePath, fileType, decomposeName }, clearScene = true) {
//     return new Promise(resolve => {
//       this.loadingStatus = false;
//       let loader;
//       if (["glb", "gltf"].includes(fileType)) {
//         const dracoLoader = new DRACOLoader();
//         dracoLoader.setDecoderPath(`draco/`);
//         dracoLoader.setDecoderConfig({ type: "js" });
//         dracoLoader.preload();
//         loader = new GLTFLoader().setDRACOLoader(dracoLoader);
//       } else {
//         loader = this.fileLoaderMap[fileType];
//       }
//       if (clearScene) {
//         this.model?.dispose()
//       }
//       loader.load(
//         filePath,
//         result => {
//           switch (fileType) {
//             case "glb":
//               this.model = result.scene;
//               if (result.animations) this.model.animations = result.animations;
//               break;
//             case "fbx":
//               this.model = result;
//               if (result.animations) this.model.animations = result.animations;
//               break;
//             case "gltf":
//               this.model = result.scene;
//               if (result.animations) this.model.animations = result.animations;
//               break;
//             case "obj":
//               this.model = result;
//               if (result.animations) this.model.animations = result.animations;
//               break;
//             case "stl":
//               const material = new THREE.MeshStandardMaterial();
//               const mesh = new THREE.Mesh(result, material);
//               this.model = mesh;
//               break;
//             default:
//               break;
//           }
//           this.model.decomposeName = decomposeName;
//           this.materialModules.getModelMaterialList();
//           this.materialModules.setModelPositionSize();
//
//           // 需要辉光的材质
//           this.glowMaterialList = this.modelMaterialList.map(v => v.name);
//           this.scene.add(this.model);
//           this.loadingStatus = true;
//           resolve(true);
//           this.getModelAnimationList(result);
//         },
//         xhr => {
//           this.modelProgressCallback(xhr.loaded, xhr.total);
//         },
//         err => {
//           ElMessage.error("文件错误");
//           console.log(err);
//           resolve(true);
//         }
//       );
//     });
//   }
//
//   // 设置材质辉光
//   setMeshFlow() {
//     this.scene.traverse(v => {
//       if (v instanceof THREE.GridHelper) {
//         this.materials.gridHelper = v.material;
//         v.material = new THREE.MeshStandardMaterial({ color: "#000" });
//       }
//       if (v instanceof THREE.Scene) {
//         this.materials.scene = v.background;
//         this.materials.environment = v.environment;
//         v.background = null;
//         v.environment = null;
//       }
//       if (!this.glowMaterialList.includes(v.name) && v.isMesh) {
//         this.materials[v.uuid] = v.material;
//         v.material = new THREE.MeshStandardMaterial({ color: "#000" });
//       }
//     });
//     this.glowComposer.render();
//     // 辉光渲染器执行完之后再恢复材质原效果
//     this.scene.traverse(v => {
//       if (this.materials[v.uuid]) {
//         v.material = this.materials[v.uuid];
//         delete this.materials[v.uuid];
//       }
//       if (v instanceof THREE.GridHelper) {
//         v.material = this.materials.gridHelper;
//         delete this.materials.gridHelper;
//       }
//       if (v instanceof THREE.Scene) {
//         v.background = this.materials.scene;
//         v.environment = this.materials.environment;
//         delete this.materials.scene;
//         delete this.materials.environment;
//       }
//     });
//     this.effectComposer.render();
//     this.controls.update();
//   }
//
//   // 加载几何体模型
//   setGeometryModel(model) {
//     return new Promise((resolve) => {
//       const { clientHeight, clientWidth, offsetLeft, offsetTop } = this.container;
//       // 计算鼠标在屏幕上的坐标
//       this.mouse.x = ((model.clientX - offsetLeft) / clientWidth) * 2 - 1;
//       this.mouse.y = -((model.clientY - offsetTop) / clientHeight) * 2 + 1;
//       this.raycaster.setFromCamera(this.mouse, this.camera);
//       const intersects = this.raycaster.intersectObjects(this.scene.children, true);
//       if (intersects.length > 0) {
//         // 在控制台输出鼠标在场景中的位置
//         const { type } = model;
//         // 不需要赋值的key
//         const notGeometryKey = ["id", "name", "modelType", "type"];
//         const geometryData = Object.keys(model)
//           .filter(key => !notGeometryKey.includes(key))
//           .map(v => model[v]);
//         // 创建几何体
//         const geometry = new THREE[type](...geometryData);
//
//         // 随机颜色
//         const meshColor = colors[Math.ceil(Math.random() * 10)];
//         const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(meshColor), side: THREE.DoubleSide });
//         const mesh = new THREE.Mesh(geometry, material);
//         const { x, y, z } = intersects[0].point;
//         mesh.position.set(x, y, z);
//
//         const newMesh = mesh.clone();
//         Object.assign(mesh.userData, {
//           rotation: newMesh.rotation,
//           scale: newMesh.scale,
//           position: newMesh.position
//         });
//
//         mesh.name = type + "_" + onlyKey(4, 5);
//         mesh.userData.geometry = true;
//         this.geometryGroup.add(mesh);
//         this.model = this.geometryGroup;
//         this.materialModules.onSetGeometryMeshList(mesh);
//
//         this.glowMaterialList = this.modelMaterialList.map(v => v.name);
//         this.setModelMeshDrag({ transformType: true });
//         this.scene.add(this.model);
//         // 计算控制器缩放大小
//         const box = new THREE.Box3().setFromObject(this.model);
//         const size = box.getSize(new THREE.Vector3());
//         this.controls.maxDistance = size.length() * 10;
//         this.loadingStatus = true;
//         resolve(true);
//       } else {
//         ElMessage.warning("当前角度无法获取鼠标位置请调整'相机角度'在添加");
//       }
//     });
//   }
//
//   // 模型加载进度条回调函数
//   onProgress(callback) {
//     if (typeof callback == "function") {
//       this.modelProgressCallback = callback;
//     }
//   }
//
//   // 创建辅助线
//   createHelper() {
//     // 网格辅助线
//     this.gridHelper = new THREE.GridHelper(6, 18, "#fff", "rgb(193,193,193)");
//     this.gridHelper.position.set(0, -0.59, -0.1);
//     this.gridHelper.visible = false;
//     this.scene.add(this.gridHelper);
//     // 坐标轴辅助线
//     this.axesHelper = new THREE.AxesHelper(2);
//     this.axesHelper.visible = false;
//     this.scene.add(this.axesHelper);
//     // 开启阴影
//     this.renderer.shadowMap.enabled = true;
//   }
//
//   // 创建光源
//   createLight() {
//     // 创建环境光
//     this.ambientLight = new THREE.AmbientLight("#fff", 0.8);
//     this.ambientLight.visible = true;
//     this.scene.add(this.ambientLight);
//     // 创建平行光
//     this.directionalLight = new THREE.DirectionalLight("#fff", 5);
//     this.directionalLight.position.set(-1.44, 2.2, 1);
//     this.directionalLight.castShadow = true;
//     this.directionalLight.visible = false;
//     this.scene.add(this.directionalLight);
//     // 创建平行光辅助线
//     this.directionalLightHelper = new THREE.DirectionalLightHelper(this.directionalLight, 0.3);
//     this.directionalLightHelper.visible = false;
//     this.scene.add(this.directionalLightHelper);
//
//     // 创建点光源
//     this.pointLight = new THREE.PointLight(0xff0000, 5, 100);
//     this.pointLight.visible = false;
//     this.scene.add(this.pointLight);
//     // 创建点光源辅助线
//     this.pointLightHelper = new THREE.PointLightHelper(this.pointLight, 0.5);
//     this.pointLightHelper.visible = false;
//     this.scene.add(this.pointLightHelper);
//
//     // 创建聚光灯
//     this.spotLight = new THREE.SpotLight("#00BABD", 900);
//     this.spotLight.visible = false;
//     this.spotLight.map = new THREE.TextureLoader().load(getAssetsFile("image/model-bg-1.jpg"));
//     this.spotLight.map = new THREE.TextureLoader().load(getAssetsFile("image/model-bg-1.jpg"));
//     this.spotLight.decay = 2;
//     this.spotLight.shadow.mapSize.width = 1920;
//     this.spotLight.shadow.mapSize.height = 1080;
//     this.spotLight.shadow.camera.near = 1;
//     this.spotLight.shadow.camera.far = 10;
//     this.scene.add(this.spotLight);
//     // 创建聚光灯辅助线
//     this.spotLightHelper = new THREE.SpotLightHelper(this.spotLight);
//     this.spotLightHelper.visible = false;
//     this.scene.add(this.spotLightHelper);
//
//     const geometry = new THREE.PlaneGeometry(2000, 2000);
//     const planeMaterial = new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.5 });
//
//     this.planeGeometry = new THREE.Mesh(geometry, planeMaterial);
//     this.planeGeometry.rotation.x = -Math.PI / 2;
//
//     this.planeGeometry.position.set(0, -1.2, 0);
//     this.planeGeometry.receiveShadow = true;
//     this.planeGeometry.material.side = THREE.DoubleSide;
//     this.planeGeometry.material.color.set("#23191F");
//     this.planeGeometry.geometry.verticesNeedUpdate = true;
//     this.scene.add(this.planeGeometry);
//   }
//
//   // 创建效果合成器
//   createEffectComposer() {
//     if (!this.container) return false;
//     const { clientHeight, clientWidth } = this.container;
//     this.effectComposer = new EffectComposer(
//       this.renderer,
//       new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
//         samples: 4 // 增加采样次数来提高抗锯齿效果
//       })
//     );
//     const renderPass = new RenderPass(this.scene, this.camera);
//
//     this.effectComposer.addPass(renderPass);
//
//     this.outlinePass = new OutlinePass(new THREE.Vector2(clientWidth, clientHeight), this.scene, this.camera);
//     this.outlinePass.visibleEdgeColor = new THREE.Color("#FF8C00"); // 可见边缘的颜色
//     this.outlinePass.hiddenEdgeColor = new THREE.Color("#8a90f3"); // 不可见边缘的颜色
//     this.outlinePass.edgeGlow = 2; // 发光强度
//     this.outlinePass.usePatternTexture = false; // 是否使用纹理图案
//     this.outlinePass.edgeThickness = 1; // 边缘浓度
//     this.outlinePass.edgeStrength = 4; // 边缘的强度，值越高边框范围越大
//     this.outlinePass.pulsePeriod = 200; // 闪烁频率，值越大频率越低
//     this.effectComposer.addPass(this.outlinePass);
//     let outputPass = new OutputPass();
//     this.effectComposer.addPass(outputPass);
//
//     // 增强FXAA抗锯齿效果
//     let effectFXAA = new ShaderPass(FXAAShader);
//     const pixelRatio = this.renderer.getPixelRatio();
//     effectFXAA.uniforms.resolution.value.set(1 / (clientWidth * pixelRatio), 1 / (clientHeight * pixelRatio));
//     effectFXAA.renderToScreen = true;
//     effectFXAA.needsSwap = true;
//     // 调整FXAA参数以增强抗锯齿效果
//     effectFXAA.material.uniforms.tDiffuse.value = 1.0;
//     effectFXAA.enabled = true;
//     this.effectComposer.addPass(effectFXAA);
//
//     // 创建辉光效果
//     this.unrealBloomPass = new UnrealBloomPass(new THREE.Vector2(clientWidth, clientHeight), 1.5, 0.4, 0.85);
//     // 辉光合成器
//     const renderTargetParameters = {
//       minFilter: THREE.LinearFilter,
//       format: THREE.RGBAFormat,
//       stencilBuffer: false,
//       samples: 4 // 为辉光效果也添加抗锯齿
//     };
//     const glowRender = new THREE.WebGLRenderTarget(clientWidth * 2, clientHeight * 2, renderTargetParameters);
//     this.glowComposer = new EffectComposer(this.renderer, glowRender);
//     this.glowComposer.renderToScreen = false;
//     this.glowRenderPass = new RenderPass(this.scene, this.camera);
//     this.glowComposer.addPass(this.glowRenderPass);
//     this.glowComposer.addPass(this.unrealBloomPass);
//     // 着色器
//     this.shaderPass = new ShaderPass(
//       new THREE.ShaderMaterial({
//         uniforms: {
//           baseTexture: { value: null },
//           bloomTexture: { value: this.glowComposer.renderTarget2.texture },
//           tDiffuse: { value: null },
//           glowColor: { value: null }
//         },
//         vertexShader,
//         fragmentShader,
//         defines: {}
//       }),
//       "baseTexture"
//     );
//
//     this.shaderPass.material.uniforms.glowColor.value = new THREE.Color();
//     this.shaderPass.renderToScreen = true;
//     this.shaderPass.needsSwap = true;
//     this.shaderPass.name = "ShaderColor";
//   }
//
//   // 注册模型切换回调
//   onSwitchModelCallback(callback) {
//     this.switchModelCallback = callback;
//   }
//
//   // 切换模型
//   onSwitchModel(model, clearScene = true) {
//     return new Promise(async (resolve, reject) => {
//       try {
//         // 加载几何模型
//         if (model.modelType && model.modelType == "geometry") {
//           this.modelAnimation = [];
//           this.camera.fov = 80;
//           this.camera.updateProjectionMatrix();
//           console.log(model);
//           await this.setGeometryModel(model);
//           this.outlinePass.renderScene = this.geometryGroup;
//           resolve();
//         } else {
//           if (clearScene) {
//             this.clearSceneModel();
//           }
//           // 加载模型
//           const load = await this.loadModel(model, clearScene);
//           this.outlinePass.renderScene = this.model;
//           // 模型加载成功返回 true
//           resolve({ load, filePath: model.filePath });
//         }
//       } catch (err) {
//         console.log(err);
//         reject();
//       }
//     });
//   }
//
//   // 新增：返回场景中可作为视角目标的对象列表（用于 UI）
//   getViewTargets() {
//     const list = [];
//     if (this.model) {
//       list.push({
//         uuid: this.model.uuid,
//         name: this.model.name || "当前模型",
//         type: "model"
//       });
//     }
//     // 多模型组内的每个子模型（包括拆出的子模型）
//     this.manyModelGroup.children.forEach(child => {
//       list.push({
//         uuid: child.uuid,
//         name: child.name || `子模型-${child.uuid.slice(0, 6)}`,
//         type: "manyModel"
//       });
//     });
//     // 如果需要也可以列出主模型下可识别的子对象（第一层）
//     if (this.model && this.model.children && this.model.children.length) {
//       this.model.children.forEach(child => {
//         // 仅列出显著命名或网格对象
//         if (child.isMesh || child.name) {
//           list.push({
//             uuid: child.uuid,
//             name: child.name || `部件-${child.uuid.slice(0,6)}`,
//             type: "part"
//           });
//         }
//       });
//     }
//     return list;
//   }
//
//   // 新增：把场景中选中的子对象从原父体中拆解，成为独立小模型（添加到 manyModelGroup）
//   // 增强：支持拆解后"弹出"动画（world 坐标位移 + 轻微缩放），可通过第二个参数控制行为
//   extractSubModel(uuid, options = { popOut: true, distanceFactor: 1.2, duration: 600 }) {
//     const obj = this.scene.getObjectByProperty("uuid", uuid);
//     if (!obj) return null;
//
//     // 确保 manyModelGroup 存在于场景中
//     if (!this.scene.getObjectByProperty('uuid', this.manyModelGroup.uuid)) {
//       this.scene.add(this.manyModelGroup);
//     }
//
//     // 记录对象当前位置（世界坐标）以便计算动画起止点
//     const worldPos = new THREE.Vector3();
//     obj.getWorldPosition(worldPos);
//
//     // 计算参考中心（优先使用主模型 world 位置）
//     const centerWorld = new THREE.Vector3();
//     if (this.model) {
//       this.model.getWorldPosition(centerWorld);
//     } else if (obj.parent) {
//       obj.parent.getWorldPosition(centerWorld);
//     } else {
//       centerWorld.set(0, 0, 0);
//     }
//
//     // 计算弹出方向（从中心指向对象），若方向长度非常小则默认沿 +Y
//     const dir = worldPos.clone().sub(centerWorld);
//     if (dir.length() < 1e-4) dir.set(0, 1, 0);
//     dir.normalize();
//
//     // 基于对象包围盒大小决定位移距离，保证不同尺寸模型弹出距离合理
//     const bbox = new THREE.Box3().setFromObject(obj);
//     const size = new THREE.Vector3();
//     bbox.getSize(size);
//     const maxDim = Math.max(size.x, size.y, size.z);
//     const offsetDistance = Math.max(maxDim, 0.5) * (options.distanceFactor || 1.2);
//
//     const endWorldPos = worldPos.clone().add(dir.multiplyScalar(offsetDistance));
//
//     // 使用 attach 保持世界变换不变地重新父级化
//     this.manyModelGroup.attach(obj);
//
//     // 确保本地起点与 worldPos 对齐（attach 一般会保持世界变换，但这里显式确保）
//     const localStart = this.manyModelGroup.worldToLocal(worldPos.clone());
//     obj.position.copy(localStart);
//
//     // 标记为子模型并允许移动，方便区分
//     obj.userData = Object.assign({}, obj.userData, { type: 'subModel', movable: true });
//
//     // 执行弹出动画（使用 TWEEN，sceneAnimation 中已有 TWEEN.update 驱动）
//     if (options.popOut) {
//       const localEnd = this.manyModelGroup.worldToLocal(endWorldPos.clone());
//       const origScale = obj.scale.clone();
//       const tweenObj = { t: 0 };
//       new TWEEN.Tween(tweenObj)
//         .to({ t: 1 }, options.duration || 600)
//         .easing(TWEEN.Easing.Cubic.Out)
//         .onUpdate(() => {
//           // 插值位置（在父级局部坐标系中插值）
//           obj.position.lerpVectors(localStart, localEnd, tweenObj.t);
//           // 轻微缩放以增强"弹出感"，在中点略微放大然后回到原始尺度
//           const scaleFactor = 1 + 0.08 * Math.sin(Math.PI * tweenObj.t);
//           obj.scale.set(origScale.x * scaleFactor, origScale.y * scaleFactor, origScale.z * scaleFactor);
//         })
//         .onComplete(() => {
//           obj.position.copy(localEnd);
//           obj.scale.copy(origScale);
//         })
//         .start();
//     }
//
//     return obj;
//   }
//
//   // 监听窗口变化
//   onWindowResizes() {
//     if (!this.container) return false;
//     const { clientHeight, clientWidth } = this.container;
//     // 调整屏幕大小
//     this.camera.aspect = clientWidth / clientHeight; // 摄像机宽高比例
//     this.camera.updateProjectionMatrix(); // 相机更新矩阵，将3d内容投射到2d面上转换
//     this.renderer.setSize(clientWidth, clientHeight);
//     this.css3DRenderer.setSize(clientWidth, clientHeight);
//
//     if (this.effectComposer) {
//       // 假设抗锯齿效果是EffectComposer中的第一个pass
//       let pass = this.effectComposer.passes[3];
//       const pixelRatio = this.renderer.getPixelRatio();
//       pass.uniforms.resolution.value.set(1 / (clientWidth * pixelRatio), 1 / (clientHeight * pixelRatio));
//       this.effectComposer.setSize(clientWidth, clientHeight);
//     }
//
//     if (this.glowComposer) this.glowComposer.setSize(clientWidth, clientHeight);
//
//     // 更新多视角系统
//     if (this.multiViewportSystem && this.multiViewportSystem.enabled) {
//       // 可以选择重新计算布局或保持现有布局
//       console.log('窗口大小改变，多视角系统可能需要重新布局');
//     }
//   }
//
//   // 下载场景封面
//   onDownloadSceneCover() {
//     let link = document.createElement("a");
//     let canvas = this.renderer.domElement;
//     link.href = canvas.toDataURL("image/png");
//     link.download = `${new Date().toLocaleString()}.png`;
//     link.click();
//     ElMessage.success("下载成功");
//   }
//
//   // 导出模型
//   onExporterModel(type) {
//     if (type == "usdz") {
//       const exporter = new USDZExporter();
//       exporter.parse(this.scene, usdz => {
//         // 将导出的 USDZ 数据保存为文件或进行其他操作
//         const blob = new Blob([usdz], { type: "model/vnd.usdz+zip" });
//         const url = URL.createObjectURL(blob);
//         const link = document.createElement("a");
//         link.href = url;
//         link.download = `${new Date().toLocaleString()}.usdz`;
//         link.click();
//         URL.revokeObjectURL(url);
//         ElMessage.success("导出成功");
//       });
//     } else {
//       const exporter = new GLTFExporter();
//       const options = {
//         trs: true, // 是否保留位置、旋转、缩放信息
//         animations: this.modelAnimation, // 导出的动画
//         binary: type == "glb" ? true : false, // 是否以二进制格式输出
//         embedImages: true, //是否嵌入贴图
//         onlyVisible: true, //是否只导出可见物体
//         includeCustomExtensions: true
//       };
//       exporter.parse(
//         this.model,
//         result => {
//           if (result instanceof ArrayBuffer) {
//             // 将结果保存为GLB二进制文件
//             saveArrayBuffer(result, `${new Date().toLocaleString()}.glb`);
//           } else {
//             // 将结果保存为GLTF JSON文件
//             saveString(JSON.stringify(result), `${new Date().toLocaleString()}.gltf`);
//           }
//           function saveArrayBuffer(buffer, filename) {
//             // 将二进制数据保存为文件
//             const blob = new Blob([buffer], { type: "application/octet-stream" });
//             const url = URL.createObjectURL(blob);
//             const link = document.createElement("a");
//             link.href = url;
//             link.download = filename;
//             link.click();
//             URL.revokeObjectURL(url);
//             ElMessage.success("导出成功");
//           }
//           function saveString(text, filename) {
//             // 将字符串数据保存为文件
//             const blob = new Blob([text], { type: "application/json" });
//             const url = URL.createObjectURL(blob);
//             const link = document.createElement("a");
//             link.href = url;
//             link.download = filename;
//             link.click();
//             URL.revokeObjectURL(url);
//             ElMessage.success("导出成功");
//           }
//         },
//         err => {
//           ElMessage.error(err);
//         },
//         options
//       );
//     }
//   }
//
//   // 清除模型数据
//   onClearModelData() {
//     cancelAnimationFrame(this.rotationAnimationFrame);
//     cancelAnimationFrame(this.renderAnimation);
//     cancelAnimationFrame(this.animationFrame);
//
//     // 移除事件监听器
//     this.container.removeEventListener("click", this.onMouseClickListener);
//     this.container.removeEventListener("mousemove", this.onMouseMoveListener);
//     this.container.removeEventListener("mousedown", this.onMouseDownListener);
//     this.container.removeEventListener("wheel", this.onWheelListener);
//     window.removeEventListener("mouseup", this.onMouseUpListener);
//     window.removeEventListener("resize", this.onWindowResizesListener);
//
//     // 清理场景
//     this.scene.traverse(v => {
//       if (v.type === "Mesh") {
//         v.geometry.dispose();
//         v.material.dispose();
//       }
//       if (v.isMesh) {
//         v.geometry.dispose();
//         v.material.dispose();
//       }
//     });
//     this.scene.clear();
//
//     // 清理渲染器
//     this.renderer.dispose();
//     this.renderer.clear();
//     this.container = null;
//
//     // 清理多视角系统
//     this.destroyMultiViewportSystem();
//
//     // 清理CSS3D渲染器
//     if (this.css3DRenderer) {
//       this.css3DRenderer.domElement.remove();
//       this.css3DRenderer = null;
//     }
//
//     // 清理所有引用
//     this.camera = null;
//     this.scene = null;
//     this.renderer = null;
//     this.controls = null;
//     this.model = null;
//     this.fileLoaderMap = null;
//     this.modelAnimation = null;
//     this.animationMixer = null;
//     this.animationClock = null;
//     this.animationFrame = null;
//     this.rotationAnimationFrame = null;
//     this.animateClipAction = null;
//     this.loopMap = null;
//     this.gridHelper = null;
//     this.axesHelper = null;
//     this.ambientLight = null;
//     this.directionalLight = null;
//     this.directionalLightHelper = null;
//     this.pointLight = null;
//     this.pointLightHelper = null;
//     this.spotLight = null;
//     this.spotLightHelper = null;
//     this.planeGeometry = null;
//     this.modelMaterialList = [];
//     this.originalMaterials.clear();
//     this.effectComposer = null;
//     this.outlinePass = null;
//     this.renderAnimation = null;
//     this.raycaster = null;
//     this.mouse = null;
//
//     if (this.glowComposer) {
//       this.glowComposer.renderer.clear();
//     }
//     this.glowComposer = null;
//     this.unrealBloomPass = null;
//     this.shaderPass = null;
//     this.glowMaterialList = null;
//     this.materials = null;
//     this.transformControls = null;
//     this.dragGeometryModel = null;
//     this.glowUnrealBloomPass = false;
//     this.css3dControls = null;
//     this.dragTag = {};
//     this.dragTagList = [];
//     this.activeDragManyModel = {};
//
//     // 清理多视角系统相关
//     this.viewPointsByTarget = null;
//     this.currentViewIndexByTarget = null;
//     this.isPlayingViewSequenceByTarget = null;
//     this.viewTween = null;
//     this.isPlayingSynchronized = null;
//
//     // 清理事件数据
//     this.clearEventData();
//   }
//
//   // 移除指定模型
//   removeModel(model) {
//     if (!model) return;
//     console.log("Removing model:", model);
//
//     // 递归释放资源
//     model.traverse(v => {
//       if (v.isMesh) {
//         if (v.geometry) v.geometry.dispose();
//         if (v.material) {
//           if (Array.isArray(v.material)) {
//             v.material.forEach(m => m.dispose());
//           } else {
//             v.material.dispose();
//           }
//         }
//       }
//     });
//
//     // 从父对象中移除
//     if (model.parent) {
//       model.parent.remove(model);
//     }
//
//     // 如果是当前选中的模型，清除选中状态
//     // 使用 toRaw 确保比较的是原始对象
//     const rawModel = toRaw(model);
//     const rawCurrentModel = toRaw(this.model);
//
//     if (rawCurrentModel === rawModel) {
//       this.model = null;
//       this.modelMaterialList = [];
//       this.originalMaterials.clear();
//       this.modelAnimation = [];
//       if (this.transformControls) {
//         this.transformControls.detach();
//       }
//       this.outlinePass.selectedObjects = [];
//     }
//
//     // 如果选中的是该模型的子网格，也需要清除选中状态
//     if (this.outlinePass.selectedObjects.length > 0) {
//       let selected = this.outlinePass.selectedObjects[0];
//       let root = selected;
//       while(root.parent && root !== model && root.parent !== null) {
//         root = root.parent;
//       }
//       if (root === model) {
//         this.outlinePass.selectedObjects = [];
//         if (this.transformControls) this.transformControls.detach();
//       }
//     }
//   }
//
//   // 清除场景模型数据
//   clearSceneModel() {
//     this.camera.fov = 50;
//     // 先移除模型 材质释放内存
//     this.scene.traverse(v => {
//       if (["Mesh"].includes(v.type)) {
//         v.geometry.dispose();
//         v.material.dispose();
//       }
//     });
//     this.dragGeometryModel = {};
//     this.activeDragManyModel = {};
//     this.geometryGroup.clear();
//     this.scene.remove(this.geometryGroup);
//     this.scene.remove(this.manyModelGroup);
//     this.manyModelGroup.clear();
//
//     // 移除添加的多模型
//     const removeModelList = this.scene.children.filter(v => v.userData.type == "manyModel");
//     removeModelList.forEach(v => {
//       this.scene.remove(v);
//     });
//     this.scene.remove(this.model);
//     this.model = null;
//
//     // 取消动画帧
//     cancelAnimationFrame(this.animationFrame);
//     cancelAnimationFrame(this.rotationAnimationFrame);
//
//     this.glowUnrealBloomPass = false;
//     this.glowMaterialList = [];
//     this.modelMaterialList = [];
//     this.originalMaterials.clear();
//
//     this.materials = {};
//     if (this.transformControls) {
//       this.transformControls.detach();
//       const transformControlsPlane = findObjectInScene(this.scene, { type: "TransformControlsPlane" });
//       if (transformControlsPlane) {
//         this.scene.remove(transformControlsPlane);
//       }
//       this.scene.remove(this.transformControls);
//       this.transformControls = null;
//     }
//
//     if (this.effectComposer) {
//       this.effectComposer.removePass(this.shaderPass);
//     }
//
//     this.renderer.toneMappingExposure = 2;
//     this.outlinePass.selectedObjects = [];
//
//     Object.assign(this.unrealBloomPass, {
//       threshold: 0,
//       strength: 0,
//       radius: 0
//     });
//     this.shaderPass.material.uniforms.glowColor.value = new THREE.Color();
//
//     const config = {
//       gridHelper: false,
//       x: 0,
//       y: -0.59,
//       z: -0.1,
//       positionX: 0,
//       positionY: -1,
//       positionZ: 0,
//       divisions: 18,
//       size: 6,
//       color: "rgb(193,193,193)",
//       axesHelper: false,
//       axesSize: 1.8
//     };
//     this.lightModules.onResettingLight({ ambientLight: true });
//
//     this.onSetModelGridHelper(config);
//     this.onSetModelGridHelperSize(config);
//     this.onSetModelAxesHelper(config);
//     this.clearSceneTags();
//     this.clearEventData();
//   }
//
//   // 设置当前被拖拽的几何模型
//   setDragGeometryModel(model) {
//     this.dragGeometryModel = model;
//   }
//
//   // 设置当前被拖拽的多模型
//   setDragManyModel(model) {
//     this.activeDragManyModel = model;
//   }
//
//   // 加载多模型
//   onLoadManyModel(model) {
//     return new Promise((resolve, reject) => {
//       const { clientHeight, clientWidth, offsetLeft, offsetTop } = this.container;
//       const { filePath, fileType, name } = model;
//       // 计算鼠标在屏幕上的坐标
//       this.mouse.x = ((model.clientX - offsetLeft) / clientWidth) * 2 - 1;
//       this.mouse.y = -((model.clientY - offsetTop) / clientHeight) * 2 + 1;
//       this.raycaster.setFromCamera(this.mouse, this.camera);
//       const intersects = this.raycaster.intersectObjects(this.scene.children, true);
//       if (intersects.length > 0) {
//         this.loadingStatus = false;
//         let loader;
//         if (["glb", "gltf"].includes(fileType)) {
//           const dracoLoader = new DRACOLoader();
//           dracoLoader.setDecoderPath(`draco/`);
//           dracoLoader.setDecoderConfig({ type: "js" });
//           dracoLoader.preload();
//           loader = new GLTFLoader().setDRACOLoader(dracoLoader);
//         } else {
//           loader = this.fileLoaderMap[fileType];
//         }
//         let manyModel;
//         loader.load(
//           filePath,
//           result => {
//             switch (fileType) {
//               case "glb":
//                 manyModel = result.scene;
//                 if (result.animations) manyModel.animations = result.animations;
//                 break;
//               case "fbx":
//                 manyModel = result;
//                 if (result.animations) manyModel.animations = result.animations;
//                 break;
//               case "gltf":
//                 manyModel = result.scene;
//                 if (result.animations) manyModel.animations = result.animations;
//                 break;
//               case "obj":
//                 manyModel = result;
//                 if (result.animations) manyModel.animations = result.animations;
//                 break;
//               case "stl":
//                 const material = new THREE.MeshStandardMaterial();
//                 const mesh = new THREE.Mesh(result, material);
//                 manyModel = mesh;
//                 break;
//               default:
//                 break;
//             }
//             this.getManyModelAnimationList(result.animations);
//
//             // 设置模型位置
//             const { x, y, z } = intersects[0].point;
//             manyModel.position.set(x, y, z);
//             const box = new THREE.Box3().setFromObject(manyModel);
//             const size = box.getSize(new THREE.Vector3());
//             const maxSize = Math.max(size.x, size.y, size.z);
//             const targetSize = 1.2;
//             const scale = targetSize / (maxSize > 1 ? maxSize : 0.5);
//             manyModel.scale.set(scale, scale, scale);
//             manyModel.name = name;
//             manyModel.userData = {
//               type: "manyModel",
//               ...manyModel.userData
//             };
//             this.manyModelGroup.add(manyModel);
//
//             // 确保多模型组在场景中
//             if (!this.scene.getObjectByProperty('uuid', this.manyModelGroup.uuid)) {
//               this.scene.add(this.manyModelGroup);
//             }
//
//             this.loadingStatus = true;
//
//             resolve({ load: true });
//           },
//           xhr => {
//             this.modelProgressCallback(xhr.loaded, xhr.total);
//           },
//           err => {
//             ElMessage.error(err);
//             reject();
//           }
//         );
//       } else {
//         reject();
//         ElMessage.warning("当前角度无法获取鼠标位置请调整'相机角度'在添加");
//       }
//     });
//   }
//
//   /***************************************************************
//    * 多相机系统 - 真正实现同步多视角显示
//    ***************************************************************/
//
//   /**
//    * 创建多相机视口系统
//    * @param {Array} viewports - 视口配置数组
//    * @param {Object} renderer - 主渲染器
//    */
//   initMultiViewportSystem(viewports, renderer) {
//     // 清理现有系统
//     this.destroyMultiViewportSystem();
//
//     this.multiViewportSystem = {
//       enabled: false,
//       viewports: [],
//       cameras: [],
//       renderers: [],
//       containers: [],
//       labels: []
//     };
//
//     if (!viewports || viewports.length === 0) {
//       console.warn("initMultiViewportSystem: 视口配置为空");
//       return;
//     }
//
//     console.log(`初始化多视角系统，共 ${viewports.length} 个视口`);
//
//     viewports.forEach((viewportConfig, index) => {
//       const {
//         width = 320,
//         height = 240,
//         left = 20,
//         top = 20,
//         position,
//         target,
//         fov = 50,
//         label = `相机 ${index + 1}`,
//         targetUuid = null
//       } = viewportConfig;
//
//       // 创建相机
//       const camera = new THREE.PerspectiveCamera(
//         fov,
//         width / height,
//         0.1,
//         10000
//       );
//
//       // 设置相机初始位置
//       if (position) {
//         camera.position.copy(position);
//       } else {
//         // 默认位置：基于主相机位置稍作偏移
//         const offsetX = (index % 2) * 5 - 2.5;
//         const offsetY = Math.floor(index / 2) * 3 - 1.5;
//         camera.position.copy(this.camera.position).add(new THREE.Vector3(offsetX, offsetY, 0));
//       }
//
//       if (target) {
//         camera.lookAt(target);
//       } else {
//         camera.lookAt(this.controls.target);
//       }
//
//       // 保存目标UUID（用于后续跟踪）
//       camera.userData = { targetUuid, label };
//
//       // 创建独立的渲染器
//       const viewportRenderer = new THREE.WebGLRenderer({
//         antialias: true,
//         alpha: true,
//         preserveDrawingBuffer: true
//       });
//       viewportRenderer.setSize(width, height);
//       viewportRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//       viewportRenderer.outputColorSpace = THREE.SRGBColorSpace;
//       viewportRenderer.toneMapping = THREE.ReinhardToneMapping;
//       viewportRenderer.toneMappingExposure = 1.5;
//
//       // 创建容器
//       const container = document.createElement('div');
//       container.className = 'multi-viewport-container';
//       container.style.position = 'absolute';
//       container.style.width = `${width}px`;
//       container.style.height = `${height}px`;
//       container.style.left = `${left}px`;
//       container.style.top = `${top}px`;
//       container.style.border = '2px solid rgba(255, 255, 255, 0.6)';
//       container.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
//       container.style.borderRadius = '4px';
//       container.style.overflow = 'hidden';
//       container.style.zIndex = '1000';
//       container.style.backgroundColor = '#1a1a1a';
//       container.appendChild(viewportRenderer.domElement);
//
//       // 创建标签容器
//       const labelContainer = document.createElement('div');
//       labelContainer.className = 'viewport-label';
//       labelContainer.style.position = 'absolute';
//       labelContainer.style.top = '8px';
//       labelContainer.style.left = '8px';
//       labelContainer.style.right = '8px';
//       labelContainer.style.color = 'white';
//       labelContainer.style.fontSize = '12px';
//       labelContainer.style.fontWeight = 'bold';
//       labelContainer.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
//       labelContainer.style.padding = '4px 8px';
//       labelContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
//       labelContainer.style.borderRadius = '3px';
//       labelContainer.textContent = label;
//       container.appendChild(labelContainer);
//
//       // 添加到DOM
//       if (this.container && this.container.appendChild) {
//         this.container.appendChild(container);
//       } else {
//         console.error('无法找到容器元素:', this.container);
//       }
//
//       this.multiViewportSystem.cameras.push(camera);
//       this.multiViewportSystem.renderers.push(viewportRenderer);
//       this.multiViewportSystem.containers.push(container);
//       this.multiViewportSystem.labels.push(labelContainer);
//       this.multiViewportSystem.viewports.push(viewportConfig);
//     });
//   }
//
//   /**
//    * 启用/禁用多视角系统
//    * @param {boolean} enabled - 是否启用
//    */
//   setMultiViewportEnabled(enabled) {
//     if (!this.multiViewportSystem) {
//       console.warn('多视角系统未初始化');
//       return;
//     }
//
//     this.multiViewportSystem.enabled = enabled;
//
//     // 显示/隐藏所有容器
//     this.multiViewportSystem.containers.forEach(container => {
//       container.style.display = enabled ? 'block' : 'none';
//     });
//
//     // 调整主渲染器透明度以突出多视角
//     if (this.renderer && this.renderer.domElement) {
//       this.renderer.domElement.style.opacity = enabled ? '0.4' : '1';
//     }
//
//     console.log(`多视角系统 ${enabled ? '启用' : '禁用'}`);
//   }
//
//   /**
//    * 更新多视角渲染
//    */
//   updateMultiViewports() {
//     if (!this.multiViewportSystem || !this.multiViewportSystem.enabled || !this.scene) {
//       return;
//     }
//
//     // 为每个视口渲染
//     this.multiViewportSystem.viewports.forEach((viewport, index) => {
//       const camera = this.multiViewportSystem.cameras[index];
//       const renderer = this.multiViewportSystem.renderers[index];
//
//       if (!camera || !renderer) return;
//
//       // 更新相机位置（如果绑定到目标）
//       this.updateCameraForViewport(camera, viewport);
//
//       // 渲染该视口
//       try {
//         renderer.render(this.scene, camera);
//       } catch (error) {
//         console.error(`渲染视口 ${index} 时出错:`, error);
//       }
//     });
//   }
//
//   /**
//    * 更新单个视口的相机位置
//    * @param {THREE.Camera} camera - 相机对象
//    * @param {Object} viewportConfig - 视口配置
//    */
//   updateCameraForViewport(camera, viewportConfig) {
//     const { targetUuid, offset, lookAtOffset, position, target, followMode = 'fixed' } = viewportConfig;
//
//     // 如果指定了固定位置
//     if (position && target && followMode === 'fixed') {
//       camera.position.copy(position);
//       camera.lookAt(target);
//       return;
//     }
//
//     // 如果绑定到目标对象
//     if (targetUuid && this.scene) {
//       const targetObj = this.scene.getObjectByProperty('uuid', targetUuid);
//       if (targetObj) {
//         // 计算世界位置
//         const worldOffset = offset ? new THREE.Vector3(offset.x, offset.y, offset.z) : new THREE.Vector3(0, 2, 5);
//         const worldLookAtOffset = lookAtOffset ? new THREE.Vector3(lookAtOffset.x, lookAtOffset.y, lookAtOffset.z) : new THREE.Vector3(0, 0, 0);
//
//         // 获取目标对象的包围盒
//         const bbox = new THREE.Box3().setFromObject(targetObj);
//         const center = new THREE.Vector3();
//         bbox.getCenter(center);
//
//         // 计算相机位置
//         const worldPos = center.clone().add(worldOffset);
//
//         // 平滑过渡
//         camera.position.lerp(worldPos, 0.1);
//
//         // 计算看向位置
//         const lookAtPos = center.clone().add(worldLookAtOffset);
//         camera.lookAt(lookAtPos);
//
//         return;
//       }
//     }
//
//     // 默认：跟随主相机，但有偏移
//     if (followMode === 'follow') {
//       const offsetVec = offset ? new THREE.Vector3(offset.x, offset.y, offset.z) : new THREE.Vector3(2, 2, 2);
//       const targetPos = this.camera.position.clone().add(offsetVec);
//       camera.position.lerp(targetPos, 0.1);
//       camera.lookAt(this.controls.target);
//     }
//   }
//
//   /**
//    * 根据视角创建多相机视口
//    * @param {Array} viewIds - 视角ID数组
//    * @param {Object} layout - 布局配置
//    */
//   createMultiCameraFromViews(viewIds, layout = {
//     cols: 2,
//     viewportWidth: 320,
//     viewportHeight: 240,
//     margin: 20
//   }) {
//     // 获取所有视角
//     const allViews = [];
//     for (const key of Object.keys(this.viewPointsByTarget || {})) {
//       allViews.push(...(this.viewPointsByTarget[key] || []));
//     }
//
//     const views = viewIds
//       .map(id => allViews.find(v => v.id === id))
//       .filter(v => v);
//
//     if (views.length === 0) {
//       console.warn('未找到指定的视角');
//       return;
//     }
//
//     const { cols, viewportWidth, viewportHeight, margin } = layout;
//     const viewports = [];
//
//     views.forEach((view, index) => {
//       const row = Math.floor(index / cols);
//       const col = index % cols;
//
//       viewports.push({
//         id: `viewport_${view.id}`,
//         label: view.name,
//         width: viewportWidth,
//         height: viewportHeight,
//         left: col * (viewportWidth + margin),
//         top: row * (viewportHeight + margin),
//         position: view.position.clone(),
//         target: view.target.clone(),
//         targetUuid: view.targetUuid,
//         fov: 60,
//         followMode: 'fixed'
//       });
//     });
//
//     this.initMultiViewportSystem(viewports, this.renderer);
//     this.setMultiViewportEnabled(true);
//   }
//
//   /**
//    * 实时同步多相机到不同目标
//    * @param {Array} configs - 每个相机的同步配置
//    */
//   syncMultiCameras(configs) {
//     if (!this.multiViewportSystem || !this.multiViewportSystem.enabled) return;
//
//     configs.forEach((config, index) => {
//       if (index >= this.multiViewportSystem.cameras.length) return;
//
//       const camera = this.multiViewportSystem.cameras[index];
//       const {
//         targetUuid,
//         offset = new THREE.Vector3(0, 2, 5),
//         lookAtOffset = new THREE.Vector3(0, 0, 0),
//         smoothFactor = 0.1
//       } = config;
//
//       // 更新视口配置
//       if (this.multiViewportSystem.viewports[index]) {
//         this.multiViewportSystem.viewports[index].targetUuid = targetUuid;
//         this.multiViewportSystem.viewports[index].offset = offset;
//         this.multiViewportSystem.viewports[index].lookAtOffset = lookAtOffset;
//       }
//     });
//   }
//
//   /**
//    * 销毁多视角系统
//    */
//   destroyMultiViewportSystem() {
//     if (!this.multiViewportSystem) return;
//
//     console.log('销毁多视角系统');
//
//     // 移除所有容器
//     this.multiViewportSystem.containers.forEach(container => {
//       if (container && container.parentNode) {
//         container.parentNode.removeChild(container);
//       }
//     });
//
//     // 释放所有渲染器资源
//     this.multiViewportSystem.renderers.forEach(renderer => {
//       if (renderer && renderer.dispose) {
//         renderer.dispose();
//         renderer.forceContextLoss();
//       }
//     });
//
//     // 重置主渲染器透明度
//     if (this.renderer && this.renderer.domElement) {
//       this.renderer.domElement.style.opacity = '1';
//     }
//
//     this.multiViewportSystem = null;
//   }
//
//   /**
//    * 获取多视角系统的状态
//    */
//   getMultiViewportStatus() {
//     if (!this.multiViewportSystem) {
//       return {
//         enabled: false,
//         viewportCount: 0,
//         cameras: []
//       };
//     }
//
//     return {
//       enabled: this.multiViewportSystem.enabled,
//       viewportCount: this.multiViewportSystem.cameras.length,
//       cameras: this.multiViewportSystem.cameras.map((cam, index) => ({
//         index,
//         label: this.multiViewportSystem.viewports[index]?.label || `相机 ${index + 1}`,
//         position: cam.position.clone(),
//         target: this.multiViewportSystem.viewports[index]?.target?.clone(),
//         targetUuid: this.multiViewportSystem.viewports[index]?.targetUuid
//       }))
//     };
//   }
//
//   /**
//    * 截图多视角
//    */
//   captureMultiViewportScreenshot() {
//     if (!this.multiViewportSystem || !this.multiViewportSystem.enabled) {
//       console.warn('多视角系统未启用');
//       return null;
//     }
//
//     const screenshots = this.multiViewportSystem.renderers.map((renderer, index) => {
//       return {
//         index,
//         label: this.multiViewportSystem.viewports[index]?.label || `相机 ${index + 1}`,
//         dataURL: renderer.domElement.toDataURL('image/png')
//       };
//     });
//
//     return screenshots;
//   }
//
//   /**
//    * 调整多视角布局
//    * @param {Object} layout - 新布局配置
//    */
//   resizeMultiViewports(layout) {
//     if (!this.multiViewportSystem || !this.multiViewportSystem.enabled) {
//       return;
//     }
//
//     const { viewportWidth = 320, viewportHeight = 240, margin = 20, cols = 2 } = layout;
//
//     this.multiViewportSystem.viewports.forEach((viewport, index) => {
//       const row = Math.floor(index / cols);
//       const col = index % cols;
//
//       // 更新视口配置
//       viewport.width = viewportWidth;
//       viewport.height = viewportHeight;
//       viewport.left = col * (viewportWidth + margin);
//       viewport.top = row * (viewportHeight + margin);
//
//       // 更新容器样式
//       const container = this.multiViewportSystem.containers[index];
//       const renderer = this.multiViewportSystem.renderers[index];
//       const label = this.multiViewportSystem.labels[index];
//
//       if (container) {
//         container.style.width = `${viewportWidth}px`;
//         container.style.height = `${viewportHeight}px`;
//         container.style.left = `${viewport.left}px`;
//         container.style.top = `${viewport.top}px`;
//       }
//
//       if (renderer) {
//         renderer.setSize(viewportWidth, viewportHeight);
//       }
//
//       if (label && viewport.label) {
//         label.textContent = viewport.label;
//       }
//     });
//   }
//
//   /**
//    * 开始同步更新多个视角
//    * @param {Array} viewIds - 要同步的视角ID数组
//    * @param {Object} options - 同步选项
//    */
//   startMultiViewSync(viewIds, options = { interval: 1000, loop: true }) {
//     const { interval = 1000, loop = true } = options;
//
//     // 停止现有的同步
//     this.stopMultiViewSync();
//
//     // 获取视角
//     const allViews = [];
//     for (const key of Object.keys(this.viewPointsByTarget || {})) {
//       allViews.push(...(this.viewPointsByTarget[key] || []));
//     }
//
//     const views = viewIds
//       .map(id => allViews.find(v => v.id === id))
//       .filter(v => v);
//
//     if (views.length === 0) {
//       console.warn('未找到指定的视角用于同步');
//       return;
//     }
//
//     // 创建多相机系统
//     const layout = options.layout || { cols: 2, viewportWidth: 320, viewportHeight: 240, margin: 20 };
//     const viewports = views.map((view, index) => {
//       const row = Math.floor(index / layout.cols);
//       const col = index % layout.cols;
//
//       return {
//         id: `sync_${view.id}`,
//         label: view.name,
//         width: layout.viewportWidth,
//         height: layout.viewportHeight,
//         left: col * (layout.viewportWidth + layout.margin),
//         top: row * (layout.viewportHeight + layout.margin),
//         position: view.position.clone(),
//         target: view.target.clone(),
//         targetUuid: view.targetUuid,
//         fov: 60,
//         followMode: 'fixed'
//       };
//     });
//
//     this.initMultiViewportSystem(viewports, this.renderer);
//     this.setMultiViewportEnabled(true);
//
//     // 设置同步更新
//     let currentIndex = 0;
//     this.syncUpdateInterval = setInterval(() => {
//       const view = views[currentIndex];
//       if (view) {
//         // 播放该视角到主相机
//         this.playViewPoint(view.id, true);
//
//         // 更新多视角标签显示当前活动视角
//         if (this.multiViewportSystem && this.multiViewportSystem.labels) {
//           this.multiViewportSystem.labels.forEach((label, idx) => {
//             if (idx === currentIndex) {
//               label.style.backgroundColor = 'rgba(255, 100, 100, 0.8)';
//             } else {
//               label.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
//             }
//           });
//         }
//
//         currentIndex++;
//         if (currentIndex >= views.length) {
//           if (loop) {
//             currentIndex = 0;
//           } else {
//             this.stopMultiViewSync();
//           }
//         }
//       }
//     }, interval);
//
//     console.log(`开始多视角同步，共 ${views.length} 个视角，间隔 ${interval}ms`);
//   }
//
//   /**
//    * 停止多视角同步
//    */
//   stopMultiViewSync() {
//     if (this.syncUpdateInterval) {
//       clearInterval(this.syncUpdateInterval);
//       this.syncUpdateInterval = null;
//     }
//
//     // 恢复标签颜色
//     if (this.multiViewportSystem && this.multiViewportSystem.labels) {
//       this.multiViewportSystem.labels.forEach(label => {
//         label.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
//       });
//     }
//
//     console.log('停止多视角同步');
//   }
//
//   /**
//    * 切换多视角显示模式
//    * @param {string} mode - 显示模式 ('single' | 'split' | 'grid')
//    */
//   switchMultiViewMode(mode = 'grid') {
//     if (!this.multiViewportSystem || !this.multiViewportSystem.enabled) {
//       console.warn('多视角系统未启用');
//       return;
//     }
//
//     const viewportCount = this.multiViewportSystem.cameras.length;
//     let cols, viewportWidth, viewportHeight, margin;
//
//     switch (mode) {
//       case 'single':
//         // 只显示第一个视口
//         cols = 1;
//         viewportWidth = Math.min(600, this.container.clientWidth - 40);
//         viewportHeight = viewportWidth * 0.75;
//         margin = 20;
//         this.multiViewportSystem.containers.forEach((container, index) => {
//           container.style.display = index === 0 ? 'block' : 'none';
//         });
//         break;
//
//       case 'split':
//         // 左右分屏
//         cols = 2;
//         viewportWidth = Math.min(400, (this.container.clientWidth - 60) / 2);
//         viewportHeight = viewportWidth * 0.75;
//         margin = 20;
//         this.multiViewportSystem.containers.forEach((container, index) => {
//           container.style.display = index < 2 ? 'block' : 'none';
//         });
//         break;
//
//       case 'grid':
//       default:
//         // 网格布局
//         cols = Math.ceil(Math.sqrt(viewportCount));
//         viewportWidth = Math.min(320, (this.container.clientWidth - 40) / cols - 20);
//         viewportHeight = viewportWidth * 0.75;
//         margin = 20;
//         this.multiViewportSystem.containers.forEach(container => {
//           container.style.display = 'block';
//         });
//         break;
//     }
//
//     // 重新布局
//     this.resizeMultiViewports({
//       cols,
//       viewportWidth,
//       viewportHeight,
//       margin
//     });
//
//     console.log(`切换到 ${mode} 显示模式`);
//   }
// }
//
// // 应用原型方法
// Object.assign(renderModel.prototype, {
//   ...modulesPrototype
// });
//
// export default renderModel;
