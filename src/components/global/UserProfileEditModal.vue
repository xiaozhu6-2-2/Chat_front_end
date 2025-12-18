<template>
  <v-dialog
    v-model="dialog"
    persistent
    transition="dialog-bottom-transition"
    width="600"
  >
    <template #activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps">
        <!-- 默认激活器插槽 -->
      </slot>
    </template>

    <v-card class="profile-edit-modal">
      <v-card-title class="d-flex align-center pa-6">
        <v-icon class="mr-3" icon="mdi-account-edit" />
        编辑个人资料
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-form v-model="formValid" @submit.prevent="handleSubmit">
          <!-- 头像上传区域 -->
          <div class="avatar-upload-section mb-6">
            <div class="d-flex align-center">
              <!-- 头像预览 -->
              <div class="avatar-preview-wrapper">
                <Avatar
                  avatar-class="profile-avatar"
                  clickable
                  :name="form.username || '用户'"
                  :size="100"
                  :url="form.avatar"
                  @click="triggerFileInput"
                />
                <!-- 头像上传提示 -->
                <v-btn
                  class="avatar-edit-btn"
                  color="primary"
                  icon="mdi-camera"
                  size="small"
                  variant="elevated"
                  @click="triggerFileInput"
                />
                <!-- 删除头像按钮 -->
                <v-btn
                  v-if="form.avatar"
                  class="avatar-delete-btn"
                  color="error"
                  icon="mdi-delete"
                  size="small"
                  variant="elevated"
                  @click="removeAvatar"
                />
              </div>

              <!-- 头像上传说明 -->
              <div class="ml-6 flex-grow-1">
                <h3 class="text-h6 mb-2">头像</h3>
                <p class="text-body-2 text-medium-emphasis">
                  点击头像或相机图标上传新头像
                </p>
                <p class="text-caption text-medium-emphasis mt-1">
                  支持 JPG、PNG 格式，文件大小不超过 2MB
                </p>
              </div>
            </div>

            <!-- 隐藏的文件输入 -->
            <input
              ref="fileInput"
              accept="image/jpeg,image/jpg,image/png"
              style="display: none"
              type="file"
              @change="handleFileChange"
            >
          </div>

          <!-- 基本信息 -->
          <v-row>
            <v-col cols="12">
              <h3 class="text-h6 mb-4">基本信息</h3>
            </v-col>

            <!-- 账号（只读） -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.account"
                density="compact"
                disabled
                hint="账号信息不可修改"
                label="账号"
                persistent-hint
                placeholder="请输入账号"
                prepend-inner-icon="mdi-account-key"
                readonly
                variant="outlined"
              />
            </v-col>

            <!-- 用户名 -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.username"
                clearable
                counter
                density="compact"
                label="用户名"
                maxlength="20"
                placeholder="请输入用户名"
                prepend-inner-icon="mdi-account"
                :rules="usernameRules"
                variant="outlined"
              />
            </v-col>

            <!-- 性别 -->
            <v-col cols="12" md="6">
              <v-select
                v-model="form.gender"
                clearable
                density="compact"
                item-title="label"
                item-value="value"
                :items="genderOptions"
                label="性别"
                placeholder="请选择性别"
                prepend-inner-icon="mdi-gender-male-female"
                :rules="genderRules"
                variant="outlined"
              />
            </v-col>

            <!-- 地区 -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.region"
                clearable
                counter
                density="compact"
                label="地区"
                maxlength="50"
                placeholder="请输入所在地区"
                prepend-inner-icon="mdi-map-marker"
                :rules="regionRules"
                variant="outlined"
              />
            </v-col>

            <!-- 邮箱 -->
            <v-col cols="12">
              <v-text-field
                v-model="form.email"
                clearable
                counter
                density="compact"
                label="邮箱"
                maxlength="100"
                placeholder="请输入邮箱地址"
                prepend-inner-icon="mdi-email"
                :rules="emailRules"
                variant="outlined"
              />
            </v-col>
          </v-row>

          <!-- 个人简介 -->
          <v-row>
            <v-col cols="12">
              <h3 class="text-h6 mb-4">个人简介</h3>
              <v-textarea
                v-model="form.bio"
                auto-grow
                clearable
                counter
                density="compact"
                label="个人简介"
                maxlength="200"
                placeholder="介绍一下自己吧..."
                prepend-inner-icon="mdi-text"
                rows="3"
                :rules="bioRules"
                variant="outlined"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-6">
        <v-spacer />
        <v-btn
          :disabled="saving"
          prepend-icon="mdi-close"
          variant="outlined"
          @click="handleCancel"
        >
          取消
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!formValid || saving || !hasChanges"
          :loading="saving"
          prepend-icon="mdi-content-save"
          variant="elevated"
          @click="handleSubmit"
        >
          保存
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import type { FriendWithUserInfo } from '../../types/friend'
  import { computed, reactive, ref, watch } from 'vue'
  import { useAuthStore } from '../../stores/authStore'
  import Avatar from './Avatar.vue'

  defineOptions({
    name: 'UserProfileEditModal',
  })

  interface Props {
    modelValue: boolean
    userId?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
  })

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'profile-updated', profile: FriendWithUserInfo): void
  }

  const emit = defineEmits<Emits>()

  // Store
  // const userStore = useUserStore()

  // Refs
  const fileInput = ref<HTMLInputElement>()
  const formValid = ref(false)
  const saving = ref(false)
  const selectedFile = ref<File | null>(null)
  const avatarPreview = ref<string>('')

  // 表单数据
  const form = reactive({
    uid: '',
    username: '',
    account: '',
    gender: 'other' as 'male' | 'female' | 'other',
    region: '',
    email: '',
    avatar: '',
    bio: '',
    createdAt: '',
  })

  // 原始数据备份
  const originalForm = reactive({
    username: '',
    gender: 'other' as 'male' | 'female' | 'other',
    region: '',
    email: '',
    avatar: '',
    bio: '',
  })

  // 性别选项
  const genderOptions = [
    { label: '男', value: 'male' },
    { label: '女', value: 'female' },
    { label: '其他', value: 'other' },
  ]

  // 验证规则
  const usernameRules = [
    (v: string) => !!v || '用户名不能为空',
    (v: string) => (v && v.length >= 2) || '用户名至少2个字符',
    (v: string) => (v && v.length <= 20) || '用户名不能超过20个字符',
    (v: string) => /^[\u4E00-\u9FA5a-zA-Z0-9_]+$/.test(v) || '用户名只能包含中文、英文、数字和下划线',
  ]

  const genderRules = [
    (v: string) => !!v || '请选择性别',
  ]

  const regionRules = [
    (v: string) => !v || v.length <= 50 || '地区不能超过50个字符',
  ]

  const emailRules = [
    (v: string) => !!v || '邮箱不能为空',
    (v: string) => /.+@.+\..+/.test(v) || '请输入有效的邮箱地址',
    (v: string) => (v && v.length <= 100) || '邮箱不能超过100个字符',
  ]

  const bioRules = [
    (v: string) => !v || v.length <= 200 || '个人简介不能超过200个字符',
  ]

  // 计算属性
  const dialog = computed({
    get: () => props.modelValue,
    set: value => {
      if (!value) {
        resetForm()
      }
      emit('update:modelValue', value)
    },
  })

  const hasChanges = computed(() => {
    return (
      form.username !== originalForm.username
      || form.gender !== originalForm.gender
      || form.region !== originalForm.region
      || form.email !== originalForm.email
      || form.avatar !== originalForm.avatar
      || form.bio !== originalForm.bio
    )
  })

  // 方法
  async function loadUserData () {
    const authStore = useAuthStore()

    const userId = authStore.userId
    const profile = await getCurrentUserInfo()

    // 转换为FriendWithUserInfo格式
    const userInfo: FriendWithUserInfo = {
      fid: '', // 当前用户不是好友，fid为空
      uid: profile.uid || userId,
      username: profile.username,
      avatar: profile.avatar || '',
      bio: profile.bio,
      createdAt: profile.create_time,
      isBlacklisted: false,
      info: {
        account: profile.account,
        gender: profile.gender,
        region: profile.region,
        email: profile.email,
      },
    }
    // 加载用户数据到表单
    Object.assign(form, profile)

    // 备份原始数据
    Object.assign(originalForm, {
      username: profile.username,
      gender: profile.gender,
      region: profile.region || '',
      email: profile.email || '',
      avatar: profile.avatar || '',
      bio: profile.bio || '',
    })
  }

  function resetForm () {
    if (fileInput.value) {
      fileInput.value.value = ''
    }
    selectedFile.value = null
    avatarPreview.value = ''
    loadUserData()
  }

  function triggerFileInput () {
    fileInput.value?.click()
  }

  function handleFileChange (event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (!file) return

    // 验证文件类型
    if (!/image\/(jpeg|jpg|png)/.test(file.type)) {
      alert('请选择 JPG 或 PNG 格式的图片')
      return
    }

    // 验证文件大小（2MB）
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB')
      return
    }

    selectedFile.value = file

    // 创建预览
    const reader = new FileReader()
    reader.addEventListener('load', e => {
      avatarPreview.value = e.target?.result as string
      form.avatar = avatarPreview.value
    })
    reader.readAsDataURL(file)
  }

  function removeAvatar () {
    form.avatar = ''
    avatarPreview.value = ''
    selectedFile.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }

  async function handleSubmit () {
    if (!formValid.value) return

    saving.value = true

    try {
      // 准备更新数据
      const updates: Partial<FriendWithUserInfo> = {
        username: form.username,
        gender: form.gender,
        region: form.region,
        email: form.email,
        avatar: form.avatar,
        bio: form.bio,
      }

      // 更新用户资料 todo

      // const success = await userStore.updateProfile(updates)
      const success = true
      if (success) {
        // 更新原始数据备份
        Object.assign(originalForm, {
          username: form.username,
          gender: form.gender,
          region: form.region,
          email: form.email,
          avatar: form.avatar,
          bio: form.bio,
        })

        // 发出更新事件
        // emit('profile-updated', userStore.currentUser)

        // 关闭对话框
        dialog.value = false
      }
    } catch (error) {
      console.error('保存用户资料失败:', error)
      alert('保存失败，请重试')
    } finally {
      saving.value = false
    }
  }

  function handleCancel () {
    if (hasChanges.value) {
      if (confirm('您有未保存的更改，确定要关闭吗？')) {
        dialog.value = false
      }
    } else {
      dialog.value = false
    }
  }

  // 监听对话框打开事件
  watch(dialog, newVal => {
    if (newVal) {
      loadUserData()
    }
  })

  // 监听用户ID变化
  watch(() => props.userId, () => {
    if (props.modelValue) {
      loadUserData()
    }
  }, { immediate: true })
</script>

<style scoped>
.profile-edit-modal {
  border-radius: 12px !important;
}

.avatar-upload-section {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
}

.avatar-preview-wrapper {
  position: relative;
  display: inline-block;
}

.profile-avatar {
  cursor: pointer;
  transition: all 0.3s ease;
}

.profile-avatar:hover {
  transform: scale(1.05);
}

.avatar-edit-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 1;
}

.avatar-delete-btn {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
}

.v-textarea :deep(.v-field__field) {
  padding-top: 8px;
}

.v-textarea :deep(.v-field__input) {
  padding-top: 4px;
}
</style>
