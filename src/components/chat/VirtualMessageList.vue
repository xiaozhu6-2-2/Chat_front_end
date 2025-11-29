<template>
  <div class="virtual-message-container">
    <v-virtual-scroll
      :items="messages"
      :height="containerHeight"
      item-height="80"
      class="virtual-scroll"
      ref="virtualScrollRef"
      @scroll="handleScroll"
    >
      <template v-slot:default="{ item, index }">
        <div
          :key="item.payload.messageId"
          class="virtual-message-item"
        >
          <MessageBubble
            :message="item"
            :current-user-id="currentUserId"
            @image-preview="handleImagePreview"
          />
        </div>
      </template>
    </v-virtual-scroll>

    <!-- 滚动到底部按钮 -->
    <v-btn
      v-if="showScrollToBottom"
      class="scroll-to-bottom-btn"
      color="primary"
      size="small"
      icon
      @click="scrollToBottom"
    >
      <v-icon>mdi-chevron-down</v-icon>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { LocalMessage } from '../../service/messageTypes'
import MessageBubble from './Message/MessageBubble.vue'
import type { VirtualMessageListProps } from '../../types/componentProps'

const props = withDefaults(defineProps<VirtualMessageListProps>(), {
  currentUserId: 'current-user',
  autoScroll: true,
  containerHeight: 500
})

const emit = defineEmits<{
  imagePreview: [imageUrl: string]
  scrollNearBottom: [isNearBottom: boolean]
}>()

const virtualScrollRef = ref()
const showScrollToBottom = ref(false)
const isNearBottom = ref(true)

// 检查是否接近底部
const checkIsNearBottom = () => {
  if (!virtualScrollRef.value) return

  const scrollElement = virtualScrollRef.value.$el?.querySelector('.v-virtual-scroll__container')
  if (!scrollElement) return

  const { scrollTop, scrollHeight, clientHeight } = scrollElement
  const threshold = 100 // 距离底部100px认为接近底部

  isNearBottom.value = scrollTop + clientHeight >= scrollHeight - threshold
  showScrollToBottom.value = !isNearBottom.value

  emit('scrollNearBottom', isNearBottom.value)
}

// 滚动处理
const handleScroll = () => {
  checkIsNearBottom()
}

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (virtualScrollRef.value && props.messages.length > 0) {
    const scrollContainer = virtualScrollRef.value.$el?.querySelector('.v-virtual-scroll__container')
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
    showScrollToBottom.value = false
  }
}

// 监听消息变化，自动滚动到底部
watch(() => props.messages.length, async (newLength, oldLength) => {
  if (props.autoScroll && newLength > oldLength && isNearBottom.value) {
    await nextTick()
    scrollToBottom()
  }
}, { flush: 'post' })

// 处理图片预览
const handleImagePreview = (imageUrl: string) => {
  emit('imagePreview', imageUrl)
}


onMounted(() => {
  scrollToBottom()
})

// 暴露方法给父组件
defineExpose({
  scrollToBottom,
  checkIsNearBottom
})
</script>

<style lang="scss" scoped>
.virtual-message-container {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.virtual-scroll {
  flex: 1;

  :deep(.v-virtual-scroll__container) {
    padding: 16px;
  }
}

.virtual-message-item {
  display: flex;
  align-items: flex-start;
  padding: 8px 0;
  box-sizing: border-box;
}

.scroll-to-bottom-btn {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 10;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.1);
  }
}

// 确保消息气泡正确显示
:deep(.message-bubble) {
  width: auto;
  max-width: 70%;
  min-width: 120px;
  margin-bottom: 0;
}
</style>