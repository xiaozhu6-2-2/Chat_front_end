<template>
    <!-- 主容器，使用全屏高度 -->
  <v-container fluid class="fill-height container">
    <!-- 行布局，垂直和水平居中 -->
    <v-row align-content="center" justify="center" class="fill-height">
      <!-- 注册卡片容器 -->
      <v-col cols="12" md="10" lg="8" xl="6">
        <v-card class="elevation-24 rounded-lg overflow-hidden card" >
          <v-row no-gutters class="fill-height">
            <!-- 左侧文本信息区域 -->
            <v-col
              cols="12"
              md="6"
              class="pa-8 d-flex flex-column justify-start text-white"
            >
              <!-- 品牌信息 -->
              <BrandInfo />
            </v-col>

            <!-- 右侧注册表单区域 -->
            <v-col
              cols="12"
              md="6"
              class="pa-8 d-flex flex-column justify-center"
            >
              <!-- 步骤 1: 邮箱输入 -->
              <div v-if="currentStep === 1" class="step-content">
                <div class="text-center mb-8">
                  <h2 class="text-h5 font-weight-bold text-grey-darken-3">
                    重置密码
                  </h2>
                  <p class="text-body-2 text-grey">
                    使用邮箱进行身份验证
                  </p>
                </div>

                <v-form @submit.prevent="step1Click">
                  <v-text-field
                    v-model="forgetForm.email"
                    :rules="emailRules"
                    label="请输入注册时的邮箱账户"
                    prepend-inner-icon="mdi-email"
                    variant="outlined"
                    color="primary"
                    class="mb-4"
                    required
                    autofocus
                  />

                  <div class="d-flex justify-end">
                    <v-btn
                      type="submit"
                      color="primary"
                      size="large"
                      :loading="loading"
                    >
                      下一步
                      <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                  </div>
                </v-form>
              </div>

              <!-- 步骤2：身份验证 -->
              <div v-if="currentStep === 2" class="step-content">
                <div class="text-center mb-8">
                  <h2 class="text-h5 font-weight-bold text-grey-darken-3">
                    验证身份
                  </h2>
                  <p class="text-body-2 text-grey">
                    我们已向您的邮箱发送了验证码
                  </p>
                </div>

                <v-form @submit.prevent="step2Click">
                  <v-text-field
                    v-model="forgetForm.verificationCode"
                    :rules="verificationCodeRules"
                    label="请输入验证码"
                    prepend-inner-icon="mdi-shield-check"
                    :append-inner-icon="resendCooldown > 0 ? '' : 'mdi-refresh'"
                    variant="outlined"
                    color="primary"
                    class="mb-6"
                    required
                    autofocus
                    maxlength="6"
                    @click:append-inner="resendCode"
                    :disabled="resendCooldown > 0"
                  >
                    <template v-slot:append-inner v-if="resendCooldown > 0">
                      <span class="text-caption text-primary">
                        {{ resendCooldown }}s
                      </span>
                    </template>
                  </v-text-field>

                  <div class="d-flex justify-space-between">
                    <v-btn
                      variant="outlined"
                      color="grey"
                      size="large"
                      @click="goBack"
                    >
                      <v-icon start>mdi-arrow-left</v-icon>
                      上一步
                    </v-btn>
                    <v-btn
                      type="submit"
                      color="primary"
                      size="large"
                      :loading="loading"
                    >
                      验证
                      <v-icon end>mdi-check</v-icon>
                    </v-btn>
                  </div>
                </v-form>
              </div>

              <!-- 步骤 3: 密码设置 -->
              <div v-if="currentStep === 3" class="step-content">
                <div class="text-center mb-8">
                  <h2 class="text-h5 font-weight-bold text-grey-darken-3">
                    设置新密码
                  </h2>
                  <p class="text-body-2 text-grey">
                    请设置一个新的安全密码
                  </p>
                </div>

                <v-form @submit.prevent="step3Click">
                  <v-text-field
                    v-model="forgetForm.newPassword"
                    :rules="passwordRules"
                    label="新密码"
                    prepend-inner-icon="mdi-lock-reset"
                    variant="outlined"
                    color="primary"
                    :type="showPassword ? 'text' : 'password'"
                    :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append-inner="showPassword = !showPassword"
                    class="mb-4"
                    required
                    autofocus
                  />

                  <v-text-field
                    v-model="forgetForm.confirmPassword"
                    :rules="confirmPasswordRules"
                    label="确认新密码"
                    prepend-inner-icon="mdi-lock-check"
                    variant="outlined"
                    color="primary"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append-inner="showConfirmPassword = !showConfirmPassword"
                    class="mb-6"
                    required
                  />

                  <div class="d-flex justify-space-between">
                    <v-btn
                      variant="outlined"
                      color="grey"
                      size="large"
                      @click="goBack"
                    >
                      <v-icon start>mdi-arrow-left</v-icon>
                      上一步
                    </v-btn>
                    <v-btn
                      type="submit"
                      color="primary"
                      size="large"
                      :loading="loading"
                    >
                      重置密码
                      <v-icon end>mdi-check-bold</v-icon>
                    </v-btn>
                  </div>
                </v-form>
              </div>

              <!-- 步骤指示器 -->
              <div class="mt-8 step-map">
                <v-stepper v-model="currentStep" alt-labels class="transparent-stepper">
                  <v-stepper-header>
                    <v-stepper-item
                      :complete="currentStep > 1"
                      :value="1"
                      icon="mdi-email"
                    ></v-stepper-item>

                    <v-divider></v-divider>

                    <v-stepper-item
                      :complete="currentStep > 2"
                      :value="2"
                      icon="mdi-shield-check"
                    ></v-stepper-item>

                    <v-divider></v-divider>

                    <v-stepper-item
                      :complete="currentStep > 3"
                      :value="3"
                      icon="mdi-lock-reset"
                    ></v-stepper-item>
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
import { ref, reactive, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { generateSecureCredentials } from '@/service/crypto';
import { noauthApi } from '@/service/api';

const router = useRouter();

// 表单数据
const forgetForm = reactive({
  email: '',
  verificationCode: '',
  newPassword: '',
  confirmPassword: ''
})

// 状态管理
const currentStep = ref(1)
const loading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const resendCooldown = ref(0)

// 表单验证规则
const emailRules = [
  (value: string) => !!value || '邮箱不能为空',
  (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || '请输入有效的邮箱地址'
  }
]

const verificationCodeRules = [
  (value: string) => !!value || '验证码不能为空',
  (value: string) => (value && value.length === 6) || '请输入6位验证码'
]

const passwordRules = [
  (value: string) => !!value || '密码不能为空',
  (value: string) => (value && value.length >= 6) || '密码至少6个字符'
]

const confirmPasswordRules = [
  (value: string) => !!value || '请确认密码',
  (value: string) => value === forgetForm.newPassword || '两次输入的密码不一致'
]

// 定时器
let cooldownTimer: number | null = null

// 显示错误提示
const showError = (message: string) => {
  alert(message)
}

// 步骤 1: 邮箱验证
const step1Click = async () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(forgetForm.email)) {
    showError('请输入有效的邮箱地址')
    return
  }

  // TODO: 调用发送验证码 API
  // loading.value = true
  //
  // try {
  //   // 发送验证码请求
  //   const response = await noauthApi.post('/forgot-password/send-code', {
  //     email: forgetForm.email
  //   })
  //
  //   if (response.status === 200) {
  //     currentStep.value = 2
  //     startResendCooldown()
  //   } else {
  //     showError('发送验证码失败，请重试')
  //   }
  // } catch (error: any) {
  //   console.error('发送验证码失败:', error)
  //   showError('发送验证码失败，请重试')
  // } finally {
  //   loading.value = false
  // }

  // 暂时直接进入第2步（用于测试UI）
  currentStep.value = 2
}

// 步骤 2: 验证码验证
const step2Click = () => {
  if (!forgetForm.verificationCode) {
    showError('请输入验证码')
    return
  }

  if (forgetForm.verificationCode.length !== 6) {
    showError('请输入6位验证码')
    return
  }

  // TODO: 调用验证码验证 API
  // try {
  //   const response = await noauthApi.post('/forgot-password/verify-code', {
  //     email: forgetForm.email,
  //     verificationCode: forgetForm.verificationCode
  //   })
  //
  //   if (response.status === 200) {
  //     currentStep.value = 3
  //   } else {
  //     showError('验证码错误，请重试')
  //   }
  // } catch (error: any) {
  //   console.error('验证码验证失败:', error)
  //   showError('验证码验证失败，请重试')
  // }

  // 暂时直接通过（用于测试UI）
  currentStep.value = 3
}

// 步骤 3: 重置密码
const step3Click = async () => {
  if (!forgetForm.newPassword) {
    showError('请输入新密码')
    return
  }

  if (forgetForm.newPassword.length < 6) {
    showError('密码至少6个字符')
    return
  }

  if (forgetForm.newPassword !== forgetForm.confirmPassword) {
    showError('两次输入的密码不一致')
    return
  }

  loading.value = true

  try {
    // 前端加密
    const { encryptedAccount, encryptedPassword } = await generateSecureCredentials(
      forgetForm.email,
      forgetForm.newPassword
    )

    // 发送重置密码请求
    const response = await noauthApi.post('/forgot-password/reset', {
      email: encryptedAccount,
      verificationCode: forgetForm.verificationCode,
      newPassword: encryptedPassword
    })

    if (response.status === 200) {
      alert('密码重置成功！')
      router.push('/login')
    } else {
      showError('密码重置失败，请重试')
    }
  } catch (error: any) {
    console.error('密码重置失败:', error)
    showError('密码重置失败，请重试')
  } finally {
    loading.value = false
  }
}

// 返回上一步
const goBack = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// 重新发送验证码
const resendCode = async () => {
  if (resendCooldown.value > 0) return

  // 立即开始倒计时
  startResendCooldown()

  // TODO: 调用发送验证码 API
  // loading.value = true
  //
  // try {
  //   const response = await noauthApi.post('/forgot-password/send-code', {
  //     email: forgetForm.email
  //   })
  //
  //   if (response.status === 200) {
  //     showError('验证码已重新发送')
  //   } else {
  //     showError('发送失败，请重试')
  //   }
  // } catch (error: any) {
  //   console.error('重新发送验证码失败:', error)
  //   showError('发送失败，请重试')
  // } finally {
  //   loading.value = false
  // }

  // 暂时直接提示（用于测试UI）
  showError('验证码已重新发送')
}

// 开始重发倒计时
const startResendCooldown = () => {
  resendCooldown.value = 60
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      if (cooldownTimer) {
        clearInterval(cooldownTimer)
        cooldownTimer = null
      }
    }
  }, 1000)
}

// 组件卸载时清理定时器
onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
})

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
</style>