<template>
  <div class="edit-box">
    <div class="header">
      <span> 自定义数据标注 </span>
      <el-tooltip content="为当前选中的模型/子模型添加自定义参数（名称-值-单位）" effect="dark" placement="top">
        <el-icon class="header-icon">
          <InfoFilled />
        </el-icon>
      </el-tooltip>
    </div>

    <div class="options">
      <div class="option">
        <div class="grid-txt">
          <el-button type="primary" link>当前目标</el-button>
        </div>
        <div class="grid-sidle">
          <span class="target-text" v-if="currentTargetName">
            {{ currentTargetName }}
          </span>
          <span class="target-text empty" v-else> 未选中任何模型，请在视窗中点击选择模型后再添加数据 </span>
        </div>
      </div>
    </div>

    <div class="options">
      <div class="header sub-header">
        <span> 参数列表 </span>
        <el-button type="primary" size="small" @click="onAddParam" :disabled="!currentTargetUuid">新增参数</el-button>
      </div>
      <el-table
        v-if="currentTargetUuid"
        :data="paramList"
        border
        size="small"
        height="260"
        class="param-table"
        empty-text="暂未添加任何参数"
      >
        <el-table-column label="参数名称" min-width="120">
          <template #default="{ row }">
            <el-input v-model.trim="row.name" placeholder="如：重量、功率" @change="onChange" />
          </template>
        </el-table-column>
        <el-table-column label="参数值" min-width="120">
          <template #default="{ row }">
            <el-input v-model.trim="row.value" placeholder="如：10、220" @change="onChange" />
          </template>
        </el-table-column>
        <el-table-column label="单位" min-width="100">
          <template #default="{ row }">
            <el-input v-model.trim="row.unit" placeholder="如：kg、V、mm" @change="onChange" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70" align="center" fixed="right">
          <template #default="{ $index }">
            <el-popconfirm title="确认删除该参数？" confirm-button-text="删除" cancel-button-text="取消" @confirm="onDeleteParam($index)">
              <template #reference>
                <el-button type="danger" link>删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="请先在场景中选中要标注数据的模型" :image-size="100" />
    </div>

    <!-- 标签显示配置 -->
    <div class="options">
      <div class="header sub-header">
        <span> 标签显示设置 </span>
      </div>
      <div class="option">
        <div class="grid-txt">
          <el-button type="primary" link>预览模式</el-button>
        </div>
        <div class="grid-sidle">
          <el-switch v-model="alwaysShowLabels" @change="onAlwaysShowChange" />
          <span class="switch-tip">开启后，所有已添加数据的模型标签将一直显示，无需选中</span>
        </div>
      </div>
    </div>
    <div class="options" v-if="currentTargetUuid">
      <div class="header sub-header">
        <span> 当前标签样式设置 </span>
      </div>
      <div class="option">
        <div class="grid-txt">
          <el-button type="primary" link>字体大小</el-button>
        </div>
        <div class="grid-sidle">
          <el-slider
            v-model="labelConfig.fontSize"
            :min="8"
            :max="24"
            :step="1"
            show-input
            @change="onLabelConfigChange"
          />
        </div>
      </div>
      <div class="option">
        <div class="grid-txt">
          <el-button type="primary" link>位置偏移 X</el-button>
        </div>
        <div class="grid-sidle">
          <el-slider
            v-model="labelConfig.offsetX"
            :min="-5"
            :max="5"
            :step="0.1"
            show-input
            @change="onLabelConfigChange"
          />
        </div>
      </div>
      <div class="option">
        <div class="grid-txt">
          <el-button type="primary" link>位置偏移 Y</el-button>
        </div>
        <div class="grid-sidle">
          <el-slider
            v-model="labelConfig.offsetY"
            :min="-5"
            :max="5"
            :step="0.1"
            show-input
            @change="onLabelConfigChange"
          />
        </div>
      </div>
      <div class="option">
        <div class="grid-txt">
          <el-button type="primary" link>位置偏移 Z</el-button>
        </div>
        <div class="grid-sidle">
          <el-slider
            v-model="labelConfig.offsetZ"
            :min="-5"
            :max="5"
            :step="0.1"
            show-input
            @change="onLabelConfigChange"
          />
        </div>
      </div>
      <div class="option">
        <div class="grid-txt">
          <el-button type="primary" link>标签缩放</el-button>
        </div>
        <div class="grid-sidle">
          <el-slider
            v-model="labelConfig.scale"
            :min="0.005"
            :max="0.05"
            :step="0.001"
            show-input
            :format-tooltip="val => val.toFixed(3)"
            @change="onLabelConfigChange"
          />
        </div>
      </div>
      <div class="option">
        <div class="grid-txt">
          <el-button type="primary" link>显示引线</el-button>
        </div>
        <div class="grid-sidle">
          <el-switch v-model="labelConfig.showLine" @change="onLabelConfigChange" />
          <span class="switch-tip">开启后，将显示从模型中心到标签位置的引线</span>
        </div>
      </div>
      <div class="option" v-if="labelConfig.showLine">
        <div class="grid-txt">
          <el-button type="primary" link>引线颜色</el-button>
        </div>
        <div class="grid-sidle">
          <el-color-picker v-model="labelConfig.lineColor" @change="onLabelConfigChange" />
        </div>
      </div>
      <div class="option">
        <el-button type="default" size="small" @click="onResetLabelConfig">重置为默认值</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useMeshEditStore } from "@/store/meshEditStore";
import * as THREE from "three";

const store = useMeshEditStore();

// 当前选中目标（来自 meshEditStore 的 selectMesh）
const currentTargetUuid = computed(() => store.selectMesh?.uuid || "");
const currentTargetName = computed(() => store.selectMesh?.name || store.selectMesh?.userData?.name || "");

// 本地参数列表，结构：[{ id, name, value, unit }]
const state = reactive({
  paramList: []
});

const paramList = computed(() => state.paramList);

// 是否一直显示所有标签
const alwaysShowLabels = ref(false);

// 标签显示配置
const labelConfig = reactive({
  fontSize: 11,
  offsetX: 0,
  offsetY: 0.5,
  offsetZ: 0,
  scale: 0.01,
  showLine: true,
  lineColor: "#ffffff"
});

// 从 modelApi 读取当前对象的自定义数据
const refreshParamsFromApi = () => {
  if (!store.modelApi || !currentTargetUuid.value) {
    state.paramList = [];
    return;
  }
  if (typeof store.modelApi.getCustomDataForObject !== "function") {
    state.paramList = [];
    return;
  }
  const list = store.modelApi.getCustomDataForObject(currentTargetUuid.value) || [];
  // 深拷贝一份到本地，避免直接修改引用
  state.paramList = list.map(item => ({
    id: item.id,
    name: item.name || "",
    value: item.value || "",
    unit: item.unit || ""
  }));
};

// 从 modelApi 读取一直显示状态
const refreshAlwaysShowFromApi = () => {
  if (!store.modelApi || typeof store.modelApi.getAlwaysShowCustomDataLabels !== "function") {
    alwaysShowLabels.value = false;
    return;
  }
  alwaysShowLabels.value = store.modelApi.getAlwaysShowCustomDataLabels() || false;
};

// 从 modelApi 读取当前对象的标签显示配置
const refreshLabelConfigFromApi = () => {
  if (!store.modelApi || !currentTargetUuid.value) {
    // 重置为默认值
    labelConfig.fontSize = 11;
    labelConfig.offsetX = 0;
    labelConfig.offsetY = 0.5;
    labelConfig.offsetZ = 0;
    labelConfig.scale = 0.01;
    labelConfig.showLine = true;
    labelConfig.lineColor = "#ffffff";
    return;
  }
  if (typeof store.modelApi.getCustomDataLabelConfig !== "function") {
    return;
  }
  const config = store.modelApi.getCustomDataLabelConfig(currentTargetUuid.value);
  if (config) {
    labelConfig.fontSize = config.fontSize || 11;
    labelConfig.offsetX = config.offsetX != null ? config.offsetX : 0;
    labelConfig.offsetY = config.offsetY != null ? config.offsetY : 0.5;
    labelConfig.offsetZ = config.offsetZ != null ? config.offsetZ : 0;
    labelConfig.scale = config.scale != null ? config.scale : 0.01;
    labelConfig.showLine = config.showLine != null ? config.showLine : true;
    labelConfig.lineColor = config.lineColor || "#ffffff";
  }
};

// 监听选中模型变化，自动刷新参数列表和标签配置
watch(
  () => currentTargetUuid.value,
  () => {
    refreshParamsFromApi();
    refreshLabelConfigFromApi();
  },
  { immediate: true }
);

// 初始化时读取一直显示状态
refreshAlwaysShowFromApi();

// 新增参数
const onAddParam = () => {
  if (!currentTargetUuid.value) return;
  if (!store.modelApi || typeof store.modelApi.addCustomDataForObject !== "function") return;

  const newItem = store.modelApi.addCustomDataForObject(currentTargetUuid.value, {
    name: "",
    value: "",
    unit: ""
  });
  if (!newItem) return;

  state.paramList.push({
    id: newItem.id,
    name: newItem.name || "",
    value: newItem.value || "",
    unit: newItem.unit || ""
  });
};

// 删除参数
const onDeleteParam = index => {
  const row = state.paramList[index];
  if (!row) return;
  if (!store.modelApi || typeof store.modelApi.removeCustomDataForObject !== "function") return;
  store.modelApi.removeCustomDataForObject(currentTargetUuid.value, row.id);
  state.paramList.splice(index, 1);
};

// 修改参数（任一字段变更时整体同步一次）
const onChange = () => {
  if (!store.modelApi || typeof store.modelApi.updateCustomDataForObject !== "function") return;
  store.modelApi.updateCustomDataForObject(currentTargetUuid.value, state.paramList);
};

// 标签配置变更
const onLabelConfigChange = () => {
  if (!store.modelApi || typeof store.modelApi.updateCustomDataLabelConfig !== "function") return;
  if (!currentTargetUuid.value) return;
  store.modelApi.updateCustomDataLabelConfig(currentTargetUuid.value, {
    fontSize: labelConfig.fontSize,
    offsetX: labelConfig.offsetX,
    offsetY: labelConfig.offsetY,
    offsetZ: labelConfig.offsetZ,
    scale: labelConfig.scale,
    showLine: labelConfig.showLine,
    lineColor: labelConfig.lineColor
  });
};

// 重置标签配置为默认值
const onResetLabelConfig = () => {
  if (!store.modelApi || !currentTargetUuid.value) return;
  // 获取对象的默认配置（基于包围盒）
  const obj = store.modelApi.scene?.getObjectByProperty("uuid", currentTargetUuid.value);
  if (obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    labelConfig.fontSize = 11;
    labelConfig.offsetX = 0;
    labelConfig.offsetY = size.y * 0.6 || 0.5;
    labelConfig.offsetZ = 0;
    labelConfig.scale = 0.01;
    labelConfig.showLine = true;
    labelConfig.lineColor = "#ffffff";
    onLabelConfigChange();
  }
};

// 一直显示开关变化
const onAlwaysShowChange = () => {
  if (!store.modelApi || typeof store.modelApi.setAlwaysShowCustomDataLabels !== "function") return;
  store.modelApi.setAlwaysShowCustomDataLabels(alwaysShowLabels.value);
};
</script>

<style scoped lang="scss">
.edit-box {
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    color: #ffffff;
    font-size: 14px;
    .header-icon {
      cursor: help;
      color: #909399;
    }
  }
  .sub-header {
    margin-top: 4px;
  }
  .options {
    margin-bottom: 10px;
  }
  .option {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .grid-txt {
    min-width: 80px;
    color: #ffffff;
    font-size: 13px;
  }
  .grid-sidle {
    flex: 1;
    display: flex;
    align-items: center;
    .target-text {
      color: #e5eaf3;
      font-size: 13px;
      &.empty {
        color: #909399;
      }
    }
  }
  .param-table {
    margin-top: 4px;
  }
  .switch-tip {
    margin-left: 8px;
    color: #909399;
    font-size: 12px;
  }
}
</style>


