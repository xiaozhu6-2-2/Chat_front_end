<template>
  <v-app id="app">
    <router-view />

    <!-- 全局 Snackbar -->
    <v-snackbar
      :model-value="!!snackbarStore.current?.show"
      :color="snackbarStore.current?.color || 'info'"
      :timeout="snackbarStore.current?.timeout || 3000"
      location="top"
      @update:model-value="handleSnackbarUpdate"
    >
      {{ snackbarStore.current?.text }}

      <template v-slot:actions>
        <v-btn
          variant="text"
          icon="mdi-close"
          @click="snackbarStore.close()"
        />
      </template>
    </v-snackbar>
  </v-app>
</template>

<script lang="ts" setup>
import { useSnackbarStore } from '@/stores/snackbarStore'

const snackbarStore = useSnackbarStore()

const handleSnackbarUpdate = (show: boolean) => {
  if (!show) {
    // 立即处理关闭，不需要延迟
    snackbarStore.onClosed()
  }
}
</script>

<style>
html, body, #app,#app > * {
  height: 100%;
  width: 100%;
  overflow: scroll;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

* {
  box-sizing: border-box;
  margin:0;
  padding:0;
}

body::-webkit-scrollbar {
  width: 0 !important;
}

/* 隐藏浏览器滚动条 */
body::-webkit-scrollbar {
  display: none;
}
</style> 