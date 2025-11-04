<template>
  <v-card class="chat-container" elevation="0">
    <!-- 顶部聊天信息栏 -->
    <v-toolbar density="compact" class="chat-header">
      <v-avatar size="40" class="mr-3">
        <v-img :src="currentChat.avatar" alt="头像"></v-img>
      </v-avatar>
      <v-toolbar-title>{{ currentChat.name }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-menu location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list density="comfortable">
          <v-list-item v-for="(item, i) in menuItems" :key="i" @click="handleMenuClick(item.action)">
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-toolbar>
    <v-divider></v-divider>
    <!-- 聊天内容区域 -->
    <div ref="messagesContainer" class="messages-container">
      <MyMessage 
        v-for="message in myMessages" 
        :key="message.id" 
        :message="message" 
      />
      <OtherMessage 
        v-for="message in otherMessages" 
        :key="message.id" 
        :message="message" 
      />
    </div>
    <v-divider></v-divider>
    <!-- 底部输入区域 -->
    <div class="input-container">
      <!-- 工具栏 -->
      <div class="toolbar">
        <v-btn icon variant="text" @click="toggleEmojiPicker">
          <v-icon>mdi-emoticon-outline</v-icon>
        </v-btn>
        <v-btn icon variant="text">
          <v-icon>mdi-image-outline</v-icon>
        </v-btn>
        <v-btn icon variant="text">
          <v-icon>mdi-file-outline</v-icon>
        </v-btn>
        <v-btn icon variant="text">
          <v-icon>mdi-microphone</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn icon variant="text">
          <v-icon>mdi-dots-horizontal</v-icon>
        </v-btn>
      </div>

      <!-- 表情选择器 -->
      <div v-if="showEmojiPicker" class="emoji-picker">
        <v-btn v-for="emoji in emojis" :key="emoji" variant="text" @click="addEmoji(emoji)">
          {{ emoji }}
        </v-btn>
      </div>

      <!-- 输入框 -->
      <v-textarea v-model="newMessage" variant="plain" placeholder="输入消息..." auto-grow rows="1" hide-details
        class="message-input" @keydown.enter.exact.prevent="sendMessage"></v-textarea>

      <!-- 发送按钮 -->
      <div class="send-button-container">
        <v-btn color="primary" variant="flat" :disabled="!newMessage.trim()" @click="sendMessage">
          发送
        </v-btn>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue';
// 接口定义
interface Chat {
  id: string;
  name: string;
  avatar: string;
  type: 'private' | 'group';
}

interface BaseMessage {
  id: string;
  text: string;
  time: Date;
}

interface MyMessageType extends BaseMessage {
  sender: 'me';
  read: boolean;
}

interface OtherMessageType extends BaseMessage {
  sender: 'other';
}

interface Props {
  chat?: {
    id: string;
    name: string;
    avatar?: string;
    type: 'private' | 'group';
  }
}

const props = defineProps<Props>()

type Message = MyMessageType | OtherMessageType;

// 当前聊天对象
const currentChat = ref<Chat>({
  id: '1',
  name: '顶冬季',
  avatar: 'C:/Users/26761/Desktop/chat/echat_web/echat_web/src/assets/yxd.jpg',
  type: 'private'
});

// 菜单项
const menuItems = ref([
  { title: '创建群聊', action: 'createGroup' },
  { title: '添加朋友', action: 'addFriend' },
  { title: '发起直播', action: 'startLive' },
  { title: '设置', action: 'settings' }
]);

// 消息列表
const messages = ref<Message[]>([
  { id: '1', text: '欢迎使用微信！', time: new Date(Date.now() - 60000), sender: 'other' },
  { id: '2', text: '你好！', time: new Date(Date.now() - 30000), sender: 'me', read: true },
  { id: '3', text: '这是一个模仿微信PC端的聊天界面', time: new Date(), sender: 'other' }
]);

// 计算属性：分离消息
const myMessages = computed(() => 
  messages.value.filter(msg => msg.sender === 'me') as MyMessageType[]
);

const otherMessages = computed(() => 
  messages.value.filter(msg => msg.sender === 'other') as OtherMessageType[]
);

// 新消息输入
const newMessage = ref('');

// 表情选择器状态
const showEmojiPicker = ref(false);

// 常用表情
const emojis = ref(['😀', '😂', '😍', '👍', '👏', '🙏', '❤️', '🎉', '🤔', '🤗']);

// 消息容器引用
const messagesContainer = ref<HTMLElement | null>(null);

// 发送消息
const sendMessage = () => {
  if (!newMessage.value.trim()) return;

  const myMessage: MyMessageType = {
    id: Date.now().toString(),
    text: newMessage.value,
    time: new Date(),
    sender: 'me',
    read: false // 初始状态为未读
  };

  messages.value.push(myMessage);

  // 模拟2秒后消息变为已读
  setTimeout(() => {
    const message = messages.value.find(msg => msg.id === myMessage.id);
    if (message && message.sender === 'me') {
      (message as MyMessageType).read = true;
    }
  }, 2000);

  // 模拟对方回复
  setTimeout(() => {
    messages.value.push({
      id: Date.now().toString(),
      text: '收到你的消息: ' + newMessage.value,
      time: new Date(),
      sender: 'other'
    });
    scrollToBottom();
  }, 1000);

  newMessage.value = '';
  scrollToBottom();
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// 切换表情选择器
const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value;
};

// 添加表情
const addEmoji = (emoji: string) => {
  newMessage.value += emoji;
};

// 处理菜单点击
const handleMenuClick = (action: string) => {
  console.log('Menu action:', action);
};

// 监听消息变化，自动滚动到底部
watch(messages, () => {
  scrollToBottom();
}, { deep: true });

// 监听chat prop的变化
watch(() => props.chat, (newChat) => {
  if (newChat) {
    currentChat.value = { ...newChat }
  }
}, { immediate: true })

// 组件挂载时滚动到底部
onMounted(() => {
  scrollToBottom();
});
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 0;
  background-color: #1A1A25;
}

.chat-header {
  background-color: #1A1A25;
  padding-top: 8px;
  padding-bottom: 8px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background-color: #1A1A25;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-container {
  background-color: #1A1A25;
  padding: 10px;
}

.toolbar {
  display: flex;
  padding: 5px 0;
}

.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 5px;
  margin-bottom: 10px;
  max-height: 150px;
  overflow-y: auto;
}

.send-button-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
</style>