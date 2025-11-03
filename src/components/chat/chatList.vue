<template>
    <div>
        <v-list class="chat-list">
            <v-list-item 
                class="chat-item"
                v-for="chat in allChats"
                :key="chat.id"
                @click="handleItemClick(chat)"
                :title="chat.name"
                :subtitle="chat.lastMessage || '暂无消息'"
                :class="{ 'active-chat': activeItem?.id === chat.id }"
            >
                <template v-slot:prepend>
                    <v-avatar size="40" class="mr-3">
                        <v-img :src="chat.avatar" alt="头像"></v-img>
                    </v-avatar>
                </template>
            </v-list-item>
        </v-list>
    </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue'

interface Chat {
  id: string;
  name: string;
  avatar?: string;
  type: 'private' | 'group';
  lastMessage?: string;
}

interface Props {
  activeItem?: Chat | null;
}

const props = defineProps<Props>()
const emit = defineEmits<{
  itemClick: [type: "chat", data: Chat]
}>()

const allChats = ref<Chat[]>([
    { 
        id: '1', 
        name: '聊天室1',
        type: 'group',
        avatar: 'src/assets/yxd.jpg',
        lastMessage: '这是最新的消息内容'
    },
    { 
        id: '2', 
        name: '聊天室2',
        type: 'private',
        avatar: 'src/assets/yxd.jpg',
        lastMessage: '你好，最近怎么样？'
    },
    // ... 其他聊天室数据
])

const handleItemClick = (chat: Chat) => {
    emit('itemClick', 'chat', chat)
}
</script>

<style lang="scss" scoped>
.chat-list{
    background-color: #1c1c1e;   
}
.chat-item{
    padding: 10px;
    height: 80px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    
    &:hover {
        background-color: #2a2a2e;
    }
    
    &.active-chat {
        background-color: #3a3a3e;
    }
}
</style>