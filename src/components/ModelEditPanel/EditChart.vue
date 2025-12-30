<template>
  <div class="edit-box">
    <div class="header">
      <span> 图表配置 </span>
      <el-tooltip content="为当前选中的模型添加3D图表" effect="dark" placement="top">
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
          <span class="target-text empty" v-else> 未选中任何模型 </span>
        </div>
      </div>
    </div>

    <div class="options">
      <div class="header sub-header">
        <span> 图表列表 </span>
        <el-space>
            <el-button 
                :type="isDemoMode ? 'success' : 'warning'" 
                size="small" 
                @click="onToggleDemoMode"
            >
                {{ isDemoMode ? '退出演示' : '演示' }}
            </el-button>
            <el-button type="primary" size="small" @click="onAddChart" :disabled="!currentTargetUuid">新增图表</el-button>
        </el-space>
      </div>
      
      <el-scrollbar max-height="260px" v-if="chartList.length">
        <div v-for="(chart, index) in chartList" :key="chart.id" class="chart-item">
            <div class="chart-info">
                <span class="chart-title">{{ chart.config.title }}</span>
                <span class="chart-type">({{ chart.config.type }})</span>
            </div>
            <div class="chart-actions">
                 <el-button type="primary" link size="small" @click="onEditChart(chart)">编辑</el-button>
                 <el-button type="danger" link size="small" @click="onDeleteChart(chart.id)">删除</el-button>
            </div>
        </div>
      </el-scrollbar>
      <el-empty v-else description="暂无图表" :image-size="100" />
    </div>

    <!-- Edit Dialog -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑图表' : '新增图表'" width="400px" append-to-body>
        <el-form :model="form" label-width="80px">
            <el-form-item label="标题">
                <el-input v-model="form.title" placeholder="图表标题"></el-input>
            </el-form-item>
            <el-form-item label="类型">
                <el-select v-model="form.type">
                    <el-option label="柱状图" value="bar"></el-option>
                    <el-option label="折线图" value="line"></el-option>
                    <el-option label="仪表盘" value="gauge"></el-option>
                </el-select>
            </el-form-item>
            <el-form-item label="主题">
                <el-select v-model="form.theme">
                    <el-option label="默认(亮色)" value="light"></el-option>
                    <el-option label="科技(深色)" value="dark"></el-option>
                </el-select>
            </el-form-item>
            <el-form-item label="缩放比例">
                <el-input-number v-model="form.scale" :step="0.1" :min="0.1" :max="5.0"></el-input-number>
            </el-form-item>
            <el-form-item label="位置偏移">
                <el-row :gutter="10">
                    <el-col :span="8"><el-input v-model="form.offsetX" placeholder="X"></el-input></el-col>
                    <el-col :span="8"><el-input v-model="form.offsetY" placeholder="Y"></el-input></el-col>
                    <el-col :span="8"><el-input v-model="form.offsetZ" placeholder="Z"></el-input></el-col>
                </el-row>
            </el-form-item>
            <el-form-item label="X轴数据" v-if="form.type !== 'gauge'">
                <el-input v-model="form.xAxisStr" placeholder="逗号分隔，如: A,B,C"></el-input>
            </el-form-item>
            <el-form-item label="数值数据">
                <el-input v-model="form.dataStr" placeholder="逗号分隔，如: 10,20,30"></el-input>
            </el-form-item>
        </el-form>
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="onSaveChart">确定</el-button>
            </span>
        </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useMeshEditStore } from "@/store/meshEditStore";
import { InfoFilled } from "@element-plus/icons-vue";

const store = useMeshEditStore();

const currentTargetUuid = computed(() => store.selectMesh?.uuid || "");
const currentTargetName = computed(() => store.selectMesh?.name || store.selectMesh?.userData?.name || "");

const chartList = ref([]);
const dialogVisible = ref(false);
const isEdit = ref(false);
const currentChartId = ref(null);
const isDemoMode = ref(false);

const form = reactive({
    title: '新图表',
    type: 'bar',
    theme: 'light',
    scale: 1.0,
    offsetX: '0',
    offsetY: '0',
    offsetZ: '0',
    xAxisStr: 'Mon,Tue,Wed,Thu,Fri',
    dataStr: '120,200,150,80,70'
});

const refreshChartList = () => {
    if (store.modelApi && currentTargetUuid.value) {
        const list = store.modelApi.getChartsForObject(currentTargetUuid.value);
        chartList.value = [...list];
    } else {
        chartList.value = [];
    }
};

watch(currentTargetUuid, () => {
    refreshChartList();
});

const onToggleDemoMode = () => {
    if (!store.modelApi) return;
    isDemoMode.value = !isDemoMode.value;
    store.modelApi.setChartDemoMode(isDemoMode.value);
};

const onAddChart = () => {
    isEdit.value = false;
    form.title = '新图表';
    form.type = 'bar';
    form.scale = 1.0;
    form.offsetX = '0';
    form.offsetY = '0';
    form.offsetZ = '0';
    form.xAxisStr = 'Mon,Tue,Wed,Thu,Fri';
    form.dataStr = '120,200,150,80,70';
    dialogVisible.value = true;
};

const onEditChart = (chart) => {
    isEdit.value = true;
    currentChartId.value = chart.id;
    form.title = chart.config.title;
    form.type = chart.config.type;
    form.theme = chart.config.theme || 'light';
    form.scale = chart.config.scale !== undefined ? chart.config.scale : 1.0
    form.theme = chart.config.theme || 'light';
    form.offsetX = (chart.config.offset ? chart.config.offset.x : 0).toString();
    form.offsetY = (chart.config.offset ? chart.config.offset.y : 0).toString();
    form.offsetZ = (chart.config.offset ? chart.config.offset.z : 0).toString();
    form.xAxisStr = (chart.config.xAxis || []).join(',');
    form.dataStr = (chart.config.data || []).join(',');
    dialogVisible.value = true;
};

const onDeleteChart = (id) => {
    if (store.modelApi && currentTargetUuid.value) {
        store.modelApi.removeChart(currentTargetUuid.value, id);
        refreshChartList();
    }
};

const onSaveChart = () => {
    const xAxis = form.xAxisStr.split(',').map(s => s.trim());
    const data = form.dataStr.split(',').map(s => parseFloat(s.trim()) || 0);
    const offset = {
        x: parseFloat(form.offsetX) || 0,
        y: parseFloat(form.offsetY) || 0,
        z: parseFloat(form.offsetZ) || 0
    };
    
    const config = {
        title: form.title,
        scale: form.scale,
        type: form.type,
        theme: form.theme,
        offset,
        xAxis,
        data
    };

    if (isEdit.value) {
        store.modelApi.updateChart(currentTargetUuid.value, currentChartId.value, config);
    } else {
        store.modelApi.addChartToModel(store.selectMesh, config);
    }
    
    dialogVisible.value = false;
    refreshChartList();
};

</script>

<style lang="scss" scoped>
.edit-box {
    padding: 10px;
    color: #fff;
}
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: bold;
    .header-icon {
        cursor: pointer;
    }
}
.sub-header {
    margin-top: 10px;
    margin-bottom: 10px;
}
.options {
    margin-bottom: 15px;
}
.option {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    .grid-txt {
        width: 80px;
    }
    .grid-sidle {
        flex: 1;
    }
}
.chart-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    padding: 8px;
    margin-bottom: 5px;
    border-radius: 4px;
    
    .chart-info {
        display: flex;
        flex-direction: column;
        .chart-title {
            font-size: 14px;
        }
        .chart-type {
            font-size: 12px;
            color: #aaa;
        }
    }
}
.target-text {
    font-size: 12px;
    &.empty {
        color: #aaa;
    }
}
</style>
