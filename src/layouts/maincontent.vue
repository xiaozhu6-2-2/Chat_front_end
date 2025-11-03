<template>
  <v-app>
    <v-main class="main-layout">
      <v-container fluid class="pa-0 fill-height">
        <v-row no-gutters class="fill-height">
          <!-- 侧边栏 -->
          <!--使用栅格布局-->
          <v-col cols="12" md="4" lg="2" class="detailbar-container">
            <div class="search-section">
              <!-- 所有的 Vuetify 输入组件都有一个 details 部分，在搜索框的下方，用来显示提示 -->
              <v-text-field class="searchInput" prepend-inner-icon="mdi-magnify" label="搜索" variant="outlined" clearable
                density="comfortable"
                hint="搜索用户、群组、群组"></v-text-field>
            </div>
            <div class="detail-list">
              <slot name="detailbar"></slot>
            </div>
          </v-col>

          <!-- 主内容区域 -->
          <v-col cols="12" md="8" lg="10" class="main-content">
            <slot name="main"></slot>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'


</script>

<style scoped>
.main-layout {
  height: 100vh;
  overflow: hidden;
}

.detailbar-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #1c1c1e;
}

.search-section {
  padding: 8px;
}

.detail-list {
  flex: 1;
  overflow-y: auto;
}

/* 整个滚动条区域 */
.detail-list::-webkit-scrollbar {
  width: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* 鼠标悬停时显示滚动条 */
.detail-list:hover::-webkit-scrollbar {
  opacity: 1;
}

/* 滚动条轨道 */
.detail-list::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

/* 滚动条滑块 */
.detail-list::-webkit-scrollbar-thumb {
  background: rgba(121, 119, 119, 0.3);
  border-radius: 3px;
  transition: background 0.3s ease;
}

.detail-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.5);
}


.main-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #1A1A25;
  overflow: hidden;
}
</style>