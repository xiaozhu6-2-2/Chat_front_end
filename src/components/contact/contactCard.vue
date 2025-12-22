<!-- components/ContactCard.vue -->
<template>
  <div class="contact-card">
    <v-card v-if="detailedProfile" class="mx-auto" max-width="400">
      <v-card-item>
        <div class="contact-header">
          <div class="avatar-large">
            {{ detailedProfile.name.charAt(0) }}
          </div>
          <div class="contact-info">
            <v-card-title>{{ detailedProfile.name }}</v-card-title>
          </div>
        </div>
      </v-card-item>

      <!-- 加载状态 -->
      <v-progress-linear
        v-if="isLoading"
        color="primary"
        indeterminate
      />

      <v-card-text>
        <div class="contact-details">
          <v-list lines="two">
            <v-list-item v-if="detailedProfile.info?.account" prepend-icon="mdi-account" title="账号">
              <template #subtitle>
                {{ detailedProfile.info.account }}
              </template>
            </v-list-item>

            <v-list-item prepend-icon="mdi-account-edit" title="备注">
              <template #subtitle>
                {{ (detailedProfile.remark || '未设置备注') }}
              </template>
            </v-list-item>

            <v-list-item v-if="detailedProfile.info?.gender" prepend-icon="mdi-gender-male-female" title="性别">
              <template #subtitle>
                {{ detailedProfile.info.gender }}
              </template>
            </v-list-item>

            <v-list-item v-if="detailedProfile.info?.email" prepend-icon="mdi-email" title="邮箱">
              <template #subtitle>
                {{ detailedProfile.info.email }}
              </template>
            </v-list-item>

            <v-list-item v-if="detailedProfile.info?.region" prepend-icon="mdi-map-marker" title="地区">
              <template #subtitle>
                {{ detailedProfile.info.region }}
              </template>
            </v-list-item>

            <v-list-item v-if="detailedProfile.bio" prepend-icon="mdi-information" title="个人简介">
              <template #subtitle>
                {{ (detailedProfile.bio || '用户还未写下简介~' ) }}
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-btn color="primary" prepend-icon="mdi-message" @click="handleSendMessage">
          发送消息
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- 未加载时显示加载状态 -->
    <v-card v-else class="mx-auto" max-width="400">
      <v-card-text class="text-center">
        <v-progress-circular v-if="isLoading" color="primary" indeterminate />
        <v-icon v-else color="error" size="48" icon="mdi-alert-circle" />
        <div class="mt-4">
          {{ isLoading ? '正在加载联系人信息...' : '无法加载联系人信息' }}
        </div>
        <v-btn v-if="!isLoading" class="mt-2" variant="outlined" @click="fetchDetailedProfile">
          重试
        </v-btn>
      </v-card-text>
    </v-card>
  </div>
</template>

  <script setup lang="ts">
  import type { ContactCardProps, FriendWithUserInfo } from '../../types/friend'
  import { onMounted, ref } from 'vue'
  import { useFriend } from '../../composables/useFriend'
  import { useSnackbar } from '../../composables/useSnackbar'
  import { useChat } from '../../composables/useChat'
  import { useRouter } from 'vue-router'
  import type { ChatType } from '../../types/chat'

  const props = defineProps<ContactCardProps>()
  const { getFriendProfile } = useFriend()
  const { showError } = useSnackbar()
  const { createChat, selectChat } = useChat()
  const router = useRouter()

  // 发送消息处理函数
  const handleSendMessage = async () => {
    if (!detailedProfile.value?.id) return

    try {
      // 创建私聊
      const chat = await createChat(detailedProfile.value.id, 'private' as ChatType)
      if (chat) {
        // 设置为活跃聊天
        selectChat(chat.id)
        // 跳转到聊天页面
        await router.push('/chat')
      }
    } catch (error) {
      console.error('创建私聊失败:', error)
      showError('创建私聊失败，请重试')
    }
  }

  // 状态管理
  const isLoading = ref(false)
  const detailedProfile = ref<FriendWithUserInfo | null>(null)

  // 获取详细资料
  async function fetchDetailedProfile () {
    // 数据验证
    if (!props.contact.id || !props.contact.fid) {
      console.warn('缺少必要的信息：uid 或 id', props.contact)
      showError('获取好友资料失败')
    }

    isLoading.value = true

    try {
      const profile = await getFriendProfile(props.contact.fid, props.contact.id)
      detailedProfile.value = profile
      console.log(profile)
    } catch (error) {
      showError('获取好友资料失败')
      console.error('获取好友详细资料失败:', error)
      // 设置基础好友信息作为回退
      detailedProfile.value = {
        id: props.contact.id,
        fid: props.contact.fid,
        name: props.contact.name || '获取资料失败',
        avatar: props.contact.avatar || '',
        createdAt: props.contact.createdAt,
        isBlacklisted: props.contact.isBlacklisted,
        bio: props.contact.bio || '',
        remark: props.contact.remark || '',
        tag: props.contact.tag || '',
      }
    } finally {
      isLoading.value = false
    }
  }

  // 组件挂载时自动获取
  onMounted(() => {
    fetchDetailedProfile()
    console.log(detailedProfile)
  })
  </script>

  <style scoped>
  .contact-card {
    padding: 20px;
  }

  .contact-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .avatar-large {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    background-color: #07c160;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
    font-weight: bold;
  }

  .contact-info {
    flex: 1;
  }

  .contact-details {
    margin-top: 16px;
  }
  </style>
