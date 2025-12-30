<template>
  <div class="edit-event-container">
    <div class="options">
      <div class="option">
        <div class="icon-name">
          <el-icon><Pointer /></el-icon>
          <span style="margin-left: 5px">当前选中模型:</span>
        </div>
        <div style="margin-left: 10px; color: #409eff">{{ store.selectMesh.name || "未选中" }}</div>
      </div>
      <div class="option">
        <div class="icon-name">
          <el-icon><Mouse /></el-icon>
          <span style="margin-left: 5px">点击事件:</span>
        </div>
        <el-select v-model="config.clickEvent" placeholder="请选择交互事件" size="small" style="width: 180px; margin-left: 10px" @change="onChangeEvent">
          <el-option label="无" value="none"></el-option>
          <el-option label="弹窗提示" value="alert"></el-option>
          <el-option label="打开链接" value="link"></el-option>
          <el-option label="模型变色" value="color"></el-option>
          <el-option label="显示/隐藏" value="visible"></el-option>
          <el-option label="视角聚焦" value="flyTo"></el-option>
          <el-option label="播放动画" value="animation"></el-option>
          <el-option label="拆解图" value="explode"></el-option>
        </el-select>
      </div>

      <!-- 弹窗提示配置 -->
      <div v-if="config.clickEvent === 'alert'">
        <div class="option">
          <div class="icon-name">
            <span style="margin-left: 20px">提示内容:</span>
          </div>
          <el-input v-model="config.alertContent" placeholder="请输入提示内容" size="small" style="width: 180px; margin-left: 10px" @input="onChangeEvent"></el-input>
        </div>
      </div>

      <!-- 打开链接配置 -->
      <div v-if="config.clickEvent === 'link'">
        <div class="option">
          <div class="icon-name">
            <span style="margin-left: 20px">链接地址:</span>
          </div>
          <el-input v-model="config.linkUrl" placeholder="请输入URL" size="small" style="width: 180px; margin-left: 10px" @input="onChangeEvent"></el-input>
        </div>
      </div>

      <!-- 模型变色配置 -->
      <div v-if="config.clickEvent === 'color'">
        <div class="option">
          <div class="icon-name">
            <span style="margin-left: 20px">目标颜色:</span>
          </div>
          <el-color-picker v-model="config.targetColor" size="small" style="margin-left: 10px" @change="onChangeEvent"></el-color-picker>
        </div>
      </div>

      <!-- 拆解图配置 -->
      <div v-if="config.clickEvent === 'explode'">
        <div class="option">
          <div class="icon-name">
            <span style="margin-left: 20px">拆解间距:</span>
          </div>
          <el-input-number v-model="config.explodeDistance" :min="0.1" :step="step" size="small" style="width: 180px; margin-left: 10px" @change="onChangeEvent"></el-input-number>
        </div>
      </div>

      <!-- 播放动画配置 -->
      <div v-if="config.clickEvent === 'animation'">
        <div class="option">
          <div class="icon-name">
            <span style="margin-left: 20px">选择动画:</span>
          </div>
          <el-select v-model="config.animationName" placeholder="请选择动画" size="small" style="width: 180px; margin-left: 10px" @change="onChangeEvent">
             <el-option v-for="anim in animationList" :key="anim.name" :label="anim.name" :value="anim.name"></el-option>
          </el-select>
        </div>
         <div class="option">
          <div class="icon-name">
            <span style="margin-left: 20px">循环方式:</span>
          </div>
          <el-select v-model="config.loop" placeholder="循环方式" size="small" style="width: 180px; margin-left: 10px" @change="onChangeEvent">
             <el-option label="单次播放" value="LoopOnce"></el-option>
             <el-option label="循环播放" value="LoopRepeat"></el-option>
             <el-option label="往复播放" value="LoopPingPong"></el-option>
          </el-select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { useMeshEditStore } from "@/store/meshEditStore";
import * as THREE from "three";

const store = useMeshEditStore();
const step = ref(1);
const config = ref({
  clickEvent: "none",
  alertContent: "",
  linkUrl: "",
  targetColor: "#ff0000",
  animationName: "",
  loop: "LoopRepeat",
  explodeDistance: 5
});

const animationList = computed(() => {
  return store.modelApi.modelAnimation || [];
});

// 监听选中模型变化，回显配置
watch(
  () => store.selectMesh.uuid,
  (val) => {
    if (val) {
      // 计算智能默认值
      let defaultDistance = 5;
      let defaultStep = 1;

      try {
        const mesh = store.modelApi.scene.getObjectByProperty("uuid", val);
        if (mesh) {
          const box = new THREE.Box3().setFromObject(mesh);
          const size = new THREE.Vector3();
          box.getSize(size); // 世界尺寸
          const maxDim = Math.max(size.x, size.y, size.z);

          // 获取父级世界缩放比例，将世界尺寸转换为局部尺寸
          let parentScale = 1;
          if (mesh.parent) {
             const worldScale = new THREE.Vector3();
             mesh.parent.getWorldScale(worldScale);
             // 取最大缩放值以防万一
             parentScale = Math.max(worldScale.x, worldScale.y, worldScale.z) || 1; 
          }
          
          // 计算局部尺寸
          const localDim = maxDim / parentScale;

          // 默认间距设为局部尺寸的 2.0 倍 (确保视觉上足够明显)
          defaultDistance = parseFloat((localDim * 2.0).toFixed(2));
          // 给予一个最小保底值，防止计算结果过小
          if (defaultDistance < 1) defaultDistance = 1;

          // 步长设为局部尺寸的 20%
          defaultStep = parseFloat((localDim * 0.2).toFixed(2));
          if (defaultStep < 0.1) defaultStep = 0.1;
        }
      } catch (e) {
        console.warn("计算模型尺寸失败", e);
      }

      step.value = defaultStep;

      const eventData = store.modelApi.getMeshEventData(val);
      if (eventData) {
        config.value = { ...config.value, ...eventData };
        // 如果旧数据没有间距，使用智能默认值
        if (config.value.explodeDistance === undefined) {
          config.value.explodeDistance = defaultDistance;
        }
      } else {
        // 重置为默认
        config.value = {
          clickEvent: "none",
          alertContent: "",
          linkUrl: "",
          targetColor: "#ff0000",
          animationName: "",
          loop: "LoopRepeat",
          explodeDistance: defaultDistance
        };
      }
    }
  }
);

const onChangeEvent = () => {
  if (store.selectMesh.uuid) {
    const eventConfig = { ...config.value, meshName: store.selectMesh.name };
    store.modelApi.setMeshEventData(store.selectMesh.uuid, eventConfig);
  }
};

defineExpose({
  config
});
</script>

<style lang="scss" scoped>
.edit-event-container {
  .options {
    padding: 0 10px;
    .option {
      margin-bottom: 10px;
    }
  }
}
</style>
