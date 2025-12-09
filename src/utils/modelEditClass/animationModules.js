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
  if (!this.viewPoints) {
    this.viewPoints = []; // 视角列表
    this.currentViewIndex = -1; // 当前视角索引
    this.isPlayingViewSequence = false; // 是否正在播放视角序列
    this.viewTween = null; // 视角过渡补间动画
  }
}

/**
 * 添加视角
 * @param {string} name - 视角名称
 * @returns {Object} 新建的视角对象
 */
function addViewPoint(name = `视角${Date.now()}`) {
  this.initViewPoints();
  const viewPoint = {
    id: `view_${Date.now()}`,
    name,
    position: this.camera.position.clone(),
    target: this.controls.target.clone(),
    duration: 1000,
    easing: "linear"
  };
  this.viewPoints.push(viewPoint);
  return viewPoint;
}

/**
 * 删除视角
 * @param {string} viewId - 视角ID
 */
function removeViewPoint(viewId) {
  const index = this.viewPoints.findIndex(v => v.id === viewId);
  if (index > -1) {
    this.viewPoints.splice(index, 1);
    if (this.currentViewIndex >= this.viewPoints.length) {
      this.currentViewIndex = this.viewPoints.length - 1;
    }
  }
}

/**
 * 更新视角信息
 * @param {string} viewId - 视角ID
 * @param {Object} updates - 更新的属性
 */
function updateViewPoint(viewId, updates) {
  const viewPoint = this.viewPoints.find(v => v.id === viewId);
  if (viewPoint) {
    Object.assign(viewPoint, updates);
  }
}

/**
 * 获取所有视角
 * @returns {Array} 视角列表
 */
function getViewPoints() {
  this.initViewPoints();
  return this.viewPoints;
}

/**
 * 播放单个视角(带平滑过渡)
 * @param {string} viewId - 视角ID
 * @param {boolean} animate - 是否使用动画过渡
 * @returns {Promise}
 */
function playViewPoint(viewId, animate = true) {
  const self = this;
  return new Promise((resolve) => {
    const viewPoint = self.viewPoints.find(v => v.id === viewId);
    if (!viewPoint) {
      resolve();
      return;
    }

    self.currentViewIndex = self.viewPoints.indexOf(viewPoint);

    if (!animate) {
      self.camera.position.copy(viewPoint.position);
      self.controls.target.copy(viewPoint.target);
      self.controls.update();
      resolve();
      return;
    }

    // 使用 TWEEN 实现平滑过渡
    if (self.viewTween) {
      self.viewTween.stop();
    }

    const startPos = self.camera.position.clone();
    const startTarget = self.controls.target.clone();
    const duration = viewPoint.duration || 1000;

    const tweenData = { t: 0 };
    self.viewTween = new TWEEN.Tween(tweenData)
      .to({ t: 1 }, duration)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(function() {
        const t = tweenData.t;
        self.camera.position.lerpVectors(startPos, viewPoint.position, t);
        self.controls.target.lerpVectors(startTarget, viewPoint.target, t);
        self.controls.update();
      })
      .onComplete(function() {
        self.camera.position.copy(viewPoint.position);
        self.controls.target.copy(viewPoint.target);
        self.controls.update();
        resolve();
      })
      .start();
  });
}

/**
 * 播放视角序列(多视角动画)
 * @param {Array<string>} viewIds - 视角ID数组，不指定则播放全部视角
 * @param {Object} options - 播放选项
 * @param {boolean} options.loop - 是否循环播放
 * @param {number} options.interval - 两个视角间的停留时长(毫秒)
 * @returns {Promise}
 */
function playViewSequence(viewIds = null, options = {}) {
  const self = this;
  return new Promise((resolve) => {
    self.initViewPoints();
    
    const { loop = false, interval = 500 } = options;
    const sequence = viewIds 
      ? self.viewPoints.filter(v => viewIds.includes(v.id))
      : self.viewPoints;

    if (sequence.length === 0) {
      resolve();
      return;
    }

    self.isPlayingViewSequence = true;

    const playSequenceStep = (index) => {
      if (!self.isPlayingViewSequence) {
        resolve();
        return;
      }

      if (index >= sequence.length) {
        if (loop) {
          playSequenceStep(0);
        } else {
          self.isPlayingViewSequence = false;
          resolve();
        }
        return;
      }

      const viewPoint = sequence[index];
      self.playViewPoint(viewPoint.id, true).then(() => {
        // 在视角间停留
        setTimeout(() => {
          playSequenceStep(index + 1);
        }, interval);
      });
    };

    playSequenceStep(0);
  });
}

/**
 * 停止视角序列播放
 */
function stopViewSequence() {
  this.isPlayingViewSequence = false;
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
 * 下一个视角
 */
function nextViewPoint() {
  this.initViewPoints();
  if (this.viewPoints.length === 0) return;
  this.currentViewIndex = (this.currentViewIndex + 1) % this.viewPoints.length;
  this.playViewPoint(this.viewPoints[this.currentViewIndex].id, true);
}

/**
 * 上一个视角
 */
function prevViewPoint() {
  this.initViewPoints();
  if (this.viewPoints.length === 0) return;
  this.currentViewIndex = (this.currentViewIndex - 1 + this.viewPoints.length) % this.viewPoints.length;
  this.playViewPoint(this.viewPoints[this.currentViewIndex].id, true);
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
  // 新增多视角相关方法
  initViewPoints,
  addViewPoint,
  removeViewPoint,
  updateViewPoint,
  getViewPoints,
  playViewPoint,
  playViewSequence,
  stopViewSequence,
  getEasingFunction,
  nextViewPoint,
  prevViewPoint
};
