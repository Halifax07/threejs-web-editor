<template>
  <div class="model-page">
    <!-- 头部操作栏 -->
    <header class="model-header">
      <div class="header-lf">
        <span> 基于Three.js+Vue3+Element-Plus开发的3d模型可视化编辑系统 </span>
        <span>作者:answer </span>
        <span>当前Three.js版本:{{ THREE.REVISION }}</span>
      </div>
      <div class="header-lr">
        <el-space>
          <el-button type="primary" icon="Film" @click="$router.push({ path: '/modelBase' })"> 模型库 </el-button>
          <el-button type="primary" icon="Document" v-if="handleConfigBtn" @click="onSaveConfig">保存数据</el-button>
          <el-button type="success" icon="Folder" v-if="handleConfigBtn" @click="onSaveProject">保存项目</el-button>
          <el-button type="info" icon="FolderOpened" v-if="handleConfigBtn" @click="onOpenProjectManager">项目管理</el-button>
          <el-button type="primary" icon="View" v-if="handleConfigBtn" @click="onPreview">效果预览</el-button>
          <el-dropdown trigger="click">
            <el-button type="primary" icon="Download"> 下载/导出<el-icon class="el-icon--right"></el-icon> </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="onExportProject">导出项目到本地</el-dropdown-item>
                <el-dropdown-item @click="onImportProject">导入项目</el-dropdown-item>
                <el-dropdown-item divided>模型导出</el-dropdown-item>
                <el-dropdown-item @click="onDownloadCover">下载封面</el-dropdown-item>
                <el-dropdown-item @click="onExportModelFile('glb')">导出模型(.glb)格式</el-dropdown-item>
                <el-dropdown-item @click="onExportModelFile('gltf')">导出模型(.gltf)格式</el-dropdown-item>
                <el-dropdown-item @click="onExportModelFile('usdz')">导出模型(.usdz)格式</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button type="primary" icon="HelpFilled" v-if="handleConfigBtn" @click="onImportantCode"> 嵌入代码 </el-button>
          <el-button type="primary" icon="FullScreen" @click="onFullScreen">
            {{ fullscreenStatus ? "取消全屏" : "全屏" }}
          </el-button>
        </el-space>
      </div>
    </header>
    <div class="model-container">
      <!-- 模型列表 -->
      <model-choose ref="choosePanel"></model-choose>
      <!-- 模型视图 -->
      <div id="model" @drop="onDragDrop" ref="model" @dragover.prevent>
        <div class="camera-icon">
          <el-tooltip effect="dark" content="居中" placement="top">
            <el-icon :size="18" color="#fff" @click="onResetCamera">
              <Aim />
            </el-icon>
          </el-tooltip>
        </div>
        <div id="mesh-txt"></div>
      </div>
      <!-- 右侧编辑栏 -->
      <div class="edit-panel" :style="{ minWidth: '380px' }">
        <model-edit-panel ref="editPanel" v-if="store.modelApi.model"></model-edit-panel>
      </div>
    </div>
    <!-- 视频背景video -->
    <video id="video" loop="loop" playsinline autoplay style="display: none"></video>
    <page-loading :loading="loading" :percentage="progress"></page-loading>
    <!-- 嵌入代码弹框 -->
    <implant-code-dialog ref="implantDialog"></implant-code-dialog>
    <!-- 项目管理对话框 -->
    <project-manager-dialog v-model="projectManagerVisible" @load-project="onLoadProject"></project-manager-dialog>
  </div>
</template>

<script setup name="modelEdit">
import { ModelEditPanel, ModelChoose, ImplantCodeDialog } from "@/components/index";
import ProjectManagerDialog from "@/components/ProjectManagerDialog/index.vue";
import { onMounted, ref, getCurrentInstance, onBeforeUnmount, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import renderModel from "@/utils/renderModel";
import { modelList } from "@/config/model";
import PageLoading from "@/components/Loading/PageLoading.vue";
import { MODEL_PREVIEW_CONFIG, MODEL_BASE_DATA, MODEL_DEFAULT_CONFIG, UPDATE_MODEL, PAGE_LOADING } from "@/config/constant";
import { useMeshEditStore } from "@/store/meshEditStore";
import { saveFile } from "@/utils/indexedDB";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { 
  saveProject, 
  exportProjectToFile, 
  importProjectFromFile, 
  collectProjectData,
  getSavedProjects,
  getCurrentProjectId 
} from "@/utils/saveProject";

const store = useMeshEditStore();
const router = useRouter();
const { $bus, $local } = getCurrentInstance().proxy;

const loading = ref(false);
const progress = ref(0);
const editPanel = ref(null);
const choosePanel = ref(null);
const implantDialog = ref(null);
const fullscreenStatus = ref(false);
const loadingTimeout = ref(null);
const projectManagerVisible = ref(false);

const handleConfigBtn = computed(() => {
  if (editPanel.value) {
    const fileInfo = choosePanel.value?.activeModel;
    return fileInfo?.filePath && ["oneModel", "tags"].includes(store.modelType) ? true : false;
  }
  return false;
});

// 重置相机位置
const onResetCamera = () => {
  store.modelApi.onResetModelCamera();
};
// 初始化模型库数据
const initModelBaseData = () => {
  const modelBase = $local.get(MODEL_BASE_DATA);
  // 如果是首次加载需要设置模型库初始数据值
  if (!Array.isArray(modelBase)) {
    let modelBaseData = [];
    modelList.forEach(v => {
      modelBaseData.push({
        ...MODEL_DEFAULT_CONFIG,
        fileInfo: { ...v }
      });
    });

    $local.set(MODEL_BASE_DATA, modelBaseData);
  }
};

// 处理拖拽结束事件
const onDragDrop = async e => {
  const { dragGeometryModel, activeDragManyModel, dragTag } = store.modelApi;
  const { clientX, clientY } = e;

  // 更新拖拽位置
  const updateDragPosition = model => {
    model.clientX = clientX;
    model.clientY = clientY;
  };

  // 处理几何体模型
  if (dragGeometryModel.id && store.modelType === "geometry") {
    updateDragPosition(dragGeometryModel);
    store.modelApi.onSwitchModel(dragGeometryModel);
    $bus.emit("update-tab", "EditGeometry");
  }

  // 处理3D标签
  if (dragTag?.id && store.modelType === "tags") {
    updateDragPosition(dragTag);
    store.modelApi.create3dTags(dragTag);
  }

  // 处理多模型
  if (activeDragManyModel && activeDragManyModel.id) {
    updateDragPosition(activeDragManyModel);

    try {
      $bus.emit(PAGE_LOADING, true);
      const { load } = await store.modelApi.onLoadManyModel(activeDragManyModel);

      if (load) {
        $bus.emit(UPDATE_MODEL);
        $bus.emit("update-tab", "EditMoreModel");
      }
    } catch (error) {
      console.error("加载多模型失败:", error);
    } finally {
      $bus.emit(PAGE_LOADING, false);
    }
  }

  // 处理着色器
  if (store.modelType === "shader") {
    store.modelApi.shaderModules.createShader({ clientX, clientY });
  }
};
// 预览
const onPreview = async () => {
  try {
    // 使用 JSON.stringify + replacer 处理循环引用，比手动递归更稳健
    const getCircularReplacer = () => {
      const seen = new WeakSet();
      return (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return;
          }
          seen.add(value);
        }
        return value;
      };
    };

    const panelConfig = editPanel.value.getPanelConfig();
    // 先序列化再反序列化，确保得到纯净的 JSON 对象
    const modelConfig = JSON.parse(JSON.stringify(panelConfig, getCircularReplacer()));
    
    modelConfig.camera = store.modelApi.onGetModelCamera();
    modelConfig.fileInfo = choosePanel.value?.activeModel;

    // 更新主模型的位置信息
    if (modelConfig.fileInfo && store.modelApi.model) {
        const { position, rotation, scale } = store.modelApi.model;
        modelConfig.fileInfo.position = position.toArray();
        modelConfig.fileInfo.rotation = rotation.toArray();
        modelConfig.fileInfo.scale = scale.toArray();
    }
    
    // 获取所有已加载模型列表
    if (store.modelApi.getLoadedModelsInfo) {
        modelConfig.modelList = store.modelApi.getLoadedModelsInfo();
    }

    // 处理 Blob URL，将其存入 IndexedDB 以便跨标签页访问
    if (modelConfig.modelList && modelConfig.modelList.length > 0) {
        for (const item of modelConfig.modelList) {
            if (item.filePath && typeof item.filePath === 'string' && item.filePath.startsWith('blob:')) {
                try {
                    const response = await fetch(item.filePath);
                    const blob = await response.blob();
                    const fileId = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    await saveFile(fileId, blob);
                    item.isFileStore = true;
                    item.fileId = fileId;
                } catch (e) {
                    console.error("Failed to save blob for preview", e);
                }
            }
        }
    }

    // 兼容处理 fileInfo
    if (modelConfig.fileInfo && modelConfig.fileInfo.filePath && typeof modelConfig.fileInfo.filePath === 'string' && modelConfig.fileInfo.filePath.startsWith('blob:')) {
         try {
            const response = await fetch(modelConfig.fileInfo.filePath);
            const blob = await response.blob();
            const fileId = `model_main_${Date.now()}`;
            await saveFile(fileId, blob);
            modelConfig.fileInfo.isFileStore = true;
            modelConfig.fileInfo.fileId = fileId;
         } catch (e) {
             console.error("Failed to save main model blob", e);
         }
    }

    //判断是否是外部模型
    if ((modelConfig.modelList && modelConfig.modelList.length > 0) || (modelConfig.fileInfo && modelConfig.fileInfo.filePath)) {
      $local.set(MODEL_PREVIEW_CONFIG, modelConfig);
      const { href } = router.resolve({ path: "/preview" });
      window.open(href, "_blank");
    } else {
      ElMessage.warning("当前模型暂不支持“效果预览”");
    }
  } catch (error) {
    console.error("预览失败:", error);
    ElMessage.error(`预览失败: ${error.message}`);
  }
};

// 切换交互模式
const onTogglePreviewMode = () => {
  store.setPreviewMode(!store.isPreviewMode);
  if (store.isPreviewMode) {
    // 进入交互模式前保存状态
    store.modelApi.saveSceneState(store.modelApi);
    ElMessage.success("已进入交互模式，点击模型触发事件");
    store.selectMeshAction({}); // 清除选中状态
    store.modelApi.outlinePass.selectedObjects = []; // 清除高亮
  } else {
    // 退出交互模式时恢复状态
    store.modelApi.restoreSceneState(store.modelApi);
    ElMessage.info("已退出交互模式");
  }
};

const onImportantCode = () => {
  const modelConfig = editPanel.value.getPanelConfig();
  modelConfig.camera = store.modelApi.onGetModelCamera();
  modelConfig.fileInfo = choosePanel.value?.activeModel;
  implantDialog.value.showDialog(modelConfig);
};

// 全屏
const onFullScreen = () => {
  const element = document.documentElement;
  if (!fullscreenStatus.value) {
    if (element.requestFullscreen) {
      element.requestFullscreen();
      // 适用于旧版WebKit浏览器
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
};

// 保存配置
const onSaveConfig = () => {
  ElMessageBox.confirm(" 确认要更新当前模型数据至“模板库”?", "提示", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    type: "success"
  })
    .then(() => {
      const modelConfig = editPanel.value.getPanelConfig();
      modelConfig.camera = store.modelApi.onGetModelCamera();
      modelConfig.fileInfo = choosePanel.value?.activeModel;
      // 判断是否是外部模型
      if (modelConfig.fileInfo.filePath) {
        const modelBaseData = $local.get(MODEL_BASE_DATA) || [];
        const { id } = modelConfig.fileInfo;
        // 更新缓存数据
        Object.assign(modelBaseData.filter(v => id === v.fileInfo.id)[0], modelConfig);
        $local.set(MODEL_BASE_DATA, modelBaseData);
        ElMessage.success("更新成功");
      } else {
        ElMessage.warning("当前模型暂不支持“数据保存”");
      }
    })
    .catch(() => {});
};

// 下载封面
const onDownloadCover = () => {
  store.modelApi.onDownloadSceneCover();
};
// 导出模型
const onExportModelFile = type => {
  store.modelApi.onExporterModel(type);
};

// 保存项目
const onSaveProject = async () => {
  try {
    if (!editPanel.value || !store.modelApi.model) {
      ElMessage.warning("请先加载模型");
      return;
    }

    // 收集项目数据
    const projectData = collectProjectData({
      getPanelConfig: () => editPanel.value.getPanelConfig(),
      modelApi: store.modelApi,
      activeModel: choosePanel.value?.activeModel
    });

    // 获取当前项目ID（如果有）
    const currentProjectId = getCurrentProjectId();
    const savedProjects = getSavedProjects();
    const currentProject = currentProjectId ? savedProjects.find(p => p.id === currentProjectId) : null;

    // 弹出输入框让用户输入项目名称
    const { value: projectName } = await ElMessageBox.prompt(
      "请输入项目名称",
      "保存项目",
      {
        confirmButtonText: "保存",
        cancelButtonText: "取消",
        inputValue: currentProject?.name || `项目_${new Date().toLocaleString()}`,
        inputValidator: (value) => {
          if (!value || value.trim() === "") {
            return "项目名称不能为空";
          }
          return true;
        }
      }
    );

    if (projectName) {
      // 保存项目
      await saveProject(projectData, projectName.trim(), currentProjectId);
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("保存项目失败:", error);
      ElMessage.error(`保存项目失败: ${error.message || error}`);
    }
  }
};

// 导出项目到本地文件
const onExportProject = async () => {
  try {
    if (!editPanel.value || !store.modelApi.model) {
      ElMessage.warning("请先加载模型");
      return;
    }

    // 收集项目数据
    const projectData = collectProjectData({
      getPanelConfig: () => editPanel.value.getPanelConfig(),
      modelApi: store.modelApi,
      activeModel: choosePanel.value?.activeModel
    });

    // 生成文件名
    const activeModel = choosePanel.value?.activeModel;
    const fileName = activeModel?.name 
      ? `threejs-project-${activeModel.name}-${new Date().toISOString().slice(0, 10)}.json`
      : `threejs-project-${new Date().toISOString().slice(0, 10)}.json`;

    // 导出到文件
    exportProjectToFile(projectData, fileName);
  } catch (error) {
    console.error("导出项目失败:", error);
    ElMessage.error(`导出项目失败: ${error.message || error}`);
  }
};

// 导入项目
const onImportProject = () => {
  try {
    // 创建文件输入元素
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.style.display = "none";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) {
        return;
      }

      try {
        // 导入项目
        const result = await importProjectFromFile(file);
        
        if (result.success && result.data) {
          // 询问用户是否要加载项目
          ElMessageBox.confirm(
            "项目导入成功！是否要加载该项目？\n注意：加载项目会替换当前场景。",
            "导入项目",
            {
              confirmButtonText: "加载",
              cancelButtonText: "取消",
              type: "info"
            }
          )
            .then(async () => {
              // 加载项目数据
              await onLoadProject(result.data);
            })
            .catch(() => {
              // 用户取消加载
            });
        }
      } catch (error) {
        console.error("导入项目失败:", error);
      } finally {
        // 清理
        document.body.removeChild(input);
      }
    };

    // 触发文件选择
    document.body.appendChild(input);
    input.click();
  } catch (error) {
    console.error("导入项目失败:", error);
    ElMessage.error(`导入项目失败: ${error.message || error}`);
  }
};

// 打开项目管理对话框
const onOpenProjectManager = () => {
  projectManagerVisible.value = true;
};

// 加载项目数据
const onLoadProject = async (projectData) => {
  try {
    if (!projectData) {
      ElMessage.warning("项目数据为空");
      return;
    }

    $bus.emit(PAGE_LOADING, true);
    
    try {
      // 检查 modelApi 和基础设施是否存在
      if (!store.modelApi) {
        ElMessage.error("模型编辑器未初始化");
        $bus.emit(PAGE_LOADING, false);
        return;
      }

      if (!store.modelApi.scene || !store.modelApi.renderer || !store.modelApi.camera) {
        ElMessage.error("场景未正确初始化，请刷新页面后重试");
        $bus.emit(PAGE_LOADING, false);
        return;
      }

      // 1. 清除当前场景中的模型（但保留渲染器、场景、相机等基础设施）
      if (store.modelApi.model) {
        store.modelApi.clearSceneModel();
      }

      // 2. 加载主模型
      if (projectData.fileInfo) {
        const fileInfo = projectData.fileInfo;
        
        // 处理 Blob URL 或 IndexedDB 存储的文件
        let filePath = fileInfo.filePath;
        if (fileInfo.isFileStore && fileInfo.fileId) {
          try {
            const blob = await getFile(fileInfo.fileId);
            if (blob) {
              filePath = URL.createObjectURL(blob);
            }
          } catch (e) {
            console.error("从 IndexedDB 加载文件失败:", e);
            ElMessage.warning("无法加载保存的模型文件，请重新上传");
            $bus.emit(PAGE_LOADING, false);
            return;
          }
        }

        // 确保文件路径有效
        if (!filePath) {
          ElMessage.warning("模型文件路径无效");
          $bus.emit(PAGE_LOADING, false);
          return;
        }

        // 加载主模型（onSwitchModel 内部会调用 clearSceneModel）
        const loadResult = await store.modelApi.onSwitchModel({
          ...fileInfo,
          filePath: filePath
        }, true);

        if (!loadResult || !loadResult.load) {
          ElMessage.warning("模型加载失败");
          $bus.emit(PAGE_LOADING, false);
          return;
        }

        // 等待模型完全加载和初始化
        await new Promise(resolve => setTimeout(resolve, 200));

        // 恢复主模型的位置、旋转、缩放（在自动调整之后）
        if (store.modelApi.model) {
          if (fileInfo.position && Array.isArray(fileInfo.position) && fileInfo.position.length >= 3) {
            store.modelApi.model.position.set(
              fileInfo.position[0],
              fileInfo.position[1],
              fileInfo.position[2]
            );
          }
          if (fileInfo.rotation && Array.isArray(fileInfo.rotation) && fileInfo.rotation.length >= 3) {
            store.modelApi.model.rotation.set(
              fileInfo.rotation[0],
              fileInfo.rotation[1],
              fileInfo.rotation[2]
            );
          }
          if (fileInfo.scale && Array.isArray(fileInfo.scale) && fileInfo.scale.length >= 3) {
            store.modelApi.model.scale.set(
              fileInfo.scale[0],
              fileInfo.scale[1],
              fileInfo.scale[2]
            );
          }
        }

        // 触发模型更新事件，确保UI更新
        $bus.emit(UPDATE_MODEL);
      } else {
        ElMessage.warning("项目数据中没有模型文件信息");
        $bus.emit(PAGE_LOADING, false);
        return;
      }

      // 3. 加载多模型列表
      if (projectData.modelList && Array.isArray(projectData.modelList) && projectData.modelList.length > 0) {
        // 获取主模型的唯一标识（优先使用 id，其次使用 filePath）
        const mainModelId = projectData.fileInfo?.id || projectData.fileInfo?.filePath;
        
        for (const modelInfo of projectData.modelList) {
          // 跳过主模型（已经在步骤2中加载）- 通过 id 或 filePath 判断
          const isMainModel = (modelInfo.id && modelInfo.id === mainModelId) || 
                              (projectData.fileInfo && modelInfo.filePath === projectData.fileInfo.filePath);
          
          if (isMainModel || !modelInfo.filePath) {
            continue;
          }

          let modelFilePath = modelInfo.filePath;
          
          // 处理 IndexedDB 存储的文件
          if (modelInfo.isFileStore && modelInfo.fileId) {
            try {
              const blob = await getFile(modelInfo.fileId);
              if (blob) {
                modelFilePath = URL.createObjectURL(blob);
              } else {
                console.warn("无法从 IndexedDB 加载模型文件:", modelInfo.fileId);
                continue;
              }
            } catch (e) {
              console.error("从 IndexedDB 加载多模型文件失败:", e);
              continue;
            }
          }

          // 直接加载多模型（不使用鼠标位置，使用保存的位置）
          try {
            const { filePath: finalPath, fileType, name } = modelInfo;
            
            // 创建加载器
            let loader;
            if (["glb", "gltf"].includes(fileType)) {
              const dracoLoader = new DRACOLoader();
              dracoLoader.setDecoderPath(`/draco/`);
              dracoLoader.setDecoderConfig({ type: "js" });
              dracoLoader.preload();
              loader = new GLTFLoader().setDRACOLoader(dracoLoader);
            } else {
              loader = store.modelApi.fileLoaderMap[fileType];
            }

            if (!loader) {
              console.warn("不支持的模型类型:", fileType);
              continue;
            }

            // 加载模型
            await new Promise((resolve, reject) => {
              loader.load(
                modelFilePath,
                result => {
                  let manyModel;
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

                  if (!manyModel) {
                    reject(new Error("无法解析模型"));
                    return;
                  }

                  // 恢复模型位置、旋转、缩放
                  if (modelInfo.position && Array.isArray(modelInfo.position) && modelInfo.position.length >= 3) {
                    manyModel.position.set(
                      modelInfo.position[0],
                      modelInfo.position[1],
                      modelInfo.position[2]
                    );
                  }
                  if (modelInfo.rotation && Array.isArray(modelInfo.rotation) && modelInfo.rotation.length >= 3) {
                    manyModel.rotation.set(
                      modelInfo.rotation[0],
                      modelInfo.rotation[1],
                      modelInfo.rotation[2]
                    );
                  }
                  if (modelInfo.scale && Array.isArray(modelInfo.scale) && modelInfo.scale.length >= 3) {
                    manyModel.scale.set(
                      modelInfo.scale[0],
                      modelInfo.scale[1],
                      modelInfo.scale[2]
                    );
                  } else {
                    // 如果没有保存的缩放，使用默认缩放
                    const box = new THREE.Box3().setFromObject(manyModel);
                    const size = box.getSize(new THREE.Vector3());
                    const maxSize = Math.max(size.x, size.y, size.z);
                    const targetSize = 1.2;
                    const scale = targetSize / (maxSize > 1 ? maxSize : 0.5);
                    manyModel.scale.set(scale, scale, scale);
                  }

                  manyModel.name = name || modelInfo.name || `model_${Date.now()}`;
                  manyModel.userData = {
                    type: "manyModel",
                    ...manyModel.userData
                  };

                  // 确保 manyModelGroup 存在
                  if (!store.modelApi.manyModelGroup) {
                    store.modelApi.manyModelGroup = new THREE.Group();
                    store.modelApi.scene.add(store.modelApi.manyModelGroup);
                  }

                  store.modelApi.manyModelGroup.add(manyModel);

                  // 确保多模型组在场景中
                  if (!store.modelApi.scene.getObjectByProperty('uuid', store.modelApi.manyModelGroup.uuid)) {
                    store.modelApi.scene.add(store.modelApi.manyModelGroup);
                  }

                  // 记录到 loadedModels
                  if (!store.modelApi.loadedModels) {
                    store.modelApi.loadedModels = [];
                  }
                  store.modelApi.loadedModels.push({
                    filePath: modelFilePath,
                    fileType: fileType,
                    decomposeName: name || modelInfo.name,
                    object: manyModel
                  });

                  // 收集动画
                  if (result.animations) {
                    store.modelApi.getManyModelAnimationList?.(result.animations);
                  }

                  resolve();
                },
                xhr => {
                  store.modelApi.modelProgressCallback?.(xhr.loaded, xhr.total);
                },
                err => {
                  console.error("加载多模型文件失败:", err);
                  reject(err);
                }
              );
            });

            // 等待模型完全加载
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error("加载多模型失败:", error, modelInfo);
            ElMessage.warning(`加载模型 "${modelInfo.name || modelInfo.filePath}" 失败`);
            // 继续加载其他模型，不中断整个流程
          }
        }
      }

      // 4. 恢复相机位置（在模型加载后）
      if (projectData.camera && store.modelApi.camera && store.modelApi.controls) {
        if (projectData.camera.x !== undefined) {
          store.modelApi.camera.position.set(
            projectData.camera.x,
            projectData.camera.y !== undefined ? projectData.camera.y : 2,
            projectData.camera.z !== undefined ? projectData.camera.z : 6
          );
        }
        if (projectData.camera.target && Array.isArray(projectData.camera.target) && projectData.camera.target.length >= 3) {
          store.modelApi.controls.target.set(
            projectData.camera.target[0],
            projectData.camera.target[1],
            projectData.camera.target[2]
          );
        }
        store.modelApi.camera.updateProjectionMatrix();
        store.modelApi.controls.update();
      }

      // 5. 恢复编辑面板配置 - 需要等待下一个 tick 确保组件已渲染
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 恢复背景配置
      if (projectData.background && store.modelApi.backgroundModules) {
        const bg = projectData.background;
        if (bg.visible) {
          if (bg.type === 1) {
            store.modelApi.backgroundModules.onSetSceneColor(bg.color);
          } else if (bg.type === 2 && bg.image) {
            store.modelApi.backgroundModules.onSetSceneImage(bg.image);
          } else if (bg.type === 3 && bg.viewImg) {
            store.modelApi.backgroundModules.onSetSceneViewImage(bg.viewImg, {
              intensity: bg.intensity,
              blurriness: bg.blurriness
            });
          }
        }
        // 更新编辑面板配置
        if (editPanel.value?.$refs?.background) {
          Object.assign(editPanel.value.$refs.background.config, bg);
        }
      }

      // 恢复材质配置
      if (projectData.material && projectData.material.meshList && store.modelApi.materialModules) {
        projectData.material.meshList.forEach(meshConfig => {
          const mesh = store.modelApi.model?.getObjectByProperty("name", meshConfig.meshName);
          if (mesh && mesh.material) {
            if (meshConfig.color) {
              mesh.material.color.set(new THREE.Color(meshConfig.color));
            }
            if (meshConfig.opacity !== undefined) {
              mesh.material.opacity = meshConfig.opacity;
              mesh.material.transparent = meshConfig.opacity < 1;
            }
            if (meshConfig.wireframe !== undefined) {
              mesh.material.wireframe = meshConfig.wireframe;
            }
            if (meshConfig.visible !== undefined) {
              mesh.material.visible = meshConfig.visible;
            }
            if (meshConfig.depthWrite !== undefined) {
              mesh.material.depthWrite = meshConfig.depthWrite;
            }
          }
        });
      }

      // 恢复动画配置
      if (projectData.animation && store.modelApi.animationModules) {
        store.modelApi.animationModules.onSetModelAnimation(projectData.animation);
        // 更新编辑面板配置
        if (editPanel.value?.$refs?.animation) {
          Object.assign(editPanel.value.$refs.animation.config, projectData.animation);
        }
      }

      // 恢复属性配置
      if (projectData.attribute && store.modelApi.helperModules) {
        const attrConfig = projectData.attribute;
        // 设置网格辅助线
        if (attrConfig.gridHelper !== undefined) {
          store.modelApi.helperModules.onSetModelGridHelper({
            x: attrConfig.x || 0,
            y: attrConfig.y || -0.59,
            z: attrConfig.z || -0.1,
            gridHelper: attrConfig.gridHelper,
            color: attrConfig.color || "rgb(193,193,193)"
          });
        }
        // 设置网格大小
        if (attrConfig.size !== undefined || attrConfig.divisions !== undefined) {
          store.modelApi.helperModules.onSetModelGridHelperSize({
            x: attrConfig.x || 0,
            y: attrConfig.y || -0.59,
            z: attrConfig.z || -0.1,
            size: attrConfig.size || 4,
            divisions: attrConfig.divisions || 10,
            color: attrConfig.color || "rgb(193,193,193)",
            gridHelper: attrConfig.gridHelper || false
          });
        }
        // 设置坐标轴辅助线
        if (attrConfig.axesHelper !== undefined) {
          store.modelApi.helperModules.onSetModelAxesHelper({
            axesHelper: attrConfig.axesHelper,
            axesSize: attrConfig.axesSize || 1.8
          });
        }
        // 设置模型位置
        if (attrConfig.positionX !== undefined || attrConfig.positionY !== undefined || attrConfig.positionZ !== undefined) {
          store.modelApi.helperModules.onSetModelPosition({
            positionX: attrConfig.positionX || 0,
            positionY: attrConfig.positionY !== undefined ? attrConfig.positionY : -0.5,
            positionZ: attrConfig.positionZ || 0
          });
        }
        // 设置模型旋转
        if (attrConfig.rotationX !== undefined || attrConfig.rotationY !== undefined || attrConfig.rotationZ !== undefined) {
          if (store.modelApi.model) {
            store.modelApi.model.rotation.set(
              attrConfig.rotationX || 0,
              attrConfig.rotationY || 0,
              attrConfig.rotationZ || 0
            );
          }
        }
        // 更新编辑面板配置
        if (editPanel.value?.$refs?.attribute) {
          Object.assign(editPanel.value.$refs.attribute.config, attrConfig);
        }
      }

      // 恢复光照配置
      if (projectData.light && store.modelApi.lightModules) {
        const lightConfig = projectData.light;
        // 分别设置各种光源
        if (lightConfig.ambientLight !== undefined) {
          store.modelApi.lightModules.onSetModelAmbientLight({
            ambientLight: lightConfig.ambientLight,
            ambientLightColor: lightConfig.ambientLightColor || "#fff",
            ambientLightIntensity: lightConfig.ambientLightIntensity !== undefined ? lightConfig.ambientLightIntensity : 0.8
          });
        }
        if (lightConfig.directionalLight !== undefined) {
          store.modelApi.lightModules.onSetModelDirectionalLight(lightConfig);
        }
        if (lightConfig.pointLight !== undefined) {
          store.modelApi.lightModules.onSetModelPointLight(lightConfig);
        }
        if (lightConfig.spotLight !== undefined) {
          store.modelApi.lightModules.onSetModelSpotLight(lightConfig);
        }
        // 更新编辑面板配置
        if (editPanel.value?.$refs?.light) {
          Object.assign(editPanel.value.$refs.light.config, lightConfig);
        }
      }

      // 恢复后期效果配置
      if (projectData.stage && store.modelApi.stageFlowModules) {
        store.modelApi.stageFlowModules.onSetUnrealBloomPass(projectData.stage);
        // 恢复模型位置列表
        if (projectData.stage.meshPositionList && Array.isArray(projectData.stage.meshPositionList)) {
          projectData.stage.meshPositionList.forEach(meshPos => {
            const mesh = store.modelApi.model?.getObjectByProperty("name", meshPos.name);
            if (mesh && meshPos.position) {
              mesh.position.set(meshPos.position.x, meshPos.position.y, meshPos.position.z);
            }
            if (mesh && meshPos.rotation) {
              mesh.rotation.set(meshPos.rotation.x, meshPos.rotation.y, meshPos.rotation.z);
            }
            if (mesh && meshPos.scale) {
              mesh.scale.set(meshPos.scale.x, meshPos.scale.y, meshPos.scale.z);
            }
          });
        }
        // 更新编辑面板配置
        if (editPanel.value?.$refs?.stage) {
          Object.assign(editPanel.value.$refs.stage.config, projectData.stage);
        }
      }

      // 恢复标签配置
      if (projectData.tags && store.modelApi.tagsModules) {
        // 更新编辑面板配置
        if (editPanel.value?.$refs?.tags) {
          Object.assign(editPanel.value.$refs.tags.config, projectData.tags);
          // 重新创建标签
          if (editPanel.value.$refs.tags.createTags) {
            editPanel.value.$refs.tags.createTags();
          }
        }
      }

      // 恢复事件配置
      if (projectData.events) {
        for (const uuid in projectData.events) {
          const eventConfig = projectData.events[uuid];
          if (store.modelApi.setMeshEventData) {
            store.modelApi.setMeshEventData(uuid, eventConfig);
          }
        }
      }

      // 触发更新事件
      $bus.emit(UPDATE_MODEL);

      ElMessage.success("项目加载成功");
    } finally {
      $bus.emit(PAGE_LOADING, false);
    }
  } catch (error) {
    console.error("加载项目失败:", error);
    ElMessage.error(`加载项目失败: ${error.message || error}`);
    $bus.emit(PAGE_LOADING, false);
  }
};

// 全屏监听事件
const addEventListenerFullscreen = e => {
  const status = document.fullscreenElement || document.webkitFullscreenElement;
  fullscreenStatus.value = !!status;
};

onMounted(async () => {
  loading.value = true;
  const modelApi = new renderModel("#model");
  store.setModelApi(modelApi);

  $bus.on(PAGE_LOADING, value => {
    clearTimeout(loadingTimeout.value);
    if (value) {
      loading.value = value;
    } else {
      loadingTimeout.value = setTimeout(() => {
        loading.value = value;
        progress.value = 0;
      }, 500);
    }
  });
  // 模型加载进度条
  store.modelApi.onProgress((progressNum, totalSize) => {
    progress.value = Number(((progressNum / totalSize) * 100).toFixed(0));
  });

  // 注册模型切换回调，用于点击场景模型时更新UI
  store.modelApi.onSwitchModelCallback(() => {
      $bus.emit(UPDATE_MODEL);
  });

  const load = await modelApi.init();

  if (load) {
    loading.value = false;
    progress.value = 0;
  }
  // 初始化模型库数据
  initModelBaseData();
  // 全屏监听事件
  document.addEventListener("fullscreenchange", addEventListenerFullscreen);
});
onBeforeUnmount(() => {
  store.modelApi.onClearModelData();
  document.removeEventListener("fullscreenchange", addEventListenerFullscreen);
  clearTimeout(loadingTimeout.value);
});
</script>

<style lang="scss" scoped>
.model-page {
  width: 100%;
  background-color: #1b1c23;
  .model-header {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 35px;
    padding: 0 10px;
    font-weight: 500;
    color: #ffffff;
    text-align: center;
    text-shadow: 5px 3px 5px #c11212;
    background-color: #010c1d;
    box-shadow: 0 2px 8px 0 rgb(0 0 0 / 10%);
    .header-lf {
      font-size: 14px;
    }
  }
  .model-container {
    display: flex;
    #model {
      position: relative;
      width: calc(100% - 630px);
      height: calc(100vh - 35px);
      .camera-icon {
        position: absolute;
        top: 10px;
        left: calc(100% - 50%);
        cursor: pointer;
      }
    }
  }
}
</style>

<style lang="scss">
.edit-box {
  height: calc(100vh - 90px);
}
.edit-box,
.model-choose {
  .header {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 35px;
    padding: 0 20px;
    color: #cccccc;
    background-color: #33343f;
    border-top: 1px solid #1b1c23;
    border-bottom: 1px solid #1b1c23;
  }
  .disabled {
    pointer-events: none;
    opacity: 0.3;
  }
  .options {
    box-sizing: border-box;
    max-width: 380px;
    background-color: #1b1c23;
    .option-active {
      background-color: #27282f;
    }
    .space-between {
      justify-content: space-between;
    }
    .option {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      height: 33px;
      padding: 0 18px;
      font-size: 14px;
      color: #cccccc;
      cursor: pointer;
      .icon-name {
        display: flex;
        align-items: center;
      }
    }
  }
}
.el-input-number {
  width: 90px !important;
}
</style>
