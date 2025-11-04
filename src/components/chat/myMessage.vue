<!-- prama:接收一个message对象 -->
<template>
    <div class="message my-message">
      <div class="message-content">
        <div class="message-text">{{ message.text }}</div>
        <div class="message-status">
          <div class="message-time">{{ formatTime(message.time) }}</div>
          <div class="read-status">
            <v-icon v-if="message.read" size="12" color="primary">mdi-check-all</v-icon>
            <v-icon v-else size="12" color="grey">mdi-check</v-icon>
            <span class="read-text">{{ message.read ? '已读' : '未读' }}</span>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  interface Message {
    id: string;
    text: string;
    time: Date;
    sender: 'me';
    read: boolean;
  }
  
  defineProps<{
    message: Message;
  }>();
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  </script>
  
  <style scoped>
  .my-message {
    align-self: flex-end;
  }
  
  .message-content {
    padding: 10px 15px;
    border-radius: 5px;
    background-color: #95ec69;
    border-top-right-radius: 0;
    max-width: 100%;
  }
  
  .message-text {
    font-size: 14px;
    line-height: 1.5;
    word-break: break-word;
    color: black;
  }
  
  .message-status {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    margin-top: 4px;
  }
  
  .message-time {
    font-size: 10px;
    color: #888;
  }
  
  .read-status {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  
  .read-text {
    font-size: 10px;
    color: #666;
  }
  </style>