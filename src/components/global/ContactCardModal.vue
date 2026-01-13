<template>
  <v-dialog
    v-model="dialog"
    transition="dialog-bottom-transition"
    width="400"
  >
    <template #activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps">
        <!-- 默认激活器插槽 -->
      </slot>
    </template>

    <v-card v-if="contactInfo" class="contact-modal-card">
      <v-card-item>
        <div class="contact-header">
          <Avatar
            avatar-class="contact-modal-avatar"
            :clickable="false"
            :name="contactInfo.name"
            :size="60"
            :url="contactInfo.avatar"
          />
          <div class="contact-info">
            <v-card-title>{{ contactInfo.name }}</v-card-title>
            <v-card-subtitle>联系人 ID: {{ contactInfo.id }}</v-card-subtitle>
          </div>
          <!-- 关闭按钮 - 右上角 -->
          <v-btn
            class="close-btn"
            icon="mdi-close"
            size="small"
            variant="text"
            @click="closeDialog"
          />
        </div>
      </v-card-item>

      <v-divider />

      <v-card-text>
        <!-- 查看模式详情 -->
        <div class="contact-details">
          <v-list density="compact" lines="two">
            <!-- 邮箱 -->
            <v-list-item v-if="contactInfo.email" prepend-icon="mdi-email" title="邮箱">
              <template #subtitle>
                {{ contactInfo.email }}
              </template>
            </v-list-item>

            <!-- 账号（如果是 UserProfile） -->
            <v-list-item v-if="contactInfo.account" prepend-icon="mdi-account-key" title="账号">
              <template #subtitle>
                {{ contactInfo.account }}
              </template>
            </v-list-item>

            <!-- 性别（如果是 UserProfile） -->
            <v-list-item v-if="contactInfo.gender" prepend-icon="mdi-gender-male-female" title="性别">
              <template #subtitle>
                {{ contactInfo.gender === 'male' ? '男' : contactInfo.gender === 'female' ? '女' : '其他' }}
              </template>
            </v-list-item>

            <!-- 地区（如果是 UserProfile） -->
            <v-list-item v-if="contactInfo.region" prepend-icon="mdi-map-marker" title="地区">
              <template #subtitle>
                {{ contactInfo.region }}
              </template>
            </v-list-item>

            <!-- 简介（如果是 UserProfile） -->
            <v-list-item v-if="contactInfo.bio" prepend-icon="mdi-text" title="简介">
              <template #subtitle>
                {{ contactInfo.bio }}
              </template>
            </v-list-item>

            <!-- 备注（如果是好友） -->
            <v-list-item v-if="isContactFriend" prepend-icon="mdi-account-edit" title="备注">
              <template #subtitle>
                {{ contactInfo.remark || '未设置' }}
              </template>
            </v-list-item>

            <!-- 标签（如果是好友） -->
            <v-list-item v-if="isContactFriend && contactInfo.tag" prepend-icon="mdi-tag" title="标签">
              <template #subtitle>
                <v-chip size="small">{{ contactInfo.tag }}</v-chip>
              </template>
            </v-list-item>

            <!-- 添加时间 -->
            <!-- <v-list-item prepend-icon="mdi-calendar" title="添加时间">
              <template #subtitle>
                {{ formatDate(contactInfo.createTime) }}
              </template>
            </v-list-item> -->

            <!-- 黑名单状态（如果是好友） -->
            <v-list-item v-if="isContactFriend" prepend-icon="mdi-block-helper" title="黑名单">
              <template #subtitle>
                <v-chip :color="contactInfo.isBlacklist ? 'error' : 'success'" size="small">
                  {{ contactInfo.isBlacklist ? '已拉黑' : '正常' }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="contact-actions">
        <v-spacer />

        <!-- 查看模式按钮 -->
        <!-- 好友模式的操作按钮 -->
        <template v-if="isFriendContact">
          <v-btn
            v-if="isContactFriend"
            color="primary"
            prepend-icon="mdi-pencil"
            @click="enterEditMode"
          >
          编辑好友
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-message"
            @click="sendMessage"
          >
            发送消息
          </v-btn>
        </template>

        <!-- 陌生人模式的操作按钮 -->
        <template v-else>
          <!-- 如果是当前用户，显示编辑资料按钮 -->
          <v-btn
            v-if="isCurrentUser"
            color="primary"
            prepend-icon="mdi-account-edit"
            @click="handleEditProfile"
          >
            编辑资料
          </v-btn>
          <!-- 如果不是当前用户，显示添加好友按钮 -->
          <v-btn
            v-else
            color="primary"
            prepend-icon="mdi-account-plus"
            @click="addFriend"
          >
            添加好友
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>

    <!-- 编辑好友对话框 -->
    <EditFriendModal
      v-if="isContactFriend"
      v-model="editMode"
      :friend="contact as FriendWithUserInfo"
      @save="handleFriendSave"
      @delete="handleFriendDelete"
      @cancel="handleEditCancel"
    />

    <!-- 添加好友对话框 -->
    <AddFriendModal
      v-model="showAddFriendModal"
      :user="contact"
      @send-request="handleSendFriendRequest"
    />
  </v-dialog>
</template>

<script setup lang="ts">
  import type { FriendWithUserInfo } from '../../types/friend'
  import type { ContactCardModalEmits, ContactCardModalProps } from '../../types/global'

  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'

  import { useFriend } from '../../composables/useFriend'
  import { useFriendStore } from '../../stores/friendStore'
  import { useUserStore } from '../../stores/userStore'

  // 作用是为这个 Vue 组件设置名称为 "ContactCardModal"
  defineOptions({
    name: 'ContactCardModal',
  })

  // 使用 useFriend composable
  const { checkUserRelation } = useFriend()
  const friendStore = useFriendStore()
  const userStore = useUserStore()
  const { currentUser } = storeToRefs(userStore)
  // modelValue 是默认的 v-model 绑定属性
  const props = withDefaults(defineProps<ContactCardModalProps>(), {
    modelValue: false,
  })

  const emit = defineEmits<ContactCardModalEmits>()

  // 编辑状态管理
  const editMode = ref(false)
  const showAddFriendModal = ref(false)

  // 监听双向绑定变量
  const dialog = computed({
    get: () => props.modelValue,
    set: value => {
      if (!value && editMode.value) {
        editMode.value = false
      }
      emit('update:modelValue', value)
    },
  })

  // 判断是否为好友
  const isFriendContact = computed(() => {
    if (!props.contact) return false

    // 先判断是否是当前用户自己，自己不能是好友
    if (isCurrentUser.value) return false

    const contact = props.contact as FriendWithUserInfo
    // 使用 fid 作为判断：如果 fid 存在且不是 'stranger'，说明是好友关系
    const isFriendRelation = contact.fid && contact.fid !== 'stranger'
    const directResult = friendStore.isFriend(props.contact.id)
    const result = checkUserRelation(props.contact.id).isFriend
    return isFriendRelation || result || directResult
  })

  // 根据联系人类型获取显示信息
  const contactInfo = computed(() => {
    if (!props.contact) return null

    if (isFriendContact.value) {
      const friend = props.contact as FriendWithUserInfo
      return {
        // 好友
        id: friend.id,
        name: friend.name,
        avatar: friend.avatar,
        email: friend.info?.email,
        remark: friend.remark,
        initial: friend.name.charAt(0).toUpperCase(),
        isBlacklist: friend.isBlacklisted,
        tag: friend.tag,
        fid: friend.fid,
        createTime: friend.createdAt,
        account: friend.info?.account,
        region: friend.info?.region,
        gender: friend.info?.gender,
        bio: friend.bio,
      }
    } else if (isCurrentUser.value) {
      return {
        id: currentUser.value?.id,
        name: currentUser.value?.name,
        avatar: currentUser.value?.avatar,
        email: currentUser.value?.email,
        initial: currentUser.value?.name?.charAt(0)?.toUpperCase() || '',
        createTime: currentUser.value?.createdAt,
        account: currentUser.value?.account,
        region: currentUser.value?.region,
        gender: currentUser.value?.gender,
        bio: currentUser.value?.bio,
      }
    } else {
      // UserProfile
      // 非好友
      const profile = props.contact as FriendWithUserInfo
      return {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        email: profile.info?.email,
        initial: (profile.name || '').charAt(0).toUpperCase(),
        account: profile.info?.account,
        gender: profile.info?.gender,
        region: profile.info?.region,
        bio: profile.bio,
        createTime: profile.createdAt,
      }
    }
  })

  // 计算属性控制card是陌生人 or 好友
  const isContactFriend = computed(() => {
    if (!props.contact) return false

    const contact = props.contact as FriendWithUserInfo
    // 使用 fid 作为判断：如果 fid 存在且不是 'stranger'，说明是好友关系
    const isFriendRelation = contact.fid && contact.fid !== 'stranger'

    const result = checkUserRelation(props.contact.id).isFriend
    return isFriendRelation || result // 使用 fid 判断作为主要条件
  })

  // 判断是否是当前用户
  // OK：使用authstore
  const isCurrentUser = computed(() => {
    if (currentUser.value) {
      return props.contact?.id === currentUser.value.id
    } else {
      console.error('ContactCardModal.vue:currentUser 为空!')
      return false
    }
  })

  // 编辑模式方法
  function enterEditMode() {
    editMode.value = true
  }

  function handleEditCancel() {
    editMode.value = false
  }

  function handleFriendSave(data: { friendId: string; remark: string; tag: string | null; isBlacklisted: boolean }) {
    emit('update-friend-profile', data.friendId, data.remark, data.isBlacklisted, data.tag || '')
    editMode.value = false
    dialog.value = false
  }

  function handleFriendDelete(friendId: string) {
    emit('remove-friend', props.contact as FriendWithUserInfo)
    editMode.value = false
  }

  function closeDialog() {
    dialog.value = false
  }

  function sendMessage() {
    emit('send-message', props.contact)
    closeDialog()
  }

  function addFriend() {
    showAddFriendModal.value = true
  }

  function handleSendFriendRequest(user: { id: string; name: string; avatar: string }, message: string, tags: string[]) {
    emit('add-friend', props.contact, message, tags)
    showAddFriendModal.value = false
  }

  // 处理编辑资料
  function handleEditProfile() {
    emit('edit-profile')
    closeDialog()
  }
</script>

<style scoped>
.contact-modal-card {
  border-radius: 12px !important;
}

.contact-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.contact-modal-avatar {
  border-radius: 8px !important;
  background-color: #07c160 !important;
  border: 2px solid rgba(7, 193, 96, 0.2);
}

.contact-info {
  flex: 1;
}

.contact-details {
  margin-top: 8px;
}

.edit-form {
  padding: 8px 0;
}

.contact-actions {
  padding: 16px;
}
</style>
