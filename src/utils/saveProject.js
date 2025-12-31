/**
 * @description 项目保存和导出工具
 * @module SaveProject
 */

import { indexedDB } from "./indexedDB";
import { local } from "./storage";
import { ElMessage } from "element-plus";

// 保存项目的 key
const PROJECT_SAVE_KEY = "THREEJS_EDITOR_PROJECTS";
const CURRENT_PROJECT_KEY = "THREEJS_EDITOR_CURRENT_PROJECT";

/**
 * 获取所有保存的项目列表
 */
export function getSavedProjects() {
  try {
    const projects = local.get(PROJECT_SAVE_KEY);
    return Array.isArray(projects) ? projects : [];
  } catch (error) {
    console.error("获取项目列表失败:", error);
    return [];
  }
}

/**
 * 保存项目到本地存储
 * @param {Object} projectData - 项目数据
 * @param {String} projectName - 项目名称
 * @param {String} projectId - 项目ID（可选，不提供则自动生成）
 */
export async function saveProject(projectData, projectName, projectId = null) {
  try {
    if (!projectData || !projectName) {
      throw new Error("项目数据和名称不能为空");
    }

    // 生成项目ID
    const id = projectId || `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建项目对象
    const project = {
      id,
      name: projectName,
      data: projectData,
      createTime: projectId ? (getSavedProjects().find(p => p.id === projectId)?.createTime || Date.now()) : Date.now(),
      updateTime: Date.now(),
      version: "1.0.0"
    };

    // 获取现有项目列表
    const projects = getSavedProjects();
    
    // 如果项目已存在，更新它；否则添加新项目
    const existingIndex = projects.findIndex(p => p.id === id);
    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }

    // 保存到 localStorage
    local.set(PROJECT_SAVE_KEY, projects);
    
    // 保存当前项目ID
    local.set(CURRENT_PROJECT_KEY, id);

    // 同时保存到 IndexedDB（用于大数据）
    try {
      await indexedDB.putArray(project);
    } catch (error) {
      console.warn("保存到 IndexedDB 失败，仅使用 localStorage:", error);
    }

    ElMessage.success(`项目 "${projectName}" 保存成功`);
    return { success: true, projectId: id };
  } catch (error) {
    console.error("保存项目失败:", error);
    ElMessage.error(`保存项目失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 加载项目
 * @param {String} projectId - 项目ID
 */
export async function loadProject(projectId) {
  try {
    if (!projectId) {
      throw new Error("项目ID不能为空");
    }

    // 先从 localStorage 获取
    const projects = getSavedProjects();
    let project = projects.find(p => p.id === projectId);

    // 如果 localStorage 中没有，尝试从 IndexedDB 获取
    if (!project) {
      try {
        const dbData = await indexedDB.get(projectId);
        if (dbData) {
          project = dbData;
        }
      } catch (error) {
        console.warn("从 IndexedDB 加载项目失败:", error);
      }
    }

    if (!project) {
      throw new Error("项目不存在");
    }

    // 更新当前项目ID
    local.set(CURRENT_PROJECT_KEY, projectId);

    ElMessage.success(`项目 "${project.name}" 加载成功`);
    return { success: true, project };
  } catch (error) {
    console.error("加载项目失败:", error);
    ElMessage.error(`加载项目失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 删除项目
 * @param {String} projectId - 项目ID
 */
export async function deleteProject(projectId) {
  try {
    if (!projectId) {
      throw new Error("项目ID不能为空");
    }

    const projects = getSavedProjects();
    const filteredProjects = projects.filter(p => p.id !== projectId);
    
    if (filteredProjects.length === projects.length) {
      throw new Error("项目不存在");
    }

    local.set(PROJECT_SAVE_KEY, filteredProjects);

    // 从 IndexedDB 删除
    try {
      await indexedDB.remove(projectId);
    } catch (error) {
      console.warn("从 IndexedDB 删除项目失败:", error);
    }

    ElMessage.success("项目删除成功");
    return { success: true };
  } catch (error) {
    console.error("删除项目失败:", error);
    ElMessage.error(`删除项目失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 导出项目到本地文件
 * @param {Object} projectData - 项目数据
 * @param {String} fileName - 文件名（可选）
 */
export function exportProjectToFile(projectData, fileName = null) {
  try {
    if (!projectData) {
      throw new Error("项目数据不能为空");
    }

    // 创建导出数据对象
    const exportData = {
      version: "1.0.0",
      exportTime: new Date().toISOString(),
      data: projectData
    };

    // 转换为 JSON 字符串
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // 创建 Blob
    const blob = new Blob([jsonString], { type: "application/json" });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // 生成文件名
    const defaultFileName = fileName || `threejs-project-${new Date().toISOString().slice(0, 10)}.json`;
    link.download = defaultFileName;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    ElMessage.success("项目导出成功");
    return { success: true };
  } catch (error) {
    console.error("导出项目失败:", error);
    ElMessage.error(`导出项目失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 从本地文件导入项目
 * @param {File} file - 文件对象
 * @returns {Promise<Object>} 导入的项目数据
 */
export function importProjectFromFile(file) {
  return new Promise((resolve, reject) => {
    try {
      if (!file) {
        throw new Error("请选择文件");
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const jsonString = e.target.result;
          const importData = JSON.parse(jsonString);
          
          // 验证数据格式
          if (!importData.data) {
            throw new Error("文件格式不正确，缺少 data 字段");
          }

          ElMessage.success("项目导入成功");
          resolve({ success: true, data: importData.data, metadata: importData });
        } catch (error) {
          console.error("解析文件失败:", error);
          ElMessage.error(`导入项目失败: ${error.message}`);
          reject(error);
        }
      };

      reader.onerror = () => {
        const error = new Error("读取文件失败");
        ElMessage.error(error.message);
        reject(error);
      };

      reader.readAsText(file);
    } catch (error) {
      console.error("导入项目失败:", error);
      ElMessage.error(`导入项目失败: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * 获取当前项目ID
 */
export function getCurrentProjectId() {
  try {
    return local.get(CURRENT_PROJECT_KEY);
  } catch (error) {
    console.error("获取当前项目ID失败:", error);
    return null;
  }
}

/**
 * 收集完整的项目数据
 * @param {Object} options - 选项
 * @param {Function} options.getPanelConfig - 获取面板配置的函数
 * @param {Object} options.modelApi - 模型API对象
 * @param {Object} options.activeModel - 当前激活的模型
 */
export function collectProjectData({ getPanelConfig, modelApi, activeModel }) {
  try {
    // 使用 JSON.stringify + replacer 处理循环引用
    const getCircularReplacer = () => {
      const seen = new WeakSet();
      return (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return;
          }
          seen.add(value);
        }
        // 过滤掉 Three.js 对象和函数（需要动态检查，避免导入问题）
        if (typeof window !== 'undefined' && window.THREE) {
          const THREE = window.THREE;
          if (value instanceof THREE.Object3D || value instanceof THREE.Material || value instanceof THREE.Texture) {
            return undefined;
          }
        }
        if (typeof value === "function") {
          return undefined;
        }
        return value;
      };
    };

    // 获取面板配置
    const panelConfig = getPanelConfig ? getPanelConfig() : {};
    
    // 创建项目数据对象
    const projectData = {
      ...panelConfig,
      camera: modelApi?.onGetModelCamera ? modelApi.onGetModelCamera() : null,
      fileInfo: activeModel || null,
      timestamp: Date.now()
    };

    // 更新主模型的位置信息
    if (projectData.fileInfo && modelApi?.model) {
      const { position, rotation, scale } = modelApi.model;
      projectData.fileInfo.position = position.toArray();
      projectData.fileInfo.rotation = rotation.toArray();
      projectData.fileInfo.scale = scale.toArray();
    }

    // 获取所有已加载模型列表
    if (modelApi?.getLoadedModelsInfo) {
      projectData.modelList = modelApi.getLoadedModelsInfo();
    }

    // 序列化数据（处理循环引用）
    const serializedData = JSON.parse(JSON.stringify(projectData, getCircularReplacer()));

    return serializedData;
  } catch (error) {
    console.error("收集项目数据失败:", error);
    throw error;
  }
}

