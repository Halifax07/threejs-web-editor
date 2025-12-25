import * as THREE from "three";
import { CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import * as echarts from "echarts";
import { onlyKey } from "@/utils/utilityFunction";

/**
 * Chart System Module
 * Allows adding ECharts to 3D models using CSS3DObject
 */

function addChartToModel(mesh, config) {
  if (!this.chartRegistry) this.chartRegistry = {};

  const chartId = onlyKey(4, 7);
  const element = document.createElement("div");
  element.className = "chart-3d-container";
  
  // Define explicit dimensions for High-DPI rendering
  // We render at a high resolution (800x500) and scale down in 3D
  const renderWidth = 800;
  const renderHeight = 500;
  
  element.style.width = `${renderWidth}px`;
  element.style.height = `${renderHeight}px`;
  element.style.boxSizing = "border-box"; // Ensure border doesn't affect width
  
  // Apply theme styles
  const isDark = config.theme === 'dark';
  if (isDark) {
      element.style.background = "linear-gradient(135deg, rgba(0, 20, 40, 0.95) 0%, rgba(0, 10, 20, 0.9) 100%)";
      element.style.border = "2px solid rgba(0, 209, 255, 0.6)";
      element.style.boxShadow = "0 0 40px rgba(0, 209, 255, 0.25), inset 0 0 30px rgba(0, 209, 255, 0.1)";
      element.style.color = "#fff";
      element.style.borderRadius = "16px";
  } else {
      element.style.backgroundColor = "rgba(255, 255, 255, 0.98)";
      element.style.borderRadius = "16px";
      element.style.boxShadow = "0 10px 30px rgba(0,0,0,0.15)";
      element.style.color = "#333";
      element.style.border = "1px solid #e0e0e0";
  }
  
  // Ensure it receives pointer events
  element.style.pointerEvents = "auto";
  // Prevent text selection
  element.style.userSelect = "none";

  const chartDiv = document.createElement("div");
  chartDiv.style.width = "100%";
  chartDiv.style.height = "100%";
  element.appendChild(chartDiv);

  // Initialize ECharts with explicit dimensions to prevent 0-size issues in detached DOM
  const chartInstance = echarts.init(chartDiv, isDark ? 'dark' : null, {
      width: renderWidth,
      height: renderHeight,
      devicePixelRatio: window.devicePixelRatio || 1
  });
  
  // Build Option based on type
  let option = {};
  // Use grid to create internal padding since we removed container padding
  const commonGrid = { top: 90, bottom: 50, left: 40, right: 40, containLabel: true };
  
  if (config.type === 'gauge') {
      option = {
          title: { 
              text: config.title || "仪表盘", 
              left: 'center', 
              top: 20,
              textStyle: { color: isDark ? '#fff' : '#333', fontSize: 32, fontWeight: 'bold' } 
          },
          series: [
            {
              type: 'gauge',
              radius: '85%',
              center: ['50%', '60%'],
              startAngle: 180,
              endAngle: 0,
              min: 0,
              max: 100,
              splitNumber: 5,
              itemStyle: {
                  color: isDark ? '#00d1ff' : '#5470c6'
              },
              progress: {
                  show: true,
                  width: 25
              },
              pointer: {
                  show: false
              },
              axisLine: {
                  lineStyle: {
                      width: 25
                  }
              },
              axisTick: {
                  show: false
              },
              splitLine: {
                  length: 15,
                  lineStyle: {
                      width: 4,
                      color: '#999'
                  }
              },
              axisLabel: {
                  distance: 30,
                  color: '#999',
                  fontSize: 20
              },
              title: {
                  show: false
              },
              detail: {
                  valueAnimation: true,
                  fontSize: 60,
                  offsetCenter: [0, '20%'],
                  formatter: '{value}',
                  color: isDark ? '#fff' : '#333',
                  fontWeight: 'bold'
              },
              data: [{ value: (config.data && config.data.length > 0) ? config.data[0] : 50 }]
            }
          ]
      };
  } else {
      option = {
        title: { 
            text: config.title || "图表", 
            left: 'center',
            top: 20,
            textStyle: { color: isDark ? '#fff' : '#333', fontSize: 32, fontWeight: 'bold' } 
        },
        grid: commonGrid,
        tooltip: { 
            trigger: 'axis', 
            confine: true,
            textStyle: { fontSize: 20 },
            padding: 15
        },
        xAxis: { 
            type: 'category', 
            data: config.xAxis || ["Mon", "Tue", "Wed", "Thu", "Fri"],
            axisLabel: { fontSize: 20, interval: 0, margin: 20 }
        },
        yAxis: { 
            type: 'value',
            splitLine: { show: !isDark, lineStyle: { type: 'dashed', opacity: 0.3 } },
            axisLabel: { fontSize: 20 }
        },
        series: [
          {
            name: "数据",
            type: config.type || "bar",
            data: config.data || [10, 52, 200, 334, 390],
            itemStyle: {
                borderRadius: config.type === 'bar' ? [10, 10, 0, 0] : 0
            },
            barWidth: '40%',
            smooth: true,
            areaStyle: config.type === 'line' ? { opacity: 0.3 } : null,
            lineStyle: config.type === 'line' ? { width: 6 } : null
          },
        ],
      };
      if (isDark) {
          option.backgroundColor = 'transparent';
      }
  }
  
  chartInstance.setOption(option);

  // Interaction: Click on chart triggers model flash
  chartInstance.on('click', (params) => {
      console.log('Chart clicked:', params);
      // Trigger visual feedback on the mesh
      if (this.flashModelMesh) {
          this.flashModelMesh(mesh);
      }
  });

  const cssObject = new CSS3DObject(element);

  // Position: Default to top center of the mesh + Offset
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  // Base position (top of mesh)
  const basePos = center.clone();
  basePos.y += size.y / 2;

  // Apply user offset
  const offsetX = config.offset ? (config.offset.x || 0) : 0;
  const offsetY = config.offset ? (config.offset.y || 0) : 0;
  const offsetZ = config.offset ? (config.offset.z || 0) : 0;

  // If no offset provided, default to slightly above
  if (offsetX === 0 && offsetY === 0 && offsetZ === 0) {
      basePos.y += 0.5;
  } else {
      basePos.add(new THREE.Vector3(offsetX, offsetY, offsetZ));
  }

  cssObject.position.copy(basePos);
  
  // Scale calculation:
  // We want the chart to be roughly 1 unit wide in 3D space.
  // Render width is 800px.
  // 800 * 0.00125 = 1.0
  const baseScale = 0.00125;
  const userScale = config.scale !== undefined ? config.scale : 1.0;
  const finalScale = baseScale * userScale;
  
  cssObject.scale.set(finalScale, finalScale, finalScale); 

  this.scene.add(cssObject);
  
  // Create Leader Line
  // Line from mesh center to chart position
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([center, basePos]);
  const lineMaterial = new THREE.LineBasicMaterial({ 
      color: isDark ? 0x00d1ff : 0x000000,
      transparent: true,
      opacity: 0.6
  });
  const leaderLine = new THREE.Line(lineGeometry, lineMaterial);
  this.scene.add(leaderLine);

  if (!this.chartRegistry[mesh.uuid]) {
    this.chartRegistry[mesh.uuid] = [];
  }

  const chartRecord = {
    id: chartId,
    object: cssObject,
    line: leaderLine,
    instance: chartInstance,
    config: config,
  };

  this.chartRegistry[mesh.uuid].push(chartRecord);

  // Default to hidden, only show on interaction in demo mode
  cssObject.visible = false;
  leaderLine.visible = false;

  return chartRecord;
}

function getChartsForObject(meshUuid) {
  if (!this.chartRegistry) return [];
  return this.chartRegistry[meshUuid] || [];
}

function removeChart(meshUuid, chartId) {
  if (!this.chartRegistry || !this.chartRegistry[meshUuid]) return;

  const charts = this.chartRegistry[meshUuid];
  const index = charts.findIndex((c) => c.id === chartId);
  if (index !== -1) {
    const chartItem = charts[index];
    this.scene.remove(chartItem.object);
    if (chartItem.line) this.scene.remove(chartItem.line);
    chartItem.instance.dispose();
    charts.splice(index, 1);
  }
}

function updateChart(meshUuid, chartId, newConfig) {
  if (!this.chartRegistry || !this.chartRegistry[meshUuid]) return;
  const charts = this.chartRegistry[meshUuid];
  const chartItem = charts.find((c) => c.id === chartId);
  if (chartItem) {
    // Remove old object and line to recreate them with new config (simplest way to handle theme/position changes)
    this.scene.remove(chartItem.object);
    if (chartItem.line) this.scene.remove(chartItem.line);
    chartItem.instance.dispose();
    
    // Re-create using addChartToModel logic but we need the mesh.
    // Since we don't have the mesh object easily here without searching, 
    // let's just find the mesh by UUID.
    const mesh = this.scene.getObjectByProperty('uuid', meshUuid);
    if (mesh) {
        // Remove the old record from array temporarily
        const index = charts.findIndex((c) => c.id === chartId);
        charts.splice(index, 1);
        
        // Add new one
        const newRecord = this.addChartToModel(mesh, newConfig);
        // Restore ID to keep it consistent if needed, or just let it be new.
        // But the UI holds the ID. So we should probably update the ID of the new record to match old one?
        // Or just let the UI refresh list.
        newRecord.id = chartId; // Keep ID
    }
  }
}

function setChartDemoMode(isActive) {
  this.isChartDemoMode = isActive;
  if (!this.chartRegistry) return;

  Object.values(this.chartRegistry).flat().forEach(chart => {
    // Always hide charts when switching modes or initializing
    chart.object.visible = false;
    if (chart.line) chart.line.visible = false;
  });
}

function hideAllCharts() {
  if (!this.chartRegistry) return;
  Object.values(this.chartRegistry).flat().forEach(chart => {
    chart.object.visible = false;
    if (chart.line) chart.line.visible = false;
  });
}

function handleChartInteraction(meshUuid) {
  if (!this.chartRegistry) return;
  
  // Try to find the model UUID that has charts associated with it
  let targetUuid = null;
  let object = this.scene.getObjectByProperty('uuid', meshUuid);
  
  while (object) {
      if (this.chartRegistry[object.uuid] && this.chartRegistry[object.uuid].length > 0) {
          targetUuid = object.uuid;
          break;
      }
      object = object.parent;
      if (!object || object.type === 'Scene') break;
  }
  
  // Check visibility BEFORE hiding
  let isTargetVisible = false;
  let targetCharts = null;
  
  if (targetUuid) {
      targetCharts = this.chartRegistry[targetUuid];
      if (targetCharts && targetCharts.length > 0) {
          isTargetVisible = targetCharts.some(c => c.object.visible);
      }
  }

  // Hide all charts first (mutex behavior)
  this.hideAllCharts();

  // If we found a target with charts, and they were NOT visible, show them.
  if (targetUuid && targetCharts && !isTargetVisible) {
      targetCharts.forEach(c => {
          c.object.visible = true;
          if (c.line) c.line.visible = true;
      });
  }
}

function flashModelMesh(mesh) {
    if (!mesh || !mesh.material) return;
    
    // Store original emissive color if not already stored
    if (!mesh.userData.originalEmissive) {
        mesh.userData.originalEmissive = mesh.material.emissive ? mesh.material.emissive.clone() : new THREE.Color(0x000000);
    }
    
    const originalEmissive = mesh.userData.originalEmissive;
    const flashColor = new THREE.Color(0xff0000); // Red flash
    
    // Use TWEEN to flash
    // Flash ON
    new TWEEN.Tween(mesh.material.emissive)
        .to({ r: flashColor.r, g: flashColor.g, b: flashColor.b }, 200)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
            // Flash OFF (Restore)
            new TWEEN.Tween(mesh.material.emissive)
                .to({ r: originalEmissive.r, g: originalEmissive.g, b: originalEmissive.b }, 400)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        })
        .start();
}

export default {
  addChartToModel,
  getChartsForObject,
  removeChart,
  updateChart,
  setChartDemoMode,
  hideAllCharts,
  handleChartInteraction,
  flashModelMesh
};
