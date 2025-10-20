<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script lang="ts" setup>
  import {websocketService} from "@/service/websocket";
  import { MessageText } from "./service/message";
  onMounted(async () => {
    try{
      await websocketService.connect("awdadadadwadaw");
      console.log("尝试发送消息");
      const testMessage = new MessageText("Hello, gin!", Date.now(), "1");
      if(websocketService.isConnected){
        websocketService.send(testMessage);
      }
    }catch(error){
      console.log(error);
    }
  })
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
</style>