<template>
  <div class="text-message" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LocalMessage } from '@/types/message'
import { useGroupStore } from '@/stores/groupStore'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps<{
  message: LocalMessage
}>()

const groupStore = useGroupStore()
const authStore = useAuthStore()

// 渲染带高亮的文本
const renderedContent = computed(() => {
  const { detail, mentioned_uids, chat_id } = props.message.payload

  // 没有 @任何人，直接返回原文
  if (!mentioned_uids || mentioned_uids.length === 0) {
    return detail || ''
  }

  // 只有当前用户被 @ 时才显示高亮
  const currentUserId = authStore.userId
  if (!currentUserId || !mentioned_uids.includes(currentUserId)) {
    return detail || ''
  }

  let html = detail || ''

  // 获取群成员信息
  const members = chat_id ? groupStore.getGroupMembers(chat_id) : []

  // 为每个 @ 的成员创建高亮
  mentioned_uids.forEach(uid => {
    const member = members.find(m => m.id === uid)
    if (member) {
      const name = member.nickname || member.name
      // 转义特殊字符
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`@${escapedName}`, 'g')
      html = html.replace(regex, `<span class="at-mention">@${name}</span>`)
    }
  })

  return html
})
</script>

<style scoped>
.text-message {
  word-break: break-word;
}

/* 钉钉风格的 @ 高亮：蓝色背景 + 白色文字 */
:deep(.at-mention) {
  color: #ffffff;
  font-weight: 500;
  background: #1976d2;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
