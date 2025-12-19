/**
 * 模型动画模块方法集合
 * @module AnimationModules
 */

import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";

/**
 * 开始执行动画
 * @param {Object} config - 动画配置参数
 */
function onStartModelAnimation(config) {
  this.onSetModelAnimation(config);
  cancelAnimationFrame(this.animationFrame);
  this.animationFrameFun();
}

/**
 * 设置模型动画参数
 * @param {Object} params - 动画参数
 * @param {string} params.animationName - 动画名称
 * @param {string} params.loop - 循环类型
 * @param {number} params.timeScale - 动画速度
 * @param {number} params.weight - 动画权重
 */
function onSetModelAnimation({ animationName, loop, timeScale, weight }) {
  this.animationMixer = new THREE.AnimationMixer(this.model);
  const clip = THREE.AnimationClip.findByName(this.modelAnimation, animationName);
  if (clip) {
    this.animateClipAction = this.animationMixer.clipAction(clip);
    this.animateClipAction.setEffectiveTimeScale(timeScale);
    this.animateClipAction.setEffectiveWeight(weight);
    this.animateClipAction.setLoop(this.loopMap[loop]);
    this.animateClipAction.play();
  }
}

/**
 * 动画帧更新
 */
function animationFrameFun() {
  this.animationFrame = requestAnimationFrame(() => this.animationFrameFun());
  if (this.animationMixer) {
    this.animationMixer.update(this.animationClock.getDelta());
  }
}

/**
 * 清除所有动画
 */
function onClearAnimation() {
  if (!this.animateClipAction) return;
  this.animationMixer.stopAllAction();
  this.animationMixer.update(0);
  cancelAnimationFrame(this.animationFrame);
}

/**
 * 设置模型旋转动画
 * @param {Object} config - 旋转配置
 * @param {boolean} config.rotationVisible - 是否显示旋转
 * @param {string} config.rotationType - 旋转轴类型
 * @param {number} config.rotationSpeed - 旋转速度
 */
function onSetRotation(config) {
  const { rotationVisible, rotationType, rotationSpeed } = config;
  if (rotationVisible) {
    cancelAnimationFrame(this.rotationAnimationFrame);
    this.rotationAnimationFun(rotationType, rotationSpeed);
  } else {
    cancelAnimationFrame(this.rotationAnimationFrame);
    this.model.rotation.set(0, 0, 0);
  }
}

/**
 * 设置旋转轴和速度
 * @param {Object} config - 旋转配置
 * @param {string} config.rotationType - 旋转轴类型
 * @param {number} config.rotationSpeed - 旋转速度
 */
function onSetRotationType(config) {
  const { rotationType, rotationSpeed } = config;
  this.model.rotation.set(0, 0, 0);
  cancelAnimationFrame(this.rotationAnimationFrame);
  this.rotationAnimationFun(rotationType, rotationSpeed);
}

/**
 * 旋转动画帧更新
 * @param {string} rotationType - 旋转轴类型
 * @param {number} rotationSpeed - 旋转速度
 */
function rotationAnimationFun(rotationType, rotationSpeed) {
  this.rotationAnimationFrame = requestAnimationFrame(() => this.rotationAnimationFun(rotationType, rotationSpeed));
  this.model.rotation[rotationType] += rotationSpeed / 50;
}

/**
 * 获取当前模型动画列表
 * @param {Object} result - 包含动画数据的对象
 */
function getModelAnimationList(result) {
  this.modelAnimation = result.animations || [];
}

/**
 * 获取多模型动画列表
 * @param {Array} animations - 动画数组
 */
function getManyModelAnimationList(animations) {
  if (Array.isArray(animations)) {
    this.modelAnimation = this.modelAnimation.concat(animations);
  }
}

/**
 * 多视角数据结构
 * @typedef {Object} ViewPoint
 * @property {string} id - 视角唯一标识
 * @property {string} name - 视角名称
 * @property {THREE.Vector3} position - 相机位置
 * @property {THREE.Vector3} target - 相机看向目标
 * @property {number} duration - 过渡时长(毫秒)
 * @property {string} easing - 缓动函数名称
 */

/**
 * 初始化多视角系统
 */
function initViewPoints() {
  if (!this.viewPointsByTarget) {
    // 按目标对象 uuid 分类存放视角
    this.viewPointsByTarget = {}; // { targetUuid: [viewPoint] }
    this.currentViewIndexByTarget = {}; // { targetUuid: index }
    this.isPlayingViewSequenceByTarget = {}; // { targetUuid: bool }
    this.viewTween = null;
  }
}

/**
 * 内部工具：获取目标 key（null 用 '__main__'）
 */
function getTargetKey(targetUuid) {
  return targetUuid || "__main__";
}

/**
 * 添加视角（绑定到指定目标）
 * @param {string} name
 * @param {string|null} targetUuid - 目标对象 UUID，null 表示绑定到当前主模型
 * @param {boolean} local - 是否以相对于目标的局部坐标保存（默认 true）
 */
function addViewPoint(name = `视角${Date.now()}`, targetUuid = null, local = true) {
  this.initViewPoints();
  const key = getTargetKey(targetUuid);
  if (!this.viewPointsByTarget[key]) this.viewPointsByTarget[key] = [];

  // try find target object in scene if targetUuid provided
  let targetObj = null;
  if (targetUuid && this.scene) {
    targetObj = this.scene.getObjectByProperty("uuid", targetUuid);
  }

  // 如果保存为局部坐标且有目标对象，则把摄像机位置转换为目标局部坐标
  let pos = this.camera.position.clone();
  let tar = this.controls.target.clone();
  let isLocal = false;
  if (local && targetObj) {
    // world -> local
    const localPos = targetObj.worldToLocal(pos.clone());
    const localTar = targetObj.worldToLocal(tar.clone());
    pos = localPos;
    tar = localTar;
    isLocal = true;
  }

  const viewPoint = {
    id: `view_${Date.now()}`,
    name,
    position: pos.clone(),
    target: tar.clone(),
    duration: 1000,
    easing: "Linear.None",
    targetUuid: targetUuid || null,
    isLocal
  };

  this.viewPointsByTarget[key].push(viewPoint);
  return viewPoint;
}

/**
 * 删除视角
 */
function removeViewPoint(viewId) {
  this.initViewPoints();
  for (const key of Object.keys(this.viewPointsByTarget)) {
    const arr = this.viewPointsByTarget[key];
    const idx = arr.findIndex(v => v.id === viewId);
    if (idx > -1) {
      arr.splice(idx, 1);
      // 更新 current index
      if (this.currentViewIndexByTarget[key] >= arr.length) {
        this.currentViewIndexByTarget[key] = arr.length - 1;
      }
      return true;
    }
  }
  return false;
}

/**
 * 更新视角（updates 中传入的位置/目标为世界坐标，内部会根据 isLocal 转换）
 */
function updateViewPoint(viewId, updates) {
  this.initViewPoints();
  for (const key of Object.keys(this.viewPointsByTarget)) {
    const viewPoint = this.viewPointsByTarget[key].find(v => v.id === viewId);
    if (!viewPoint) continue;

    // 将传入的世界坐标转换为存储坐标（如果 viewPoint.isLocal 且有目标对象）
    if (updates.position && viewPoint.isLocal && viewPoint.targetUuid) {
      const targetObj = this.scene.getObjectByProperty("uuid", viewPoint.targetUuid);
      if (targetObj) {
        const localPos = targetObj.worldToLocal(updates.position.clone());
        viewPoint.position.copy(localPos);
      } else {
        viewPoint.position.copy(updates.position);
      }
    } else if (updates.position) {
      viewPoint.position.copy(updates.position);
    }

    if (updates.target && viewPoint.isLocal && viewPoint.targetUuid) {
      const targetObj = this.scene.getObjectByProperty("uuid", viewPoint.targetUuid);
      if (targetObj) {
        const localTar = targetObj.worldToLocal(updates.target.clone());
        viewPoint.target.copy(localTar);
      } else {
        viewPoint.target.copy(updates.target);
      }
    } else if (updates.target) {
      viewPoint.target.copy(updates.target);
    }

    if (typeof updates.duration === "number") viewPoint.duration = updates.duration;
    if (typeof updates.easing === "string") viewPoint.easing = updates.easing;
    if (typeof updates.name === "string") viewPoint.name = updates.name;
    return true;
  }
  return false;
}

/**
 * 获取视角（返回世界坐标形式，便于 UI 展示）
 * @param {string|null} targetUuid
 * @returns {Array} viewPoints（position/target 均为世界坐标副本）
 */
function getViewPoints(targetUuid = null) {
  this.initViewPoints();
  const key = getTargetKey(targetUuid);
  const arr = this.viewPointsByTarget[key] || [];
  // 返回深拷贝并把局部坐标转换为世界坐标（用于 UI）
  return arr.map(v => {
    const copy = Object.assign({}, v, {
      position: v.position.clone(),
      target: v.target.clone()
    });
    if (v.isLocal && v.targetUuid && this.scene) {
      const targetObj = this.scene.getObjectByProperty("uuid", v.targetUuid);
      if (targetObj) {
        copy.position = targetObj.localToWorld(v.position.clone());
        copy.target = targetObj.localToWorld(v.target.clone());
      }
    }
    return copy;
  });
}

/**
 * 播放单个视角（支持局部坐标）
 */
function playViewPoint(viewId, animate = true) {
  const self = this;
  return new Promise(resolve => {
    self.initViewPoints();
    // 查找视角
    let viewPoint = null;
    for (const key of Object.keys(self.viewPointsByTarget)) {
      const found = (self.viewPointsByTarget[key] || []).find(v => v.id === viewId);
      if (found) {
        viewPoint = found;
        break;
      }
    }
    if (!viewPoint) {
      resolve();
      return;
    }

    // 计算目标世界坐标（如果是局部坐标）
    let endPos = viewPoint.position.clone();
    let endTarget = viewPoint.target.clone();
    if (viewPoint.isLocal && viewPoint.targetUuid && self.scene) {
      const targetObj = self.scene.getObjectByProperty("uuid", viewPoint.targetUuid);
      if (targetObj) {
        endPos = targetObj.localToWorld(viewPoint.position.clone());
        endTarget = targetObj.localToWorld(viewPoint.target.clone());
      } else {
        // fallback: treat stored coords as world
        endPos = viewPoint.position.clone();
        endTarget = viewPoint.target.clone();
      }
    }

    // 更新 current index for its target
    const key = getTargetKey(viewPoint.targetUuid);
    const idx = (self.viewPointsByTarget[key] || []).findIndex(v => v.id === viewId);
    self.currentViewIndexByTarget[key] = idx;

    if (!animate) {
      self.camera.position.copy(endPos);
      self.controls.target.copy(endTarget);
      self.controls.update();
      resolve();
      return;
    }

    if (self.viewTween) self.viewTween.stop();

    const startPos = self.camera.position.clone();
    const startTarget = self.controls.target.clone();
    const duration = viewPoint.duration || 1000;
    const tweenData = { t: 0 };

    const easingFunc = getEasingFunction(viewPoint.easing);

    self.viewTween = new TWEEN.Tween(tweenData)
      .to({ t: 1 }, duration)
      .easing(easingFunc)
      .onUpdate(function () {
        const t = tweenData.t;
        self.camera.position.lerpVectors(startPos, endPos, t);
        self.controls.target.lerpVectors(startTarget, endTarget, t);
        self.controls.update();
      })
      .onComplete(function () {
        self.camera.position.copy(endPos);
        self.controls.target.copy(endTarget);
        self.controls.update();
        resolve();
      })
      .start();
  });
}

/**
 * 播放视角序列（可以传 targetUuid，仅播放该目标下视角）
 * @param {Array<string>|null} viewIds
 * @param {Object} options { loop, interval, targetUuid }
 */
function playViewSequence(viewIds = null, options = {}) {
  const self = this;
  return new Promise((resolve) => {
    self.initViewPoints();
    const { loop = false, interval = 500, targetUuid = null } = options;
    let sequence = [];

    if (Array.isArray(viewIds) && viewIds.length) {
      // 从全局中挑出对应 id 的视角
      for (const key of Object.keys(self.viewPointsByTarget)) {
        sequence = sequence.concat(self.viewPointsByTarget[key].filter(v => viewIds.includes(v.id)));
      }
    } else {
      const key = getTargetKey(targetUuid);
      sequence = (self.viewPointsByTarget[key] || []).slice();
    }

    if (sequence.length === 0) {
      resolve();
      return;
    }

    self.isPlayingViewSequenceByTarget[getTargetKey(targetUuid)] = true;

    const playStep = (index) => {
      if (!self.isPlayingViewSequenceByTarget[getTargetKey(targetUuid)]) {
        resolve();
        return;
      }
      if (index >= sequence.length) {
        if (loop) {
          playStep(0);
        } else {
          self.isPlayingViewSequenceByTarget[getTargetKey(targetUuid)] = false;
          resolve();
        }
        return;
      }
      const view = sequence[index];
      self.playViewPoint(view.id, true).then(() => {
        setTimeout(() => playStep(index + 1), interval);
      });
    };
    playStep(0);
  });
}

/**
 * 停止序列播放（可传 targetUuid）
 */
function stopViewSequence(targetUuid = null) {
  this.isPlayingViewSequenceByTarget[getTargetKey(targetUuid)] = false;
  if (this.viewTween) {
    this.viewTween.stop();
    this.viewTween = null;
  }
}

/**
 * 停止所有正在播放的视角序列（跨目标）
 */
function stopAllSequences() {
  if (this.isPlayingViewSequenceByTarget) {
    Object.keys(this.isPlayingViewSequenceByTarget).forEach(k => {
      this.isPlayingViewSequenceByTarget[k] = false;
    });
  }
  if (this.viewTween) {
    this.viewTween.stop();
    this.viewTween = null;
  }
}

/**
 * 获取缓动函数对象路径
 * @param {string} easingName - 缓动函数名称
 * @returns {Function}
 */
function getEasingFunction(easingName = "Linear.None") {
  const parts = easingName.split(".");
  if (parts.length === 2) {
    const [type, name] = parts;
    return TWEEN.Easing[type] && TWEEN.Easing[type][name]
      ? TWEEN.Easing[type][name]
      : TWEEN.Easing.Linear.None;
  }
  return TWEEN.Easing.Linear.None;
}

/**
 * 获取当前目标的视角索引
 * @param {string|null} targetUuid
 * @returns {number}
 */
function getCurrentViewIndex(targetUuid = null) {
  this.initViewPoints();
  const key = getTargetKey(targetUuid);
  return typeof this.currentViewIndexByTarget[key] === 'number' ? this.currentViewIndexByTarget[key] : -1;
}

/**
 * 下一个视角（可指定目标）
 */
function nextViewPoint(targetUuid = null) {
  this.initViewPoints();
  const key = getTargetKey(targetUuid);
  const arr = this.viewPointsByTarget[key] || [];
  if (arr.length === 0) return;
  const cur = typeof this.currentViewIndexByTarget[key] === 'number' ? this.currentViewIndexByTarget[key] : -1;
  const next = (cur + 1) % arr.length;
  this.currentViewIndexByTarget[key] = next;
  this.playViewPoint(arr[next].id, true);
}

/**
 * 上一个视角（可指定目标）
 */
function prevViewPoint(targetUuid = null) {
  this.initViewPoints();
  const key = getTargetKey(targetUuid);
  const arr = this.viewPointsByTarget[key] || [];
  if (arr.length === 0) return;
  const cur = typeof this.currentViewIndexByTarget[key] === 'number' ? this.currentViewIndexByTarget[key] : 0;
  const prev = (cur - 1 + arr.length) % arr.length;
  this.currentViewIndexByTarget[key] = prev;
  this.playViewPoint(arr[prev].id, true);
}

/**
 * 新增：根据多个 targetUuid 生成合并序列
 * @param {Array<string>} targetUuids - 目标 UUID 数组
 * @param {Object} options - 选项 { mode: 'sequential' | 'interleave' }
 * @returns {Array<string>} viewIds - 合并后的视角 ID 序列
 */
function createCombinedSequence(targetUuids = [], options = { mode: 'sequential' }) {
  const targets = Array.isArray(targetUuids) ? targetUuids : [targetUuids];
  const groups = targets.map(t => (this.viewPointsByTarget[getTargetKey(t)] || []).slice());
  if (options.mode === 'sequential') {
    // A then B then C...
    return groups.flat().map(v => v.id);
  } else if (options.mode === 'interleave') {
    // A1,B1,C1,A2,B2...
    const maxLen = Math.max(...groups.map(g => g.length));
    const out = [];
    for (let i = 0; i < maxLen; i++) {
      for (const g of groups) {
        if (g[i]) out.push(g[i].id);
      }
    }
    return out;
  }
  return [];
}

/**
 * 播放合并视角序列
 * @param {Array<string>} targetUuids - 目标 UUID 数组
 * @param {Object} playOptions - 播放选项
 * @returns {Promise}
 */
function playCombinedSequence(targetUuids = [], playOptions = {}) {
  const viewIds = this.createCombinedSequence(targetUuids, playOptions);
  if (!viewIds.length) return Promise.resolve();
  return this.playViewSequence(viewIds, playOptions);
}

/**
 * 新增：根据多个目标生成“同步轨迹”帧集合（把每个目标在同一索引位置的视角取平均，得到用于单一相机的合成路径）
 * @param {Array<string>} targetUuids
 * @param {Object} options { mode: 'average', duration: number, easing: string }
 * @returns {Array<Object>} frames - [{ position: THREE.Vector3, target: THREE.Vector3, duration, easing }]
 */
function createSynchronizedPath(targetUuids = [], options = { mode: 'average' }) {
  const targets = Array.isArray(targetUuids) ? targetUuids : [targetUuids];
  const groups = targets.map(t => this.getViewPoints(t)); // getViewPoints 返回世界坐标副本
  const maxLen = Math.max(...groups.map(g => g.length), 0);
  const frames = [];
  for (let i = 0; i < maxLen; i++) {
    const posAcc = new THREE.Vector3(0, 0, 0);
    const tarAcc = new THREE.Vector3(0, 0, 0);
    let countPos = 0;
    let maxDuration = 0;
    let easing = options.easing || 'Linear.None';
    for (let g of groups) {
      const v = g[i] || g[g.length - 1]; // 若缺少索引则使用最后一个视角作为填充
      if (v) {
        posAcc.add(v.position);
        tarAcc.add(v.target);
        countPos++;
        if (v.duration && v.duration > maxDuration) maxDuration = v.duration;
        if (v.easing) easing = v.easing; // 若存在则以最后一个非空 easing 为准
      }
    }
    if (countPos === 0) continue;
    const avgPos = posAcc.multiplyScalar(1 / countPos);
    const avgTar = tarAcc.multiplyScalar(1 / countPos);
    frames.push({ position: avgPos, target: avgTar, duration: options.duration || maxDuration || 800, easing });
  }
  return frames;
}

/**
 * 新增：播放同步轨迹（把多个目标的同索引视角合并为单一路径）
 * @param {Array<string>} targetUuids
 * @param {Object} playOptions { loop, interval }
 * @returns {Promise}
 */
function playSynchronizedPath(targetUuids = [], playOptions = {}) {
  const self = this;
  return new Promise(resolve => {
    const { loop = false, interval = 500 } = playOptions;
    const frames = this.createSynchronizedPath(targetUuids, playOptions);
    if (!frames.length) {
      resolve();
      return;
    }

    // 控制播放标志
    if (!this.isPlayingSynchronized) this.isPlayingSynchronized = {};
    const key = JSON.stringify(targetUuids);
    this.isPlayingSynchronized[key] = true;

    let index = 0;
    const playStep = () => {
      if (!this.isPlayingSynchronized[key]) {
        resolve();
        return;
      }
      if (index >= frames.length) {
        if (loop) {
          index = 0;
        } else {
          this.isPlayingSynchronized[key] = false;
          resolve();
          return;
        }
      }

      const frame = frames[index];
      // 停止已有 tween
      if (self.viewTween) self.viewTween.stop();

      const startPos = self.camera.position.clone();
      const startTarget = self.controls.target.clone();
      const endPos = frame.position.clone();
      const endTarget = frame.target.clone();
      const tdata = { t: 0 };
      const easingFunc = getEasingFunction(frame.easing || 'Linear.None');

      self.viewTween = new TWEEN.Tween(tdata)
        .to({ t: 1 }, frame.duration || 800)
        .easing(easingFunc)
        .onUpdate(function () {
          const t = tdata.t;
          self.camera.position.lerpVectors(startPos, endPos, t);
          self.controls.target.lerpVectors(startTarget, endTarget, t);
          self.controls.update();
        })
        .onComplete(function () {
          self.camera.position.copy(endPos);
          self.controls.target.copy(endTarget);
          self.controls.update();
          index++;
          setTimeout(playStep, interval);
        })
        .start();
    };

    playStep();
  });
}

/**
 * 新增：停止指定的同步轨迹播放
 */
function stopSynchronizedPath(targetUuids = []) {
  const key = JSON.stringify(targetUuids);
  if (this.isPlayingSynchronized && this.isPlayingSynchronized[key]) {
    this.isPlayingSynchronized[key] = false;
  }
  if (this.viewTween) {
    this.viewTween.stop();
    this.viewTween = null;
  }
}

export default {
  onStartModelAnimation,
  onSetModelAnimation,
  animationFrameFun,
  onClearAnimation,
  onSetRotation,
  onSetRotationType,
  rotationAnimationFun,
  getModelAnimationList,
  getManyModelAnimationList,
  // 多视角相关新接口
  initViewPoints,
  addViewPoint,
  removeViewPoint,
  updateViewPoint,
  getViewPoints,
  playViewPoint,
  playViewSequence,
  stopViewSequence,
  // 停止所有序列播放（跨目标）
  stopAllSequences,
  getEasingFunction,
  getCurrentViewIndex,
  nextViewPoint,
  prevViewPoint,
  createCombinedSequence,
  playCombinedSequence,
  // 同步轨迹播放 API
  createSynchronizedPath,
  playSynchronizedPath,
  stopSynchronizedPath
};

// /**
//  * 模型动画模块方法集合
//  * @module AnimationModules
//  */
//
// import * as THREE from "three";
// import TWEEN from "@tweenjs/tween.js";
//
// /**
//  * 开始执行动画
//  * @param {Object} config - 动画配置参数
//  */
// function onStartModelAnimation(config) {
//   this.onSetModelAnimation(config);
//   cancelAnimationFrame(this.animationFrame);
//   this.animationFrameFun();
// }
//
// /**
//  * 设置模型动画参数
//  * @param {Object} params - 动画参数
//  * @param {string} params.animationName - 动画名称
//  * @param {string} params.loop - 循环类型
//  * @param {number} params.timeScale - 动画速度
//  * @param {number} params.weight - 动画权重
//  */
// function onSetModelAnimation({ animationName, loop, timeScale, weight }) {
//   this.animationMixer = new THREE.AnimationMixer(this.model);
//   const clip = THREE.AnimationClip.findByName(this.modelAnimation, animationName);
//   if (clip) {
//     this.animateClipAction = this.animationMixer.clipAction(clip);
//     this.animateClipAction.setEffectiveTimeScale(timeScale);
//     this.animateClipAction.setEffectiveWeight(weight);
//     this.animateClipAction.setLoop(this.loopMap[loop]);
//     this.animateClipAction.play();
//   }
// }
//
// /**
//  * 动画帧更新
//  */
// function animationFrameFun() {
//   this.animationFrame = requestAnimationFrame(() => this.animationFrameFun());
//   if (this.animationMixer) {
//     this.animationMixer.update(this.animationClock.getDelta());
//   }
// }
//
// /**
//  * 清除所有动画
//  */
// function onClearAnimation() {
//   if (!this.animateClipAction) return;
//   this.animationMixer.stopAllAction();
//   this.animationMixer.update(0);
//   cancelAnimationFrame(this.animationFrame);
// }
//
// /**
//  * 设置模型旋转动画
//  * @param {Object} config - 旋转配置
//  * @param {boolean} config.rotationVisible - 是否显示旋转
//  * @param {string} config.rotationType - 旋转轴类型
//  * @param {number} config.rotationSpeed - 旋转速度
//  */
// function onSetRotation(config) {
//   const { rotationVisible, rotationType, rotationSpeed } = config;
//   if (rotationVisible) {
//     cancelAnimationFrame(this.rotationAnimationFrame);
//     this.rotationAnimationFun(rotationType, rotationSpeed);
//   } else {
//     cancelAnimationFrame(this.rotationAnimationFrame);
//     this.model.rotation.set(0, 0, 0);
//   }
// }
//
// /**
//  * 设置旋转轴和速度
//  * @param {Object} config - 旋转配置
//  * @param {string} config.rotationType - 旋转轴类型
//  * @param {number} config.rotationSpeed - 旋转速度
//  */
// function onSetRotationType(config) {
//   const { rotationType, rotationSpeed } = config;
//   this.model.rotation.set(0, 0, 0);
//   cancelAnimationFrame(this.rotationAnimationFrame);
//   this.rotationAnimationFun(rotationType, rotationSpeed);
// }
//
// /**
//  * 旋转动画帧更新
//  * @param {string} rotationType - 旋转轴类型
//  * @param {number} rotationSpeed - 旋转速度
//  */
// function rotationAnimationFun(rotationType, rotationSpeed) {
//   this.rotationAnimationFrame = requestAnimationFrame(() => this.rotationAnimationFun(rotationType, rotationSpeed));
//   this.model.rotation[rotationType] += rotationSpeed / 50;
// }
//
// /**
//  * 获取当前模型动画列表
//  * @param {Object} result - 包含动画数据的对象
//  */
// function getModelAnimationList(result) {
//   this.modelAnimation = result.animations || [];
// }
//
// /**
//  * 获取多模型动画列表
//  * @param {Array} animations - 动画数组
//  */
// function getManyModelAnimationList(animations) {
//   if (Array.isArray(animations)) {
//     this.modelAnimation = this.modelAnimation.concat(animations);
//   }
// }
//
// /**
//  * 多视角数据结构
//  * @typedef {Object} ViewPoint
//  * @property {string} id - 视角唯一标识
//  * @property {string} name - 视角名称
//  * @property {THREE.Vector3} position - 相机位置
//  * @property {THREE.Vector3} target - 相机看向目标
//  * @property {number} duration - 过渡时长(毫秒)
//  * @property {string} easing - 缓动函数名称
//  */
//
// /**
//  * 初始化多视角系统
//  */
// function initViewPoints() {
//   if (!this.viewPointsByTarget) {
//     // 按目标对象 uuid 分类存放视角
//     this.viewPointsByTarget = {}; // { targetUuid: [viewPoint] }
//     this.currentViewIndexByTarget = {}; // { targetUuid: index }
//     this.isPlayingViewSequenceByTarget = {}; // { targetUuid: bool }
//     this.viewTween = null;
//   }
// }
//
// /**
//  * 内部工具：获取目标 key（null 用 '__main__'）
//  */
// function getTargetKey(targetUuid) {
//   return targetUuid || "__main__";
// }
//
// /**
//  * 添加视角（绑定到指定目标）
//  * @param {string} name
//  * @param {string|null} targetUuid - 目标对象 UUID，null 表示绑定到当前主模型
//  * @param {boolean} local - 是否以相对于目标的局部坐标保存（默认 true）
//  */
// function addViewPoint(name = `视角${Date.now()}`, targetUuid = null, local = true) {
//   this.initViewPoints();
//   const key = getTargetKey(targetUuid);
//   if (!this.viewPointsByTarget[key]) this.viewPointsByTarget[key] = [];
//
//   // try find target object in scene if targetUuid provided
//   let targetObj = null;
//   if (targetUuid && this.scene) {
//     targetObj = this.scene.getObjectByProperty("uuid", targetUuid);
//   }
//
//   // 如果保存为局部坐标且有目标对象，则把摄像机位置转换为目标局部坐标
//   let pos = this.camera.position.clone();
//   let tar = this.controls.target.clone();
//   let isLocal = false;
//   if (local && targetObj) {
//     // world -> local
//     const localPos = targetObj.worldToLocal(pos.clone());
//     const localTar = targetObj.worldToLocal(tar.clone());
//     pos = localPos;
//     tar = localTar;
//     isLocal = true;
//   }
//
//   const viewPoint = {
//     id: `view_${Date.now()}`,
//     name,
//     position: pos.clone(),
//     target: tar.clone(),
//     duration: 1000,
//     easing: "Linear.None",
//     targetUuid: targetUuid || null,
//     isLocal
//   };
//
//   this.viewPointsByTarget[key].push(viewPoint);
//   return viewPoint;
// }
//
// /**
//  * 删除视角
//  */
// function removeViewPoint(viewId) {
//   this.initViewPoints();
//   for (const key of Object.keys(this.viewPointsByTarget)) {
//     const arr = this.viewPointsByTarget[key];
//     const idx = arr.findIndex(v => v.id === viewId);
//     if (idx > -1) {
//       arr.splice(idx, 1);
//       // 更新 current index
//       if (this.currentViewIndexByTarget[key] >= arr.length) {
//         this.currentViewIndexByTarget[key] = arr.length - 1;
//       }
//       return true;
//     }
//   }
//   return false;
// }
//
// /**
//  * 更新视角（updates 中传入的位置/目标为世界坐标，内部会根据 isLocal 转换）
//  */
// function updateViewPoint(viewId, updates) {
//   this.initViewPoints();
//   for (const key of Object.keys(this.viewPointsByTarget)) {
//     const viewPoint = this.viewPointsByTarget[key].find(v => v.id === viewId);
//     if (!viewPoint) continue;
//
//     // 将传入的世界坐标转换为存储坐标（如果 viewPoint.isLocal 且有目标对象）
//     if (updates.position && viewPoint.isLocal && viewPoint.targetUuid) {
//       const targetObj = this.scene.getObjectByProperty("uuid", viewPoint.targetUuid);
//       if (targetObj) {
//         const localPos = targetObj.worldToLocal(updates.position.clone());
//         viewPoint.position.copy(localPos);
//       } else {
//         viewPoint.position.copy(updates.position);
//       }
//     } else if (updates.position) {
//       viewPoint.position.copy(updates.position);
//     }
//
//     if (updates.target && viewPoint.isLocal && viewPoint.targetUuid) {
//       const targetObj = this.scene.getObjectByProperty("uuid", viewPoint.targetUuid);
//       if (targetObj) {
//         const localTar = targetObj.worldToLocal(updates.target.clone());
//         viewPoint.target.copy(localTar);
//       } else {
//         viewPoint.target.copy(updates.target);
//       }
//     } else if (updates.target) {
//       viewPoint.target.copy(updates.target);
//     }
//
//     if (typeof updates.duration === "number") viewPoint.duration = updates.duration;
//     if (typeof updates.easing === "string") viewPoint.easing = updates.easing;
//     if (typeof updates.name === "string") viewPoint.name = updates.name;
//     return true;
//   }
//   return false;
// }
//
// /**
//  * 获取视角（返回世界坐标形式，便于 UI 展示）
//  * @param {string|null} targetUuid
//  * @returns {Array} viewPoints（position/target 均为世界坐标副本）
//  */
// function getViewPoints(targetUuid = null) {
//   this.initViewPoints();
//   const key = getTargetKey(targetUuid);
//   const arr = this.viewPointsByTarget[key] || [];
//   // 返回深拷贝并把局部坐标转换为世界坐标（用于 UI）
//   return arr.map(v => {
//     const copy = Object.assign({}, v, {
//       position: v.position.clone(),
//       target: v.target.clone()
//     });
//     if (v.isLocal && v.targetUuid && this.scene) {
//       const targetObj = this.scene.getObjectByProperty("uuid", v.targetUuid);
//       if (targetObj) {
//         copy.position = targetObj.localToWorld(v.position.clone());
//         copy.target = targetObj.localToWorld(v.target.clone());
//       }
//     }
//     return copy;
//   });
// }
//
// /**
//  * 播放单个视角（支持局部坐标）
//  */
// function playViewPoint(viewId, animate = true) {
//   const self = this;
//   return new Promise(resolve => {
//     self.initViewPoints();
//     // 查找视角
//     let viewPoint = null;
//     for (const key of Object.keys(self.viewPointsByTarget)) {
//       const found = (self.viewPointsByTarget[key] || []).find(v => v.id === viewId);
//       if (found) {
//         viewPoint = found;
//         break;
//       }
//     }
//     if (!viewPoint) {
//       resolve();
//       return;
//     }
//
//     // 计算目标世界坐标（如果是局部坐标）
//     let endPos = viewPoint.position.clone();
//     let endTarget = viewPoint.target.clone();
//     if (viewPoint.isLocal && viewPoint.targetUuid && self.scene) {
//       const targetObj = self.scene.getObjectByProperty("uuid", viewPoint.targetUuid);
//       if (targetObj) {
//         endPos = targetObj.localToWorld(viewPoint.position.clone());
//         endTarget = targetObj.localToWorld(viewPoint.target.clone());
//       } else {
//         // fallback: treat stored coords as world
//         endPos = viewPoint.position.clone();
//         endTarget = viewPoint.target.clone();
//       }
//     }
//
//     // 更新 current index for its target
//     const key = getTargetKey(viewPoint.targetUuid);
//     const idx = (self.viewPointsByTarget[key] || []).findIndex(v => v.id === viewId);
//     self.currentViewIndexByTarget[key] = idx;
//
//     if (!animate) {
//       self.camera.position.copy(endPos);
//       self.controls.target.copy(endTarget);
//       self.controls.update();
//       resolve();
//       return;
//     }
//
//     if (self.viewTween) self.viewTween.stop();
//
//     const startPos = self.camera.position.clone();
//     const startTarget = self.controls.target.clone();
//     const duration = viewPoint.duration || 1000;
//     const tweenData = { t: 0 };
//
//     const easingFunc = getEasingFunction(viewPoint.easing);
//
//     self.viewTween = new TWEEN.Tween(tweenData)
//       .to({ t: 1 }, duration)
//       .easing(easingFunc)
//       .onUpdate(function () {
//         const t = tweenData.t;
//         self.camera.position.lerpVectors(startPos, endPos, t);
//         self.controls.target.lerpVectors(startTarget, endTarget, t);
//         self.controls.update();
//       })
//       .onComplete(function () {
//         self.camera.position.copy(endPos);
//         self.controls.target.copy(endTarget);
//         self.controls.update();
//         resolve();
//       })
//       .start();
//   });
// }
//
// /**
//  * 播放视角序列（可以传 targetUuid，仅播放该目标下视角）
//  * @param {Array<string>|null} viewIds
//  * @param {Object} options { loop, interval, targetUuid }
//  */
// function playViewSequence(viewIds = null, options = {}) {
//   const self = this;
//   return new Promise((resolve) => {
//     self.initViewPoints();
//     const { loop = false, interval = 500, targetUuid = null } = options;
//     let sequence = [];
//
//     if (Array.isArray(viewIds) && viewIds.length) {
//       // 从全局中挑出对应 id 的视角
//       for (const key of Object.keys(self.viewPointsByTarget)) {
//         sequence = sequence.concat(self.viewPointsByTarget[key].filter(v => viewIds.includes(v.id)));
//       }
//     } else {
//       const key = getTargetKey(targetUuid);
//       sequence = (self.viewPointsByTarget[key] || []).slice();
//     }
//
//     if (sequence.length === 0) {
//       resolve();
//       return;
//     }
//
//     self.isPlayingViewSequenceByTarget[getTargetKey(targetUuid)] = true;
//
//     const playStep = (index) => {
//       if (!self.isPlayingViewSequenceByTarget[getTargetKey(targetUuid)]) {
//         resolve();
//         return;
//       }
//       if (index >= sequence.length) {
//         if (loop) {
//           playStep(0);
//         } else {
//           self.isPlayingViewSequenceByTarget[getTargetKey(targetUuid)] = false;
//           resolve();
//         }
//         return;
//       }
//       const view = sequence[index];
//       self.playViewPoint(view.id, true).then(() => {
//         setTimeout(() => playStep(index + 1), interval);
//       });
//     };
//     playStep(0);
//   });
// }
//
// /**
//  * 停止序列播放（可传 targetUuid）
//  */
// function stopViewSequence(targetUuid = null) {
//   this.isPlayingViewSequenceByTarget[getTargetKey(targetUuid)] = false;
//   if (this.viewTween) {
//     this.viewTween.stop();
//     this.viewTween = null;
//   }
// }
//
// /**
//  * 停止所有正在播放的视角序列（跨目标）
//  */
// function stopAllSequences() {
//   if (this.isPlayingViewSequenceByTarget) {
//     Object.keys(this.isPlayingViewSequenceByTarget).forEach(k => {
//       this.isPlayingViewSequenceByTarget[k] = false;
//     });
//   }
//   if (this.viewTween) {
//     this.viewTween.stop();
//     this.viewTween = null;
//   }
// }
//
// /**
//  * 获取缓动函数对象路径
//  * @param {string} easingName - 缓动函数名称
//  * @returns {Function}
//  */
// function getEasingFunction(easingName = "Linear.None") {
//   const parts = easingName.split(".");
//   if (parts.length === 2) {
//     const [type, name] = parts;
//     return TWEEN.Easing[type] && TWEEN.Easing[type][name]
//       ? TWEEN.Easing[type][name]
//       : TWEEN.Easing.Linear.None;
//   }
//   return TWEEN.Easing.Linear.None;
// }
//
// /**
//  * 获取当前目标的视角索引
//  * @param {string|null} targetUuid
//  * @returns {number}
//  */
// function getCurrentViewIndex(targetUuid = null) {
//   this.initViewPoints();
//   const key = getTargetKey(targetUuid);
//   return typeof this.currentViewIndexByTarget[key] === 'number' ? this.currentViewIndexByTarget[key] : -1;
// }
//
// /**
//  * 下一个视角（可指定目标）
//  */
// function nextViewPoint(targetUuid = null) {
//   this.initViewPoints();
//   const key = getTargetKey(targetUuid);
//   const arr = this.viewPointsByTarget[key] || [];
//   if (arr.length === 0) return;
//   const cur = typeof this.currentViewIndexByTarget[key] === 'number' ? this.currentViewIndexByTarget[key] : -1;
//   const next = (cur + 1) % arr.length;
//   this.currentViewIndexByTarget[key] = next;
//   this.playViewPoint(arr[next].id, true);
// }
//
// /**
//  * 上一个视角（可指定目标）
//  */
// function prevViewPoint(targetUuid = null) {
//   this.initViewPoints();
//   const key = getTargetKey(targetUuid);
//   const arr = this.viewPointsByTarget[key] || [];
//   if (arr.length === 0) return;
//   const cur = typeof this.currentViewIndexByTarget[key] === 'number' ? this.currentViewIndexByTarget[key] : 0;
//   const prev = (cur - 1 + arr.length) % arr.length;
//   this.currentViewIndexByTarget[key] = prev;
//   this.playViewPoint(arr[prev].id, true);
// }
//
// /**
//  * 新增：根据多个 targetUuid 生成合并序列
//  * @param {Array<string>} targetUuids - 目标 UUID 数组
//  * @param {Object} options - 选项 { mode: 'sequential' | 'interleave' }
//  * @returns {Array<string>} viewIds - 合并后的视角 ID 序列
//  */
// function createCombinedSequence(targetUuids = [], options = { mode: 'sequential' }) {
//   const targets = Array.isArray(targetUuids) ? targetUuids : [targetUuids];
//   const groups = targets.map(t => (this.viewPointsByTarget[getTargetKey(t)] || []).slice());
//   if (options.mode === 'sequential') {
//     // A then B then C...
//     return groups.flat().map(v => v.id);
//   } else if (options.mode === 'interleave') {
//     // A1,B1,C1,A2,B2...
//     const maxLen = Math.max(...groups.map(g => g.length));
//     const out = [];
//     for (let i = 0; i < maxLen; i++) {
//       for (const g of groups) {
//         if (g[i]) out.push(g[i].id);
//       }
//     }
//     return out;
//   }
//   return [];
// }
//
// /**
//  * 播放合并视角序列
//  * @param {Array<string>} targetUuids - 目标 UUID 数组
//  * @param {Object} playOptions - 播放选项
//  * @returns {Promise}
//  */
// function playCombinedSequence(targetUuids = [], playOptions = {}) {
//   const viewIds = this.createCombinedSequence(targetUuids, playOptions);
//   if (!viewIds.length) return Promise.resolve();
//   return this.playViewSequence(viewIds, playOptions);
// }
//
// /**
//  * 新增：根据多个目标生成"同步轨迹"帧集合（把每个目标在同一索引位置的视角取平均，得到用于单一相机的合成路径）
//  * @param {Array<string>} targetUuids
//  * @param {Object} options { mode: 'average', duration: number, easing: string }
//  * @returns {Array<Object>} frames - [{ position: THREE.Vector3, target: THREE.Vector3, duration, easing }]
//  */
// function createSynchronizedPath(targetUuids = [], options = { mode: 'average' }) {
//   const targets = Array.isArray(targetUuids) ? targetUuids : [targetUuids];
//   const groups = targets.map(t => this.getViewPoints(t)); // getViewPoints 返回世界坐标副本
//   const maxLen = Math.max(...groups.map(g => g.length), 0);
//   const frames = [];
//   for (let i = 0; i < maxLen; i++) {
//     const posAcc = new THREE.Vector3(0, 0, 0);
//     const tarAcc = new THREE.Vector3(0, 0, 0);
//     let countPos = 0;
//     let maxDuration = 0;
//     let easing = options.easing || 'Linear.None';
//     for (let g of groups) {
//       const v = g[i] || g[g.length - 1]; // 若缺少索引则使用最后一个视角作为填充
//       if (v) {
//         posAcc.add(v.position);
//         tarAcc.add(v.target);
//         countPos++;
//         if (v.duration && v.duration > maxDuration) maxDuration = v.duration;
//         if (v.easing) easing = v.easing; // 若存在则以最后一个非空 easing 为准
//       }
//     }
//     if (countPos === 0) continue;
//     const avgPos = posAcc.multiplyScalar(1 / countPos);
//     const avgTar = tarAcc.multiplyScalar(1 / countPos);
//     frames.push({ position: avgPos, target: avgTar, duration: options.duration || maxDuration || 800, easing });
//   }
//   return frames;
// }
//
// /**
//  * 新增：播放同步轨迹（把多个目标的同索引视角合并为单一路径）
//  * @param {Array<string>} targetUuids
//  * @param {Object} playOptions { loop, interval }
//  * @returns {Promise}
//  */
// function playSynchronizedPath(targetUuids = [], playOptions = {}) {
//   const self = this;
//   return new Promise(resolve => {
//     const { loop = false, interval = 500 } = playOptions;
//     const frames = this.createSynchronizedPath(targetUuids, playOptions);
//     if (!frames.length) {
//       resolve();
//       return;
//     }
//
//     // 控制播放标志
//     if (!this.isPlayingSynchronized) this.isPlayingSynchronized = {};
//     const key = JSON.stringify(targetUuids);
//     this.isPlayingSynchronized[key] = true;
//
//     let index = 0;
//     const playStep = () => {
//       if (!this.isPlayingSynchronized[key]) {
//         resolve();
//         return;
//       }
//       if (index >= frames.length) {
//         if (loop) {
//           index = 0;
//         } else {
//           this.isPlayingSynchronized[key] = false;
//           resolve();
//           return;
//         }
//       }
//
//       const frame = frames[index];
//       // 停止已有 tween
//       if (self.viewTween) self.viewTween.stop();
//
//       const startPos = self.camera.position.clone();
//       const startTarget = self.controls.target.clone();
//       const endPos = frame.position.clone();
//       const endTarget = frame.target.clone();
//       const tdata = { t: 0 };
//       const easingFunc = getEasingFunction(frame.easing || 'Linear.None');
//
//       self.viewTween = new TWEEN.Tween(tdata)
//         .to({ t: 1 }, frame.duration || 800)
//         .easing(easingFunc)
//         .onUpdate(function () {
//           const t = tdata.t;
//           self.camera.position.lerpVectors(startPos, endPos, t);
//           self.controls.target.lerpVectors(startTarget, endTarget, t);
//           self.controls.update();
//         })
//         .onComplete(function () {
//           self.camera.position.copy(endPos);
//           self.controls.target.copy(endTarget);
//           self.controls.update();
//           index++;
//           setTimeout(playStep, interval);
//         })
//         .start();
//     };
//
//     playStep();
//   });
// }
//
// /**
//  * 新增：停止指定的同步轨迹播放
//  */
// function stopSynchronizedPath(targetUuids = []) {
//   const key = JSON.stringify(targetUuids);
//   if (this.isPlayingSynchronized && this.isPlayingSynchronized[key]) {
//     this.isPlayingSynchronized[key] = false;
//   }
//   if (this.viewTween) {
//     this.viewTween.stop();
//     this.viewTween = null;
//   }
// }
//
// /***************************************************************
//  * 多相机系统 - 真正实现同步多视角显示
//  ***************************************************************/
//
// /**
//  * 创建多相机视口系统
//  * @param {Array} viewports - 视口配置数组
//  * @param {Object} renderer - 主渲染器
//  */
// function initMultiViewportSystem(viewports, renderer) {
//   // 清理现有系统
//   this.destroyMultiViewportSystem();
//
//   this.multiViewportSystem = {
//     enabled: false,
//     viewports: [],
//     cameras: [],
//     renderers: [],
//     containers: [],
//     labels: []
//   };
//
//   if (!viewports || viewports.length === 0) {
//     console.warn("initMultiViewportSystem: 视口配置为空");
//     return;
//   }
//
//   console.log(`初始化多视角系统，共 ${viewports.length} 个视口`);
//
//   viewports.forEach((viewportConfig, index) => {
//     const {
//       width = 320,
//       height = 240,
//       left = 20,
//       top = 20,
//       position,
//       target,
//       fov = 50,
//       label = `相机 ${index + 1}`,
//       targetUuid = null
//     } = viewportConfig;
//
//     // 创建相机
//     const camera = new THREE.PerspectiveCamera(
//       fov,
//       width / height,
//       0.1,
//       10000
//     );
//
//     // 设置相机初始位置
//     if (position) {
//       camera.position.copy(position);
//     } else {
//       // 默认位置：基于主相机位置稍作偏移
//       const offsetX = (index % 2) * 5 - 2.5;
//       const offsetY = Math.floor(index / 2) * 3 - 1.5;
//       camera.position.copy(this.camera.position).add(new THREE.Vector3(offsetX, offsetY, 0));
//     }
//
//     if (target) {
//       camera.lookAt(target);
//     } else {
//       camera.lookAt(this.controls.target);
//     }
//
//     // 保存目标UUID（用于后续跟踪）
//     camera.userData = { targetUuid, label };
//
//     // 创建独立的渲染器
//     const viewportRenderer = new THREE.WebGLRenderer({
//       antialias: true,
//       alpha: true,
//       preserveDrawingBuffer: true
//     });
//     viewportRenderer.setSize(width, height);
//     viewportRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//     viewportRenderer.outputColorSpace = THREE.SRGBColorSpace;
//     viewportRenderer.toneMapping = THREE.ReinhardToneMapping;
//     viewportRenderer.toneMappingExposure = 1.5;
//
//     // 创建容器
//     const container = document.createElement('div');
//     container.className = 'multi-viewport-container';
//     container.style.position = 'absolute';
//     container.style.width = `${width}px`;
//     container.style.height = `${height}px`;
//     container.style.left = `${left}px`;
//     container.style.top = `${top}px`;
//     container.style.border = '2px solid rgba(255, 255, 255, 0.6)';
//     container.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
//     container.style.borderRadius = '4px';
//     container.style.overflow = 'hidden';
//     container.style.zIndex = '1000';
//     container.style.backgroundColor = '#1a1a1a';
//     container.appendChild(viewportRenderer.domElement);
//
//     // 创建标签容器
//     const labelContainer = document.createElement('div');
//     labelContainer.className = 'viewport-label';
//     labelContainer.style.position = 'absolute';
//     labelContainer.style.top = '8px';
//     labelContainer.style.left = '8px';
//     labelContainer.style.right = '8px';
//     labelContainer.style.color = 'white';
//     labelContainer.style.fontSize = '12px';
//     labelContainer.style.fontWeight = 'bold';
//     labelContainer.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
//     labelContainer.style.padding = '4px 8px';
//     labelContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
//     labelContainer.style.borderRadius = '3px';
//     labelContainer.textContent = label;
//     container.appendChild(labelContainer);
//
//     // 添加到DOM
//     if (this.container && this.container.appendChild) {
//       this.container.appendChild(container);
//     } else {
//       console.error('无法找到容器元素:', this.container);
//     }
//
//     this.multiViewportSystem.cameras.push(camera);
//     this.multiViewportSystem.renderers.push(viewportRenderer);
//     this.multiViewportSystem.containers.push(container);
//     this.multiViewportSystem.labels.push(labelContainer);
//     this.multiViewportSystem.viewports.push(viewportConfig);
//   });
// }
//
// /**
//  * 启用/禁用多视角系统
//  * @param {boolean} enabled - 是否启用
//  */
// function setMultiViewportEnabled(enabled) {
//   if (!this.multiViewportSystem) {
//     console.warn('多视角系统未初始化');
//     return;
//   }
//
//   this.multiViewportSystem.enabled = enabled;
//
//   // 显示/隐藏所有容器
//   this.multiViewportSystem.containers.forEach(container => {
//     container.style.display = enabled ? 'block' : 'none';
//   });
//
//   // 调整主渲染器透明度以突出多视角
//   if (this.renderer && this.renderer.domElement) {
//     this.renderer.domElement.style.opacity = enabled ? '0.4' : '1';
//   }
//
//   console.log(`多视角系统 ${enabled ? '启用' : '禁用'}`);
// }
//
// /**
//  * 更新多视角渲染
//  */
// function updateMultiViewports() {
//   if (!this.multiViewportSystem || !this.multiViewportSystem.enabled || !this.scene) {
//     return;
//   }
//
//   // 为每个视口渲染
//   this.multiViewportSystem.viewports.forEach((viewport, index) => {
//     const camera = this.multiViewportSystem.cameras[index];
//     const renderer = this.multiViewportSystem.renderers[index];
//
//     if (!camera || !renderer) return;
//
//     // 更新相机位置（如果绑定到目标）
//     this.updateCameraForViewport(camera, viewport);
//
//     // 渲染该视口
//     try {
//       renderer.render(this.scene, camera);
//     } catch (error) {
//       console.error(`渲染视口 ${index} 时出错:`, error);
//     }
//   });
// }
//
// /**
//  * 更新单个视口的相机位置
//  * @param {THREE.Camera} camera - 相机对象
//  * @param {Object} viewportConfig - 视口配置
//  */
// function updateCameraForViewport(camera, viewportConfig) {
//   const { targetUuid, offset, lookAtOffset, position, target, followMode = 'fixed' } = viewportConfig;
//
//   // 如果指定了固定位置
//   if (position && target && followMode === 'fixed') {
//     camera.position.copy(position);
//     camera.lookAt(target);
//     return;
//   }
//
//   // 如果绑定到目标对象
//   if (targetUuid && this.scene) {
//     const targetObj = this.scene.getObjectByProperty('uuid', targetUuid);
//     if (targetObj) {
//       // 计算世界位置
//       const worldOffset = offset ? new THREE.Vector3(offset.x, offset.y, offset.z) : new THREE.Vector3(0, 2, 5);
//       const worldLookAtOffset = lookAtOffset ? new THREE.Vector3(lookAtOffset.x, lookAtOffset.y, lookAtOffset.z) : new THREE.Vector3(0, 0, 0);
//
//       // 获取目标对象的包围盒
//       const bbox = new THREE.Box3().setFromObject(targetObj);
//       const center = new THREE.Vector3();
//       bbox.getCenter(center);
//
//       // 计算相机位置
//       const worldPos = center.clone().add(worldOffset);
//
//       // 平滑过渡
//       camera.position.lerp(worldPos, 0.1);
//
//       // 计算看向位置
//       const lookAtPos = center.clone().add(worldLookAtOffset);
//       camera.lookAt(lookAtPos);
//
//       return;
//     }
//   }
//
//   // 默认：跟随主相机，但有偏移
//   if (followMode === 'follow') {
//     const offsetVec = offset ? new THREE.Vector3(offset.x, offset.y, offset.z) : new THREE.Vector3(2, 2, 2);
//     const targetPos = this.camera.position.clone().add(offsetVec);
//     camera.position.lerp(targetPos, 0.1);
//     camera.lookAt(this.controls.target);
//   }
// }
//
// /**
//  * 根据视角创建多相机视口
//  * @param {Array} viewIds - 视角ID数组
//  * @param {Object} layout - 布局配置
//  */
// function createMultiCameraFromViews(viewIds, layout = {
//   cols: 2,
//   viewportWidth: 320,
//   viewportHeight: 240,
//   margin: 20
// }) {
//   // 获取所有视角
//   const allViews = [];
//   for (const key of Object.keys(this.viewPointsByTarget || {})) {
//     allViews.push(...(this.viewPointsByTarget[key] || []));
//   }
//
//   const views = viewIds
//     .map(id => allViews.find(v => v.id === id))
//     .filter(v => v);
//
//   if (views.length === 0) {
//     console.warn('未找到指定的视角');
//     return;
//   }
//
//   const { cols, viewportWidth, viewportHeight, margin } = layout;
//   const viewports = [];
//
//   views.forEach((view, index) => {
//     const row = Math.floor(index / cols);
//     const col = index % cols;
//
//     viewports.push({
//       id: `viewport_${view.id}`,
//       label: view.name,
//       width: viewportWidth,
//       height: viewportHeight,
//       left: col * (viewportWidth + margin),
//       top: row * (viewportHeight + margin),
//       position: view.position.clone(),
//       target: view.target.clone(),
//       targetUuid: view.targetUuid,
//       fov: 60,
//       followMode: 'fixed'
//     });
//   });
//
//   this.initMultiViewportSystem(viewports, this.renderer);
//   this.setMultiViewportEnabled(true);
// }
//
// /**
//  * 实时同步多相机到不同目标
//  * @param {Array} configs - 每个相机的同步配置
//  */
// function syncMultiCameras(configs) {
//   if (!this.multiViewportSystem || !this.multiViewportSystem.enabled) return;
//
//   configs.forEach((config, index) => {
//     if (index >= this.multiViewportSystem.cameras.length) return;
//
//     const camera = this.multiViewportSystem.cameras[index];
//     const {
//       targetUuid,
//       offset = new THREE.Vector3(0, 2, 5),
//       lookAtOffset = new THREE.Vector3(0, 0, 0),
//       smoothFactor = 0.1
//     } = config;
//
//     // 更新视口配置
//     if (this.multiViewportSystem.viewports[index]) {
//       this.multiViewportSystem.viewports[index].targetUuid = targetUuid;
//       this.multiViewportSystem.viewports[index].offset = offset;
//       this.multiViewportSystem.viewports[index].lookAtOffset = lookAtOffset;
//     }
//   });
// }
//
// /**
//  * 销毁多视角系统
//  */
// function destroyMultiViewportSystem() {
//   if (!this.multiViewportSystem) return;
//
//   console.log('销毁多视角系统');
//
//   // 移除所有容器
//   this.multiViewportSystem.containers.forEach(container => {
//     if (container && container.parentNode) {
//       container.parentNode.removeChild(container);
//     }
//   });
//
//   // 释放所有渲染器资源
//   this.multiViewportSystem.renderers.forEach(renderer => {
//     if (renderer && renderer.dispose) {
//       renderer.dispose();
//       renderer.forceContextLoss();
//     }
//   });
//
//   // 重置主渲染器透明度
//   if (this.renderer && this.renderer.domElement) {
//     this.renderer.domElement.style.opacity = '1';
//   }
//
//   this.multiViewportSystem = null;
// }
//
// /**
//  * 获取多视角系统的状态
//  */
// function getMultiViewportStatus() {
//   if (!this.multiViewportSystem) {
//     return {
//       enabled: false,
//       viewportCount: 0,
//       cameras: []
//     };
//   }
//
//   return {
//     enabled: this.multiViewportSystem.enabled,
//     viewportCount: this.multiViewportSystem.cameras.length,
//     cameras: this.multiViewportSystem.cameras.map((cam, index) => ({
//       index,
//       label: this.multiViewportSystem.viewports[index]?.label || `相机 ${index + 1}`,
//       position: cam.position.clone(),
//       target: this.multiViewportSystem.viewports[index]?.target?.clone(),
//       targetUuid: this.multiViewportSystem.viewports[index]?.targetUuid
//     }))
//   };
// }
//
// /**
//  * 截图多视角
//  */
// function captureMultiViewportScreenshot() {
//   if (!this.multiViewportSystem || !this.multiViewportSystem.enabled) {
//     console.warn('多视角系统未启用');
//     return null;
//   }
//
//   const screenshots = this.multiViewportSystem.renderers.map((renderer, index) => {
//     return {
//       index,
//       label: this.multiViewportSystem.viewports[index]?.label || `相机 ${index + 1}`,
//       dataURL: renderer.domElement.toDataURL('image/png')
//     };
//   });
//
//   return screenshots;
// }
//
// /**
//  * 调整多视角布局
//  * @param {Object} layout - 新布局配置
//  */
// function resizeMultiViewports(layout) {
//   if (!this.multiViewportSystem || !this.multiViewportSystem.enabled) {
//     return;
//   }
//
//   const { viewportWidth = 320, viewportHeight = 240, margin = 20, cols = 2 } = layout;
//
//   this.multiViewportSystem.viewports.forEach((viewport, index) => {
//     const row = Math.floor(index / cols);
//     const col = index % cols;
//
//     // 更新视口配置
//     viewport.width = viewportWidth;
//     viewport.height = viewportHeight;
//     viewport.left = col * (viewportWidth + margin);
//     viewport.top = row * (viewportHeight + margin);
//
//     // 更新容器样式
//     const container = this.multiViewportSystem.containers[index];
//     const renderer = this.multiViewportSystem.renderers[index];
//     const label = this.multiViewportSystem.labels[index];
//
//     if (container) {
//       container.style.width = `${viewportWidth}px`;
//       container.style.height = `${viewportHeight}px`;
//       container.style.left = `${viewport.left}px`;
//       container.style.top = `${viewport.top}px`;
//     }
//
//     if (renderer) {
//       renderer.setSize(viewportWidth, viewportHeight);
//     }
//
//     if (label && viewport.label) {
//       label.textContent = viewport.label;
//     }
//   });
// }
//
// export default {
//   // 基础动画功能
//   onStartModelAnimation,
//   onSetModelAnimation,
//   animationFrameFun,
//   onClearAnimation,
//   onSetRotation,
//   onSetRotationType,
//   rotationAnimationFun,
//   getModelAnimationList,
//   getManyModelAnimationList,
//
//   // 多视角管理
//   initViewPoints,
//   addViewPoint,
//   removeViewPoint,
//   updateViewPoint,
//   getViewPoints,
//   playViewPoint,
//   playViewSequence,
//   stopViewSequence,
//   stopAllSequences,
//   getEasingFunction,
//   getCurrentViewIndex,
//   nextViewPoint,
//   prevViewPoint,
//
//   // 合并序列功能
//   createCombinedSequence,
//   playCombinedSequence,
//
//   // 同步轨迹功能
//   createSynchronizedPath,
//   playSynchronizedPath,
//   stopSynchronizedPath,
//
//   // 多相机系统 - 真正的同步多视角
//   initMultiViewportSystem,
//   setMultiViewportEnabled,
//   updateMultiViewports,
//   createMultiCameraFromViews,
//   syncMultiCameras,
//   destroyMultiViewportSystem,
//   getMultiViewportStatus,
//   captureMultiViewportScreenshot,
//   resizeMultiViewports
// };
