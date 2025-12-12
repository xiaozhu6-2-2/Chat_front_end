<template>
  <v-dialog
    v-model="dialog"
    width="400"
    persistent
    transition="dialog-bottom-transition"
  >
    <template v-slot:activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps">
        <!-- 默认激活器插槽 -->
      </slot>
    </template>

    <v-card v-if="contactInfo" class="contact-modal-card">
      <v-card-item>
        <div class="contact-header">
          <Avatar
            :url="contactInfo.avatar"
            :name="contactInfo.name"
            :size="60"
            :clickable="false"
            avatar-class="contact-modal-avatar"
          />
          <div class="contact-info">
            <v-card-title>{{ contactInfo.name }}</v-card-title>
            <v-card-subtitle>联系人 ID: {{ contactInfo.id }}</v-card-subtitle>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="closeDialog"
          />
        </div>
      </v-card-item>

      <v-divider></v-divider>

      <v-card-text>
        <div class="contact-details">
          <v-list lines="two" density="compact">
            <!-- 邮箱 -->
            <v-list-item prepend-icon="mdi-email" title="邮箱">
              <template v-slot:subtitle>
                {{ contactInfo.email || `${contactInfo.name.toLowerCase()}@example.com` }}
              </template>
            </v-list-item>

            <!-- 账号（如果是 UserProfile） -->
            <v-list-item v-if="contactInfo.account" prepend-icon="mdi-account-key" title="账号">
              <template v-slot:subtitle>
                {{ contactInfo.account }}
              </template>
            </v-list-item>

            <!-- 性别（如果是 UserProfile） -->
            <v-list-item v-if="contactInfo.gender" prepend-icon="mdi-gender-male-female" title="性别">
              <template v-slot:subtitle>
                {{ contactInfo.gender === 'male' ? '男' : contactInfo.gender === 'female' ? '女' : '其他' }}
              </template>
            </v-list-item>

            <!-- 地区（如果是 UserProfile） -->
            <v-list-item v-if="contactInfo.region" prepend-icon="mdi-map-marker" title="地区">
              <template v-slot:subtitle>
                {{ contactInfo.region }}
              </template>
            </v-list-item>

            <!-- 简介（如果是 UserProfile） -->
            <v-list-item v-if="contactInfo.bio" prepend-icon="mdi-text" title="简介">
              <template v-slot:subtitle>
                {{ contactInfo.bio }}
              </template>
            </v-list-item>

            <!-- 备注（如果是好友） -->
            <v-list-item v-if="isContactFriend" prepend-icon="mdi-account-edit" title="备注">
              <template v-slot:subtitle>
                {{ contactInfo.remark || '未设置' }}
              </template>
            </v-list-item>

            <!-- 标签（如果是好友） -->
            <v-list-item v-if="isContactFriend && contactInfo.tag" prepend-icon="mdi-tag" title="标签">
              <template v-slot:subtitle>
                <v-chip size="small" color="primary">{{ contactInfo.tag }}</v-chip>
              </template>
            </v-list-item>

            <!-- 添加时间 -->
            <v-list-item prepend-icon="mdi-calendar" title="添加时间">
              <template v-slot:subtitle>
                {{ formatDate(contactInfo.createTime) }}
              </template>
            </v-list-item>

            <!-- 黑名单状态（如果是好友） -->
            <v-list-item v-if="isContactFriend" prepend-icon="mdi-block-helper" title="黑名单">
              <template v-slot:subtitle>
                <v-chip :color="contactInfo.isBlacklist ? 'error' : 'success'" size="small">
                  {{ contactInfo.isBlacklist ? '已拉黑' : '正常' }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="contact-actions">
        <v-spacer />

        <!-- 好友模式的操作按钮 -->
        <template v-if="mode === 'friend'">
          <v-btn
            variant="outlined"
            prepend-icon="mdi-pencil"
            @click="editRemark"
          >
            编辑备注
          </v-btn>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-tag"
            @click="setTag"
          >
            设置标签
          </v-btn>
          <v-btn
            :color="contactInfo.isBlacklist ? 'success' : 'error'"
            :prepend-icon="contactInfo.isBlacklist ? 'mdi-account-check' : 'mdi-account-cancel'"
            variant="outlined"
            @click="toggleBlacklist"
          >
            {{ contactInfo.isBlacklist ? '移出黑名单' : '加入黑名单' }}
          </v-btn>
          <v-btn
            color="error"
            prepend-icon="mdi-account-remove"
            variant="outlined"
            @click="removeFriend"
          >
            删除好友
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
          <!-- 如果不是当前用户，显示添加好友按钮 -->
          <v-btn
            v-if="!isCurrentUser"
            color="primary"
            prepend-icon="mdi-account-plus"
            @click="addFriend"
          >
            添加好友
          </v-btn>
          <v-btn
            color="success"
            prepend-icon="mdi-message"
            @click="sendMessage"
          >
            发送消息
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isFriend, type ContactData } from '../../types/componentProps'
import type { FriendWithUserInfo, UserProfile } from '../../service/messageTypes'

//作用是为这个 Vue 组件设置名称为 "ContactCardModal"
defineOptions({
  name: 'ContactCardModal'
})

import type { ContactCardModalProps, ContactCardModalEmits } from '../../types/componentProps'

//modelValue 是默认的 v-model 绑定属性
const props = withDefaults(defineProps<ContactCardModalProps>(), {
  modelValue: false,
  mode: 'stranger'
})

const emit = defineEmits<ContactCardModalEmits>()

//监听双向绑定变量
const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 判断是否为好友
const isFriendContact = computed(() => {
  return props.contact && isFriend(props.contact)
})

// 根据联系人类型获取显示信息
const contactInfo = computed(() => {
  if (!props.contact) return null

  if (isFriendContact.value) {
    const friend = props.contact as FriendWithUserInfo
    return {
      id: friend.uid,
      name: friend.user_info.username,
      avatar: friend.user_info.avatar,
      email: friend.user_info.email,
      remark: friend.remark || friend.to_remark,
      initial: friend.user_info.username.charAt(0).toUpperCase(),
      isBlacklist: friend.is_blacklist,
      tag: friend.tag || friend.to_tag,
      fid: friend.fid,
      createTime: friend.create_time,
      account: friend.user_info.account,
      region: friend.user_info.region,
      gender: friend.user_info.gender,
      bio: friend.user_info.bio
    }
  } else {
    // UserProfile
    const profile = props.contact as UserProfile
    return {
      id: profile.uid,
      name: profile.username,
      avatar: profile.avatar,
      email: profile.email,
      remark: undefined,
      initial: profile.username.charAt(0).toUpperCase(),
      account: profile.account,
      gender: profile.gender,
      region: profile.region,
      bio: profile.bio,
      createTime: profile.create_time,
      isBlacklist: false,
      tag: null,
      fid: null
    }
  }
})

const isContactFriend = computed(() => isFriend(props.contact))

// 判断是否是当前用户
const isCurrentUser = computed(() => {
  return props.contact?.uid === 'current-user' || props.contact?.uid === 'test-user-001'
})

// 格式化日期
const formatDate = (dateString?: string) => {
  if (!dateString) return '未知'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const closeDialog = () => {
  dialog.value = false
}

const sendMessage = () => {
  emit('send-message', props.contact)
  closeDialog()
}

const addFriend = () => {
  emit('add-friend', props.contact)
  closeDialog()
}

const removeFriend = () => {
  if (isContactFriend.value) {
    emit('remove-friend', props.contact as FriendWithUserInfo)
    closeDialog()
  }
}

const editRemark = () => {
  if (isContactFriend.value) {
    const newRemark = prompt('请输入新的备注名称：', contactInfo.value.remark || '')
    if (newRemark !== null) {
      emit('edit-remark', props.contact as FriendWithUserInfo, newRemark)
    }
  }
}

const setTag = () => {
  if (isContactFriend.value) {
    const newTag = prompt('请输入标签：', contactInfo.value.tag || '')
    if (newTag !== null) {
      emit('set-tag', props.contact as FriendWithUserInfo, newTag)
    }
  }
}

const toggleBlacklist = () => {
  if (isContactFriend.value) {
    emit('set-blacklist', props.contact as FriendWithUserInfo, !contactInfo.value.isBlacklist)
  }
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

.contact-actions {
  padding: 16px;
}
</style>