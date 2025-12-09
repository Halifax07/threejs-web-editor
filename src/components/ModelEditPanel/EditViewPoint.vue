<template>
  <div class="edit-box">
    <div class="header">
      <span>多视角展示</span>
      <el-button type="primary" size="small" @click="onAddViewPoint">
        <el-icon><Plus /></el-icon>
        添加视角
      </el-button>
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

const viewPoints = computed(() => {
  if (store.modelApi && typeof store.modelApi.getViewPoints === 'function') {
    return store.modelApi.getViewPoints();
  }
  return [];
});

const currentViewIndex = computed(() => {
  return store.modelApi?.currentViewIndex ?? -1;
});

onMounted(() => {
  $bus.on(UPDATE_MODEL, () => {
    editDialogVisible.value = false;
    editingView.value = null;
  });
});

// 添加视角
const onAddViewPoint = () => {
  if (!store.modelApi || typeof store.modelApi.addViewPoint !== 'function') {
    ElMessage.warning("模型未加载");
    return;
  }
  const newView = store.modelApi.addViewPoint();
  editingView.value = newView;
  Object.assign(editFormData, {
    name: newView.name,
    duration: newView.duration,
    easing: newView.easing,
    position: {
      x: newView.position.x,
      y: newView.position.y,
      z: newView.position.z
    },
    target: {
      x: newView.target.x,
      y: newView.target.y,
      z: newView.target.z
    }
  });
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
    position: new THREE.Vector3(
      editFormData.position.x,
      editFormData.position.y,
      editFormData.position.z
    ),
    target: new THREE.Vector3(
      editFormData.target.x,
      editFormData.target.y,
      editFormData.target.z
    )
  });
  ElMessage.success("视角已保存");
  editDialogVisible.value = false;
};

// 删除视角
const onDeleteViewPoint = (viewId) => {
  store.modelApi.removeViewPoint(viewId);
  ElMessage.success("视角已删除");
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
    interval: viewSequenceConfig.interval
  });
  ElMessage.info("开始播放视角序列");
};

// 停止视角序列
const onStopViewSequence = () => {
  if (!store.modelApi || typeof store.modelApi.stopViewSequence !== 'function') {
    ElMessage.error("stopViewSequence 方法不存在");
    return;
  }
  store.modelApi.stopViewSequence();
  ElMessage.info("已停止播放");
};

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