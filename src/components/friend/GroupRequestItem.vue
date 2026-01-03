<template>
  <v-card class="group-request-item mb-3" elevation="1">
    <v-card-text class="pa-4">
      <div class="d-flex align-start">
        <!-- 左侧图标：群聊或用户 -->
        <div class="mr-3 flex-shrink-0">
          <!-- 收到的申请：显示申请人头像 -->
          <v-avatar v-if="type === 'received'" :image="getUserAvatar() || undefined" size="48">
            <v-icon v-if="!getUserAvatar()" icon="mdi-account" size="24" />
          </v-avatar>

          <!-- 发送的申请：显示群聊头像 -->
          <v-avatar v-else :image="getGroupAvatar() || undefined" size="48">
            <v-icon v-if="!getGroupAvatar()" icon="mdi-account-group" size="24" />
          </v-avatar>
        </div>

        <!-- 请求信息 -->
        <div class="flex-grow-1">
          <div class="d-flex align-center mb-2">
            <!-- 显示名称 -->
            <h3 class="text-subtitle-1 font-weight-medium mr-2">
              {{ getDisplayName() }}
            </h3>

            <!-- 请求状态 -->
            <v-chip
              :color="getStatusColor()"
              size="small"
              :variant="getStatusVariant()"
            >
              {{ getStatusText() }}
            </v-chip>
          </div>

          <!-- 申请消息 -->
          <p v-if="request.apply_text" class="text-body-2 text-grey-darken-1 mb-2">
            {{ request.apply_text }}
          </p>

          <!-- 关联信息 -->
          <div class="d-flex align-center mb-2">
            <!-- 收到的申请：显示群聊信息 -->
            <div v-if="type === 'received'" class="d-flex align-center">
              <v-icon class="mr-1" icon="mdi-account-group" size="16" />
              <span class="text-body-2 text-grey-darken-1">
                申请加入：{{ request.groupProfile?.name || `群聊${request.gid}` }}
              </span>
            </div>

            <!-- 发送的申请：显示申请人信息 -->
            <div v-else class="d-flex align-center">
              <v-icon class="mr-1" icon="mdi-account" size="16" />
              <span class="text-body-2 text-grey-darken-1">
                申请人：{{ request.userProfile?.name || `用户${request.sender_uid}` }}
              </span>
            </div>
          </div>

          <!-- 请求时间 -->
          <p class="text-caption text-grey mb-3">
            {{ formatRequestTime() }}
          </p>

          <!-- 操作按钮（仅收到的待处理请求显示） -->
          <div v-if="type === 'received' && request.status === 'pending'" class="d-flex gap-2">
            <v-btn
              class="ma-3"
              color="success"
              size="small"
              variant="elevated"
              @click="$emit('accept', request)"
            >
              <v-icon class="ma-1" icon="mdi-check" />
              接受
            </v-btn>

            <v-btn
              class="ma-3"
              color="error"
              size="small"
              variant="outlined"
              @click="$emit('reject', request)"
            >
              <v-icon class="ma-1" icon="mdi-close" />
              拒绝
            </v-btn>
          </div>

          <!-- 已处理状态的提示 -->
          <div v-else-if="type === 'received'" class="d-flex align-center">
            <v-icon
              class="mr-2"
              :color="request.status === 'accepted' ? 'success' : 'error'"
              :icon="request.status === 'accepted' ? 'mdi-check-circle' : 'mdi-close-circle'"
              size="20"
            />
            <span class="text-body-2">
              {{ request.status === 'accepted' ? '已接受' : '已拒绝' }}
              <span v-if="request.create_time">
                ({{ formatHandleTime() }})
              </span>
            </span>
          </div>

          <!-- 发送请求的状态 -->
          <div v-else-if="type === 'sent'" class="d-flex align-center">
            <v-icon
              class="mr-2"
              :color="getStatusColor()"
              :icon="getStatusIcon()"
              size="20"
            />
            <span class="text-body-2">
              {{ getStatusText() }}
              <span v-if="request.create_time">
                ({{ formatHandleTime() }})
              </span>
            </span>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
  import type { GroupRequest, GroupRequestStatus } from '../../types/groupRequest'

  interface GroupRequestItemProps {
    request: GroupRequest
    type: 'received' | 'sent'
  }

  interface GroupRequestItemEmits {
    (e: 'accept', request: GroupRequest): void
    (e: 'reject', request: GroupRequest): void
  }

  const props = defineProps<GroupRequestItemProps>()
  const emit = defineEmits<GroupRequestItemEmits>()

  // 获取显示名称
  function getDisplayName () {
    if (props.type === 'received') {
      // 收到的申请：显示申请人名称
      return props.request.userProfile?.name || `用户${props.request.sender_uid}`
    } else {
      // 发送的申请：显示群聊名称
      return props.request.groupProfile?.name || `群聊${props.request.gid}`
    }
  }

  // 获取用户头像
  function getUserAvatar () {
    if (props.type === 'received' && props.request.userProfile) {
      return props.request.userProfile.avatar
    }
    return null
  }

  // 获取群聊头像
  function getGroupAvatar () {
    if (props.type === 'sent' && props.request.groupProfile) {
      return props.request.groupProfile.avatar
    }
    return null
  }

  // 获取状态颜色
  function getStatusColor () {
    switch (props.request.status) {
      case 'pending': {
        return 'warning'
      }
      case 'accepted': {
        return 'success'
      }
      case 'rejected': {
        return 'error'
      }
      case 'expired': {
        return 'grey'
      }
      default: {
        return 'grey'
      }
    }
  }

  // 获取状态变体
  function getStatusVariant () {
    switch (props.request.status) {
      case 'pending': {
        return 'elevated'
      }
      default: {
        return 'flat'
      }
    }
  }

  // 获取状态文本
  function getStatusText () {
    switch (props.request.status) {
      case 'pending': {
        return props.type === 'sent' ? '等待处理' : '待处理'
      }
      case 'accepted': {
        return '已接受'
      }
      case 'rejected': {
        return '已拒绝'
      }
      case 'expired': {
        return '已过期'
      }
      default: {
        return '未知状态'
      }
    }
  }

  // 获取状态图标
  function getStatusIcon () {
    switch (props.request.status) {
      case 'pending': {
        return 'mdi-clock-outline'
      }
      case 'accepted': {
        return 'mdi-check-circle'
      }
      case 'rejected': {
        return 'mdi-close-circle'
      }
      case 'expired': {
        return 'mdi-timer-off'
      }
      default: {
        return 'mdi-help-circle'
      }
    }
  }

  // 格式化请求时间
  function formatRequestTime () {
    const date = new Date(props.request.create_time * 1000)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes}分钟前`
    } else if (diffHours < 24) {
      return `${diffHours}小时前`
    } else {
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}天前`
    }
  }

  // 格式化处理时间
  function formatHandleTime () {
    if (!props.request.create_time) return ''

    const date = new Date(props.request.create_time * 1000)
    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
</script>

<style scoped>
.group-request-item {
  transition: transform 0.2s ease;
}

.group-request-item:hover {
  transform: translateY(-1px);
}

.flex-shrink-0 {
  flex-shrink: 0;
}
</style>
