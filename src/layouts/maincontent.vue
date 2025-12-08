<template>
  <v-app>
    <v-main class="main-layout">
      <v-container fluid class="pa-0 fill-height">
        <v-row no-gutters class="fill-height">
          <!-- 侧边栏 -->
          <!--使用栅格布局-->
          <v-col cols="12" md="4" lg="2" sm="1" class="detailbar-container">
            <div class="search-section">
              <!-- 所有的 Vuetify 输入组件都有一个 details 部分，在搜索框的下方，用来显示提示 -->
              <v-text-field class="searchInput" prepend-inner-icon="mdi-magnify" label="搜索" variant="solo" clearable
                density="comfortable" hint="搜索用户、群组、群组"></v-text-field>
              <v-menu location="bottom">
                <template v-slot:activator="{ props }">
                  <v-btn variant="elevated" class="ma-3 search-plus" v-bind="props">
                    <v-icon>mdi-plus</v-icon>
                  </v-btn>
                </template>
                <v-list density="comfortable">
                  <v-list-item v-for="(item, i) in menuItems" :key="i" @click="$router.push(item.action)">
                    <v-list-item-title>{{ item.title }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>

            </div>
            <transition name="list-expand">
              <div class="detail-list" v-if="showList">
                <slot name="detailbar"></slot>
              </div>
            </transition>
          </v-col>

          <!-- 主内容区域 -->
          <v-col cols="12" md="8" lg="10" sm="11" class="main-content">
            <slot name="main"></slot>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
const showList = ref(false)

onMounted(() => {
  // 组件挂载后显示列表，触发动画
  setTimeout(() => {
    showList.value = true
  }, 100)
})


const menuItems = ref([
  { title: '创建群聊', action: 'createGroup' },
  { title: '添加朋友', action: 'addFriend' },
]);
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
  display: flex;
  flex-direction: row;
  padding: 8px;
  margin: 8px;
}

.search-plus {
  position: relative;
  top: -5px;
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
  justify-content: center;
  overflow: hidden;
  background-color: #1A1A25;
}

/* 列表展开动画 */
.list-expand-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0.1s;
}

.list-expand-enter-from {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.list-expand-enter-to {
  opacity: 1;
  transform: translateY(0);
  max-height: 1000px;
  /* 足够大的值确保完全展开 */
}

/* 内容淡入动画 */
.content-fade-enter-active,
.content-fade-leave-active {
  transition: all 0.3s ease;
}

.content-fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.content-fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>