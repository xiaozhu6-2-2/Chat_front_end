<template>
  <v-card>
    <v-card-text>
      <!-- 群组信息展示 -->
      <v-list-item>
        <template #prepend>
          <v-avatar>
            <v-img
              :alt="group.group_name"
              :src="group.avatar || defaultGroupAvatar"
            >
              <template #placeholder>
                <v-icon
                  color="grey-lighten-1"
                  icon="mdi-account-group"
                  size="32"
                />
              </template>
            </v-img>
          </v-avatar>
        </template>
        <v-list-item-title class="font-weight-medium">
          {{ group.group_name }}
        </v-list-item-title>
        <v-list-item-subtitle>
          {{ group.bio || '暂无简介' }}
        </v-list-item-subtitle>
      </v-list-item>
    </v-card-text>

    <v-card-actions>
      <v-btn
        color="primary"
        :loading="isJoining"
        variant="outlined"
        @click="showJoinDialog = true"
      >
        <v-icon icon="mdi-account-plus" start />
        申请加入
      </v-btn>
    </v-card-actions>

    <!-- 申请对话框 -->
    <v-dialog
      v-model="showJoinDialog"
      max-width="450"
      persistent
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon
            class="mr-2"
            color="primary"
            icon="mdi-account-group-outline"
          />
          申请加入群组
        </v-card-title>

        <v-card-text>
          <!-- 群组信息摘要 -->
          <div class="mb-4 pa-3 bg-grey-lighten-5 rounded-lg">
            <div class="d-flex align-center mb-2">
              <v-avatar class="mr-3" size="40">
                <v-img
                  :alt="group.group_name"
                  :src="group.avatar || defaultGroupAvatar"
                >
                  <template #placeholder>
                    <v-icon
                      color="grey-lighten-1"
                      icon="mdi-account-group"
                      size="24"
                    />
                  </template>
                </v-img>
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ group.group_name }}</div>
                <div class="text-caption text-grey-darken-1">
                  {{ group.bio || '暂无简介' }}
                </div>
              </div>
            </div>
          </div>

          <!-- 申请信息输入 -->
          <v-textarea
            v-model="applyText"
            auto-grow
            counter="200"
            label="申请信息"
            max-rows="5"
            placeholder="请简单介绍您自己，说明申请加入的理由"
            rows="3"
            :rules="[v => (v || '').length <= 200 || '申请信息不能超过200字']"
            variant="outlined"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            :disabled="isJoining"
            variant="text"
            @click="showJoinDialog = false"
          >
            取消
          </v-btn>
          <v-btn
            color="primary"
            :loading="isJoining"
            @click="handleJoinGroup"
          >
            发送申请
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
  import type { GroupSearchResult } from '../../types/search'
  import { ref } from 'vue'
  import { useGroupRequest } from '../../composables/useGroupRequest'
  import { useSnackbar } from '../../composables/useSnackbar'

  interface Props {
    group: GroupSearchResult
  }

  interface Emits {
    (e: 'join-group', group: GroupSearchResult, success: boolean): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const { sendGroupRequest } = useGroupRequest()
  const { showSuccess, showError } = useSnackbar()

  // 默认群组头像
  const defaultGroupAvatar = '/images/default-group-avatar.png'

  // 对话框状态
  const showJoinDialog = ref(false)
  const isJoining = ref(false)
  const applyText = ref('')

  // 处理申请加入群组
  async function handleJoinGroup () {
    if (!applyText.value.trim()) {
      showError('请输入申请信息')
      return
    }

    try {
      isJoining.value = true
      console.log('GroupSearchResultCard: 开始申请加入群组', {
        gid: props.group.gid,
        groupName: props.group.group_name,
        applyText: applyText.value,
      })

      // 调用服务发送申请
      await sendGroupRequest(props.group.gid, applyText.value.trim())

      // 申请成功
      showSuccess('申请已发送，等待群主审核')
      showJoinDialog.value = false
      applyText.value = ''

      // 通知父组件
      emit('join-group', props.group, true)

      console.log('GroupSearchResultCard: 群组申请发送成功')
    } catch (error) {
      console.error('GroupSearchResultCard: 申请加入群组失败', error)
      showError('申请发送失败，请稍后重试')

      // 通知父组件
      emit('join-group', props.group, false)
    } finally {
      isJoining.value = false
    }
  }
</script>

<style scoped>
.v-card {
  transition: all 0.3s ease;
}

.v-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
