<template>
  <v-card class="user-search-result-card" elevation="2">
    <v-card-text class="pa-4">
      <!-- 用户信息 -->
      <div class="d-flex align-center mb-3">
        <v-avatar :image="user.avatar" size="48" class="mr-3">
          <v-icon v-if="!user.avatar" icon="mdi-account" size="24"></v-icon>
        </v-avatar>

        <div class="flex-grow-1">
          <h3 class="text-subtitle-1 font-weight-medium mb-1">
            {{ user.username }}
          </h3>
          <p class="text-caption text-grey mb-1">
            @{{ user.account }}
          </p>
          <p class="text-caption text-grey" v-if="user.region">
            <v-icon icon="mdi-map-marker" size="14" class="mr-1"></v-icon>
            {{ user.region }}
          </p>
        </div>

        <!-- 性别图标 -->
        <v-icon
          :icon="getGenderIcon(user.gender)"
          :color="getGenderColor(user.gender)"
          size="20"
          class="ml-2"
        />
      </div>

      <!-- 个人简介 -->
      <p v-if="user.bio" class="text-body-2 text-grey-darken-1 mb-3">
        {{ user.bio }}
      </p>

      <!-- 操作按钮 -->
      <div class="d-flex gap-2">
        <v-btn
          v-if="!user.is_friend && !user.request_sent"
          variant="elevated"
          color="primary"
          class="ma-3"
          size="small"
          @click="showRequestDialog = true"
        >
          <v-icon icon="mdi-account-plus" class="mr-1"></v-icon>
          添加好友
        </v-btn>

        <v-btn
          v-else-if="user.request_sent"
          variant="outlined"
          color="grey"
          class="ma-3"
          size="small"
          disabled
        >
          <v-icon icon="mdi-clock-outline" class="mr-1"></v-icon>
          已发送请求
        </v-btn>

        <v-btn
          v-else-if="user.is_friend"
          variant="outlined"
          color="success"
          class="ma-3"
          size="small"
          disabled
        >
          <v-icon icon="mdi-account-check" class="mr-1"></v-icon>
          已是好友
        </v-btn>

        <v-btn
          v-else-if="user.request_received"
          variant="outlined"
          color="info"
          class="ma-3"
          size="small"
          @click="$emit('handle-request', user)"
        >
          <v-icon icon="mdi-message-reply-text" class="mr-1"></v-icon>
          处理请求
        </v-btn>

        <v-btn
          variant="outlined"
          color="grey"
          class="ma-3"
          size="small"
          @click="showProfileDialog = true"
        >
          <v-icon icon="mdi-account-details" class="mr-1"></v-icon>
          查看资料
        </v-btn>
      </div>
    </v-card-text>

    <!-- 发送好友请求对话框 -->
    <v-dialog v-model="showRequestDialog" max-width="600">
      <v-card>
        <v-card-title class="text-h9 align-self-center">
          申请添加朋友
        </v-card-title>

        <v-card-text>
          <p class="mb-4 text-grey text-subtitle-2">
            发送好友请求
          </p>

          <v-textarea
            v-model="requestMessage"
            placeholder="你好，我想添加你为好友..."
            rows="1"
            variant="outlined"
            counter="200"
          />
        </v-card-text>

        <!-- 决定不在加好友时添加备注 -->
        <!-- <v-card-text>
          <p class="mb-4 text-grey text-subtitle-2">
            备注
          </p>

          <v-textarea
            v-model="remark"
            placeholder="好友备注（不填写则默认为用户名）"
            rows="1"
            variant="outlined"
            counter="10"
          />
        </v-card-text> -->

        <!-- 标签分组选择 -->
        <v-card-text>
          <p class="mb-4 text-grey text-subtitle-2">
            标签分组（可选）
          </p>

          <v-combobox
            v-model="selectedTags"
            :items="recentTags"
            label="选择或输入标签"
            placeholder="选择标签或输入新标签"
            variant="outlined"
            chips
            multiple
            clearable
            counter="10"
            :rules="tagRules"
          >
            <template v-slot:chip="{ props, item }">
              <v-chip
                v-bind="props"
                :color="getTagColor(item.raw)"
                size="small"
              >
                <v-icon icon="mdi-tag" size="12" class="mr-1"></v-icon>
                {{ item.raw }}
              </v-chip>
            </template>
          </v-combobox>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showRequestDialog = false">
            取消
          </v-btn>
          <v-btn
            color="primary"
            @click="handleSendRequest"
            :loading="sending"
          >
            发送
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 用户资料对话框 -->
    <v-dialog v-model="showProfileDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-avatar :image="user.avatar" size="40" class="mr-3">
            <v-icon v-if="!user.avatar" icon="mdi-account"></v-icon>
          </v-avatar>
          {{ user.username }} 的资料
        </v-card-title>

        <v-card-text>
          <v-list>
            <v-list-item>
              <v-list-item-title>账号</v-list-item-title>
              <v-list-item-subtitle>{{ user.account }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="user.email">
              <v-list-item-title>邮箱</v-list-item-title>
              <v-list-item-subtitle>{{ user.email }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="user.region">
              <v-list-item-title>地区</v-list-item-title>
              <v-list-item-subtitle>{{ user.region }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>性别</v-list-item-title>
              <v-list-item-subtitle>{{ getGenderText(user.gender) }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="user.bio">
              <v-list-item-title>个人简介</v-list-item-title>
              <v-list-item-subtitle>{{ user.bio }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>注册时间</v-list-item-title>
              <v-list-item-subtitle>{{ formatDate(user.create_time) }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showProfileDialog = false">
            关闭
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { UserSearchResultCardProps, UserSearchResultCardEmits } from '@/types/componentProps'

const props = defineProps<UserSearchResultCardProps>()
const emit = defineEmits<UserSearchResultCardEmits>()

const showRequestDialog = ref(false)
const showProfileDialog = ref(false)
const requestMessage = ref('')
const sending = ref(false)

// 标签相关数据
const selectedTags = ref<string[]>([])
// TODO: 简单的静态实现，后续可以从friendStore获取真实的最近标签列表
const recentTags = ref<string[]>(['同事', '家人', '同学', '朋友'])

// 标签验证规则
const tagRules = [
  (tags: string[]) => tags.length === 0 || tags.every(tag => tag.length <= 10) || '标签长度不能超过10个字符',
  (tags: string[]) => tags.length === 0 || tags.every(tag => /^[\u4e00-\u9fa5a-zA-Z0-9\s]+$/.test(tag)) || '标签只能包含中文、英文、数字和空格'
]

// 获取性别图标
const getGenderIcon = (gender: string) => {
  switch (gender) {
    case 'male':
      return 'mdi-gender-male'
    case 'female':
      return 'mdi-gender-female'
    default:
      return 'mdi-gender-male-female'
  }
}

// 获取性别颜色
const getGenderColor = (gender: string) => {
  switch (gender) {
    case 'male':
      return 'blue'
    case 'female':
      return 'pink'
    default:
      return 'grey'
  }
}

// 获取性别文本
const getGenderText = (gender: string) => {
  switch (gender) {
    case 'male':
      return '男'
    case 'female':
      return '女'
    default:
      return '其他'
  }
}

// 获取标签颜色
const getTagColor = (tag: string): string => {
  const colors = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'purple', 'indigo', 'teal']
  const hash = (tag || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

// 发送好友请求
const handleSendRequest = async () => {
  sending.value = true
  try {
    // 发送标签数组（空数组表示无标签）
    await emit('send-request', props.user, requestMessage.value, selectedTags.value)
    showRequestDialog.value = false
    requestMessage.value = ''
    selectedTags.value = []
  } catch (error) {
    console.error('发送好友请求失败:', error)
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.user-search-result-card {
  transition: transform 0.2s ease;
}

.user-search-result-card:hover {
  transform: translateY(-2px);
}
</style>