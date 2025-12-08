<template>
  <div class="chat-container">
    <!-- 聊天控制面板 -->
    <div class="chat-controls">
      <div class="control-group">
        <label>聊天类型：</label>
        <select v-model="chatType">
          <option value="Private">私聊</option>
          <option value="Group">群聊</option>
        </select>
      </div>
      
      <div class="control-group">
        <label>聊天ID：</label>
        <input v-model="currentChatId" placeholder="输入聊天ID" />
        <button @click="switchChat">切换聊天</button>
      </div>
    </div>

    <!-- 消息发送区域 -->
    <div class="message-input">
      <div class="input-group">
        <label>接收者ID：</label>
        <input v-model="receiverId" placeholder="接收者用户ID或群ID" />
      </div>
      
      <div class="input-group">
        <label>消息内容：</label>
        <textarea v-model="messageInput" placeholder="输入消息内容" rows="3"></textarea>
      </div>
      
      <button @click="sendMessage" :disabled="!canSend">发送消息</button>
    </div>

    <!-- 消息显示区域 -->
    <div class="messages-container">
      <div class="messages-header">
        <h3>消息列表 - {{ currentChatId || '未选择聊天' }}</h3>
        <span>共 {{ displayedMessages.length }} 条消息</span>
      </div>
      
      <div class="messages-list">
        <div 
          v-for="message in displayedMessages" 
          :key="message.payload.messageId"
          :class="['message-item', getMessageClass(message)]"
        >
          <div class="message-header">
            <span class="sender">{{ message.payload.senderId }}</span>
            <span class="time">{{ formatTime(message.payload.timestamp) }}</span>
          </div>
          <div class="message-content">{{ message.payload.detail }}</div>
          <div class="message-id">ID: {{ message.payload.messageId }}</div>
        </div>
        
        <div v-if="displayedMessages.length === 0" class="no-messages">
          暂无消息
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { messageService, MessageText } from '@/service/message'

// 响应式数据
const chatType = ref<'Private' | 'Group'>('Private')
const currentChatId = ref('')
const receiverId = ref('')
const messageInput = ref('')

// 从localStorage获取当前用户信息
const currentUserId = localStorage.getItem('userid')

// 计算属性
const canSend = computed(() => {
  return receiverId.value.trim() && messageInput.value.trim() && currentUserId
})

// 获取显示的消息列表（新消息在最上方）
const displayedMessages = computed(() => {
  // 从messageService获取当前聊天的消息
  const messages = messageService.getMessages(chatType.value, currentChatId).value
  
  // 按时间戳降序排列（新消息在最上方）
  return [...messages].sort((a, b) => b.payload.timestamp - a.payload.timestamp)
})

// 消息发送函数
const sendMessage = async () => {
  if (!canSend.value) return

  try {
    // 创建文本消息
    const message = new MessageText(chatType.value, {
      senderId: currentUserId!,
      receiverId: receiverId.value,
      chatType: 'text', // 文本消息
      detail: messageInput.value
    })

    // 发送消息（会自动入列）
    messageService.sendWithUpdate(message)
    
    // 清空输入框
    messageInput.value = ''
    
    console.log('消息发送成功:', message)
  } catch (error) {
    console.error('发送消息失败:', error)
    alert('发送消息失败，请检查网络连接')
  }
}

// 切换聊天
const switchChat = async () => {
  if (!currentChatId.value.trim()) {
    alert('请输入聊天ID')
    return
  }

  try {
    // 根据聊天类型加载历史消息
    if (chatType.value === 'Private') {
      await messageService.fetchHistoryPrivateMessages(currentChatId.value)
    } else {
      await messageService.fetchHistoryGroupMessages(currentChatId.value)
    }
    
    console.log(`切换到${chatType.value}聊天: ${currentChatId.value}`)
  } catch (error) {
    console.error('切换聊天失败:', error)
    alert('切换聊天失败')
  }
}

// 工具函数
const getMessageClass = (message: any) => {
  // 判断是否是自己发送的消息
  const isOwn = message.payload.senderId === currentUserId
  return {
    'own-message': isOwn,
    'other-message': !isOwn
  }
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString()
}

// 监听聊天类型变化，清空当前聊天ID
watch(chatType, () => {
  currentChatId.value = ''
})

// 组件挂载时检查登录状态
onMounted(() => {
  if (!currentUserId) {
    alert('请先登录')
    // 这里可以添加路由跳转到登录页
    return
  }
  
  console.log('Chat组件已加载，当前用户:', currentUserId)
})
</script>

<style scoped>
.chat-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  color: #000000; /* 改为黑色 */
}

.chat-controls {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #000000;
}

.control-group label {
  font-weight: bold;
  color: #000000; /* 改为黑色 */
}

.message-input {
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 20px;
}

.input-group {
  margin-bottom: 15px;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #000000; /* 改为黑色 */
}

.input-group input,
.input-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
  color: #000000; /* 改为黑色 */
}

.input-group input::placeholder,
.input-group textarea::placeholder {
  color: #666666; /* 占位符文字颜色稍浅 */
}

button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background: #0056b3;
}

.messages-container {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.messages-header {
  padding: 15px;
  background: #e9ecef;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.messages-header h3 {
  color: #000000; /* 改为黑色 */
}

.messages-header span {
  color: #000000; /* 改为黑色 */
}

.messages-list {
  height: 400px;
  overflow-y: auto;
  padding: 10px;
}

.message-item {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  color: #000000; /* 改为黑色 */
}

.own-message {
  background: #e3f2fd;
  margin-left: 20%;
}

.other-message {
  background: #f5f5f5;
  margin-right: 20%;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.9em;
}

.sender {
  font-weight: bold;
  color: #000000; /* 改为黑色 */
}

.time {
  color: #000000; /* 改为黑色 */
  font-size: 0.8em;
}

.message-content {
  margin-bottom: 5px;
  line-height: 1.4;
  color: #000000; /* 改为黑色 */
}

.message-id {
  font-size: 0.7em;
  color: #000000; /* 改为黑色 */
  text-align: right;
}

.no-messages {
  text-align: center;
  color: #000000; /* 改为黑色 */
  padding: 40px;
}

option {
  color: #000000;
}
</style>
