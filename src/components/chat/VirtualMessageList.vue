<template>
  <div class="virtual-message-container">
    <v-virtual-scroll
      ref="virtualScrollRef"
      class="virtual-scroll"
      :height="containerHeight"
      item-height="80"
      :items="messages"
      @scroll="handleScroll"
    >
      <template #default="{ item, index }">
        <div
          :key="item.payload.messageId"
          class="virtual-message-item"
        >
          <MessageBubble
            :current-user-id="currentUserId"
            :message="item"
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
      icon
      size="small"
      @click="scrollToBottom"
    >
      <v-icon>mdi-chevron-down</v-icon>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
  import type { LocalMessage } from '../../types/message'
  import type { VirtualMessageListProps } from '../../types/chat'
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import MessageBubble from './Message/MessageBubble.vue'

  const props = withDefaults(defineProps<VirtualMessageListProps>(), {
    currentUserId: 'current-user',
    autoScroll: true,
    containerHeight: 500,
  })

  const emit = defineEmits<{
    imagePreview: [imageUrl: string]
    scrollNearBottom: [isNearBottom: boolean]
  }>()
  // 组件的实例ref
  const virtualScrollRef = ref()
  const showScrollToBottom = ref(false)
  const isNearBottom = ref(true)

  // 检查是否接近底部
  function checkIsNearBottom () {
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
  function handleScroll () {
    checkIsNearBottom()
  }

  // 滚动到底部
  async function scrollToBottom () {
    await nextTick()
    if (virtualScrollRef.value && props.messages.length > 0) {
      // 找到滚动容器
      const scrollContainer = virtualScrollRef.value.$el?.querySelector('.v-virtual-scroll__container')
      if (scrollContainer) {
        // scrolltop:当前滚动的位置，距离顶部的像素
        // scrollHeight:整个内容的总高度
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
      // 隐藏按钮
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
  function handleImagePreview (imageUrl: string) {
    emit('imagePreview', imageUrl)
  }

  onMounted(() => {
    scrollToBottom()
  })

  // 暴露方法给父组件
  defineExpose({
    scrollToBottom,
    checkIsNearBottom,
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

/* 整个滚动条区域 */
.virtual-scroll::-webkit-scrollbar {
  width: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* 鼠标悬停时显示滚动条 */
.virtual-scroll:hover::-webkit-scrollbar {
  opacity: 1;
}

/* 滚动条轨道 */
.virtual-scroll::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

/* 滚动条滑块 */
.virtual-scroll::-webkit-scrollbar-thumb {
  background: rgba(121, 119, 119, 0.3);
  border-radius: 3px;
  transition: background 0.3s ease;
}

.virtual-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.5);
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
