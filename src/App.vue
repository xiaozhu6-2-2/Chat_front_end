<template>
  <v-app id="app">
    <router-view />
  </v-app>
</template>

<script lang="ts" setup>
//
</script>

<style>
/* 隐藏浏览器滚动条 */
body::-webkit-scrollbar {
  display: none;
}
</style>