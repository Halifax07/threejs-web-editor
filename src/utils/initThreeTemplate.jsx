// Vue相关
import { defineComponent, h, createApp } from "vue";
import { ElIcon, ElMessage } from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";

// Three.js核心
import * as THREE from "three";

// Three.js控制器和加载器
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";

// Three.js后期处理
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";

// Three.js渲染器
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";

// 项目配置和工具函数
import { vertexShader, fragmentShader } from "@/config/constant.js";
import { getFile } from "@/utils/indexedDB";
import { mapImageList } from "@/config/model";
import { lightPosition, onlyKey, debounce, getAssetsFile } from "@/utils/utilityFunction";
import TWEEN from "@tweenjs/tween.js";

/**
 * @describe three.js 组件数据初始化方法
 * @param {Object} config 组件参数配置信息
 * @param {String} elementId 容器元素ID
 */
class renderModel {
  constructor(config, elementId) {
    // 基础配置
    this.config = config;
    this.container = document.querySelector("#" + elementId);
    // 场景相关
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.model = null;

    // 加载器配置
    this.fileLoaderMap = {
      glb: new GLTFLoader(),
      fbx: new FBXLoader(this.loadingManager),
      gltf: new GLTFLoader(),
      obj: new OBJLoader(this.loadingManager),
      stl: new STLLoader()
    };

    // 动画相关
    this.modelAnimation = null;
    this.animationMixer = null;
    this.animationClock = new THREE.Clock();
    this.animationFrame = null;
    this.rotationAnimationFrame = null;
    this.animateClipAction = null;
    this.loopMap = {
      LoopOnce: THREE.LoopOnce,
      LoopRepeat: THREE.LoopRepeat,
      LoopPingPong: THREE.LoopPingPong
    };

    // 辅助工具
    this.gridHelper = null;
    this.axesHelper = null;
    this.planeGeometry = null;

    // 材质与贴图
    this.modelMaterialList = null;
    this.modelTextureMap = null;
    this.glowMaterialList = null;
    this.materials = {};

    // 后期处理
    this.effectComposer = null;
    this.outlinePass = null;
    this.renderAnimation = null;
    this.glowComposer = null;
    this.unrealBloomPass = null;
    this.shaderPass = null;

    // 交互相关
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.onWindowResizesListener = null;
    this.onMouseMoveListener = null;

    // CSS3D渲染
    this.css3dControls = null;
    this.css3DRenderer = null;
    
    // 多模型组
    this.manyModelGroup = null;
  }

  async init() {
    try {
      // 初始化基础场景
      this.initRender();
      this.initCamera();
      this.initScene();
      this.initControls();

      // 加载模型
      let load = false;
      if (this.config.modelList && this.config.modelList.length > 0) {
          for (const modelInfo of this.config.modelList) {
              await this.loadModel(modelInfo);
          }
          load = true;
      } else if (this.config.fileInfo) {
          load = await this.loadModel(this.config.fileInfo);
      }

      // 设置场景效果
      await Promise.all([
        this.createEffectComposer(),
        this.setSceneBackground(),
        this.setModelMaterial(),
        this.setModelLaterStage(),
        this.setSceneLight(),
        this.setModelAnimation(),
        this.setModelAxleLine(),
        this.setSceneTagsRender()
      ]);

      // 启动渲染
      this.sceneAnimation();
      this.addEvenListMouseListener();

      return load;
    } catch (error) {
      console.error("初始化3D场景失败:", error);
      throw error;
    }
  }
  // 创建渲染器
  initRender() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    }); //设置抗锯齿
    //设置屏幕像素比
    this.renderer.setPixelRatio(window.devicePixelRatio);
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
  }
  // 创建相机
  initCamera() {
    const { clientHeight, clientWidth } = this.container;
    this.camera = new THREE.PerspectiveCamera(45, clientWidth / clientHeight, 0.25, 2000);
    // this.camera.near = 0.1

    const { camera } = this.config;
    if (!camera) return false;
    const { x, y, z } = camera;
    this.camera.position.set(x, y, z);
    this.camera.updateProjectionMatrix();
  }
  // 创建场景
  initScene() {
    this.scene = new THREE.Scene();
  }
  addEvenListMouseListener() {
    // 监听场景大小改变，跳转渲染尺寸
    this.onWindowResizesListener = this.onWindowResize.bind(this);
    window.addEventListener("resize", this.onWindowResizesListener);
    
    // 监听点击事件
    this.onMouseClickListener = this.onMouseClick.bind(this);
    this.container.addEventListener("click", this.onMouseClickListener);
  }

  onMouseClick(event) {
    const { clientHeight, clientWidth, offsetLeft, offsetTop } = this.container;
    this.mouse.x = ((event.clientX - offsetLeft) / clientWidth) * 2 - 1;
    this.mouse.y = -((event.clientY - offsetTop) / clientHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    // 递归检测所有子对象，确保能选中模型
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0) {
      // 获取第一个选中的对象
      let object = intersects[0].object;
      
      // 尝试触发事件
      // 如果当前对象没有事件，尝试向上查找父级（针对组合模型）
      let currentObj = object;
      while(currentObj) {
          if (this.triggerEvent(currentObj)) {
              break; // 如果触发成功，停止冒泡
          }
          currentObj = currentObj.parent;
          if (currentObj && currentObj.type === 'Scene') break;
      }
    }
  }

  triggerEvent(mesh) {
    if (!this.config.events) return false;
    let eventConfig = this.config.events[mesh.uuid];

    // 如果通过UUID找不到配置，尝试通过名称匹配（适用于预览模式）
    if (!eventConfig) {
      const events = Object.values(this.config.events);
      eventConfig = events.find(e => e.meshName === mesh.name);
    }

    if (!eventConfig || eventConfig.clickEvent === "none") return false;

    switch (eventConfig.clickEvent) {
      case "alert":
        if (eventConfig.alertContent) {
          ElMessage.info(eventConfig.alertContent);
        }
        break;
      case "link":
        if (eventConfig.linkUrl) {
          window.open(eventConfig.linkUrl, "_blank");
        }
        break;
      case "color":
        if (eventConfig.targetColor) {
          mesh.material.color.set(eventConfig.targetColor);
        }
        break;
      case "visible":
        mesh.visible = !mesh.visible;
        break;
      case "flyTo":
        {
            const box = new THREE.Box3().setFromObject(mesh);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = this.camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 2.0;

            const direction = this.camera.position.clone().sub(center).normalize();
            const newPos = center.clone().add(direction.multiplyScalar(cameraZ));

            new TWEEN.Tween(this.camera.position)
            .to(newPos, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

            new TWEEN.Tween(this.controls.target)
            .to(center, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        }
        break;
      case "animation":
        if (eventConfig.animationName && this.modelAnimation) {
            const clip = THREE.AnimationClip.findByName(this.modelAnimation, eventConfig.animationName);
            if (clip) {
                if (this.animateClipAction) this.animateClipAction.stop();
                this.animateClipAction = this.animationMixer.clipAction(clip);
                this.animateClipAction.setLoop(this.loopMap[eventConfig.loop || 'LoopRepeat']);
                this.animateClipAction.play();
            }
        }
        break;
      case "explode":
        {
          // 1. 寻找模型根节点
          let modelRoot = mesh;
          while (modelRoot.parent && modelRoot.parent.type !== 'Scene') {
              modelRoot = modelRoot.parent;
          }
          
          // 辅助函数：获取配置（兼容UUID和Name）
          const getEventConfig = (m) => {
              if (this.config.events[m.uuid]) return this.config.events[m.uuid];
              return Object.values(this.config.events).find(e => e.meshName === m.name);
          };

          // 2. 获取整个模型下的所有“拆解”对象
          const targets = [];
          modelRoot.traverse((child) => {
               if (child.isMesh) {
                   const childConfig = getEventConfig(child);
                   if (childConfig && childConfig.clickEvent === 'explode') {
                       targets.push(child);
                   }
               }
          });

          if (targets.length === 0) return;

          // 3. 智能判断拆解模式
          const parentBox = new THREE.Box3().setFromObject(modelRoot);
          const parentSize = new THREE.Vector3();
          parentBox.getSize(parentSize);
          const parentCenter = new THREE.Vector3();
          parentBox.getCenter(parentCenter);

          const meshBox = new THREE.Box3().setFromObject(mesh);
          const meshSize = new THREE.Vector3();
          meshBox.getSize(meshSize);
          const meshCenter = new THREE.Vector3();
          meshBox.getCenter(meshCenter);

          const coverageX = meshSize.x / parentSize.x;
          const coverageZ = meshSize.z / parentSize.z;
          
          const rawDir = new THREE.Vector3().subVectors(meshCenter, parentCenter);
          const distXZ = Math.sqrt(rawDir.x * rawDir.x + rawDir.z * rawDir.z);
          const distY = Math.abs(rawDir.y);
          
          const isSmallPart = coverageX < 0.5 && coverageZ < 0.5;
          const isInternal = isSmallPart && rawDir.y < 0 && distXZ < Math.max(parentSize.x, parentSize.z) * 0.3 && distY > parentSize.y * 0.1;

          let activeTargets = [];
          if (isInternal) {
              activeTargets = [mesh];
          } else {
              activeTargets = targets;
          }

          const isExploded = activeTargets.some(obj => obj.userData.isExploded);

          if (!isExploded) {
              // --- 执行拆解 ---
              activeTargets.forEach(part => {
                  const partConfig = getEventConfig(part);
                  const distance = partConfig.explodeDistance || 5;

                  if (!part.userData.originalPos) {
                      part.userData.originalPos = part.position.clone();
                  }

                  const pBox = new THREE.Box3().setFromObject(part);
                  const pCenter = new THREE.Vector3();
                  pBox.getCenter(pCenter);
                  const pSize = new THREE.Vector3();
                  pBox.getSize(pSize);

                  let worldDir = new THREE.Vector3();
                  
                  const pRawDir = new THREE.Vector3().subVectors(pCenter, parentCenter);
                  const pDistXZ = Math.sqrt(pRawDir.x * pRawDir.x + pRawDir.z * pRawDir.z);
                  const pDistY = Math.abs(pRawDir.y);
                  const minParentDim = Math.min(parentSize.x, parentSize.z);

                  const pCovX = pSize.x / parentSize.x;
                  const pCovZ = pSize.z / parentSize.z;
                  
                  const isCentered = pDistXZ < minParentDim * 0.25;
                  const pIsLayer = pCovX > 0.6 && pCovZ > 0.6 && (pSize.y < parentSize.y * 0.8) && isCentered;

                  if (pIsLayer) {
                      const yOffset = pCenter.y - parentCenter.y;
                      worldDir.set(0, yOffset >= -0.1 ? 1 : -1, 0);
                  } else {
                      const pIsSmall = pCovX < 0.5 && pCovZ < 0.5;
                      if (pIsSmall && pRawDir.y < 0 && pDistXZ < minParentDim * 0.35 && pDistY > parentSize.y * 0.1) {
                          worldDir.set(0, 1, 0);
                      } else {
                          worldDir.copy(pRawDir);
                          if (worldDir.lengthSq() < 0.0001) worldDir.set(0, 1, 0);
                      }
                  }
                  worldDir.normalize();

                  const localDir = worldDir.clone();
                  if (part.parent) {
                      const parentWorldQuat = new THREE.Quaternion();
                      part.parent.getWorldQuaternion(parentWorldQuat);
                      localDir.applyQuaternion(parentWorldQuat.invert());
                  }
                  localDir.normalize();

                  const targetPos = part.position.clone().add(localDir.multiplyScalar(distance));

                  new TWEEN.Tween(part.position)
                      .to(targetPos, 1000)
                      .easing(TWEEN.Easing.Exponential.Out)
                      .start();
                  
                  part.userData.isExploded = true;
              });
              if (ElMessage) ElMessage.success("模型已拆解");

          } else {
              // --- 执行还原 ---
              activeTargets.forEach(part => {
                  if (part.userData.originalPos) {
                      new TWEEN.Tween(part.position)
                          .to(part.userData.originalPos, 1000)
                          .easing(TWEEN.Easing.Exponential.Out)
                          .start();
                  }
                  part.userData.isExploded = false;
              });
              if (ElMessage) ElMessage.success("模型已还原");
          }
        }
        break;
    }
  }

  // 创建控制器
  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = true;
    this.controls.enableDamping = false;
    
    // 恢复控制器目标点
    const { camera } = this.config;
    if (camera && camera.target) {
        this.controls.target.fromArray(camera.target);
    } else {
        this.controls.target.set(0, 0, 0);
    }
    this.controls.update();

    //标签控制器
    this.css3dControls = new OrbitControls(this.camera, this.css3DRenderer.domElement);
    this.css3dControls.enablePan = false;
    this.css3dControls.enabled = false;
    this.css3dControls.enableDamping = false;
    this.css3dControls.target.copy(this.controls.target);
    this.css3dControls.update();
  }
  // 更新场景
  sceneAnimation() {
    this.renderAnimation = requestAnimationFrame(() => this.sceneAnimation());
    TWEEN.update();
    const { stage, tags } = this.config;
    //辉光效果开关开启时执行
    if (stage && stage.glow) {
      // 将不需要处理辉光的材质进行存储备份
      this.setMeshFlow();
    } else {
      this.effectComposer.render();
      this.controls.update();
    }

    // 3d标签渲染器
    if (tags && tags.dragTagList.length) {
      this.css3DRenderer.render(this.scene, this.camera);
      this.css3dControls.update();
    }
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
  // 创建效果合成器
  createEffectComposer() {
    const { clientHeight, clientWidth } = this.container;
    const pixelRatio = this.renderer.getPixelRatio();
    const renderSize = new THREE.Vector2(clientWidth, clientHeight);

    // 主效果合成器
    this.effectComposer = new EffectComposer(
      this.renderer,
      new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
        samples: 4 // 增加采样次数来提高抗锯齿效果
      })
    );

    // 基础渲染通道
    const renderPass = new RenderPass(this.scene, this.camera);
    this.effectComposer.addPass(renderPass);

    // 轮廓通道
    this.outlinePass = new OutlinePass(renderSize, this.scene, this.camera);
    this.configureOutlinePass();
    this.effectComposer.addPass(this.outlinePass);

    // 输出通道
    this.effectComposer.addPass(new OutputPass());

    // FXAA抗锯齿通道
    const effectFXAA = new ShaderPass(FXAAShader);
    effectFXAA.uniforms.resolution.value.set(1 / (clientWidth * pixelRatio), 1 / (clientHeight * pixelRatio));
    effectFXAA.renderToScreen = true;
    effectFXAA.needsSwap = true;
    effectFXAA.material.uniforms.tDiffuse.value = 1.0;
    effectFXAA.enabled = true;
    this.effectComposer.addPass(effectFXAA);

    // 辉光通道
    this.setupBloomEffect(clientWidth, clientHeight);

    // 自定义着色器通道
    this.setupShaderPass();
  }

  configureOutlinePass() {
    this.outlinePass.visibleEdgeColor = new THREE.Color("#FF8C00");
    this.outlinePass.hiddenEdgeColor = new THREE.Color("#8a90f3");
    this.outlinePass.edgeGlow = 2.0;
    this.outlinePass.edgeThickness = 1;
    this.outlinePass.edgeStrength = 4;
    this.outlinePass.pulsePeriod = 100;
  }

  setupBloomEffect(width, height) {
    // 创建辉光通道
    this.unrealBloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0, 0, 0);

    // 辉光合成器
    const renderTarget = new THREE.WebGLRenderTarget(width * 2, height * 2, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false
    });

    this.glowComposer = new EffectComposer(this.renderer, renderTarget);
    this.glowComposer.renderToScreen = false;
    this.glowComposer.addPass(new RenderPass(this.scene, this.camera));
    this.glowComposer.addPass(this.unrealBloomPass);
  }

  setupShaderPass() {
    this.shaderPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this.glowComposer.renderTarget2.texture },
          tDiffuse: { value: null },
          glowColor: { value: new THREE.Color() }
        },
        vertexShader,
        fragmentShader,
        defines: {}
      }),
      "baseTexture"
    );

    this.shaderPass.renderToScreen = true;
    this.shaderPass.needsSwap = true;
    this.effectComposer.addPass(this.shaderPass);
  }
  // 加载模型
  loadModel({ filePath, fileType, map, position, rotation, scale, isFileStore, fileId }) {
    return new Promise(async (resolve, reject) => {
      let finalFilePath = filePath;
      if (isFileStore && fileId) {
          try {
              const blob = await getFile(fileId);
              if (blob) {
                  finalFilePath = URL.createObjectURL(blob);
              }
          } catch (e) {
              console.error("Failed to load file from IndexedDB", e);
          }
      } else if (finalFilePath && typeof finalFilePath === 'string' && !finalFilePath.startsWith("http") && !finalFilePath.startsWith("blob:") && !finalFilePath.startsWith("/")) {
          finalFilePath = `/${finalFilePath}`;
      }

      let loader;
      if (["glb", "gltf"].includes(fileType)) {
        const dracoLoader = new DRACOLoader();
        // 使用绝对路径，避免在子路由（如 /preview）下路径解析错误
        dracoLoader.setDecoderPath(`/draco/`);
        dracoLoader.setDecoderConfig({ type: "js" });
        dracoLoader.preload();
        loader = new GLTFLoader().setDRACOLoader(dracoLoader);
      } else {
        loader = this.fileLoaderMap[fileType];
      }
      loader.load(
        finalFilePath,
        result => {
          let loadedModel;
          switch (fileType) {
            case "glb":
              loadedModel = result.scene;
              break;
            case "fbx":
              loadedModel = result;
              break;
            case "gltf":
              loadedModel = result.scene;
              break;
            case "obj":
              loadedModel = result;
              break;
            case "stl":
              const material = new THREE.MeshStandardMaterial();
              const mesh = new THREE.Mesh(result, material);
              loadedModel = mesh;
              break;
            default:
              break;
          }

          // 如果是第一个模型，赋值给 this.model，否则添加到 manyModelGroup
          if (!this.model) {
              this.model = loadedModel;
              this.scene.add(this.model);
          } else {
              if (!this.manyModelGroup) {
                  this.manyModelGroup = new THREE.Group();
                  this.scene.add(this.manyModelGroup);
              }
              this.manyModelGroup.add(loadedModel);
          }

          // 应用变换
          if (position && rotation && scale) {
              loadedModel.position.fromArray(position);
              loadedModel.rotation.fromArray(rotation);
              loadedModel.scale.fromArray(scale);
          } else if (this.model === loadedModel) {
              // 只有第一个模型且没有变换信息时才自动调整
              this.setModelPositionSize();
          }

          this.getModelMaterialList(map, loadedModel);
          
          // 收集动画
          if (result.animations) {
              this.modelAnimation = (this.modelAnimation || []).concat(result.animations);
          }
          
          this.glowMaterialList = (this.glowMaterialList || []).concat(this.modelMaterialList.map(v => v.name));
          
          resolve(true);
        },
        () => {},
        err => {
          ElMessage.error("文件错误");
          console.log(err);
          reject();
        }
      );
    });
  }
  onWindowResize = () => {
    // 获取容器尺寸
    const { clientHeight, clientWidth } = this.container;
    const pixelRatio = this.renderer.getPixelRatio();

    // 更新相机参数
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();

    // 更新渲染器尺寸
    this.renderer.setSize(clientWidth, clientHeight);
    this.css3DRenderer.setSize(clientWidth, clientHeight);

    // 更新后期处理效果
    if (this.effectComposer) {
      const fxaaPass = this.effectComposer.passes[3];
      if (fxaaPass && fxaaPass.uniforms) {
        fxaaPass.uniforms.resolution.value.set(1 / (clientWidth * pixelRatio), 1 / (clientHeight * pixelRatio));
      }
      this.effectComposer.setSize(clientWidth, clientHeight);
    }

    // 更新辉光效果
    if (this.glowComposer) {
      this.glowComposer.setSize(clientWidth, clientHeight);
    }
  };
  // 清除模型数据
  onClearModelData() {
    // 取消所有动画帧
    [this.rotationAnimationFrame, this.renderAnimation, this.animationFrame].forEach(frame => {
      if (frame) cancelAnimationFrame(frame);
    });

    // 清除场景中的网格和材质
    this.scene.traverse(v => {
      if (v.type === "Mesh") {
        v.geometry?.dispose();
        v.material?.dispose();
      }
    });

    // 清除辅助对象
    [this.gridHelper, this.axesHelper].forEach(helper => {
      if (helper) {
        helper.clear();
        helper.dispose();
      }
    });

    // 清除渲染器和合成器
    [this.effectComposer, this.glowComposer].forEach(composer => {
      composer?.dispose();
    });

    // 移除事件监听
    this.container?.removeEventListener("mousemove", this.onMouseMoveListener);
    window.removeEventListener("resize", this.onWindowResizesListener);

    // 清除场景和渲染器
    this.scene?.clear();
    this.renderer?.clear();
    this.renderer?.dispose();
    this.camera?.clear();

    // 重置所有属性为null
    const properties = [
      "config",
      "container",
      "camera",
      "scene",
      "renderer",
      "controls",
      "model",
      "fileLoaderMap",
      "modelAnimation",
      "animationMixer",
      "animationClock",
      "animationFrame",
      "rotationAnimationFrame",
      "animateClipAction",
      "loopMap",
      "gridHelper",
      "axesHelper",
      "planeGeometry",
      "modelMaterialList",
      "effectComposer",
      "outlinePass",
      "renderAnimation",
      "raycaster",
      "mouse",
      "modelTextureMap",
      "glowComposer",
      "unrealBloomPass",
      "shaderPass",
      "glowMaterialList",
      "materials",
      "css3dControls",
      "css3DRenderer"
    ];

    properties.forEach(prop => {
      this[prop] = null;
    });
  }

  // 设置模型定位缩放大小
  setModelPositionSize() {
    //设置模型位置
    this.model.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // 计算缩放比例
    const maxSize = Math.max(size.x, size.y, size.z);
    const targetSize = 2.5; // 目标大小
    const scale = targetSize / (maxSize > 1 ? maxSize : 0.5);
    this.model.scale.set(scale, scale, scale);
    // 设置模型位置
    this.model.position.sub(center.multiplyScalar(scale));
    // 设置控制器最小缩放值
    this.controls.maxDistance = size.length() * 10;
    // 设置相机位置
    // this.camera.position.set(0, 2, 6)
    // 设置相机坐标系
    this.camera.updateProjectionMatrix();
  }
  // 获取当前模型材质
  getModelMaterialList(map, targetModel = this.model) {
    if (!this.modelMaterialList) this.modelMaterialList = [];
    targetModel.traverse(v => {
      if (v.isMesh) {
        v.castShadow = true;
        v.frustumCulled = false;
        if (v.material) {
          const newMaterial = v.material.clone();
          v.material = newMaterial;
          this.modelMaterialList.push(v);
        }
      }
    });
  }

  // 处理背景数据回填
  setSceneBackground() {
    const { background } = this.config;
    if (!background) return false;
    // 设置背景
    if (background.visible) {
      const { color, image, viewImg, intensity, blurriness, type = 3 } = background;
      switch (type) {
        case 1:
          this.scene.background = new THREE.Color(color);
          break;
        case 2:
          const bgTexture = new THREE.TextureLoader().load(image);
          this.scene.background = bgTexture;
          bgTexture.dispose();
          break;
        case 3:
          const texture = new THREE.TextureLoader().load(viewImg);
          texture.mapping = THREE.EquirectangularReflectionMapping;
          this.scene.background = texture;
          this.scene.environment = texture;
          this.scene.backgroundIntensity = intensity;
          this.scene.backgroundBlurriness = blurriness;
          texture.dispose();
          break;
        default:
          break;
      }
    } else {
      this.scene.background = new THREE.Color("#000");
    }
  }
  // 处理模型材质数据回填
  setModelMaterial() {
    const { material } = this.config;
    if (!material || !material.meshList) return false;
    const mapIdList = mapImageList.map(v => v.id);
    material.meshList.forEach(v => {
      const mesh = this.model.getObjectByProperty("name", v.meshName);
      if (!mesh) return false;
      const { color, opacity, depthWrite, wireframe, visible, type } = v;
      const { map } = mesh?.material || {};
      if (material.materialType && map) {
        mesh.material = new THREE[type]({
          map
        });
      } else if (mesh.material) {
        mesh.material.map = map;
      }
      // 处理修改了贴图的材质
      if (v.meshFrom) {
        // 如果使用的是系统贴图
        if (mapIdList.includes(v.meshFrom)) {
          // 找到当前的系统材质
          const mapInfo = mapImageList.find(m => m.id == v.meshFrom) || {};
          // 加载系统材质贴图
          const mapTexture = new THREE.TextureLoader().load(mapInfo.url);
          mapTexture.wrapS = THREE.MirroredRepeatWrapping;
          mapTexture.wrapT = THREE.MirroredRepeatWrapping;
          mapTexture.flipY = false;
          mapTexture.colorSpace = THREE.SRGBColorSpace;
          mapTexture.minFilter = THREE.LinearFilter;
          mapTexture.magFilter = THREE.LinearFilter;
          // 如果当前模型的材质类型被修改了，则使用用新的材质type
          if (material.materialType) {
            mesh.material = new THREE[type]({
              map: mapTexture
            });
          } else {
            mesh.material.map = mapTexture;
          }
          mapTexture.dispose();
        } else {
          // 如果是当前模型材质自身贴图
          const meshFrom = this.model.getObjectByProperty("name", v.meshFrom);
          const { map } = meshFrom.material;
          // 如果当前模型的材质类型被修改了，则使用用新的材质type
          if (material.materialType) {
            mesh.material = new THREE[type]({
              map
            });
          } else {
            mesh.material.map = map;
          }
        }
      }
      // 设置材质显隐
      mesh.material.visible = visible;
      //设置材质颜色
      mesh.material.color.set(new THREE.Color(color));
      //设置网格
      mesh.material.wireframe = wireframe;
      // 设置深度写入
      mesh.material.depthWrite = depthWrite;
      //设置透明度
      mesh.material.transparent = true;
      mesh.material.opacity = opacity;
    });
  }
  // 设置辉光和模型操作数据回填
  setModelLaterStage() {
    const { stage } = this.config;
    if (!stage) return false;
    const { threshold, strength, radius, toneMappingExposure, meshPositionList, color } = stage;
    // 设置辉光效果
    if (stage.glow) {
      this.unrealBloomPass.threshold = threshold;
      this.unrealBloomPass.strength = strength;
      this.unrealBloomPass.radius = radius;
      this.renderer.toneMappingExposure = toneMappingExposure;
      this.shaderPass.material.uniforms.glowColor.value = new THREE.Color(color);
    } else {
      this.unrealBloomPass.threshold = 0;
      this.unrealBloomPass.strength = 0;
      this.unrealBloomPass.radius = 0;
      this.renderer.toneMappingExposure = toneMappingExposure;
      this.shaderPass.material.uniforms.glowColor.value = new THREE.Color();
    }
    // 模型材质位置
    meshPositionList.forEach(v => {
      const mesh = this.model.getObjectByProperty("name", v.name);
      if (!mesh) return;
      const { rotation, scale, position } = v;
      mesh.rotation.set(rotation.x, rotation.y, rotation.z);
      mesh.scale.set(scale.x, scale.y, scale.z);
      mesh.position.set(position.x, position.y, position.z);
    });
  }
  // 处理灯光数据回填
  setSceneLight() {
    const { light } = this.config;
    if (!light) return false;
    // 环境光
    if (light.ambientLight) {
      // 创建环境光
      const ambientLight = new THREE.AmbientLight(light.ambientLightColor, light.ambientLightIntensity);
      ambientLight.visible = light.ambientLight;
      this.scene.add(ambientLight);
    }
    // 平行光
    if (light.directionalLight) {
      const directionalLight = new THREE.DirectionalLight(light.directionalLightColor, light.directionalLightIntensity);
      const { x, y, z } = lightPosition(light.directionalHorizontal, light.directionalVertical, light.directionalSistine);
      directionalLight.position.set(x, y, z);
      directionalLight.castShadow = light.directionShadow;
      directionalLight.visible = light.directionalLight;
      this.scene.add(directionalLight);
      const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 0.5);
      directionalLightHelper.visible = light.directionalLightHelper;
      this.scene.add(directionalLightHelper);
    }
    // 点光源
    if (light.pointLight) {
      const pointLight = new THREE.PointLight(light.pointLightColor, light.pointLightIntensity, 100);
      pointLight.visible = light.pointLight;
      const { x, y, z } = lightPosition(light.pointHorizontal, light.pointVertical, light.pointDistance);
      pointLight.position.set(x, y, z);
      this.scene.add(pointLight);
      // 创建点光源辅助线
      const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.5);
      pointLightHelper.visible = light.pointLightHelper;
      this.scene.add(pointLightHelper);
    }
    // 聚光灯
    if (light.spotLight) {
      const spotLight = new THREE.SpotLight(light.spotLightColor, 900);
      spotLight.visible = light.spotLight;
      const texture = new THREE.TextureLoader().load(getAssetsFile("image/model-bg-1.jpg"));
      texture.dispose();
      spotLight.map = texture;
      spotLight.decay = 2;
      spotLight.shadow.mapSize.width = 1920;
      spotLight.shadow.mapSize.height = 1080;
      spotLight.shadow.camera.near = 1;
      spotLight.shadow.camera.far = 10;
      spotLight.intensity = light.spotLightIntensity;
      spotLight.angle = light.spotAngle;
      spotLight.penumbra = light.spotPenumbra;
      spotLight.shadow.focus = light.spotFocus;
      spotLight.castShadow = light.spotCastShadow;
      spotLight.distance = light.spotDistance;
      const { x, y, z } = lightPosition(light.spotHorizontal, light.spotVertical, light.spotSistine);
      spotLight.position.set(x, y, z);
      this.scene.add(spotLight);
      //创建聚光灯辅助线
      const spotLightHelper = new THREE.SpotLightHelper(spotLight);
      spotLightHelper.visible = light.spotLightHelper && light.spotLight;
      this.scene.add(spotLightHelper);
    }
    // 模型平面
    if (light.planeGeometry) {
      const geometry = new THREE.PlaneGeometry(light.planeWidth, light.planeHeight);
      let groundMaterial = new THREE.MeshStandardMaterial({
        color: light.planeColor
      });
      const planeGeometry = new THREE.Mesh(geometry, groundMaterial);
      planeGeometry.rotation.x = -Math.PI / 2;
      planeGeometry.position.set(0, -1.2, 0);
      planeGeometry.visible = light.planeGeometry;
      planeGeometry.material.side = THREE.DoubleSide;
      planeGeometry.geometry.verticesNeedUpdate = true;
      // 让地面接收阴影
      planeGeometry.receiveShadow = true;
      this.scene.add(planeGeometry);
    }
  }
  // 处理模型动画数据回填
  setModelAnimation() {
    const { animation } = this.config;
    if (!animation) return false;

    // 只要有动画数据，就初始化混合器，以便后续事件调用
    if (this.modelAnimation && this.modelAnimation.length > 0) {
        if (!this.animationMixer) {
            this.animationMixer = new THREE.AnimationMixer(this.model);
        }
    }

    if (this.modelAnimation && this.modelAnimation.length > 0 && animation && animation.visible) {
      const { animationName, timeScale, weight, loop } = animation;
      // 模型动画
      const clip = THREE.AnimationClip.findByName(this.modelAnimation, animationName);
      if (clip) {
        this.animateClipAction = this.animationMixer.clipAction(clip);
        this.animateClipAction.setEffectiveTimeScale(timeScale);
        this.animateClipAction.setEffectiveWeight(weight);
        this.animateClipAction.setLoop(this.loopMap[loop]);
        this.animateClipAction.play();
      }
    }
    
    // 启动动画循环
    if (this.animationMixer || animation.rotationVisible) {
        this.animationFrameFun();
    }

    // 轴动画
    if (animation.rotationVisible) {
      const { rotationType, rotationSpeed } = animation;
      this.rotationAnimationFun(rotationType, rotationSpeed);
    }
  }
  // 模型动画帧
  animationFrameFun() {
    this.animationFrame = requestAnimationFrame(() => this.animationFrameFun());
    if (this.animationMixer) {
      this.animationMixer.update(this.animationClock.getDelta());
    }
  }
  // 轴动画帧
  rotationAnimationFun(rotationType, rotationSpeed) {
    this.rotationAnimationFrame = requestAnimationFrame(() => this.rotationAnimationFun(rotationType, rotationSpeed));
    this.model.rotation[rotationType] += rotationSpeed / 50;
  }
  // 模型轴辅助线配置
  setModelAxleLine() {
    const { attribute } = this.config;

    if (!attribute) return false;
    const {
      axesHelper,
      axesSize,
      color,
      divisions,
      gridHelper,
      positionX,
      positionY,
      positionZ,
      size,
      visible,
      x,
      y,
      z,
      rotationX,
      rotationY,
      rotationZ
    } = attribute;
    if (!visible) return false;
    //网格辅助线
    this.gridHelper = new THREE.GridHelper(size, divisions, color, color);
    this.gridHelper.position.set(x, y, z);
    this.gridHelper.visible = gridHelper;
    this.gridHelper.material.linewidth = 0.1;
    this.scene.add(this.gridHelper);
    // 坐标轴辅助线
    this.axesHelper = new THREE.AxesHelper(axesSize);
    this.axesHelper.visible = axesHelper;
    this.axesHelper.position.set(0, -0.5, 0);
    this.scene.add(this.axesHelper);
    // 设置模型位置
    this.model.position.set(positionX, positionY, positionZ);
    // 设置模型轴位置
    this.model.rotation.set(rotationX, rotationY, rotationZ);
    // 开启阴影
    this.renderer.shadowMap.enabled = true;
  }
  // 处理标签渲染
  setSceneTagsRender() {
    const { tags } = this.config;
    if (!tags?.dragTagList?.length) return;

    this.container.appendChild(this.css3DRenderer.domElement);

    const createTagElement = tagConfig => {
      const {
        backgroundColor,
        color,
        fontSize,
        height,
        iconColor,
        iconName,
        iconSize,
        innerText,
        positionX,
        positionY,
        positionZ,
        width
      } = tagConfig;

      const element = document.createElement("div");

      // 创建标签组件
      const TagComponent = createApp({
        render() {
          return (
            <div>
              <div
                className="element-tag"
                style={{
                  width: `${width}px`,
                  height: `${height}px`,
                  fontSize: `${fontSize}px`,
                  color,
                  backgroundColor,
                  boxShadow: `0px 0px 4px ${backgroundColor}`
                }}
              >
                <span className="tag-txt">{innerText}</span>
              </div>
              <div
                className="tag-icon"
                style={{
                  fontSize: `${iconSize}px`,
                  color: iconColor
                }}
              >
                <ElIcon>{h(ElementPlusIconsVue[iconName])}</ElIcon>
              </div>
            </div>
          );
        }
      });

      // 挂载组件
      const vNode = TagComponent.mount(document.createElement("div"));
      element.appendChild(vNode.$el);

      // 创建3D对象
      const cssObject = new CSS3DObject(element);
      cssObject.position.set(positionX, positionY, positionZ);
      cssObject.scale.set(0.01, 0.01, 0.01);

      return cssObject;
    };

    // 批量创建标签并添加到场景
    tags.dragTagList.forEach(tagConfig => {
      const tagObject = createTagElement(tagConfig);
      this.scene.add(tagObject);
    });
  }
}

/**
 * 动态创建3D模型组件
 * @param {Object} config - 组件配置参数
 * @returns {Object} Vue组件
 */
function createThreeDComponent(config) {
  const elementId = `three-model-${onlyKey(5, 10)}`;
  let modelApi = null;

  return defineComponent({
    name: "ThreeDComponent",
    props: {
      width: [String, Number],
      height: [String, Number]
    },
    data: () => ({
      loading: false
    }),
    watch: {
      $props: {
        handler: () => {
          modelApi?.onWindowResize && debounce(modelApi.onWindowResize, 200)();
        },
        deep: true
      }
    },

    async mounted() {
      try {
        this.loading = true;
        modelApi = new renderModel(config, elementId);
        await modelApi.init();
      } catch (err) {
        console.error("3D模型加载失败:", err);
      } finally {
        this.loading = false;
      }
    },

    beforeUnmount() {
      modelApi?.onClearModelData();
      modelApi = null;
    },
    render() {
      const style = {
        width: this.width ? `${this.width - 10}px` : "100%",
        height: this.height ? `${this.height - 10}px` : "100%",
        pointerEvents: this.width && this.height ? "none" : undefined
      };
      return <div id={elementId} style={style} v-zLoading={this.loading}></div>;
    }
  });
}

export default createThreeDComponent;
