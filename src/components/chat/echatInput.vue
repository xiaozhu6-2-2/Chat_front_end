<!-- From Uiverse.io by 0xnihilism -->
<template>
  <div class="input__container">
    <div class="shadow__input" />
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="emoji-btn-wrapper">
        <v-btn icon variant="text" @click="toggleEmojiPicker">
          <v-icon>mdi-emoticon-outline</v-icon>
        </v-btn>
        <!-- 表情选择器弹出层 -->
        <v-expand-transition>
          <div v-if="showEmojiPicker" class="emoji-picker-popup">
            <EmojiPicker
              :native="true"
              :theme="'dark'"
              :display-recent="true"
              @select="onSelectEmoji"
            />
          </div>
        </v-expand-transition>
      </div>
      <v-btn icon variant="text" @click="handleFileUpload">
        <v-icon>mdi-file-outline</v-icon>
      </v-btn>
      <!-- @ 功能按钮 - 仅群聊显示 -->
      <v-btn
        v-if="isGroupChat"
        icon
        variant="text"
        @click="openAtDialog"
      >
        <v-icon>mdi-at</v-icon>
      </v-btn>
      <!-- 公告按钮 - 仅群聊且为群主/管理员显示 -->
      <v-btn
        v-if="canPublishAnnouncement"
        icon
        variant="text"
        color="warning"
        @click="openAnnouncementDialog"
      >
        <v-icon>mdi-bullhorn-variant</v-icon>
      </v-btn>
      <v-spacer />
      <!-- <v-btn icon variant="text">
        <v-icon>mdi-dots-horizontal</v-icon>
      </v-btn> -->
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      style="display: none"
      @change="handleFileSelected"
    >

    <!-- 成员选择弹窗 -->
    <v-dialog v-model="showAtDialog" max-width="400" scrim>
      <v-card>
        <v-card-title>选择要@的成员</v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item
              v-for="member in groupMembers"
              :key="member.id"
              @click="selectMember(member)"
            >
              <template #prepend>
                <Avatar
                  :name="member.name"
                  :url="member.avatar"
                  :size="40"
                  avatar-class="custom-avatar"
                  class="mr-3"
                />
              </template>
              <v-list-item-title>
                {{ member.nickname || member.name }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showAtDialog = false">取消</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 公告弹窗 -->
    <v-dialog v-model="showAnnouncementDialog" max-width="500">
      <v-card>
        <v-card-title class="pa-0">
          <div class="announcement-dialog-header">
            <span class="text-h6">发布群公告</span>
            <v-btn icon variant="text" @click="showAnnouncementDialog = false" class="close-btn">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card-title>

        <v-card-text>
          <v-textarea
            v-model="announcementContent"
            label="公告内容"
            counter="500"
            rows="4"
            auto-grow
            variant="outlined"
            placeholder="请输入群公告内容..."
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAnnouncementDialog = false">取消</v-btn>
          <v-btn
            color="warning"
            variant="elevated"
            :disabled="!announcementContent.trim()"
            @click="handleSendAnnouncement"
          >
            发布
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
  import { computed, ref } from 'vue'
  import EmojiPicker from 'vue3-emoji-picker'
  import 'vue3-emoji-picker/css'
  import { useChat } from '@/composables/useChat'
  import { useGroupStore } from '@/stores/groupStore'
  import { useGroup } from '@/composables/useGroup'
  import { useAuthStore } from '@/stores/authStore'

  const props = defineProps({
    modelValue: {
      type: String,
      default: '',
    },
    chatId: {
      type: String,
      default: '',
    },
    chatType: {
      type: String,
      default: 'private',
    },
  })
  const emit = defineEmits(['update:modelValue', 'keydown.enter.exact.prevent', 'send-message', 'send-file', 'send-announcement'])

  // 获取聊天信息
  const { activeChatId, activeChatType } = useChat()
  const groupStore = useGroupStore()
  const { getGroupMembers, checkPermissions } = useGroup()
  const authStore = useAuthStore()

  // 是否是群聊
  const isGroupChat = computed(() => {
    return props.chatType === 'group' || activeChatType.value === 'group'
  })

  // 是否可以发布公告（群主或管理员）
  const canPublishAnnouncement = computed(() => {
    const gid = props.chatId || activeChatId.value
    if (!isGroupChat.value || !gid) return false
    const permissions = checkPermissions(gid)
    return permissions.isOwner || permissions.isAdmin
  })

  // @ 弹窗状态
  const showAtDialog = ref(false)

  // 公告弹窗状态
  const showAnnouncementDialog = ref(false)
  const announcementContent = ref('')

  // 已选择的成员
  const selectedMembers = ref([])

  // 群成员列表（排除当前用户，防止自己@自己）
  const groupMembers = computed(() => {
    const gid = props.chatId || activeChatId.value
    if (!isGroupChat.value || !gid) return []
    const allMembers = groupStore.getGroupMembers(gid)
    const currentUserId = authStore.userId
    return allMembers.filter(m => m.id !== currentUserId)
  })

  // 打开 @ 弹窗
  async function openAtDialog() {
    const gid = props.chatId || activeChatId.value
    if (!gid) return

    // 加载群成员
    await getGroupMembers({ gid })

    showAtDialog.value = true
  }

  // 选择成员
  function selectMember(member) {
    selectedMembers.value.push(member)

    // 在输入框中插入 @名字
    const atText = `@${member.nickname || member.name} `
    emit('update:modelValue', (props.modelValue || '') + atText)

    showAtDialog.value = false
  }

  // 打开发布公告弹窗
  function openAnnouncementDialog() {
    showAnnouncementDialog.value = true
  }

  // 发送公告
  function handleSendAnnouncement() {
    const content = announcementContent.value.trim()
    if (!content) {
      return
    }

    // 触发发布公告事件
    emit('send-announcement', content)

    // 清空并关闭
    announcementContent.value = ''
    showAnnouncementDialog.value = false
  }

  // 文件输入引用
  const fileInputRef = ref(null)

  // 表情选择器状态
  const showEmojiPicker = ref(false)

  // 常量：文件大小限制（100MB）
  const MAX_FILE_SIZE = 100 * 1024 * 1024

  // 处理发送按钮点击
  function handleSendMessage () {
    const memberIds = selectedMembers.value.length > 0
      ? selectedMembers.value.map(m => m.id)
      : null

    emit('send-message', {
      content: props.modelValue,
      mentionedUids: memberIds,
    })
    // 清空已选成员
    selectedMembers.value = []
  }

  // 切换表情选择器显示
  function toggleEmojiPicker () {
    showEmojiPicker.value = !showEmojiPicker.value
  }

  // 选择表情
  function onSelectEmoji (emoji) {
    // emoji.i 是表情字符，如 "😊"
    emit('update:modelValue', (props.modelValue || '') + emoji.i)
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

  // 暴露方法给父组件调用
  defineExpose({
    openAnnouncementDialog,
  })
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
    position: relative;
  }

  /* 表情按钮包装器 */
  .emoji-btn-wrapper {
    position: relative;
    display: inline-block;
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

/* 表情选择器弹出层 */
.emoji-picker-popup {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 8px;
    background: #2c2c2e;
    border-radius: 10px;
    padding: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    max-height: 400px;
    max-width: 320px;
    overflow-y: auto;
    z-index: 1000;
  }

  /* 深色主题下的表情选择器样式覆盖 */
  .emoji-picker-popup :deep(.emoji-picker) {
    background: #2c2c2e;
    border: none;
  }

  .emoji-picker-popup :deep(.emoji-picker__search) {
    background: #323234;
    border: none;
  }

  .emoji-picker-popup :deep(.emoji-picker__search input) {
    background: transparent;
    color: #fff;
  }

  .emoji-picker-popup :deep(.emoji-picker__search input::placeholder) {
    color: rgba(255, 255, 255, 0.4);
  }

  /* 滚动条样式 */
  .emoji-picker-popup::-webkit-scrollbar {
    width: 8px;
  }

  .emoji-picker-popup::-webkit-scrollbar-track {
    background: #2c2c2e;
    border-radius: 4px;
  }

  .emoji-picker-popup::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  .emoji-picker-popup::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>

<style scoped>
/* 公告弹窗样式 */
.announcement-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px;
}

.announcement-dialog-header .close-btn {
  margin-left: auto;
}
</style>
