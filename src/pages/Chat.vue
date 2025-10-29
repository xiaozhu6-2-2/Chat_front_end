<template>
  <div class="wrapper">
    <h2>聊天页面</h2>
    
    <!-- 控制区域 -->
    <div class="controls">
      <button class="button" @click="toggleChatType">{{ contentType }}</button>
      <input 
        class="chatId-input"
        type="text"
        v-model="chatId"
        :placeholder="contentType === 'Group' ? '输入群聊ID' : '输入用户ID'"
      />
    </div>

    <!-- 消息列表区域 -->
    <div class="message-container">
      <div class="message-queue">
        <div 
          v-for="(msg, index) in reversedMessageQueue" 
          :key="msg.payload.messageId || index"
          class="message"
          :class="getMessageClass(msg)"
        >
          <div class="message-header">
            <span class="sender">{{ msg.payload.senderId }}</span>
            <span class="arrow">→</span>
            <span class="receiver">{{ msg.payload.receiverId }}</span>
          </div>
          <div class="message-content">
            {{ msg.payload.detail }}
          </div>
          <div class="message-time">
            {{ formatTime(msg.payload.timestamp) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang='ts'>
import { ref, computed, watch } from 'vue'; 
import type { Message } from '@/service/message';
import { messageService, MessageText } from '@/service/message';

console.log('chat page');

// 响应式数据
const contentType = ref<"Group" | "Private">("Group");
const chatId = ref("");
const userId = localStorage.getItem("userId");
if(!userId){
  throw new Error("chat界面userId为空");
  //后续处理可以考虑重定向到login
}

// 切换聊天类型
const toggleChatType = () => {
  contentType.value = contentType.value === "Group" ? "Private" : "Group";
  // 切换类型后重新获取历史消息
  fetchHistoryMessages();
};

// 获取历史消息的函数
const fetchHistoryMessages = () => {
  if (contentType.value === "Group") {
    messageService.fetchHistoryGroupMessages(chatId.value);
  } else {
    messageService.fetchHistoryPrivateMessages(chatId.value);
  }
};

// 监听 chatId 变化，自动获取对应聊天记录
watch(chatId, (newChatId) => {
  if (newChatId) {
    fetchHistoryMessages();
  }
});

// 测试数据 - 在实际应用中这些会通过WS接收
const messagesTest: MessageText[] = [
  new MessageText("Private", {
    senderId: userId,
    receiverId: "1002",
    chatType: "Private",
    detail: "你好，这是一条私聊消息。",
  }),
  new MessageText("Group", {
    senderId: userId,
    receiverId: "group1",
    chatType: "Group",
    detail: "大家好，这是一条群聊消息。",
  }),
  new MessageText("Group", {
    senderId: userId,
    receiverId: "group1",
    chatType: "Group",
    detail: "这是最新的群聊消息！",
  }),
];

// 发送测试消息
messagesTest.forEach(message => {
  messageService.sendWithUpdate(message);
});

// 获取原始消息列表
const messageQueue = computed((): Message[] => {
  return messageService.getMessages(contentType.value, chatId).value || [];
});

// 反转消息列表，使新消息显示在顶部
const reversedMessageQueue = computed((): Message[] => {
  return [...messageQueue.value].reverse();
});

// 消息样式类
const getMessageClass = (msg: Message) => {
  return {
    'private-message': msg.payload.chatType === 'Private',
    'group-message': msg.payload.chatType === 'Group'
  };
};

// 格式化时间显示
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};
</script>

<style scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.controls {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.chatId-input {
  height: 40px;
  width: 200px;
  padding: 0 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.button {
  height: 40px;
  width: 100px;
  background-color: rgb(54, 120, 178);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.button:hover {
  background-color: rgb(45, 100, 150);
}

.message-container {
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background-color: #fafafa;
}

.message-queue {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 10px;
}

.message {
  padding: 12px 16px;
  margin-bottom: 10px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  background-color: white;
}

.private-message {
  border-left: 4px solid #ff6b6b;
  background-color: #fff5f5;
}

.group-message {
  border-left: 4px solid #4ecdc4;
  background-color: #f0fffe;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}

.sender {
  font-weight: bold;
  color: #333;
}

.receiver {
  color: #666;
}

.arrow {
  color: #999;
}

.message-content {
  margin-bottom: 8px;
  line-height: 1.4;
  color: #333;
}

.message-time {
  font-size: 12px;
  color: #888;
  text-align: right;
}
</style>