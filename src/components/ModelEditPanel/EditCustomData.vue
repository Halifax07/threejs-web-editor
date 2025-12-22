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
  </div>
</template>

<script setup>
import { computed, reactive, watch } from "vue";
import { useMeshEditStore } from "@/store/meshEditStore";

const store = useMeshEditStore();

// 当前选中目标（来自 meshEditStore 的 selectMesh）
const currentTargetUuid = computed(() => store.selectMesh?.uuid || "");
const currentTargetName = computed(() => store.selectMesh?.name || store.selectMesh?.userData?.name || "");

// 本地参数列表，结构：[{ id, name, value, unit }]
const state = reactive({
  paramList: []
});

const paramList = computed(() => state.paramList);

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

// 监听选中模型变化，自动刷新参数列表
watch(
  () => currentTargetUuid.value,
  () => {
    refreshParamsFromApi();
  },
  { immediate: true }
);

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
}
</style>


