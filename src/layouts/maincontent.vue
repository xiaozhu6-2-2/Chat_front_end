<template>
  <v-app>
    <v-main class="main-layout">
      <v-container class="pa-0 fill-height" fluid>
        <v-row class="fill-height" no-gutters>
          <!-- 侧边栏 -->
          <transition name="sidebar-collapse">
            <v-col
              v-if="!sidebarStore.isCollapsed"
              class="detailbar-container"
              v-bind="sidebarCols"
            >
            <div class="search-section">
              <!-- 所有的 Vuetify 输入组件都有一个 details 部分，在搜索框的下方，用来显示提示 -->
              <v-text-field
                class="searchInput"
                clearable
                density="comfortable"
                hint="搜索用户、群组、群组"
                label="搜索"
                prepend-inner-icon="mdi-magnify"
                variant="solo"
              />
              <v-menu location="bottom">
                <template #activator="{ props }">
                  <v-btn class="ma-3 search-plus" variant="elevated" v-bind="props">
                    <v-icon>mdi-plus</v-icon>
                  </v-btn>
                </template>
                <v-list density="comfortable">
                  <v-list-item v-for="(item, i) in menuItems" :key="i" @click="$router.push(item.action)">
                    <v-list-item-title>{{ item.title }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>

              <!-- 侧边栏折叠按钮 -->
              <v-tooltip>
                <template #activator="{ props }">
                  <v-btn
                    class="ma-3 collapse-btn"
                    variant="elevated"
                    v-bind="props"
                    @click="toggleSidebar"
                  >
                    <v-icon>mdi-chevron-left</v-icon>
                  </v-btn>
                </template>
                <span>折叠侧边栏</span>
              </v-tooltip>

            </div>
            <transition name="list-expand">
              <div v-if="showList" class="detail-list">
                <slot name="detailbar" />
              </div>
            </transition>
          </v-col>
          </transition>

          <!-- 主内容区域 -->
          <v-col
            class="main-content"
            v-bind="mainCols"
          >
            <slot name="main" />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useSidebarStore } from '@/stores/sidebarStore'

  const sidebarStore = useSidebarStore()
  const showList = ref(false)

  onMounted(() => {
    // 组件挂载后显示列表，触发动画
    setTimeout(() => {
      showList.value = true
    }, 100)
  })

  // 切换侧边栏状态
  function toggleSidebar() {
    sidebarStore.toggle()
  }

  // 计算侧边栏栅格列数
  const sidebarCols = computed(() => {
    if (sidebarStore.isCollapsed) {
      return { cols: 0, lg: 0, md: 0, sm: 0 }
    }
    return { cols: 12, lg: 2, md: 4, sm: 1 }
  })

  // 计算主内容栅格列数
  const mainCols = computed(() => {
    if (sidebarStore.isCollapsed) {
      return { cols: 12, lg: 12, md: 12, sm: 12 }
    }
    return { cols: 12, lg: 10, md: 8, sm: 11 }
  })

  const menuItems = ref([
    { title: '创建群聊', action: '/CreateGroup' },
    { title: '添加朋友', action: '/AddFriend' },
  ])
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

/* 折叠按钮样式 */
.collapse-btn {
  position: relative;
  top: -5px;
}

/* 侧边栏过渡动画 */
.detailbar-container {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.main-content {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 侧边栏折叠动画 */
.sidebar-collapse-enter-active,
.sidebar-collapse-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-collapse-enter-from,
.sidebar-collapse-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.sidebar-collapse-enter-to,
.sidebar-collapse-leave-from {
  opacity: 1;
  transform: translateX(0);
}
</style>
