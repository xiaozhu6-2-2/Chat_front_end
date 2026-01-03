<template>
  <v-navigation-drawer
    v-model="drawer"
    location="right"
    temporary
    width="320"
  >
    <!-- 加载状态 -->
    <v-overlay
      v-if="isLoadingMembers"
      contained
      class="align-center justify-center"
    >
      <v-progress-circular indeterminate color="primary" />
    </v-overlay>

    <!-- 群信息头部 -->
    <div class="group-header-section">
      <Avatar
        :name="activeChat?.name || ''"
        :url="activeChat?.avatar || ''"
        :size="60"
        avatar-class="profile-avatar"
      />
      <div class="group-meta">
        <h3 class="group-name">{{ activeChat?.name || '未知群聊' }}({{ groupMembers.length }})</h3>
        <!-- <p class="member-count"></p> -->
      </div>
    </div>

    <v-divider />
<v-card>
  
</v-card>
    <!-- 成员列表区域 -->
    <div class="members-section">
      <div class="section-title">
        群成员
      </div>

      <!-- 微信网格样式：4-5列 -->
      <div class="members-grid">
        <!-- 渲染每个成员 -->
        <div
          v-for="member in groupMembers"
          :key="member.id"
          class="member-grid-item"
          @click="showMemberCard(member)"
        >
          <div class="member-avatar-wrapper">
            <Avatar
              :name="member.name"
              :url="member.avatar"
              :size="48"
              avatar-class="profile-avatar"
            />
            <!-- 角色徽章 -->
            <div
              v-if="member.role !== 'member'"
              class="role-badge"
              :class="roleBadgeClass(member.role)"
            >
              {{ roleLabel(member.role) }}
            </div>
          </div>
          <span class="member-name">{{ member.nickname || member.name }}</span>
        </div>

        <!-- 邀请成员按钮 -->
        <div
          class="member-grid-item add-btn"
          @click="openInviteModal"
        >
          <div class="member-avatar-wrapper">
            <Avatar
              name="+"
              :size="48"
              variant="outlined"
              avatar-class="profile-avatar"
            />
          </div>
          <span class="member-name">邀请</span>
        </div>
      </div>
    </div>

    <v-divider />

    <!-- 底部操作按钮 -->
    <div class="action-buttons">
      <v-btn
        color="error"
        variant="outlined"
        block
        @click="handleLeaveGroup"
      >
        退出群聊
      </v-btn>
    </div>

    <!-- 成员卡片弹窗 -->
    <ContactCardModal
      v-if="selectedMemberAsFriend"
      v-model="showContactCard"
      :contact="selectedMemberAsFriend"
      @send-message="handleSendMessage"
      @add-friend="handleAddFriend"
    />

    <!-- 邀请好友弹窗 -->
    <InviteToGroupModal
      v-model="showInviteModal"
      :gid="currentGroupId"
      :existing-members="groupMembers"
      @invited="handleMembersInvited"
    />
  </v-navigation-drawer>
</template>

<script setup lang="ts">
  import type { FriendWithUserInfo } from '@/types/friend'
  import type { GroupMember } from '@/types/group'
  import type { GroupRole } from '@/types/group'

  import { computed, ref, watch } from 'vue'

  import { useChatStore } from '@/stores/chatStore'
  import { useGroupStore } from '@/stores/groupStore'
  import { useGroup } from '@/composables/useGroup'
  import { useSnackbar } from '@/composables/useSnackbar'
  import { useFriendRequest } from '../../composables/useFriendRequest'

  defineOptions({
    name: 'OnlineBoard',
  })

  const props = defineProps<{
    modelValue: boolean
  }>()

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
  }>()

  const chatStore = useChatStore()
  const groupStore = useGroupStore()
  const { getGroupMembers, leaveGroup, checkPermissions } = useGroup()
  const { showError, showSuccess } = useSnackbar()
  const { sendFriendRequest } = useFriendRequest()

  // 控制抽屉显示
  const drawer = computed({
    get: () => props.modelValue,
    set: value => emit('update:modelValue', value),
  })

  // 获取当前活跃的聊天
  const activeChat = computed(() => {
    const chatId = chatStore.activeChatId
    return chatStore.getChatByid(chatId)
  })

  // 获取当前群聊 ID
  const currentGroupId = computed(() => {
    return activeChat.value?.id || ''
  })

  // 获取群成员列表
  const groupMembers = computed(() => {
    if (!currentGroupId.value) return []
    return groupStore.getGroupMembers(currentGroupId.value)
  })

  // 加载状态
  const isLoadingMembers = ref(false)

  // 成员卡片弹窗
  const showContactCard = ref(false)
  const selectedMember = ref<GroupMember | null>(null)

  // 邀请弹窗
  const showInviteModal = ref(false)

  // 成员数据适配器：GroupMember → FriendWithUserInfo
  const selectedMemberAsFriend = computed(() => {
    if (!selectedMember.value) return null

    const member = selectedMember.value
    return {
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      fid: member.id,
      isBlacklisted: false,
      createdAt: new Date().toISOString(),
      remark: member.nickname,
    } as FriendWithUserInfo
  })

  // 监听抽屉打开，加载群成员数据
  watch(() => props.modelValue, async (isOpen) => {
    if (isOpen && currentGroupId.value) {
      await loadGroupMembers()
    }
  })

  // 加载群成员数据
  async function loadGroupMembers() {
    if (!currentGroupId.value) return

    // 检查是否已有缓存
    const cached = groupStore.getGroupMembers(currentGroupId.value)
    if (cached.length > 0) {
      return
    }

    isLoadingMembers.value = true
    try {
      await getGroupMembers({ gid: currentGroupId.value })
    } catch (error) {
      console.error('Failed to load group members:', error)
      showError('加载群成员失败')
    } finally {
      isLoadingMembers.value = false
    }
  }

  // 显示成员卡片
  function showMemberCard(member: GroupMember) {
    selectedMember.value = member
    showContactCard.value = true
  }

  // 打开邀请弹窗
  function openInviteModal() {
    showInviteModal.value = true
  }

  // 发送私聊消息
  function handleSendMessage(contact: FriendWithUserInfo) {
    console.log('Send private message to:', contact.name)
    // TODO: 打开与该成员的私聊会话
    showContactCard.value = false
    drawer.value = false
  }

  // 添加好友
  async function handleAddFriend(
    contact: FriendWithUserInfo,
    message?: string,
    tags?: string[]
  ) {
    if (!message) {
      message = '我想添加你为好友'
    }

    // 发送好友请求，同时传递标签（会在好友接受后自动设置）
    await sendFriendRequest(contact.id, message, tags)

    showContactCard.value = false
  }

  // 成员被邀请后的处理
  function handleMembersInvited(newMembers: GroupMember[]) {
    console.log('Members invited:', newMembers)
    showSuccess(`已邀请 ${newMembers.length} 位好友进群`)
    // 成员列表会通过 store 更新自动刷新
  }

  // 退出群聊
  async function handleLeaveGroup() {
    if (!currentGroupId.value) return

    // 权限检查
    const permissions = checkPermissions(currentGroupId.value)

    if (permissions.isOwner) {
      showError('群主无法退出群聊，请先转让群主或解散群聊')
      return
    }

    // 确认对话框
    const confirmed = confirm('确定要退出该群聊吗？')
    if (!confirmed) return

    try {
      await leaveGroup({ gid: currentGroupId.value })
      showSuccess('已退出群聊')

      // 清空当前聊天
      chatStore.setActiveChat('')
      drawer.value = false
    } catch (error) {
      console.error('Failed to leave group:', error)
      showError('退出群聊失败')
    }
  }

  // 角色标签
  function roleLabel(role: GroupRole): string {
    const labels = {
      owner: '群主',
      admin: '管理',
      member: '',
    }
    return labels[role] || ''
  }

  // 角色徽章样式
  function roleBadgeClass(role: GroupRole): string {
    const classes = {
      owner: 'badge-owner',
      admin: 'badge-admin',
      member: '',
    }
    return classes[role] || ''
  }
</script>

<style scoped>
.group-header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
}

.group-meta {
  margin-top: 12px;
  text-align: center;
}

.group-name {
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.member-count {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  margin: 0;
}

.members-section {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.section-title {
  padding: 0 16px 12px;
  font-weight: 600;
  font-size: 14px;
  color: rgba(238, 230, 230, 0.87);
}

/* 微信网格样式：4-5列 */
.members-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 0 16px 16px;
}

@media (min-width: 380px) {
  .members-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

.member-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.member-grid-item:hover {
  opacity: 0.7;
}

.member-avatar-wrapper {
  position: relative;
}

.role-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  line-height: 1.2;
}

.badge-owner {
  background-color: #f44336;
}

.badge-admin {
  background-color: #ff9800;
}

.member-name {
  font-size: 11px;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(238, 230, 230, 0.87);
}

.add-btn {
  opacity: 0.7;
}

.add-btn:hover {
  opacity: 1;
}

.action-buttons {
  padding: 16px;
}

/* 滚动条样式 */
.members-section::-webkit-scrollbar {
  width: 4px;
}

.members-section::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.members-section::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.members-section::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
