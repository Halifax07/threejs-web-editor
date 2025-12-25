<template>
  <div class="model-choose">
    <el-scrollbar max-height="calc(100vh - 72px)">
      <!-- 普通模型 -->
      <div class="options">
        <div class="option">
          <el-space>
            <el-icon>
              <Orange />
            </el-icon>
            <span>普通模型</span>
          </el-space>
        </div>
        <!-- 模型列表 -->
        <el-scrollbar max-height="210px">
          <el-row>
            <el-col
              draggable="true"
              :style="{ textAlign: 'center', cursor: 'all-scroll' }"
              :span="12"
              v-for="model in ordinaryModelList"
              @dragstart="e => onDragModelStart(model)"
              @drag="e => onDrag(e)"
              :key="model.id"
            >
              <el-image
                draggable="false"
                class="el-img"
                :class="reactiveData.activeModelId == model.id ? 'active-model' : ''"
                :src="model.icon"
                fit="cover"
                @click.prevent="onChangeModel(model)"
              />
            </el-col>
          </el-row>
        </el-scrollbar>
      </div>
      <!-- 动画模型 -->
      <div class="options">
        <div class="option">
          <el-space>
            <el-icon>
              <Paperclip />
            </el-icon>
            <span>动画模型</span>
            <span :style="{ color: '#18c174 ' }">(可拖拽添加多个)</span>
          </el-space>
        </div>
        <!-- 模型列表 -->
        <el-scrollbar max-height="210px">
          <el-row>
            <el-col
              draggable="true"
              :style="{ textAlign: 'center', cursor: 'all-scroll' }"
              :span="12"
              v-for="model in animationModelList"
              @dragstart="e => onDragModelStart(model)"
              @drag="e => onDrag(e)"
              :key="model.id"
            >
              <el-image
                draggable="false"
                @click="onChangeModel(model)"
                class="el-img"
                :class="reactiveData.activeModelId == model.id ? 'active-model' : ''"
                :src="model.icon"
                fit="cover"
              />
            </el-col>
          </el-row>
        </el-scrollbar>
      </div>

      <!-- 外部模型 -->
      <div class="options">
        <div class="option">
          <el-space>
            <el-icon>
              <UploadFilled />
            </el-icon>
            <span>外部模型</span>
          </el-space>
        </div>
        <!-- 模型内容 -->
        <div class="file-name">
          <span>当前模型:</span>
          <el-tooltip effect="dark" :content="reactiveData.localModelName" placement="top">
            <b>{{ reactiveData.localModelName }}</b>
          </el-tooltip>
        </div>
        <el-upload
          action=""
          accept=".glb,.obj,.gltf,.fbx,.stl"
          class="file-box"
          :show-file-list="false"
          :auto-upload="false"
          :on-change="onUpload"
        >
          <div class="upload">
            <div class="icon">
              <el-icon :size="44">
                <Plus />
              </el-icon>
              <div><span>请选择(目前仅支持.glb, .obj, .gltf, .fbx, .stl格式)</span></div>
            </div>
          </div>
        </el-upload>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { ref, computed, getCurrentInstance, reactive } from "vue";
import { modelList } from "@/config/model.js";
import { useMeshEditStore } from "@/store/meshEditStore";
import { getFileType, getAssetsFile } from "@/utils/utilityFunction.js";
import { ElMessage } from "element-plus";
import { UPDATE_MODEL, PAGE_LOADING } from "@/config/constant";

const store = useMeshEditStore();
const { $bus } = getCurrentInstance().proxy;

//普通模型
const ordinaryModelList = computed(() => {
  return modelList.filter(v => !v.animation);
});
// 动画模型
const animationModelList = computed(() => {
  return modelList.filter(v => v.animation);
});

const reactiveData = reactive({
  // 当前模型ID
  activeModelId: 7,
  localModelName: null
});

// 当前模型信息
const activeModel = ref({
  name: "su7",
  fileType: "glb",
  id: 7,
  animation: false,
  filePath: "threeFile/glb/glb-7.glb",
  icon: getAssetsFile("model-icon/4.png"),
  decomposeName: "transformers_3",
  key: "transformers-3"
});

//选择模型
const onChangeModel = async model => {
  if (model.id == reactiveData.activeModelId) return false;
  activeModel.value = model;
  Object.assign(reactiveData, {
    activeModelId: model.id,
    localModelName: null,
  });

  $bus.emit(PAGE_LOADING, true);
  try {
    const { load } = await store.modelApi.onSwitchModel(model);
    if (load) {
      $bus.emit(UPDATE_MODEL);
      $bus.emit(PAGE_LOADING, false);
    }
  } catch (err) {
    $bus.emit(PAGE_LOADING, false);
  }
};


// 拖拽中
const onDrag = event => {
  event.preventDefault();
};

// 拖拽模型开始
const onDragModelStart = model => {
  store.modelApi.setDragManyModel(model);
};

// 选择本地模型文件
const onUpload = async file => {
  reactiveData.localModelName = file.name;
  const filePath = URL.createObjectURL(file.raw);

  const model = {
    filePath,
    fileType: getFileType(file.name)
  };
  $bus.emit(PAGE_LOADING, true);
  try {
    // 导入外部模型时不清空场景，而是追加
    const { load, filePath } = await store.modelApi.onSwitchModel(model, false);
    // 注意：不能立即释放 Blob URL，否则预览功能无法再次读取该文件
    // URL.revokeObjectURL(filePath);
    if (load) {
      $bus.emit(UPDATE_MODEL);
      $bus.emit(PAGE_LOADING, false);

      // activeModel.value = {};
      Object.assign(reactiveData, {
        activeModelId: null,
      });
    }
  } catch (err) {
    reactiveData.localModelName = null;
    $bus.emit(PAGE_LOADING, false);
  }
};

defineExpose({
  activeModel
});
</script>

<style lang="scss">
.model-choose {
  min-width: 305px;
  height: calc(100vh - 35px) !important;
  background-color: #1b1c23;
  .el-img {
    box-sizing: border-box;
    width: 145px;
    height: 88px;
    margin-bottom: 4px;
    opacity: 0.5;
  }
  .active-model {
    border: 3px solid #18c174 !important;
    opacity: 1;
  }

  .geometry-box {
    position: relative;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    padding: 0 20px;
    overflow: hidden;
    color: #8c939d;
    text-align: center;
    .geometry-add {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 228px;
      height: 108px;
      cursor: pointer;
      border: 1px dashed #dcdfe6;
      border-radius: 6px;
      .icon {
        span {
          font-size: 14px;
        }
      }
      &:hover {
        color: #409eff;
        border-color: #409eff;
      }
    }
  }
  .file-box {
    position: relative;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    padding: 10px 20px;
    overflow: hidden;
    color: #8c939d;
    text-align: center;
    cursor: pointer;
    .upload {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 228px;
      height: 100px;
      border: 1px dashed #dcdfe6;
      border-radius: 6px;
      .icon {
        span {
          font-size: 14px;
        }
      }
      &:hover {
        color: #409eff;
        border-color: #409eff;
      }
    }
  }
  .file-name {
    overflow: hidden;
    font-size: 14px;
    color: #ffffff;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
