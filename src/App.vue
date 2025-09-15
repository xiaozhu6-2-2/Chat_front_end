<!-- src/App.vue -->
<template>
  <router-view></router-view>
</template>

<script>
// 导出模块，在main.js中导入
export default {
  name: 'App'
}
</script>

<style>
/* 全局样式 */
html, body, #app,#app > * {
  height: 100%;     /* 让 html, body, #app 撑满视口 */
  margin: 0;        /* 去掉默认 margin */
}
</style>