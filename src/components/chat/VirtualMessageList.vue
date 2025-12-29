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
          :key="item.payload.message_id"
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
  import type { VirtualMessageListProps } from '../../types/chat'
  import type { LocalMessage } from '../../types/message'
  import { nextTick, onMounted, ref, watch } from 'vue'
  import MessageBubble from './Message/MessageBubble.vue'

  const props = withDefaults(defineProps<VirtualMessageListProps>(), {
    currentUserId: 'current-user',
    autoScroll: true,
    containerHeight: 500,
    hasMore: false,
    isLoadingMore: false,
  })

  const emit = defineEmits<{
    imagePreview: [imageUrl: string]
    scrollNearBottom: [isNearBottom: boolean]
    scrollNearTop: [isNearTop: boolean]
  }>()

  // 组件的实例ref
  const virtualScrollRef = ref()
  const showScrollToBottom = ref(false)
  const isNearBottom = ref(true)
  const isNearTop = ref(false)

  // 保存滚动状态，用于加载历史消息后恢复位置
  const previousScrollHeight = ref(0)
  const scrollPositionBeforeLoad = ref(0)
  const firstVisibleItemIndex = ref(0)

  // 用于控制是否处理滚动事件（设置滚动位置时禁用）
  const shouldHandleScroll = ref(true)

  // 检查是否接近底部
  function checkIsNearBottom () {
    if (!virtualScrollRef.value) return

    const scrollElement = virtualScrollRef.value.$el
    if (!scrollElement) return

    const { scrollTop, scrollHeight, clientHeight } = scrollElement
    const threshold = 100 // 距离底部100px认为接近底部

    isNearBottom.value = scrollTop + clientHeight >= scrollHeight - threshold
    showScrollToBottom.value = !isNearBottom.value

    emit('scrollNearBottom', isNearBottom.value)
  }

  // 检查是否接近顶部
  function checkIsNearTop () {
    if (!virtualScrollRef.value) return

    const scrollElement = virtualScrollRef.value.$el
    if (!scrollElement) return

    const { scrollTop } = scrollElement
    const threshold = 100 // 距离顶部100px时触发加载更多

    const wasNearTop = isNearTop.value
    isNearTop.value = scrollTop <= threshold

    // 只在状态变化时触发 emit
    if (wasNearTop !== isNearTop.value) {
      emit('scrollNearTop', isNearTop.value)
    }
  }

  // 滚动处理
  function handleScroll () {
    if (!shouldHandleScroll.value) return
    checkIsNearBottom()
    checkIsNearTop()
  }

  // 滚动到底部
  async function scrollToBottom () {
    await nextTick()
    if (virtualScrollRef.value && props.messages.length > 0) {
      const scrollContainer = virtualScrollRef.value.$el
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
      showScrollToBottom.value = false
    }
  }

  // 直接设置滚动位置到底部（不触发滚动事件）
  function setScrollToBottomDirectly () {
    // 禁用滚动事件处理
    shouldHandleScroll.value = false

    nextTick(() => {
      if (!virtualScrollRef.value || props.messages.length === 0) {
        shouldHandleScroll.value = true
        return
      }

      // Vuetify v-virtual-scroll 的滚动容器在根元素上
      const scrollContainer = virtualScrollRef.value.$el
      if (!scrollContainer) {
        shouldHandleScroll.value = true
        return
      }

      // 直接设置 scrollTop
      scrollContainer.scrollTop = scrollContainer.scrollHeight

      // 更新内部状态
      showScrollToBottom.value = false
      isNearBottom.value = true

      // 延迟恢复滚动事件处理，确保设置完成
      setTimeout(() => {
        shouldHandleScroll.value = true
      }, 50)
    })
  }

  // 保存当前滚动状态（在加载更多历史消息前调用）
  function saveScrollState () {
    if (!virtualScrollRef.value) return

    const scrollElement = virtualScrollRef.value.$el
    if (!scrollElement) return

    previousScrollHeight.value = scrollElement.scrollHeight
    scrollPositionBeforeLoad.value = scrollElement.scrollTop

    // 计算当前视野中的第一条消息的索引位置
    // 使用 scrollTop 和 item-height (80px) 来估算
    const approxItemIndex = Math.floor(scrollElement.scrollTop / 80)
    firstVisibleItemIndex.value = approxItemIndex
  }

  // 恢复滚动位置（在加载更多历史消息后调用）
  function restoreScrollPosition () {
    nextTick(() => {
      if (!virtualScrollRef.value) return

      const scrollElement = virtualScrollRef.value.$el
      if (!scrollElement) return

      // 新增的消息数量（从加载前后的消息数量差计算）
      const messagesAdded = props.messages.length - previousScrollHeight.value / 80

      // 如果用户在顶部（scrollTop 接近 0），保持在顶部
      if (scrollPositionBeforeLoad.value < 10) {
        scrollElement.scrollTop = 0
      } else {
        // 否则，滚动到原来的第一条可见消息（索引增加了新增消息数）
        const newScrollTop = (firstVisibleItemIndex.value + messagesAdded) * 80
        scrollElement.scrollTop = newScrollTop
      }
    })
  }

  // 处理图片预览
  function handleImagePreview (imageUrl: string) {
    emit('imagePreview', imageUrl)
  }

  // 监听消息变化，自动滚动到底部
  watch(() => props.messages.length, async (newLength, oldLength) => {
    if (props.autoScroll && newLength > oldLength && isNearBottom.value) {
      await nextTick()
      scrollToBottom()
    }
  }, { flush: 'post' })

  onMounted(() => {
    scrollToBottom()
  })

  // 暴露方法给父组件
  defineExpose({
    scrollToBottom,
    setScrollToBottomDirectly,
    checkIsNearBottom,
    checkIsNearTop,
    saveScrollState,
    restoreScrollPosition,
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
