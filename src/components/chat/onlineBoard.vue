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
      <!-- 头像容器，用于定位编辑按钮 -->
      <div class="group-avatar-wrapper">
        <Avatar
          :name="activeChat?.name || ''"
          :url="activeChat?.avatar || ''"
          :size="60"
          avatar-class="profile-avatar"
        />

        <!-- 编辑按钮 - 仅群主可见 -->
        <v-btn
          v-if="isGroupOwner"
          class="avatar-edit-btn"
          color="primary"
          icon="mdi-camera"
          size="x-small"
          variant="elevated"
          :loading="isUploadingAvatar"
          @click="triggerAvatarUpload"
        />
      </div>

      <div class="group-meta">
        <div class="group-name-row">
          <h3 class="group-name">{{ activeChat?.name || '未知群聊' }}({{ groupMembers.length }})</h3>
          <v-btn
            v-if="isGroupOwner"
            icon="mdi-pencil"
            size="x-small"
            variant="text"
            class="edit-info-btn"
            @click="openEditGroupInfoDialog"
          />
        </div>
      </div>
    </div>

    <!-- 隐藏的文件输入框 -->
    <input
      ref="avatarFileInput"
      accept="image/jpeg,image/jpg,image/png"
      style="display: none"
      type="file"
      @change="handleAvatarFileChange"
    >

    <v-divider />

    <!-- 群介绍区域 -->
    <div class="intro-section">
      <div class="section-title">
        群介绍
      </div>

      <!-- 群介绍内容 -->
      <div v-if="groupInfo?.group_intro" class="intro-content">
        {{ groupInfo.group_intro }}
      </div>
      <div v-else class="intro-content empty">
        暂无群介绍
      </div>
    </div>

    <v-divider />

    <!-- 公告区域 -->
    <div class="announcements-section">
      <div class="section-header">
        <span class="section-title">群公告</span>
        <v-btn
          v-if="canPublishAnnouncement"
          icon="mdi-plus"
          size="small"
          variant="text"
          @click="openPublishModal"
        />
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoadingAnnouncements" class="loading-state">
        <v-progress-circular indeterminate size="20" color="warning" />
      </div>

      <!-- 最新公告 -->
      <div v-else-if="latestAnnouncement" class="latest-announcement">
        <div class="announcement-header">
          <v-icon color="warning" size="18">mdi-bullhorn-variant</v-icon>
          <span class="announcement-date">{{ formatAnnouncementTime(latestAnnouncement.send_time) }}</span>
        </div>
        <div class="announcement-content">{{ latestAnnouncement.content }}</div>
        <div class="announcement-footer">
          <span class="announcement-sender">{{ getAnnouncementSenderName(latestAnnouncement) }}</span>
        </div>
      </div>

      <!-- 无公告状态 -->
      <div v-else class="no-announcement">
        <span class="text-caption text-grey">暂无群公告</span>
      </div>

      <!-- 查看更多 - 可以和最新公告同时显示 -->
      <v-btn
        v-if="announcementCount >= 1 && !isLoadingAnnouncements"
        variant="outlined"
        size="small"
        class="mt-2 announcement-list-btn"
        @click="openHistoryModal"
      >
        查看全部公告 ({{ announcementCount }})
      </v-btn>
    </div>

    <v-divider />

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

    <!-- 编辑群信息弹窗 -->
    <v-dialog v-model="showEditGroupInfoDialog" max-width="500">
      <v-card>
        <v-card-title class="pa-0">
          <div class="edit-dialog-header">
            <span class="text-h6">编辑群信息</span>
            <v-btn icon variant="text" @click="showEditGroupInfoDialog = false" class="close-btn">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card-title>

        <v-card-text>
          <v-text-field
            v-model="editGroupName"
            label="群名称"
            variant="outlined"
            counter="50"
            placeholder="请输入群名称"
          />

          <v-textarea
            v-model="editGroupIntro"
            label="群简介"
            counter="200"
            rows="3"
            auto-grow
            variant="outlined"
            placeholder="请输入群简介..."
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showEditGroupInfoDialog = false">取消</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="!editGroupName.trim()"
            @click="handleSaveGroupInfo"
          >
            保存
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 历史公告弹窗 -->
    <v-dialog v-model="showHistoryModal" max-width="500">
      <v-card>
        <v-card-title class="pa-0">
          <div class="edit-dialog-header">
            <span class="text-h6">群公告列表</span>
            <v-btn icon variant="text" @click="showHistoryModal = false" class="close-btn">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card-title>

        <v-card-text class="pa-0">
          <v-list v-if="groupAnnouncements.length > 0">
            <v-list-item
              v-for="announcement in groupAnnouncements"
              :key="announcement.msg_id"
              class="announcement-list-item"
            >
              <template #prepend>
                <v-icon color="warning" size="20">mdi-bullhorn-variant</v-icon>
              </template>
              <v-list-item-title class="announcement-content-text">
                {{ announcement.content }}
              </v-list-item-title>
              <v-list-item-subtitle>
                <span class="announcement-sender">{{ getAnnouncementSenderName(announcement) }}</span>
                <span class="mx-2">•</span>
                <span class="announcement-time">{{ formatAnnouncementTime(announcement.send_time) }}</span>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <v-list-item v-else class="text-center text-grey">
            <span class="text-caption">暂无群公告</span>
          </v-list-item>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
  import type { FriendWithUserInfo } from '../../types/friend'
  import type { GroupMember } from '../../types/group'
  import type { GroupRole } from '../../types/group'

  import { computed, ref, watch } from 'vue'

  import { useChatStore } from '@/stores/chatStore'
  import { useGroupStore } from '@/stores/groupStore'
  import { useGroup } from '@/composables/useGroup'
  import { useSnackbar } from '@/composables/useSnackbar'
  import { useFriend } from '../../composables/useFriend'
  import { useFriendRequest } from '../../composables/useFriendRequest'
  import { useFile } from '@/composables/useFile'
  import type { GroupAnnouncement } from '../../types/group'

  defineOptions({
    name: 'OnlineBoard',
  })

  const props = defineProps<{
    modelValue: boolean
  }>()

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'publish-announcement'): void
  }>()

  const chatStore = useChatStore()
  const groupStore = useGroupStore()
  const { getGroupMembers, leaveGroup, checkPermissions, updateGroupInfo, getGroupAnnouncements } = useGroup()
  const { showError, showSuccess, showInfo } = useSnackbar()
  const { getFriendByUid } = useFriend()
  const { sendFriendRequest } = useFriendRequest()
  const { uploadFile } = useFile()

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

  // 获取群信息（包含 group_intro）
  const groupInfo = computed(() => {
    if (!currentGroupId.value) return null
    return groupStore.getGroupById(currentGroupId.value)
  })

  // 获取群成员列表
  const groupMembers = computed(() => {
    if (!currentGroupId.value) return []
    return groupStore.getGroupMembers(currentGroupId.value)
  })

  // 检查当前用户是否是群主
  const isGroupOwner = computed(() => {
    if (!currentGroupId.value) return false
    return checkPermissions(currentGroupId.value).isOwner
  })

  // 是否可以发布公告（群主或管理员）
  const canPublishAnnouncement = computed(() => {
    if (!currentGroupId.value) return false
    const permissions = checkPermissions(currentGroupId.value)
    return permissions.isOwner || permissions.isAdmin
  })

  // 公告相关状态
  const isLoadingAnnouncements = ref(false)
  const showHistoryModal = ref(false)

  // 获取群公告列表
  const groupAnnouncements = computed(() => {
    if (!currentGroupId.value) return []
    return groupStore.getGroupAnnouncements(currentGroupId.value)
  })

  const latestAnnouncement = computed(() => groupAnnouncements.value[0] || null)
  const announcementCount = computed(() => groupAnnouncements.value.length)

  // 加载状态
  const isLoadingMembers = ref(false)

  // 头像上传状态
  const avatarFileInput = ref<HTMLInputElement>()
  const isUploadingAvatar = ref(false)

  // 成员卡片弹窗
  const showContactCard = ref(false)
  const selectedMember = ref<GroupMember | null>(null)

  // 邀请弹窗
  const showInviteModal = ref(false)

  // 编辑群信息弹窗
  const showEditGroupInfoDialog = ref(false)
  const editGroupName = ref('')
  const editGroupIntro = ref('')

  // 成员数据适配器：GroupMember → FriendWithUserInfo
  const selectedMemberAsFriend = computed(() => {
    if (!selectedMember.value) return null

    const member = selectedMember.value

    // 先从 friendStore 中查找，获取真实的好友数据（包含黑名单状态）
    const friendData = getFriendByUid(member.id)

    if (friendData) {
      // 如果是好友（包括黑名单好友），返回真实的好友数据
      return friendData
    }

    // 如果不是好友，创建一个最小化的 FriendWithUserInfo 对象
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
      await loadAnnouncements()
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

  // 加载群公告数据
  async function loadAnnouncements() {
    if (!currentGroupId.value) return

    // 检查是否已有缓存
    const cached = groupStore.getGroupAnnouncements(currentGroupId.value)
    if (cached.length > 0) {
      return
    }

    isLoadingAnnouncements.value = true
    try {
      await getGroupAnnouncements({ gid: currentGroupId.value })
    } catch (error) {
      console.error('Failed to load group announcements:', error)
      showError('加载群公告失败')
    } finally {
      isLoadingAnnouncements.value = false
    }
  }

  // 格式化公告时间
  function formatAnnouncementTime(timestamp: number) {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 获取公告发送者名称
  function getAnnouncementSenderName(announcement: GroupAnnouncement) {
    const member = groupStore.getGroupMembers(currentGroupId.value).find(
      (m: GroupMember) => m.id === announcement.sender_uid
    )
    return member?.nickname || member?.name || '未知'
  }

  // 打开发布公告弹窗 - 通知父组件
  function openPublishModal() {
    emit('publish-announcement')
  }

  // 打开历史公告弹窗
  function openHistoryModal() {
    showHistoryModal.value = true
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

  // 打开编辑群信息弹窗
  function openEditGroupInfoDialog() {
    if (!groupInfo.value) return
    editGroupName.value = groupInfo.value.name
    editGroupIntro.value = groupInfo.value.group_intro || ''
    showEditGroupInfoDialog.value = true
  }

  // 保存群信息
  async function handleSaveGroupInfo() {
    if (!currentGroupId.value) return

    const trimmedName = editGroupName.value.trim()
    if (!trimmedName) {
      showError('群名称不能为空')
      return
    }

    try {
      await updateGroupInfo({
        gid: currentGroupId.value,
        group_name: trimmedName,
        group_intro: editGroupIntro.value.trim() || undefined,
      })
      showEditGroupInfoDialog.value = false
      showSuccess('群信息已更新')
    } catch (error) {
      console.error('Failed to update group info:', error)
      // Error is already shown in updateGroupInfo
    }
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

  // ========== 头像上传函数 ==========

  /**
   * 触发文件选择器
   */
  function triggerAvatarUpload() {
    avatarFileInput.value?.click()
  }

  /**
   * 处理文件选择
   */
  function handleAvatarFileChange(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (!file) return

    // 验证文件类型
    if (!/image\/(jpeg|jpg|png)/.test(file.type)) {
      showError('请选择 JPG 或 PNG 格式的图片')
      if (avatarFileInput.value) {
        avatarFileInput.value.value = ''
      }
      return
    }

    // 验证文件大小（10MB限制）
    if (file.size > 10 * 1024 * 1024) {
      showError('图片大小不能超过 10MB')
      if (avatarFileInput.value) {
        avatarFileInput.value.value = ''
      }
      return
    }

    // 上传文件
    uploadGroupAvatar(file)
  }

  /**
   * 上传群头像并更新群信息
   */
  async function uploadGroupAvatar(file: File) {
    if (!currentGroupId.value) {
      showError('无法识别群聊信息')
      return
    }

    isUploadingAvatar.value = true

    try {
      // 步骤1: 上传文件
      const uploadResult = await uploadFile(file, {
        fileName: `group_avatar_${currentGroupId.value}_${Date.now()}`,
        fileType: 'image',
      })

      // 步骤2: 更新群信息
      await updateGroupInfo({
        gid: currentGroupId.value,
        group_avatar: uploadResult.file_id,
      })

      showSuccess('群头像更新成功')
    } catch (error: any) {
      console.error('Failed to upload group avatar:', error)
      showError(error.message || '群头像上传失败，请重试')
    } finally {
      isUploadingAvatar.value = false
      if (avatarFileInput.value) {
        avatarFileInput.value.value = ''
      }
    }
  }
</script>

<style scoped>
.group-header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
}

.group-avatar-wrapper {
  position: relative;
  display: inline-block;
}

.avatar-edit-btn {
  position: absolute;
  bottom: -5px;
  right: -5px;
  z-index: 1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.avatar-edit-btn:hover {
  transform: scale(1.1);
  transition: transform 0.2s ease;
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
  border-top: 1px solid rgba(255, 255, 255, 0.1);
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

/* 群介绍区域样式 */
.intro-section {
  width: 100%;
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.intro-content {
  padding: 0 16px;
  color: rgba(255, 255, 255, 0.87);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.intro-content.empty {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

/* 公告区域样式 */
.announcements-section {
  width: 100%;
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px 12px 0;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  color: rgba(238, 230, 230, 0.87);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 0 16px;
}

.latest-announcement {
  background: rgba(255, 152, 0, 0.1);
  border-radius: 8px;
  padding: 12px;
  margin: 0 16px 8px 16px;
}

.announcement-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.announcement-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.announcement-content {
  color: rgba(255, 255, 255, 0.87);
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 8px;
  white-space: pre-wrap;
}

.announcement-footer {
  display: flex;
  justify-content: flex-end;
}

.announcement-sender {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.no-announcement {
  text-align: center;
  padding: 16px;
  margin: 0 16px;
  color: rgba(255, 255, 255, 0.5);
}

.announcement-list-btn {
  margin: 8px 16px 0 16px;
  width: calc(100% - 32px);
}

/* 群信息头部样式 */
.group-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-info-btn {
  color: rgba(255, 255, 255, 0.7);
  margin-left: 4px;
}

.edit-info-btn:hover {
  color: rgba(255, 255, 255, 0.9);
}

/* 编辑对话框样式 */
.edit-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px;
}

.edit-dialog-header .close-btn {
  margin-left: auto;
}

/* 历史公告弹窗样式 */
.announcement-list-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.announcement-content-text {
  color: rgba(255, 255, 255, 0.87);
  white-space: pre-wrap;
  word-break: break-word;
}

.announcement-sender {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.announcement-time {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}
</style>
