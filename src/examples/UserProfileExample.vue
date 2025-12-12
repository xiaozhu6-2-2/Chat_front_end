<template>
  <div class="user-profile-example pa-6">
    <h1 class="text-h4 mb-6">用户资料示例</h1>

    <!-- 当前用户信息展示 -->
    <v-card class="mb-6" elevation="2">
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-account" class="mr-3" />
        当前用户信息
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>用户ID</v-list-item-title>
                <v-list-item-subtitle>{{ userStore.currentUser.uid }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>用户名</v-list-item-title>
                <v-list-item-subtitle>{{ userStore.currentUser.username }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>账号</v-list-item-title>
                <v-list-item-subtitle>{{ userStore.currentUser.account }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>性别</v-list-item-title>
                <v-list-item-subtitle>{{ getGenderText(userStore.currentUser.gender) }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-col>
          <v-col cols="12" md="6">
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>地区</v-list-item-title>
                <v-list-item-subtitle>{{ userStore.currentUser.region || '未填写' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>邮箱</v-list-item-title>
                <v-list-item-subtitle>{{ userStore.currentUser.email || '未填写' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>个人简介</v-list-item-title>
                <v-list-item-subtitle>{{ userStore.currentUser.bio || '未填写' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>资料完成度</v-list-item-title>
                <v-list-item-subtitle>
                  <v-progress-linear
                    :model-value="userStore.profileCompletionRate"
                    color="primary"
                    height="20"
                    rounded
                  >
                    {{ userStore.profileCompletionRate }}%
                  </v-progress-linear>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-col>
        </v-row>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          color="primary"
          prepend-icon="mdi-pencil"
          @click="openEditModal"
        >
          编辑资料
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- 编辑按钮触发器 -->
    <UserProfileEditModal
      v-model="editModalOpen"
      @profile-updated="handleProfileUpdated"
    >
      <template v-slot:activator="{ props }">
        <!-- 可以自定义激活器，不使用则使用组件内置的 -->
        <v-btn v-bind="props" class="d-none">隐藏的激活器</v-btn>
      </template>
    </UserProfileEditModal>

    <!-- 操作按钮区域 -->
    <v-card class="mt-6" elevation="2">
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-cog" class="mr-3" />
        操作示例
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6" md="4">
            <v-btn
              variant="outlined"
              block
              prepend-icon="mdi-refresh"
              @click="reloadProfile"
              :loading="userStore.isLoading"
            >
              重新加载资料
            </v-btn>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-btn
              variant="outlined"
              block
              prepend-icon="mdi-image"
              @click="updateAvatarExample"
            >
              更新头像示例
            </v-btn>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-btn
              variant="outlined"
              block
              prepend-icon="mdi-delete"
              color="error"
              @click="clearProfile"
            >
              清除资料（登出）
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- 响应消息 -->
    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      timeout="3000"
    >
      {{ snackbarMessage }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '../stores/userStore'
import UserProfileEditModal from '../components/global/UserProfileEditModal.vue'
import type { UserProfile } from '../service/messageTypes'

defineOptions({
  name: 'UserProfileExample'
})

// Store
const userStore = useUserStore()

// State
const editModalOpen = ref(false)
const showSnackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// Methods
const getGenderText = (gender: 'male' | 'female' | 'other') => {
  switch (gender) {
    case 'male':
      return '男'
    case 'female':
      return '女'
    case 'other':
      return '其他'
    default:
      return '未知'
  }
}

const openEditModal = () => {
  editModalOpen.value = true
}

const handleProfileUpdated = (profile: UserProfile) => {
  showMessage('资料更新成功！', 'success')
  console.log('Updated profile:', profile)
}

const reloadProfile = () => {
  userStore.loadProfile()
  showMessage('资料已重新加载', 'success')
}

const updateAvatarExample = async () => {
  // 示例：使用随机头像
  const randomSeed = Math.random().toString(36).substring(7)
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`

  const success = await userStore.updateAvatar(avatarUrl)
  if (success) {
    showMessage('头像更新成功！', 'success')
  } else {
    showMessage('头像更新失败', 'error')
  }
}

const clearProfile = () => {
  if (confirm('确定要清除所有用户资料吗？这将登出当前账号。')) {
    userStore.clearProfile()
    showMessage('已清除用户资料', 'info')
  }
}

const showMessage = (message: string, color: string) => {
  snackbarMessage.value = message
  snackbarColor.value = color
  showSnackbar.value = true
}

// 初始化
userStore.initialize()
</script>

<style scoped>
.user-profile-example {
  max-width: 1200px;
  margin: 0 auto;
}
</style>