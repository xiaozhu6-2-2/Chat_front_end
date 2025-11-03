<template>
    <div class="message other-message">
      <div class="message-content">
        <div class="message-text">{{ message.text }}</div>
        <div class="message-time">{{ formatTime(message.time) }}</div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  interface Message {
    id: string;
    text: string;
    time: Date;
    sender: 'other';
  }
  
  defineProps<{
    message: Message;
  }>();
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  </script>
  
  <style scoped>
  .other-message {
    align-self: flex-start;
  }
  
  .message-content {
    padding: 10px 15px;
    border-radius: 5px;
    background-color: rgb(65, 60, 60);
    border-top-left-radius: 0;
  }
  
  .message-text {
    font-size: 14px;
    line-height: 1.5;
    word-break: break-word;
    color: white;
  }
  
  .message-time {
    font-size: 10px;
    color: #ccc;
    text-align: right;
    margin-top: 4px;
  }
  </style>