import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSidebarStore = defineStore('sidebar', () => {
  // 侧边栏折叠状态
  const isCollapsed = ref(false)

  // 切换侧边栏状态
  function toggle() {
    isCollapsed.value = !isCollapsed.value
  }

  // 折叠侧边栏
  function collapse() {
    isCollapsed.value = true
  }

  // 展开侧边栏
  function expand() {
    isCollapsed.value = false
  }

  return {
    isCollapsed,
    toggle,
    collapse,
    expand,
  }
})
