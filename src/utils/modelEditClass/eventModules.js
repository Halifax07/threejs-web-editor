/**
 * 事件交互模块
 *
 * @module EventModules
 * @description 处理模型点击交互事件
 */

import * as THREE from "three";
import { ElMessage, ElMessageBox } from "element-plus";
import { useMeshEditStore } from "@/store/meshEditStore";
import { toRaw } from "vue";
import TWEEN from "@tweenjs/tween.js";

// 存储模型事件配置 Map<uuid, config>
const meshEventMap = new Map();

// 存储交互前的场景状态
let originalSceneState = {
  cameraPosition: null,
  controlsTarget: null,
  meshStates: new Map()
};

/**
 * 保存场景状态
 * @param {Object} modelApi - 模型API对象
 */
function saveSceneState(modelApi) {
  if (!modelApi) return;
  
  // 保存相机和控制器状态
  originalSceneState.cameraPosition = modelApi.camera.position.clone();
  originalSceneState.controlsTarget = modelApi.controls.target.clone();
  
  // 保存所有网格的状态
  originalSceneState.meshStates.clear();
  // 使用 scene.traverse 而不是 model.traverse，以确保覆盖所有模型
  modelApi.scene.traverse((obj) => {
    if (obj.isMesh || obj.isGroup) {
      originalSceneState.meshStates.set(obj.uuid, {
        visible: obj.visible,
        color: obj.material && obj.material.color ? obj.material.color.getHex() : null,
        position: obj.position.clone()
      });
    }
  });
}

/**
 * 恢复场景状态
 * @param {Object} modelApi - 模型API对象
 */
function restoreSceneState(modelApi) {
  if (!modelApi) return;

  // 恢复相机和控制器状态
  if (originalSceneState.cameraPosition) {
    // 使用动画平滑恢复，或者直接恢复
    // 这里选择平滑恢复以获得更好的体验，或者直接恢复以确保准确性
    // 考虑到“退出”通常意味着重置，直接恢复可能更干脆
    new TWEEN.Tween(modelApi.camera.position)
      .to(originalSceneState.cameraPosition, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();

    new TWEEN.Tween(modelApi.controls.target)
      .to(originalSceneState.controlsTarget, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
  }

  // 恢复网格状态
  // 同样遍历整个场景
  modelApi.scene.traverse((obj) => {
    if ((obj.isMesh || obj.isGroup) && originalSceneState.meshStates.has(obj.uuid)) {
      const state = originalSceneState.meshStates.get(obj.uuid);
      obj.visible = state.visible;
      if (state.color !== null && obj.material && obj.material.color) {
        obj.material.color.setHex(state.color);
      }
      if (state.position) {
        // 如果位置有变化（比如拆解后），则恢复位置
        if (!obj.position.equals(state.position)) {
           new TWEEN.Tween(obj.position)
            .to(state.position, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        }
      }
      // 清除拆解标记
      if (obj.userData.isExploded) {
        obj.userData.isExploded = false;
      }
    }
    // 同时也清除Group上的标记
    if (obj.isGroup && obj.userData.isExploded) {
        obj.userData.isExploded = false;
    }
  });

  // 停止所有动画
  if (modelApi.onClearAnimation) {
    modelApi.onClearAnimation();
  }
}

/**
 * 设置模型事件数据
 * @param {string} uuid - 模型UUID
 * @param {Object} config - 事件配置
 */
function setMeshEventData(uuid, config) {
  meshEventMap.set(uuid, config);
}

/**
 * 获取模型事件数据
 * @param {string} uuid - 模型UUID
 * @returns {Object} 事件配置
 */
function getMeshEventData(uuid) {
  return meshEventMap.get(uuid);
}

/**
 * 获取所有模型事件数据
 * @returns {Object} 所有事件配置 { uuid: config }
 */
function getAllMeshEventData() {
  const obj = {};
  for (const [uuid, config] of meshEventMap) {
    obj[uuid] = config;
  }
  return obj;
}

/**
 * 触发模型点击事件
 * @param {Object} mesh - 被点击的模型对象
 */
function triggerMeshEvent(mesh) {
  const store = useMeshEditStore();
  // 确保使用原始对象获取配置
  const rawMesh = toRaw(mesh);
  const config = meshEventMap.get(rawMesh.uuid);
  
  if (!config || config.clickEvent === "none") return;

  switch (config.clickEvent) {
    case "alert":
      if (config.alertContent) {
        ElMessageBox.alert(config.alertContent, "提示", {
          confirmButtonText: "确定"
        });
      }
      break;
    case "link":
      if (config.linkUrl) {
        window.open(config.linkUrl, "_blank");
      }
      break;
    case "color":
      if (config.targetColor) {
        // 保存原始颜色以便恢复（可选）
        if (!mesh.userData.originalColor) {
          mesh.userData.originalColor = mesh.material.color.getHex();
        }
        mesh.material.color.set(config.targetColor);
        ElMessage.success("模型颜色已改变");
      }
      break;
    case "visible":
      mesh.visible = !mesh.visible;
      ElMessage.success(mesh.visible ? "模型已显示" : "模型已隐藏");
      break;
    case "flyTo":
      {
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = store.modelApi.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 2.0; // 适当后退，避免太近

        const direction = store.modelApi.camera.position.clone().sub(center).normalize();
        const newPos = center.clone().add(direction.multiplyScalar(cameraZ));

        new TWEEN.Tween(store.modelApi.camera.position)
          .to(newPos, 1000)
          .easing(TWEEN.Easing.Quadratic.Out)
          .start();

        new TWEEN.Tween(store.modelApi.controls.target)
          .to(center, 1000)
          .easing(TWEEN.Easing.Quadratic.Out)
          .start();
      }
      break;
    case "animation":
      if (config.animationName) {
        // 检查是否有该动画
        const clip = THREE.AnimationClip.findByName(store.modelApi.modelAnimation, config.animationName);
        if (clip) {
           store.modelApi.onStartModelAnimation({
             animationName: config.animationName,
             loop: config.loop || 'LoopRepeat',
             timeScale: 1,
             weight: 1
           });
           ElMessage.success(`开始播放动画: ${config.animationName}`);
        } else {
           ElMessage.warning(`未找到动画: ${config.animationName}`);
        }
      }
      break;
    case "explode":
      {
        // 1. 寻找模型根节点 (Model Root) - 作为计算参考系
        let modelRoot = mesh;
        while (modelRoot.parent && modelRoot.parent.type !== 'Scene') {
            modelRoot = modelRoot.parent;
        }
        
        // 2. 获取整个模型下的所有“拆解”对象 (Targets)
        // 不再局限于 mesh.parent，而是查找整个 modelRoot 下的所有部件
        const targets = [];
        modelRoot.traverse((child) => {
             if (child.isMesh) {
                 const childConfig = meshEventMap.get(child.uuid);
                 if (childConfig && childConfig.clickEvent === 'explode') {
                     targets.push(child);
                 }
             }
        });

        if (targets.length === 0) return;

        // 3. 智能判断拆解模式 (基于点击的那个模型 mesh 和 模型根节点)
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

        // 判定特征 (相对于整个模型)
        const coverageX = meshSize.x / parentSize.x;
        const coverageZ = meshSize.z / parentSize.z;
        
        const rawDir = new THREE.Vector3().subVectors(meshCenter, parentCenter);
        const distXZ = Math.sqrt(rawDir.x * rawDir.x + rawDir.z * rawDir.z);
        const distY = Math.abs(rawDir.y);
        
        // 判定为内部独立物体 (如水池)：
        // 1. 位于下方
        // 2. 水平居中
        // 3. 尺寸较小 (关键：防止车底盘等大部件被误判)
        const isSmallPart = coverageX < 0.5 && coverageZ < 0.5;
        const isInternal = isSmallPart && rawDir.y < 0 && distXZ < Math.max(parentSize.x, parentSize.z) * 0.3 && distY > parentSize.y * 0.1;

        // 4. 确定参与拆解的目标对象集合
        let activeTargets = [];
        if (isInternal) {
            // 模式 A: 独立物体 (水池) -> 只拆解自己
            activeTargets = [mesh];
        } else {
            // 模式 B: 组合物体 (楼层、车部件) -> 拆解所有相关部件
            activeTargets = targets;
        }

        // 5. 执行拆解/还原
        const isExploded = activeTargets.some(obj => obj.userData.isExploded);

        if (!isExploded) {
            // --- 执行拆解 ---
            activeTargets.forEach(part => {
                const partConfig = meshEventMap.get(part.uuid);
                const distance = partConfig.explodeDistance || 5;

                if (!part.userData.originalPos) {
                    part.userData.originalPos = part.position.clone();
                }

                // 重新计算每个部件的方向 (相对于 modelRoot)
                const pBox = new THREE.Box3().setFromObject(part);
                const pCenter = new THREE.Vector3();
                pBox.getCenter(pCenter);
                const pSize = new THREE.Vector3();
                pBox.getSize(pSize);

                let worldDir = new THREE.Vector3();
                
                // 计算相对于中心的向量
                const pRawDir = new THREE.Vector3().subVectors(pCenter, parentCenter);
                const pDistXZ = Math.sqrt(pRawDir.x * pRawDir.x + pRawDir.z * pRawDir.z);
                const pDistY = Math.abs(pRawDir.y);
                const minParentDim = Math.min(parentSize.x, parentSize.z);

                // 判定特征
                const pCovX = pSize.x / parentSize.x;
                const pCovZ = pSize.z / parentSize.z;
                
                // 判定为楼层/层叠结构：
                // 1. 覆盖面积大 (相对于整个模型)
                // 2. 垂直厚度相对较小
                // 3. 水平位置居中
                const isCentered = pDistXZ < minParentDim * 0.25;
                const pIsLayer = pCovX > 0.6 && pCovZ > 0.6 && (pSize.y < parentSize.y * 0.8) && isCentered;

                if (pIsLayer) {
                    // A. 楼层模式：沿着 Y 轴拆解
                    const yOffset = pCenter.y - parentCenter.y;
                    worldDir.set(0, yOffset >= -0.1 ? 1 : -1, 0);
                } else {
                    // B. 内部物体模式 (如厂房内的水池)：
                    // 1. 位于中心下方
                    // 2. 水平偏离较小
                    // 3. 有一定的垂直深度
                    // 4. 必须是小部件 (防止车门等侧面大部件被误判)
                    const pIsSmall = pCovX < 0.5 && pCovZ < 0.5;
                    
                    if (pIsSmall && pRawDir.y < 0 && pDistXZ < minParentDim * 0.35 && pDistY > parentSize.y * 0.1) {
                        worldDir.set(0, 1, 0);
                    } else {
                        // C. 侧面物体模式 (如车门、车轮)：
                        // 保持径向拆解 (背离中心)
                        worldDir.copy(pRawDir);
                        // 如果重合，默认向上
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
            ElMessage.success("模型已拆解");

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
            ElMessage.success("模型已还原");
        }
      }
      break;
    default:
      break;
  }
}

/**
 * 清除所有事件数据
 */
function clearEventData() {
  meshEventMap.clear();
}

export default {
  setMeshEventData,
  getMeshEventData,
  getAllMeshEventData,
  triggerMeshEvent,
  clearEventData,
  saveSceneState,
  restoreSceneState
};
