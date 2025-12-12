<template>
  <v-card class="chat-container" elevation="0">
    <!-- 顶部聊天信息栏 -->
    <v-toolbar density="compact" class="chat-header">
      <Avatar
        :url="currentChat?.avatar"
        :name="currentChat?.name"
        :size="40"
        :clickable="false"
        avatar-class="custom-avatar ml-6"
        v-bind="props"
      />
      <v-toolbar-title>{{ currentChat?.name }}</v-toolbar-title>
      <v-spacer></v-spacer>

      <v-btn icon @click="toggleOnlineBoard">
        <v-icon>mdi-dots-horizontal</v-icon>
      </v-btn>
    </v-toolbar>
    <v-divider></v-divider>

    <!-- 聊天内容区域 -->
    <div class="messages-container">
      <div v-if="messages.length === 0" class="empty-state">
        <p>暂无消息，开始聊天吧！</p>
      </div>

      <!-- 虚拟滚动消息列表 -->
      <VirtualMessageList
        v-else
        :messages="messages"
        :current-user-id="currentUserId"
        :auto-scroll="autoScroll"
        :container-height="containerHeight"
        @image-preview="handleImagePreview"
        @scroll-near-bottom="handleScrollNearBottom"
        ref="virtualMessageList"
      />

      <!-- Typing Indicator -->
      <!-- todo：检测对方正在输入 -->
      <!-- <div v-if="isTyping" class="typing-indicator">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="typing-text">对方正在输入...</span>
      </div> -->
    </div>

    <!-- 底部输入区域 -->
    <div class="input-container">

      <!-- 表情选择器 -->
      <div v-if="showEmojiPicker" class="emoji-picker">
        <v-btn
          v-for="emoji in emojis"
          :key="emoji"
          variant="text"
          @click="insertEmoji(emoji)"
        >
          {{ emoji }}
        </v-btn>
      </div>

      <!-- 输入框 -->
      <!-- <v-textarea
        v-model="message"
        variant="plain"
        placeholder="输入消息..."
        auto-grow
        rows="1"
        hide-details
        class="message-input"
        @keydown.enter.exact.prevent="handleSendMessage"
        @input="handleTyping"
      /> -->
      <echatInput
        @keydown.enter.exact.prevent="handleSendMessage"
        v-model="message"
      />

    </div>

    <!-- Online Board -->
    <OnlineBoard v-model="showOnlineBoard" />
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useChat } from "@/composables/useChat";
import { useMessageInput } from "@/composables/useMessageInput";
import { useChatStore } from "@/stores/chatStore";
import { messageService } from "../../service/message";
import { ChatType } from "../../service/messageTypes";
import Avatar from "../../components/global/Avatar.vue";
import ContactCardModal from "../../components/global/ContactCardModal.vue";
import OnlineBoard from "./onlineBoard.vue";
import echatInput from "./echatInput.vue";

import VirtualMessageList from "./VirtualMessageList.vue";
import type { Chat } from "../../service/messageTypes";
import type { LocalMessage } from "../../service/messageTypes";
import type { ChatAreaProps } from "@/types/componentProps";

const props = defineProps<ChatAreaProps>();

const emit = defineEmits<{
  imagePreview: [imageUrl: string];
}>();

// Store and composables
const chatStore = useChatStore();
const { currentChat, messages, sendMessage, selectChat } = useChat();
const {
  message,
  showEmojiPicker,
  emojis,
  insertEmoji,
  toggleEmojiPicker,
  scrollToBottom,
} = useMessageInput();

// Local state
const showOnlineBoard = ref(false);
const showContactCard = ref(false);
// const isTyping = ref(false)
const isSending = ref(false);
const typingTimeout = ref<number>();
const virtualMessageList = ref();

// 当前聊天联系人信息
const currentChatContact = computed(() => {
  if (!props.chat) return null;
  return {
    uid: props.chat.id,
    username: props.chat.name,
    account: props.chat.name.toLowerCase().replace(/\s+/g, "_"),
    gender: "other" as const,
    region: "",
    email: `${props.chat.name.toLowerCase()}@example.com`,
    create_time: new Date().toISOString(),
    avatar: props.chat.avatar,
    bio: `${props.chat.name}的聊天`,
  };
});

// 虚拟滚动配置
const currentUserId = ref("current-user");
const autoScroll = ref(true);
const containerHeight = computed(() => {
  // 计算容器高度，减去头部、输入框等高度
  const headerHeight = 64; // v-toolbar 高度
  const inputHeight = 120; // 输入区域估计高度
  const padding = 32; // 上下边距
  return window.innerHeight - headerHeight - inputHeight - padding - 60; // 侧边栏宽度
});

// Computed
const isLoading = computed(() => chatStore.isLoading);

// Watch for chat changes
watch(
  () => props.chat,
  (newChat) => {
    if (newChat) {
      // The useChat composable will handle setting the current chat
      // Call selectChat to load history messages
      selectChat(newChat);
    }
  },
  { immediate: true }
);

// Watch for messages to scroll to bottom
watch(
  messages,
  () => {
    if (autoScroll.value) {
      virtualMessageList.value?.scrollToBottom();
    }
  },
  { deep: true }
);

// 处理虚拟滚动接近底部事件
const handleScrollNearBottom = (isNearBottom: boolean) => {
  autoScroll.value = isNearBottom;
};

// Methods
const handleSendMessage = async () => {
  if (!message.value.trim() || isSending.value) return;

  isSending.value = true;
  try {
    await sendMessage(message.value);
    message.value = "";
  } catch (error) {
    console.error("Failed to send message:", error);
  } finally {
    isSending.value = false;
  }
};

const handleTyping = () => {
  // Clear existing timeout
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value);
  }

  //todo：检测对方正在输入
  // Show typing indicator
  // isTyping.value = true;

  // Hide after 3 seconds of no typing
  // typingTimeout.value = window.setTimeout(() => {
  //   isTyping.value = false;
  // }, 3000) as unknown as number;
};

const toggleOnlineBoard = () => {
  showOnlineBoard.value = !showOnlineBoard.value;
  chatStore.setOnlineBoardVisible(showOnlineBoard.value);
};

const handleImagePreview = (imageUrl: string) => {
  emit("imagePreview", imageUrl);
};

const handleFileUpload = () => {
  // TODO: Implement file upload
  console.log("File upload clicked");
};

const handleVoiceRecord = () => {
  // TODO: Implement voice recording
  console.log("Voice record clicked");
};

// Lifecycle
onMounted(() => {
  // 初始化消息服务（如果需要）
  if (!messageService.isInitialized) {
    // 这里可以添加初始化逻辑，比如传入 token 和 userId
    console.log("Message service not initialized yet");
  }

  // 延迟滚动到底部，确保组件已渲染
  setTimeout(() => {
    virtualMessageList.value?.scrollToBottom();
  }, 100);
});
</script>

<style lang="scss" scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 0;
}

.chat-header {
  background-color: #1a1a25;
  padding-top: 8px;
  padding-bottom: 8px;
}

.custom-avatar {
  border-radius: 4px !important;
  overflow: hidden;
}

.messages-container {
  flex: 1;
  overflow-y: hidden;
  background-color: #1a1a25;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.input-container {
  background-color: #1a1a25;
  padding: 10px;
}

.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  background-color: #2a2a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 5px;
  margin-bottom: 10px;
  max-height: 150px;
  overflow-y: auto;
}

.message-input {
  margin: 8px 0;
}
</style>