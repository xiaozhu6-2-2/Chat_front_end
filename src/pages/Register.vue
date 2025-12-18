<template>
  <!-- 主容器，使用全屏高度 -->
  <v-container class="fill-height container" fluid>
    <!-- 行布局，垂直和水平居中 -->
    <v-row align-content="center" class="fill-height" justify="center">
      <!-- 注册卡片容器 -->
      <v-col cols="12" lg="8" md="10" xl="6">
        <v-card class="elevation-24 rounded-lg overflow-hidden card">
          <v-row class="fill-height" no-gutters>
            <!-- 左侧文本信息区域 -->
            <v-col
              class="pa-8 d-flex flex-column justify-center text-white"
              cols="12"
              md="6"
            >
              <!-- 品牌信息 -->
              <BrandInfo />

              <!-- 特色功能列表 -->
              <FeatureList class="mt-8" />
            </v-col>

            <!-- 右侧注册表单区域 -->
            <v-col
              class="pa-8 d-flex flex-column justify-center"
              cols="12"
              md="6"
            >
              <!-- 步骤 1: 邮箱输入 -->
              <div v-if="currentStep === 1" class="step-content">
                <div class="text-center mb-8">
                  <h2 class="text-h5 font-weight-bold text-white">
                    创建新账户
                  </h2>
                  <p class="text-body-2 text-grey">
                    使用邮箱开始您的注册流程
                  </p>
                </div>

                <v-form @submit.prevent="step1Click">
                  <v-text-field
                    v-model="registerForm.email"
                    autofocus
                    class="mb-4"
                    color="primary"
                    label="邮箱地址"
                    prepend-inner-icon="mdi-email"
                    required
                    :rules="emailRules"
                    variant="outlined"
                  />

                  <div class="d-flex justify-end">
                    <v-btn
                      color="primary"
                      :loading="loading"
                      size="large"
                      type="submit"
                    >
                      下一步
                      <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                  </div>
                </v-form>
              </div>

              <!-- 步骤 2: 密码设置 -->
              <div v-if="currentStep === 2" class="step-content">
                <div class="text-center mb-8">
                  <h2 class="text-h5 font-weight-bold text-white">
                    设置密码
                  </h2>
                  <p class="text-body-2 text-grey">
                    请设置一个安全的密码
                  </p>
                </div>

                <v-form @submit.prevent="step2Click">
                  <v-text-field
                    v-model="registerForm.password"
                    :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    autofocus
                    class="mb-4"
                    color="primary"
                    label="密码"
                    prepend-inner-icon="mdi-lock"
                    required
                    :rules="passwordRules"
                    :type="showPassword ? 'text' : 'password'"
                    variant="outlined"
                    @click:append-inner="showPassword = !showPassword"
                  />

                  <v-text-field
                    v-model="registerForm.confirmPassword"
                    :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    class="mb-6"
                    color="primary"
                    label="确认密码"
                    prepend-inner-icon="mdi-lock-check"
                    required
                    :rules="confirmPasswordRules"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    variant="outlined"
                    @click:append-inner="showConfirmPassword = !showConfirmPassword"
                  />

                  <div class="d-flex justify-space-between">
                    <v-btn
                      color="grey"
                      size="large"
                      variant="outlined"
                      @click="goBack"
                    >
                      <v-icon start>mdi-arrow-left</v-icon>
                      上一步
                    </v-btn>
                    <v-btn
                      color="primary"
                      :loading="loading"
                      size="large"
                      type="submit"
                    >
                      下一步
                      <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                  </div>
                </v-form>
              </div>

              <!-- 步骤 3: 用户名和头像 -->
              <div v-if="currentStep === 3" class="step-content">
                <div class="text-center mb-8">
                  <h2 class="text-h5 font-weight-bold text-white">
                    设置用户名和头像
                  </h2>
                  <p class="text-body-2 text-grey">
                    创建您的个人身份标识
                  </p>
                </div>

                <v-form @submit.prevent="step3Click">
                  <!-- 头像预览区域 -->
                  <div class="avatar-upload-area mb-6">
                    <div class="avatar-preview-section mb-4">
                      <!-- 隐藏的文件输入框 -->
                      <input
                        ref="avatarInput"
                        accept="image/*"
                        style="display: none"
                        type="file"
                        @change="handleAvatarInputChange"
                      >

                      <!-- 可点击的预览区域 -->
                      <div
                        class="avatar-clickable-area"
                        @click="triggerAvatarInput"
                      >
                        <v-avatar class="avatar-preview" size="120">
                          <Avatar
                            v-if="registerForm.avatarPreview"
                            :name="registerForm.username || '预览'"
                            size="120"
                            :url="registerForm.avatarPreview"
                          />
                          <div v-else class="d-flex flex-column align-center justify-center h-100">
                            <v-icon class="mb-2" color="grey-lighten-1" size="60">
                              mdi-camera-plus
                            </v-icon>
                          </div>
                        </v-avatar>
                      </div>

                      <v-btn
                        v-if="registerForm.avatarPreview"
                        class="mt-2"
                        color="error"
                        size="small"
                        variant="text"
                        @click="clearAvatar"
                      >
                        移除头像
                      </v-btn>
                    </div>

                    <!-- 显示文件信息的文本区域（只读） -->
                    <div v-if="registerForm.avatar" class="file-info mb-4">
                      <v-chip
                        color="primary"
                        prepend-icon="mdi-image"
                        size="small"
                        variant="outlined"
                      >
                        {{ registerForm.avatar.name }}
                        <v-tooltip activator="parent" location="top">
                          大小: {{ formatFileSize(registerForm.avatar.size) }}
                        </v-tooltip>
                      </v-chip>
                    </div>
                  </div>

                  <v-text-field
                    v-model="registerForm.username"
                    autofocus
                    class="mb-6"
                    color="primary"
                    label="用户名"
                    prepend-inner-icon="mdi-account"
                    required
                    :rules="usernameRules"
                    variant="outlined"
                  />

                  <div class="d-flex justify-space-between">
                    <v-btn
                      color="grey"
                      size="large"
                      variant="outlined"
                      @click="goBack"
                    >
                      <v-icon start>mdi-arrow-left</v-icon>
                      上一步
                    </v-btn>
                    <v-btn
                      color="primary"
                      :loading="loading"
                      size="large"
                      type="submit"
                    >
                      下一步
                      <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                  </div>
                </v-form>
              </div>

              <!-- 步骤 4: 完善信息 -->
              <div v-if="currentStep === 4" class="step-content">
                <div class="text-center mb-8">
                  <h2 class="text-h5 font-weight-bold text-white">
                    完善个人信息
                  </h2>
                  <p class="text-body-2 text-grey">
                    帮助其他用户更好地了解您
                  </p>
                </div>

                <v-form @submit.prevent="step4Click">
                  <v-select
                    v-model="registerForm.gender"
                    class="mb-4"
                    clearable
                    color="primary"
                    :items="genderOptions"
                    label="性别"
                    prepend-inner-icon="mdi-gender-male-female"
                    variant="outlined"
                  />

                  <v-text-field
                    v-model="registerForm.region"
                    class="mb-4"
                    clearable
                    color="primary"
                    label="地区"
                    prepend-inner-icon="mdi-map-marker"
                    variant="outlined"
                  />

                  <v-textarea
                    v-model="registerForm.bio"
                    class="mb-6"
                    color="primary"
                    label="个人简介"
                    no-resize
                    placeholder="简单介绍一下自己..."
                    prepend-inner-icon="mdi-text"
                    rows="3"
                    variant="outlined"
                  />

                  <div class="d-flex justify-space-between">
                    <v-btn
                      color="grey"
                      size="large"
                      variant="outlined"
                      @click="goBack"
                    >
                      <v-icon start>mdi-arrow-left</v-icon>
                      上一步
                    </v-btn>
                    <v-btn
                      color="primary"
                      :loading="loading"
                      size="large"
                      type="submit"
                    >
                      完成注册
                      <v-icon end>mdi-check</v-icon>
                    </v-btn>
                  </div>
                </v-form>
              </div>

              <!-- 步骤 5: 注册成功 -->
              <div v-if="currentStep === 5" class="step-content text-center">
                <div class="mb-8">
                  <v-icon class="mb-4" color="success" size="80">
                    mdi-check-circle
                  </v-icon>
                  <h2 class="text-h5 font-weight-bold text-white mb-4">
                    注册成功！
                  </h2>
                  <div class="d-flex align-center justify-center">
                    <v-avatar
                      class="mr-3"
                      :color="registerForm.avatarPreview ? 'transparent' : 'primary'"
                      :size="40"
                    >
                      <Avatar
                        v-if="registerForm.avatarPreview"
                        :name="registerForm.username"
                        :size="40"
                        :url="registerForm.avatarPreview"
                      />
                      <v-icon
                        v-else
                        color="white"
                        size="24"
                      >
                        mdi-account
                      </v-icon>
                    </v-avatar>
                    <p class="text-h6 text-primary font-weight-medium mb-0">
                      {{ registerForm.username }}
                    </p>
                  </div>
                </div>

                <v-btn
                  class="px-8"
                  color="primary"
                  size="large"
                  @click="goToLogin"
                >
                  开始聊天
                  <v-icon end>mdi-message</v-icon>
                </v-btn>
              </div>

              <!-- 步骤指示器 -->
              <div class="mt-8 step-map">
                <v-stepper v-model="currentStep" alt-labels class="transparent-stepper">
                  <v-stepper-header>
                    <v-stepper-item
                      :complete="currentStep > 1"
                      icon="mdi-email"
                      :value="1"
                    />

                    <v-divider />

                    <v-stepper-item
                      :complete="currentStep > 2"
                      icon="mdi-lock"
                      :value="2"
                    />

                    <v-divider />

                    <v-stepper-item
                      :complete="currentStep > 3"
                      icon="mdi-account"
                      :value="3"
                    />

                    <v-divider />

                    <v-stepper-item
                      :complete="currentStep > 4"
                      icon="mdi-information"
                      :value="4"
                    />

                    <v-divider />

                    <v-stepper-item
                      icon="mdi-check"
                      :value="5"
                    />
                  </v-stepper-header>
                </v-stepper>
              </div>

            </v-col>
          </v-row>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

</template>

<route lang="yaml">
meta:
  layout: auth
</route>

<script setup lang="ts">
  import { reactive, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuth } from '@/composables/useAuth'
  import { useSnackbar } from '@/composables/useSnackbar'

  const router = useRouter()
  const { showError, showSuccess } = useSnackbar()
  const { register, isLoading } = useAuth()

  // 表单数据
  const registerForm = reactive({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    gender: '',
    region: '',
    // 简介
    bio: '',
    // 头像相关
    avatar: null as File | null, // File object
    avatarPreview: '', // Blob URL for preview
  })

  // 状态管理
  const currentStep = ref(1)
  const loading = ref(false)
  const showPassword = ref(false)
  const showConfirmPassword = ref(false)

  // 头像相关状态
  const avatarError = ref('')
  const avatarInput = ref<HTMLInputElement | null>(null)
  const avatarRules = [
    (file: File) => {
      if (!file) return true // Avatar is optional
      if (!file.type.startsWith('image/')) {
        return '请选择图片文件'
      }
      if (file.size > 5 * 1024 * 1024) {
        return '图片大小不能超过5MB'
      }
      return true
    },
  ]

  // 性别选项
  const genderOptions = [
    { title: '男', value: 'male' },
    { title: '女', value: 'female' },
    { title: '其他', value: 'other' },
  ]

  // 表单验证规则
  const emailRules = [
    (value: string) => !!value || '邮箱不能为空',
    (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value) || '请输入有效的邮箱地址'
    },
  ]

  const passwordRules = [
    (value: string) => !!value || '密码不能为空',
    (value: string) => (value && value.length >= 6) || '密码至少6个字符',
  ]

  const confirmPasswordRules = [
    (value: string) => !!value || '请确认密码',
    (value: string) => value === registerForm.password || '两次输入的密码不一致',
  ]

  const usernameRules = [
    (value: string) => !!value || '用户名不能为空',
    (value: string) => (value && value.length >= 2) || '用户名至少2个字符',
  ]

  // 步骤 1: 邮箱验证
  async function step1Click () {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(registerForm.email)) {
      showError('请输入有效的邮箱地址')
      return
    }

    currentStep.value = 2
  }

  // 步骤 2: 密码验证
  function step2Click () {
    if (!registerForm.password) {
      showError('请输入密码')
      return
    }

    if (registerForm.password.length < 6) {
      showError('密码至少6个字符')
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      showError('两次输入的密码不一致')
      return
    }

    currentStep.value = 3
  }

  // 步骤 3: 用户名验证
  function step3Click () {
    if (!registerForm.username) {
      showError('请输入用户名')
      return
    }

    if (registerForm.username.length < 2) {
      showError('用户名至少2个字符')
      return
    }

    currentStep.value = 4
  }

  // 返回上一步
  function goBack () {
    if (currentStep.value > 1) {
      currentStep.value--
    }
  }

  // 注册成功后跳转到聊天页面
  function goToLogin () {
    router.push('/login')
  }

  // 清除头像
  function clearAvatar () {
    if (registerForm.avatarPreview) {
      URL.revokeObjectURL(registerForm.avatarPreview)
    }
    registerForm.avatar = null
    registerForm.avatarPreview = ''
    avatarError.value = ''
  }

  // 触发文件选择对话框
  function triggerAvatarInput () {
    avatarInput.value?.click()
  }

  // 处理文件输入变化
  function handleAvatarInputChange (event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0] || null

    // 重置输入框以允许重复选择同一文件
    if (target) {
      target.value = ''
    }

    // 调用原来的处理函数
    handleAvatarChange(file)
  }

  // 头像处理方法
  function handleAvatarChange (file: File | null) {
    avatarError.value = ''

    if (!file) {
      clearAvatar()
      return
    }

    // 验证文件
    const validation = avatarRules[0]!(file)
    if (validation !== true) {
      avatarError.value = validation as string
      clearAvatar()
      return
    }

    // 保存文件对象并创建预览
    registerForm.avatar = file
    registerForm.avatarPreview = URL.createObjectURL(file)
  }

  // 格式化文件大小
  function formatFileSize (bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 步骤 4: 执行注册
  async function step4Click () {
    if (registerForm.avatar && avatarError.value) {
      showError('头像上传错误，请重试')
      return
    }

    loading.value = true

    try {
      console.log('Register: 开始注册流程，调用 useAuth.register')

      // 准备注册数据
      const userData = {
        account: registerForm.email,
        password: registerForm.password,
        username: registerForm.username,
        gender: registerForm.gender === 'male' ? 1 : (registerForm.gender === 'female' ? 2 : undefined),
        region: registerForm.region || undefined,
        bio: registerForm.bio || undefined,
        avatar: '1', // 默认头像
      }

      // 调用 useAuth 的 register 方法
      const result = await register(userData)

      if (result.success) {
        currentStep.value = 5 // 跳转到注册成功页面
        showSuccess('注册成功，请登录')
      } else {
        showError(result.error || '注册失败')
      }
    } catch (error: any) {
      console.error('Register: 注册失败', error)
      showError(error.message || '注册失败，请重试')
    } finally {
      loading.value = false
    }
  }

</script>

<style scoped>
.container {
  background-color: #1c1c1e;
}

.card {
  border: 1px solid #1c1c11;
  background-color: #1c1c1e;
  box-shadow: 0px 0px 10px 5px rgba(0, 0, 0, 0.3);
}

.rounded-lg {
  border-radius: 16px;
}

/* 透明步骤指示器样式 */
.transparent-stepper {
  background: transparent !important;
}

.transparent-stepper .v-stepper-header {
  background: transparent !important;
  box-shadow: none !important;
}

.transparent-stepper .v-stepper-item {
  color: rgba(255, 255, 255, 0.7) !important;
}

.transparent-stepper .v-stepper-item--active {
  color: white !important;
}

.transparent-stepper .v-stepper-item--complete {
  color: #4caf50 !important;
}

.transparent-stepper .v-divider {
  border-color: rgba(255, 255, 255, 0.3) !important;
}

/* 步骤内容动画 */
.step-content {
  animation: fadeInRight 0.3s ease-in-out;
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 响应式调整 */
@media (max-width: 960px) {
  .pa-8 {
    padding: 24px;
  }

  .transparent-stepper .v-stepper-header {
    flex-direction: column;
    gap: 8px;
  }

  .transparent-stepper .v-divider {
    display: none;
  }
}

/* 表单输入框悬停效果 */
.v-text-field:hover .v-field__outline,
.v-select:hover .v-field__outline,
.v-textarea:hover .v-field__outline {
  border-color: rgba(var(--v-theme-primary), 0.8);
}

/* 按钮悬停效果 */
.v-btn:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease-in-out;
}

.step-map {
  height: 10%;
}

/* 头像上传样式 */
.avatar-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-preview-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
}

.avatar-clickable-area {
  cursor: pointer;

  .avatar-preview {
    border: 2px dashed rgba(255, 255, 255, 0.3);
    transition: all 0.3s ease;

    &:hover {
      border-color: rgba(255, 255, 255, 0.6);
      transform: scale(1.02);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
  }
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 头像区域响应式调整 */
@media (max-width: 600px) {
  .avatar-preview {
    width: 100px !important;
    height: 100px !important;
  }
}
</style>
