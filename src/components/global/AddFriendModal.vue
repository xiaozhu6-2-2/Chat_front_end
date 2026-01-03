<template>
  <v-dialog
    v-model="dialog"
    persistent
    transition="dialog-bottom-transition"
    width="500"
  >
    <v-card class="add-friend-modal">
      <v-card-item>
        <div class="d-flex align-center">
          <Avatar
            class="mr-3"
            :name="user.name || '用户'"
            :size="48"
            :url="avatarUrl"
          />
          <v-card-title>添加好友</v-card-title>
        </div>
        <v-btn
          class="close-btn"
          icon="mdi-close"
          size="small"
          variant="text"
          @click="closeDialog"
        />
      </v-card-item>

      <v-divider />

      <v-card-text>
        <v-form v-model="formValid">
          <!-- 验证消息 -->
          <v-textarea
            v-model="requestMessage"
            class="mb-4"
            counter
            label="验证消息"
            maxlength="200"
            placeholder="你好，我想添加你为好友..."
            :rules="messageRules"
            rows="3"
            variant="outlined"
          />

          <!-- 标签分组选择 -->
          <p class="mb-2 text-caption text-grey">
            标签分组（可选）
          </p>
          <v-combobox
            v-model="selectedTags"
            chips
            clearable
            :items="recentTags"
            label="选择或输入标签"
            multiple
            placeholder="选择标签或输入新标签"
            :rules="tagRules"
            variant="outlined"
          >
            <template #chip="{ props: chipProps, item }">
              <v-chip
                v-bind="chipProps"
                :color="getTagColor(item.raw)"
                size="small"
              >
                <v-icon class="mr-1" icon="mdi-tag" size="12" />
                {{ item.raw }}
              </v-chip>
            </template>
          </v-combobox>
          
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          :disabled="sending"
          variant="outlined"
          @click="closeDialog"
        >
          取消
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!formValid || sending"
          :loading="sending"
          variant="elevated"
          @click="handleSendRequest"
        >
          发送请求
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import type { AddFriendModalEmits, AddFriendModalProps } from '../../types/global'
  import { useFriendStore } from '../../stores/friendStore'

  import { computed, ref } from 'vue'

  defineOptions({
    name: 'AddFriendModal',
  })

  const props = defineProps<AddFriendModalProps>()
  const emit = defineEmits<AddFriendModalEmits>()

  // 状态管理
  const formValid = ref(false)
  const sending = ref(false)
  const requestMessage = ref('你好，我想添加你为好友')
  const selectedTags = ref<string[]>([])

  // 获取常用标签
  const friendStore = useFriendStore()
  const recentTags = computed(() => friendStore.getAllTags)

  // 对话框状态
  const dialog = computed({
    get: () => props.modelValue,
    set: value => emit('update:modelValue', value),
  })

  // 验证规则
  const messageRules = [
    (v: string) => !!v || '请输入验证消息',
    (v: string) => v.length <= 200 || '验证消息不能超过200个字符',
  ]

  const tagRules = [
    (tags: string[]) => tags.every(tag => tag.length <= 10) || '标签长度不能超过10个字符',
    (tags: string[]) => tags.every(tag => /^[\u4E00-\u9FA5a-zA-Z0-9\s]+$/.test(tag)) || '标签只能包含中文、英文、数字和空格',
  ]

  // 获取标签颜色
  function getTagColor (tag: string): string {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'purple', 'indigo', 'teal']
    const hash = (tag || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[Math.abs(hash) % colors.length]
  }

  // 获取头像 URL，处理可能的 undefined
  const avatarUrl = computed(() => props.user.avatar || '')

  // 关闭对话框
  function closeDialog() {
    dialog.value = false
    // 重置表单
    requestMessage.value = '你好，我想添加你为好友'
    selectedTags.value = []
  }

  // 发送好友请求
  async function handleSendRequest() {
    if (!formValid.value) return

    sending.value = true
    try {
      emit('send-request', props.user, requestMessage.value, selectedTags.value)
      closeDialog()
    } finally {
      sending.value = false
    }
  }
</script>

<style scoped>
.add-friend-modal {
  border-radius: 12px !important;
}

.close-btn {
  position: absolute;
  top: 0;
  right: 0;
}
</style>
