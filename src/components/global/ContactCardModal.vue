<template>
  <v-dialog
    v-model="dialog"
    persistent
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
          <!-- 编辑按钮 - 仅好友可见 -->
          <v-btn
            v-if="isContactFriend && !editMode"
            icon="mdi-pencil"
            size="small"
            variant="text"
            @click="enterEditMode"
          />
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            @click="closeDialog"
          />
        </div>
      </v-card-item>

      <v-divider />

      <v-card-text>
        <!-- 编辑模式表单 -->
        <v-form v-if="editMode && isContactFriend" v-model="formValid" @submit.prevent="saveEdit">
          <div class="edit-form">
            <!-- 备注输入框 -->
            <v-text-field
              v-model="editData.remark"
              class="mb-4"
              counter
              density="compact"
              label="备注"
              maxlength="20"
              placeholder="为好友设置备注名称"
              prepend-inner-icon="mdi-account-edit"
              :rules="remarkRules"
              variant="outlined"
            />

            <!-- 标签选择器 -->
            <v-combobox
              v-model="editData.tag"
              chips
              class="mb-4"
              clearable
              counter
              density="compact"
              label="标签"
              maxlength="10"
              placeholder="选择或输入标签"
              prepend-inner-icon="mdi-tag"
              :rules="tagRules"
              variant="outlined"
            >
              <template #chip="{ props: chipProps, item }">
                <v-chip
                  v-bind="chipProps"
                  size="small"
                />
              </template>
            </v-combobox>

            <!-- 黑名单开关 -->
            <v-switch
              v-model="editData.isBlacklist"
              color="error"
              inset
              label="加入黑名单"
              :messages="editData.isBlacklist ? '加入黑名单后将无法接收对方消息' : ''"
              prepend-inner-icon="mdi-block-helper"
            />
          </div>
        </v-form>

        <!-- 查看模式详情 -->
        <div v-else class="contact-details">
          <v-list density="compact" lines="two">
            <!-- 邮箱 -->
            <v-list-item prepend-icon="mdi-email" title="邮箱">
              <template #subtitle>
                {{ contactInfo.email || `${contactInfo.name.toLowerCase()}@example.com` }}
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
            <v-list-item prepend-icon="mdi-calendar" title="添加时间">
              <template #subtitle>
                {{ formatDate(contactInfo.createTime) }}
              </template>
            </v-list-item>

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

        <!-- 编辑模式按钮 -->
        <template v-if="editMode && isContactFriend">
          <v-btn
            :disabled="saving"
            variant="outlined"
            @click="cancelEdit"
          >
            取消
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!formValid || saving"
            :loading="saving"
            variant="elevated"
            @click="saveEdit"
          >
            保存
          </v-btn>
        </template>

        <!-- 查看模式按钮 -->
        <template v-else>
          <!-- 好友模式的操作按钮 -->
          <template v-if="isFriendContact">
            <!-- 如果是当前用户且是好友（自己），显示编辑资料按钮 -->
            <v-btn
              v-if="isCurrentUser"
              color="primary"
              prepend-icon="mdi-account-edit"
              @click="handleEditProfile"
            >
              编辑资料
            </v-btn>
            <!-- 如果不是当前用户，显示发送消息按钮 -->
            <v-btn
              v-else
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
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import type { FriendWithUserInfo } from '../../types/friend'
  import type { ContactCardModalEmits, ContactCardModalProps } from '../../types/global'

  import { computed, reactive, ref } from 'vue'

  import { useFriend } from '../../composables/useFriend'

  // 作用是为这个 Vue 组件设置名称为 "ContactCardModal"
  defineOptions({
    name: 'ContactCardModal',
  })

  // 使用 useFriend composable
  const { checkUserRelation } = useFriend()

  // modelValue 是默认的 v-model 绑定属性
  const props = withDefaults(defineProps<ContactCardModalProps>(), {
    modelValue: false,
  })

  const emit = defineEmits<ContactCardModalEmits>()

  // 编辑状态管理
  const editMode = ref(false)
  const formValid = ref(false)
  const saving = ref(false)
  const editData = reactive({
    remark: '',
    tag: null as string | null,
    isBlacklist: false,
  })
  const originalData = reactive({
    remark: '',
    tag: null as string | null,
    isBlacklist: false,
  })

  // 验证规则
  const remarkRules = [
    (v: string) => !v || v.length <= 20 || '备注不能超过20个字符',
  ]

  const tagRules = [
    (v: string) => !v || v.length <= 10 || '标签不能超过10个字符',
  ]

  // 监听双向绑定变量
  const dialog = computed({
    get: () => props.modelValue,
    set: value => {
      if (!value && editMode.value) {
        cancelEdit()
      }
      emit('update:modelValue', value)
    },
  })

  // 判断是否为好友
  const isFriendContact = computed(() => {
    return props.contact && checkUserRelation(props.contact.uid).isFriend
  })

  // 根据联系人类型获取显示信息
  const contactInfo = computed(() => {
    if (!props.contact) return null

    if (isFriendContact.value) {
      const friend = props.contact as FriendWithUserInfo
      return {
        // 好友
        id: friend.uid,
        name: friend.username,
        avatar: friend.avatar,
        email: friend.info?.email,
        remark: friend.remark,
        initial: friend.username.charAt(0).toUpperCase(),
        isBlacklist: friend.isBlacklisted,
        tag: friend.tag,
        fid: friend.fid,
        createTime: friend.createdAt,
        account: friend.info?.account,
        region: friend.info?.region,
        gender: friend.info?.gender,
        bio: friend.bio,
      }
    } else {
      // UserProfile
      // 非好友
      const profile = props.contact as FriendWithUserInfo
      return {
        id: profile.uid,
        name: profile.username,
        avatar: profile.avatar,
        email: profile.info?.email,
        initial: (profile.username || '').charAt(0).toUpperCase(),
        account: profile.info?.account,
        gender: profile.info?.gender,
        region: profile.info?.region,
        bio: profile.bio,
        createTime: profile.createdAt,
      }
    }
  })

  // 计算属性控制card是陌生人 or 好友 or 自己
  const isContactFriend = computed(() => {
    return props.contact && checkUserRelation(props.contact.uid).isFriend
  })

  // 判断是否是当前用户
  // todo：使用authstore
  const isCurrentUser = computed(() => {
    return props.contact?.uid === 'current-user' || props.contact?.uid === 'test-user-001'
  })

  // 格式化日期
  function formatDate (dateString?: string) {
    if (!dateString) return '未知'
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  // 编辑模式方法
  function enterEditMode () {
    if (!isContactFriend.value || !props.contact) return

    // 备份当前数据
    originalData.remark = contactInfo.value?.remark || ''
    originalData.tag = contactInfo.value?.tag || null
    originalData.isBlacklist = contactInfo.value?.isBlacklist || false

    // 设置编辑数据
    editData.remark = originalData.remark
    editData.tag = originalData.tag
    editData.isBlacklist = originalData.isBlacklist

    // 进入编辑模式
    editMode.value = true
  }

  function cancelEdit () {
    // 恢复原始数据
    editData.remark = originalData.remark
    editData.tag = originalData.tag
    editData.isBlacklist = originalData.isBlacklist

    // 退出编辑模式
    editMode.value = false
  }

  async function saveEdit () {
    if (!formValid.value || !isContactFriend.value || !props.contact) return

    saving.value = true

    try {
      const friend = props.contact as FriendWithUserInfo

      // 检查是否有变化
      const hasChanges
        = editData.remark !== originalData.remark
          || editData.tag !== originalData.tag
          || editData.isBlacklist !== originalData.isBlacklist

      if (hasChanges) {
        // 备注黑名单标签发生变化
        emit('update-friend-profile', friend.fid, editData.remark, editData.isBlacklist, editData.tag)
      }

      // 退出编辑模式
      editMode.value = false
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      saving.value = false
    }
  }

  function closeDialog () {
    if (editMode.value) {
      cancelEdit()
    }
    dialog.value = false
  }

  function sendMessage () {
    emit('send-message', props.contact)
    closeDialog()
  }

  function addFriend () {
    emit('add-friend', props.contact)
    closeDialog()
  }

  function removeFriend () {
    if (isContactFriend.value && props.contact) {
      emit('remove-friend', props.contact as FriendWithUserInfo)
      closeDialog()
    }
  }

  // 处理编辑资料
  function handleEditProfile () {
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
