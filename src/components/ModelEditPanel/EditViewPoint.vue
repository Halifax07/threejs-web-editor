<template>
  <div class="edit-box">
    <div class="header">
      <span>多视角展示</span>
      <div>
        <el-select v-model="targetUuid" size="small" placeholder="选择目标" style="width:200px" @change="() => {}">
          <el-option v-for="t in viewTargetOptions" :key="t.uuid" :label="t.name" :value="t.uuid" />
        </el-select>
        <el-button size="small" type="warning" @click="onExtractSelected" style="margin-left:8px">拆解选中子模型</el-button>
        <el-button type="primary" size="small" @click="onAddViewPoint" style="margin-left:8px">
          添加视角
        </el-button>
      </div>
    </div>

    <!-- 视角列表 -->
    <div class="options">
      <el-scrollbar max-height="300px" v-if="viewPoints.length">
        <div
          class="option view-item"
          :class="{ 'view-item-active': currentViewIndex === index }"
          v-for="(view, index) in viewPoints"
          :key="view.id"
        >
          <el-space>
            <span class="view-name">{{ view.name }}</span>
            <el-button-group>
              <el-button type="primary" size="small" @click="onPlayViewPoint(view.id)">
                预览
              </el-button>
              <el-button type="default" size="small" @click="onEditViewPoint(view)">
                编辑
              </el-button>
              <el-button type="danger" size="small" @click="onDeleteViewPoint(view.id)">
                删除
              </el-button>
            </el-button-group>
          </el-space>
        </div>
      </el-scrollbar>
      <el-empty v-else description="暂无视角" :image-size="100" />
    </div>

    <!-- 视角序列播放 -->
    <div class="header">
      <span>视角序列</span>
    </div>
    <div class="options">
      <div class="option">
        <el-space>
          <el-button @click="onPlayViewSequence" type="success" size="small">
            播放所有视角
          </el-button>
          <el-button @click="onStopViewSequence" type="warning" size="small">
            停止
          </el-button>
        </el-space>
      </div>
      <div class="option">
        <el-checkbox v-model="viewSequenceConfig.loop">循环播放</el-checkbox>
      </div>
      <div class="option">
        <el-space>
          <span>视角间隔(ms):</span>
          <el-input-number
            v-model="viewSequenceConfig.interval"
            :min="100"
            :max="5000"
            :step="100"
          />
        </el-space>
      </div>

      <!-- 合并播放（可选多个目标） -->
      <div class="option">
        <el-space>
          <el-select v-model="combinedTargets" multiple placeholder="选择要合并的目标" style="width:260px">
            <el-option v-for="t in viewTargetOptions" :key="t.uuid" :label="t.name" :value="t.uuid" />
          </el-select>

          <el-select v-model="combinedMode" size="small" style="width:140px">
            <el-option label="顺序播放" value="sequential" />
            <el-option label="交错播放" value="interleave" />
          </el-select>

          <el-button type="success" size="small" @click="onPlayCombinedSequence">合并播放</el-button>
          <el-button type="warning" size="small" @click="onStopCombinedSequence">停止</el-button>

          <el-button type="primary" size="small" @click="onPlaySynchronizedPath" style="margin-left:8px">同步轨迹播放</el-button>
          <el-button type="danger" size="small" @click="onStopSynchronizedPath">停止同步</el-button>
        </el-space>
      </div>
    </div>

    <!-- 编辑视角弹窗 -->
    <el-dialog v-model="editDialogVisible" :title="editingView ? '编辑视角' : '新建视角'" width="500px">
      <div class="view-edit-form">
        <el-form :model="editFormData" label-width="100px">
          <el-form-item label="视角名称">
            <el-input v-model="editFormData.name" placeholder="请输入视角名称" />
          </el-form-item>
          <el-form-item label="过渡时长(ms)">
            <el-input-number v-model="editFormData.duration" :min="100" :max="5000" :step="100" />
          </el-form-item>
          <el-form-item label="缓动函数">
            <el-select v-model="editFormData.easing">
              <el-option label="Linear" value="Linear.None" />
              <el-option label="Quad In" value="Quad.In" />
              <el-option label="Quad Out" value="Quad.Out" />
              <el-option label="Quad InOut" value="Quad.InOut" />
              <el-option label="Cubic In" value="Cubic.In" />
              <el-option label="Cubic Out" value="Cubic.Out" />
              <el-option label="Cubic InOut" value="Cubic.InOut" />
            </el-select>
          </el-form-item>
          <el-form-item label="相机位置">
            <div style="display: flex; gap: 10px">
              <el-input-number v-model="editFormData.position.x" placeholder="X" />
              <el-input-number v-model="editFormData.position.y" placeholder="Y" />
              <el-input-number v-model="editFormData.position.z" placeholder="Z" />
            </div>
          </el-form-item>
          <el-form-item label="看向目标">
            <div style="display: flex; gap: 10px">
              <el-input-number v-model="editFormData.target.x" placeholder="X" />
              <el-input-number v-model="editFormData.target.y" placeholder="Y" />
              <el-input-number v-model="editFormData.target.z" placeholder="Z" />
            </div>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSaveViewPoint">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import * as THREE from "three";
import { reactive, computed, onMounted, getCurrentInstance, ref } from "vue";
import { useMeshEditStore } from "@/store/meshEditStore";
import { UPDATE_MODEL } from "@/config/constant";
import { ElMessage } from "element-plus";

const store = useMeshEditStore();
const { $bus } = getCurrentInstance().proxy;

const editDialogVisible = ref(false);
const editingView = ref(null);

const editFormData = reactive({
  name: "",
  duration: 1000,
  easing: "Linear.None",
  position: { x: 0, y: 0, z: 0 },
  target: { x: 0, y: 0, z: 0 }
});

const viewSequenceConfig = reactive({
  loop: false,
  interval: 500
});

const targetUuid = ref(null); // 当前选择的目标 uuid（null 对应主模型）
const targetList = ref([]);

// 合并播放相关
const combinedTargets = ref([]);
const combinedMode = ref("sequential"); // sequential | interleave

// 获取目标列表
const updateTargetList = () => {
  if (!store.modelApi || typeof store.modelApi.getViewTargets !== "function") {
    targetList.value = [];
    return;
  }
  const list = store.modelApi.getViewTargets();
  // 默认把第一项（主模型）放置在顶部
  targetList.value = list;
  if (!targetUuid.value && list.length) {
    targetUuid.value = list[0].uuid;
  }
};

onMounted(() => {
  $bus.on(UPDATE_MODEL, () => {
    editDialogVisible.value = false;
    editingView.value = null;
    updateTargetList();
  });
  updateTargetList();
});

// 添加视角
const onAddViewPoint = () => {
  if (!store.modelApi || typeof store.modelApi.addViewPoint !== "function") {
    ElMessage.warning("模型未加载");
    return;
  }
  // 默认以局部坐标保存（相对于目标），如果 target 是主模型也适用
  const newView = store.modelApi.addViewPoint(undefined, targetUuid.value, true);
  editingView.value = newView;
  // 为编辑界面填充世界坐标（addViewPoint 已存局部，getViewPoints 会返回世界坐标副本）
  const list = store.modelApi.getViewPoints(targetUuid.value);
  const found = list.find(v => v.id === newView.id);
  if (found) {
    Object.assign(editFormData, {
      name: found.name,
      duration: found.duration,
      easing: found.easing,
      position: {
        x: found.position.x,
        y: found.position.y,
        z: found.position.z
      },
      target: {
        x: found.target.x,
        y: found.target.y,
        z: found.target.z
      }
    });
  } else {
    // fallback 使用当前 camera 值
    Object.assign(editFormData, {
      name: newView.name,
      duration: newView.duration,
      easing: newView.easing,
      position: {
        x: store.modelApi.camera.position.x,
        y: store.modelApi.camera.position.y,
        z: store.modelApi.camera.position.z
      },
      target: {
        x: store.modelApi.controls.target.x,
        y: store.modelApi.controls.target.y,
        z: store.modelApi.controls.target.z
      }
    });
  }
  editDialogVisible.value = true;
};

// 编辑视角
const onEditViewPoint = (view) => {
  editingView.value = view;
  Object.assign(editFormData, {
    name: view.name,
    duration: view.duration,
    easing: view.easing,
    position: {
      x: view.position.x,
      y: view.position.y,
      z: view.position.z
    },
    target: {
      x: view.target.x,
      y: view.target.y,
      z: view.target.z
    }
  });
  editDialogVisible.value = true;
};

// 保存视角
const onSaveViewPoint = () => {
  if (!editingView.value) return;
  
  store.modelApi.updateViewPoint(editingView.value.id, {
    name: editFormData.name,
    duration: editFormData.duration,
    easing: editFormData.easing,
    position: new THREE.Vector3(editFormData.position.x, editFormData.position.y, editFormData.position.z),
    target: new THREE.Vector3(editFormData.target.x, editFormData.target.y, editFormData.target.z)
  });
  ElMessage.success("视角已保存");
  editDialogVisible.value = false;
  updateTargetList();
  $bus.emit(UPDATE_MODEL);
};

// 删除视角
const onDeleteViewPoint = (viewId) => {
  store.modelApi.removeViewPoint(viewId);
  ElMessage.success("视角已删除");
  updateTargetList();
  $bus.emit(UPDATE_MODEL);
};

// 播放单个视角
const onPlayViewPoint = (viewId) => {
  if (!store.modelApi) {
    ElMessage.error("模型API未初始化");
    return;
  }
  if (typeof store.modelApi.playViewPoint !== 'function') {
    ElMessage.error("playViewPoint 方法不存在");
    console.log("可用方法:", Object.keys(store.modelApi));
    return;
  }
  store.modelApi.playViewPoint(viewId, true);
};

// 播放视角序列
const onPlayViewSequence = () => {
  if (!store.modelApi) {
    ElMessage.error("模型API未初始化");
    return;
  }
  if (typeof store.modelApi.playViewSequence !== 'function') {
    ElMessage.error("playViewSequence 方法不存在");
    return;
  }
  store.modelApi.playViewSequence(null, {
    loop: viewSequenceConfig.loop,
    interval: viewSequenceConfig.interval,
    targetUuid: targetUuid.value
  });
  ElMessage.info("开始播放视角序列");
};

// 停止视角序列
const onStopViewSequence = () => {
  if (!store.modelApi || typeof store.modelApi.stopViewSequence !== 'function') {
    ElMessage.error("stopViewSequence 方法不存在");
    return;
  }
  store.modelApi.stopViewSequence(targetUuid.value);
  ElMessage.info("已停止播放");
};

// 播放合并视角序列（根据选中目标）
const onPlayCombinedSequence = () => {
  if (!store.modelApi || typeof store.modelApi.playCombinedSequence !== 'function') {
    ElMessage.error("合并播放不可用");
    return;
  }
  if (!combinedTargets.value || combinedTargets.value.length === 0) {
    ElMessage.warning("请先选择至少一个目标");
    return;
  }
  store.modelApi.playCombinedSequence(combinedTargets.value, {
    mode: combinedMode.value,
    loop: viewSequenceConfig.loop,
    interval: viewSequenceConfig.interval
  });
  ElMessage.info("开始合并播放");
};

// 播放同步轨迹（生成合成路径，单相机播放）
const onPlaySynchronizedPath = () => {
  if (!store.modelApi || typeof store.modelApi.playSynchronizedPath !== 'function') {
    ElMessage.error("同步轨迹播放不可用");
    return;
  }
  if (!combinedTargets.value || combinedTargets.value.length === 0) {
    ElMessage.warning("请先选择至少一个目标");
    return;
  }
  store.modelApi.playSynchronizedPath(combinedTargets.value, {
    loop: viewSequenceConfig.loop,
    interval: viewSequenceConfig.interval
  });
  ElMessage.info("开始同步轨迹播放");
};

const onStopSynchronizedPath = () => {
  if (!store.modelApi) {
    ElMessage.error("模型 API 未初始化");
    return;
  }
  if (typeof store.modelApi.stopSynchronizedPath === 'function') {
    store.modelApi.stopSynchronizedPath(combinedTargets.value);
    ElMessage.info("已停止同步播放");
    return;
  }
  // fallback to stop all sequences if available
  if (typeof store.modelApi.stopAllSequences === 'function') {
    store.modelApi.stopAllSequences();
    ElMessage.info("已停止同步播放 (fallback)");
    return;
  }
  ElMessage.warning("停止同步播放不可用");
};

// 停止合并播放（若 Engine 支持 stopAllSequences 则用它，否则逐个停止目标）
const onStopCombinedSequence = () => {
  if (!store.modelApi) {
    ElMessage.error("模型 API 未初始化");
    return;
  }
  if (typeof store.modelApi.stopAllSequences === 'function') {
    store.modelApi.stopAllSequences();
    ElMessage.info("已停止合并播放");
    return;
  }
  // fallback: 停止选中目标的序列
  if (combinedTargets.value && combinedTargets.value.length) {
    combinedTargets.value.forEach(t => {
      if (typeof store.modelApi.stopViewSequence === 'function') store.modelApi.stopViewSequence(t);
    });
    ElMessage.info("已停止合并播放");
  } else {
    ElMessage.warning("没有选中的目标可停止");
  }
};

// 拆解子模型（把 store.selectMesh 当前选中网格拆出来成为独立小模型）
const onExtractSelected = () => {
  const selected = store.selectMesh;
  if (!selected || !selected.uuid) {
    ElMessage.warning("请先在场景中选中要拆解的子模型");
    return;
  }
  if (!store.modelApi || typeof store.modelApi.extractSubModel !== "function") {
    ElMessage.error("拆解功能不可用");
    return;
  }
  const newObj = store.modelApi.extractSubModel(selected.uuid);
  if (newObj) {
    // 自动切换目标到新拆解的小模型，使后续视角/预览都作用于该子模型
    targetUuid.value = newObj.uuid;
    ElMessage.success("拆解成功并已切换目标到子模型，后续视角/预览将以该子模型为主体");
    // 更新目标列表
    updateTargetList();
    // 触发界面刷新
    $bus.emit(UPDATE_MODEL);
  } else {
    ElMessage.error("拆解失败");
  }
};

// 切换目标时必须刷新可见视角列表（界面通过 computed 获取）
const viewPoints = computed(() => {
  if (store.modelApi && typeof store.modelApi.getViewPoints === "function") {
    return store.modelApi.getViewPoints(targetUuid.value);
  }
  return [];
});

// 目标列表供模板渲染
const viewTargetOptions = computed(() => targetList.value);

const currentViewIndex = computed(() => {
  if (store.modelApi && typeof store.modelApi.getCurrentViewIndex === 'function') {
    return store.modelApi.getCurrentViewIndex(targetUuid.value);
  }
  return -1;
});

defineExpose({
  viewPoints,
  currentViewIndex
});
</script>

<style scoped lang="scss">
.view-item {
  transition: background-color 0.3s;
  padding: 10px;
  border-radius: 4px;
  
  &:hover {
    background-color: #f5f7fa;
  }
  
  &.view-item-active {
    background-color: #e6f7ff;
    border-left: 3px solid #1890ff;
  }
}

.view-name {
  min-width: 100px;
  font-weight: 500;
}

.view-edit-form {
  padding: 20px 0;
}

.option {
  padding: 8px 0;
}
</style>