<template>
  <el-dialog
    v-model="visible"
    title="项目管理"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="project-manager">
      <!-- 项目列表 -->
      <div class="project-list" v-if="projects.length > 0">
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-item"
          :class="{ active: currentProjectId === project.id }"
        >
          <div class="project-info">
            <div class="project-name">{{ project.name }}</div>
            <div class="project-meta">
              <span>创建时间: {{ formatTime(project.createTime) }}</span>
              <span>更新时间: {{ formatTime(project.updateTime) }}</span>
            </div>
          </div>
          <div class="project-actions">
            <el-button type="primary" size="small" @click="handleLoad(project)">加载</el-button>
            <el-button type="success" size="small" @click="handleExport(project)">导出</el-button>
            <el-button type="danger" size="small" @click="handleDelete(project)">删除</el-button>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无保存的项目" />
    </div>
    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getSavedProjects,
  loadProject,
  deleteProject,
  exportProjectToFile,
  getCurrentProjectId
} from "@/utils/saveProject";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["update:modelValue", "load-project"]);

const visible = ref(props.modelValue);
const projects = ref([]);
const currentProjectId = ref(null);

// 监听 visible 变化
watch(
  () => props.modelValue,
  (val) => {
    visible.value = val;
    if (val) {
      loadProjects();
    }
  }
);

watch(visible, (val) => {
  emit("update:modelValue", val);
});

// 加载项目列表
const loadProjects = () => {
  projects.value = getSavedProjects();
  currentProjectId.value = getCurrentProjectId();
  // 按更新时间排序
  projects.value.sort((a, b) => b.updateTime - a.updateTime);
};

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return "未知";
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN");
};

// 加载项目
const handleLoad = async (project) => {
  try {
    ElMessageBox.confirm(
      `确定要加载项目 "${project.name}" 吗？\n注意：加载项目会替换当前场景。`,
      "加载项目",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    )
      .then(async () => {
        const result = await loadProject(project.id);
        if (result.success) {
          emit("load-project", result.project.data);
          handleClose();
        }
      })
      .catch(() => {
        // 用户取消
      });
  } catch (error) {
    console.error("加载项目失败:", error);
  }
};

// 导出项目
const handleExport = (project) => {
  try {
    const fileName = `threejs-project-${project.name}-${new Date(project.updateTime).toISOString().slice(0, 10)}.json`;
    exportProjectToFile(project.data, fileName);
  } catch (error) {
    console.error("导出项目失败:", error);
    ElMessage.error("导出项目失败");
  }
};

// 删除项目
const handleDelete = async (project) => {
  try {
    ElMessageBox.confirm(
      `确定要删除项目 "${project.name}" 吗？此操作不可恢复。`,
      "删除项目",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    )
      .then(async () => {
        const result = await deleteProject(project.id);
        if (result.success) {
          loadProjects();
        }
      })
      .catch(() => {
        // 用户取消
      });
  } catch (error) {
    console.error("删除项目失败:", error);
  }
};

// 关闭对话框
const handleClose = () => {
  visible.value = false;
};

defineExpose({
  loadProjects
});
</script>

<style lang="scss" scoped>
.project-manager {
  .project-list {
    max-height: 400px;
    overflow-y: auto;

    .project-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      margin-bottom: 8px;
      background-color: #27282f;
      border-radius: 4px;
      border: 1px solid transparent;
      transition: all 0.3s;

      &:hover {
        background-color: #33343f;
        border-color: #4d57fd;
      }

      &.active {
        border-color: #4d57fd;
        background-color: #33343f;
      }

      .project-info {
        flex: 1;

        .project-name {
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .project-meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #888888;

          span {
            display: inline-block;
          }
        }
      }

      .project-actions {
        display: flex;
        gap: 8px;
      }
    }
  }
}
</style>

