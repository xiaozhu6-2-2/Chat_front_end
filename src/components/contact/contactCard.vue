<!-- components/ContactCard.vue -->
<template>
    <div class="contact-card">
      <v-card class="mx-auto" max-width="400" v-if="detailedProfile">
        <v-card-item>
          <div class="contact-header">
            <div class="avatar-large">
              {{ detailedProfile.username.charAt(0) }}
            </div>
            <div class="contact-info">
              <v-card-title>{{ detailedProfile.username }}</v-card-title>
              <v-card-subtitle>ID: {{ detailedProfile.fid }}</v-card-subtitle>
            </div>
          </div>
        </v-card-item>

        <!-- 加载状态 -->
        <v-progress-linear
          v-if="isLoading"
          indeterminate
          color="primary"
        ></v-progress-linear>

        <v-card-text>
          <div class="contact-details">
            <v-list lines="two">
              <v-list-item v-if="detailedProfile.info?.account" prepend-icon="mdi-account" title="账号">
                <template v-slot:subtitle>
                  {{ detailedProfile.info.account }}
                </template>
              </v-list-item>

              <v-list-item  prepend-icon="mdi-account-edit" title="备注">
                <template v-slot:subtitle>
                  {{ (detailedProfile.remark || '未设置备注') }}
                </template>
              </v-list-item>

              <v-list-item v-if="detailedProfile.info?.gender" prepend-icon="mdi-gender-male-female" title="性别">
                <template v-slot:subtitle>
                  {{ detailedProfile.info.gender }}
                </template>
              </v-list-item>

              <v-list-item v-if="detailedProfile.info?.email" prepend-icon="mdi-email" title="邮箱">
                <template v-slot:subtitle>
                  {{ detailedProfile.info.email }}
                </template>
              </v-list-item>

              <v-list-item v-if="detailedProfile.info?.region" prepend-icon="mdi-map-marker" title="地区">
                <template v-slot:subtitle>
                  {{ detailedProfile.info.region }}
                </template>
              </v-list-item>

              <v-list-item v-if="detailedProfile.info?.region" prepend-icon="mdi-information" title="个人简介">
                <template v-slot:subtitle>
                  {{ (detailedProfile.bio || '用户还未写下简介~' )}}
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>

      <v-card-actions>
        <v-btn color="primary" prepend-icon="mdi-message">
          发送消息
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- 未加载时显示加载状态 -->
    <v-card v-else class="mx-auto" max-width="400">
      <v-card-text class="text-center">
        <v-progress-circular color="primary" indeterminate />
        <div class="mt-4">正在加载联系人信息...</div>
      </v-card-text>
    </v-card>
  </div>
</template>

  <script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFriend } from '../../composables/useFriend'
import { useSnackbar } from '../../composables/useSnackbar'
import type { ContactCardProps } from '../../types/friend'
import type { FriendWithUserInfo } from '../../types/friend'

  const props = defineProps<ContactCardProps>()
  const { getFriendProfile } = useFriend()
  const { showError } = useSnackbar()

  // 状态管理
  const isLoading = ref(false)
  const detailedProfile = ref<FriendWithUserInfo | null>(null)

// 获取详细资料
const fetchDetailedProfile = async () => {
  if (!props.contact.uid || !props.contact.fid) {
    console.warn('缺少必要的信息：uid 或 id')
    return
  }

  isLoading.value = true

  try {
    const profile = await getFriendProfile(props.contact.fid, props.contact.uid)
    detailedProfile.value = profile
  } catch (err) {
    showError('获取好友资料失败')
    console.error('获取好友详细资料失败:', err)
  } finally {
    isLoading.value = false
  }
}

// 组件挂载时自动获取
onMounted(() => {
  fetchDetailedProfile()
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
