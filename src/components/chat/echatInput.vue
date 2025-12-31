<!-- From Uiverse.io by 0xnihilism -->
<template>
  <div class="input__container">
    <div class="shadow__input" />
    <!-- 工具栏 -->
    <div class="toolbar">
      <v-btn icon variant="text" @click="toggleEmojiPicker">
        <v-icon>mdi-emoticon-outline</v-icon>
      </v-btn>
      <v-btn icon variant="text" @click="handleFileUpload">
        <v-icon>mdi-file-outline</v-icon>
      </v-btn>
      <v-btn icon variant="text" @click="handleVoiceRecord">
        <v-icon>mdi-microphone</v-icon>
      </v-btn>
      <v-spacer />
      <v-btn icon variant="text">
        <v-icon>mdi-dots-horizontal</v-icon>
      </v-btn>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      style="display: none"
      @change="handleFileSelected"
    >
    <input
      class="chat_input"
      name="chat_input"
      placeholder="请输入消息"
      type="text"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      @keydown.enter.exact.prevent="$emit('keydown.enter.exact.prevent', $event)"
    >

    <!-- 发送按钮 -->
    <div class="send-button-container">
      <v-btn
        color="primary"
        variant="flat"
        @click="handleSendMessage"
      >
        发送
      </v-btn>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'

  defineProps({
    modelValue: {
      type: String,
      default: '',
    },
  })
  const emit = defineEmits(['update:modelValue', 'keydown.enter.exact.prevent', 'send-message', 'send-file'])

  // 文件输入引用
  const fileInputRef = ref(null)

  // 常量：文件大小限制（100MB）
  const MAX_FILE_SIZE = 100 * 1024 * 1024

  // 处理发送按钮点击
  function handleSendMessage () {
    emit('send-message')
  }

  // TODO: 待实现功能
  function toggleEmojiPicker () {
    console.warn('表情选择器功能待实现')
  }

  /**
   * 处理文件上传按钮点击
   */
  function handleFileUpload () {
    fileInputRef.value?.click()
  }

  /**
   * 验证文件大小
   */
  function validateFileSize (file) {
    if (file.size > MAX_FILE_SIZE) {
      emit('send-file', null, 'error', `文件大小超出限制（最大 100MB，当前文件：${formatFileSize(file.size)}）`)
      return false
    }
    return true
  }

  /**
   * 格式化文件大小
   */
  function formatFileSize (bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 处理文件选择
   */
  function handleFileSelected (event) {
    const target = event.target
    const file = target.files?.[0]

    if (!file) return

    if (!validateFileSize(file)) {
      target.value = '' // 重置 input
      return
    }

    // 判断文件类型
    const fileType = file.type.startsWith('image/') ? 'image' : 'file'

    // 触发文件上传事件
    emit('send-file', file, fileType)
    target.value = '' // 重置 input
  }

  function handleVoiceRecord () {
    console.warn('语音录制功能待实现')
  }
</script>

<style scoped>
/* 深色主题输入框样式 */
.input__container {
    position: relative;
    background: #1c1c1e;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-radius: 12px;
}

.shadow__input {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    bottom: 0;
    z-index: -1;
    background: rgba(25, 118, 210, 0.1);
    filter: blur(20px);
    border-radius: 12px;
}

.toolbar {
    display: flex;
    padding: 4px 0;
    gap: 8px;
}

.toolbar :deep(.v-btn) {
    color: rgba(255, 255, 255, 0.7);
}

.toolbar :deep(.v-btn:hover) {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.08);
}

.chat_input {
    width: 100%;
    outline: none;
    border: none;
    padding: 14px 16px;
    font-size: 15px;
    background: #2c2c2e;
    color: #fff;
    border-radius: 10px;
    transition: all 200ms ease;
    font-family: inherit;
}

.chat_input::placeholder {
    color: rgba(255, 255, 255, 0.4);
}

.chat_input:focus {
    background: #323234;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.5);
}

.send-button-container {
    display: flex;
    justify-content: flex-end;
}

.send-button-container :deep(.v-btn) {
    min-width: 70px;
    border-radius: 10px;
    font-weight: 500;
}
</style>
