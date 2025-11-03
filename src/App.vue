<template>
  <v-app id="app">
    <router-view />
  </v-app>
</template>

<script lang="ts" setup>
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