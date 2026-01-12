<template>
  <v-dialog
    v-model="dialog"
    max-width="500"
    persistent
  >
    <v-card>
      <v-card-title>邀请好友进群</v-card-title>

      <v-divider />

      <v-card-text class="friend-list">
        <!-- 搜索输入框 -->
        <v-text-field
          v-model="searchQuery"
          placeholder="搜索好友"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          class="mb-2"
        />

        <!-- 好友列表 -->
        <v-list>
          <v-list-item
            v-for="friend in filteredFriends"
            :key="friend.id"
            class="friend-item"
          >
            <template #prepend>
              <v-checkbox
                v-model="selectedFriends"
                :value="friend.id"
                color="primary"
                density="compact"
              />
            </template>

            <template #title>
              <div class="d-flex align-center">
                <Avatar
                  :name="friend.remark || friend.name"
                  :url="friend.avatar"
                  :size="40"
                />
                <span class="ml-3">{{ friend.remark || friend.name }}</span>
              </div>
            </template>
          </v-list-item>
        </v-list>

        <!-- 空状态提示 -->
        <v-alert
          v-if="filteredFriends.length === 0"
          type="info"
          density="compact"
          class="mt-4"
        >
          {{ searchQuery ? '没有找到匹配的好友' : '没有可邀请的好友' }}
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">
          取消
        </v-btn>
        <v-btn
          color="primary"
          :disabled="selectedFriends.length === 0"
          @click="handleInvite"
        >
          邀请 ({{ selectedFriends.length }})
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import type { FriendWithUserInfo } from '@/types/friend'
  import type { InviteToGroupModalEmits, InviteToGroupModalProps } from '@/types/global'
  import type { GroupMember } from '@/types/group'

  import { computed, ref, watch } from 'vue'

  import { useFriend } from '@/composables/useFriend'
  import { useDirectMessage } from '@/composables/useDirectMessage'
  import { useSnackbar } from '@/composables/useSnackbar'

  defineOptions({
    name: 'InviteToGroupModal',
  })

  const props = withDefaults(defineProps<InviteToGroupModalProps>(), {
    modelValue: false,
    gid: '',
    existingMembers: () => [],
  })

  const emit = defineEmits<InviteToGroupModalEmits>()

  const { activeFriends } = useFriend()
  const { sendGroupInvitations } = useDirectMessage()
  const { showSuccess, showError } = useSnackbar()

  const dialog = computed({
    get: () => props.modelValue,
    set: value => emit('update:modelValue', value),
  })

  const searchQuery = ref('')
  const selectedFriends = ref<string[]>([])

  // 过滤出可邀请的好友（排除已在群内的）
  const filteredFriends = computed(() => {
    const memberIds = new Set(props.existingMembers.map((m: GroupMember) => m.id))

    return activeFriends.value.filter((friend: FriendWithUserInfo) => {
      // 排除已在群内的成员
      if (memberIds.has(friend.id)) return false

      // 搜索过滤
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        const name = friend.name.toLowerCase()
        const remark = (friend.remark || '').toLowerCase()
        return name.includes(query) || remark.includes(query)
      }

      return true
    })
  })

  // 重置搜索和选择
  watch(() => props.modelValue, (isOpen) => {
    if (!isOpen) {
      searchQuery.value = ''
      selectedFriends.value = []
    }
  })

  function close() {
    dialog.value = false
  }

  async function handleInvite() {
    if (selectedFriends.value.length === 0) return

    try {
      // 获取选中的好友完整对象
      const selectedFriendsObjs = activeFriends.value
        .filter((f: FriendWithUserInfo) => selectedFriends.value.includes(f.id))

      // 发送群邀请消息
      const result = await sendGroupInvitations(
        selectedFriendsObjs,
        props.gid
      )

      // 显示结果反馈
      if (result.successCount > 0) {
        showSuccess(`已成功邀请 ${result.successCount} 位好友`)
      }
      if (result.failedCount > 0) {
        showError(`${result.failedCount} 位好友邀请失败`)
      }

      // 获取选中的好友信息用于 emit
      const invitedMembers = selectedFriendsObjs.map((f: FriendWithUserInfo) => ({
        id: f.id,
        name: f.name,
        avatar: f.avatar,
        role: 'member' as const,
      } as GroupMember))

      emit('invited', invitedMembers)
      close()
    } catch (error) {
      console.error('发送邀请失败:', error)
      showError('发送邀请失败，请重试')
    }
  }
</script>

<style scoped>
.friend-list {
  max-height: 400px;
  overflow-y: auto;
}

.friend-item :deep(.v-list-item__prepend) {
  align-self: center;
}
</style>
