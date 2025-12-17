<template>
  <!-- 主容器，使用全屏高度 -->
  <v-container class="fill-height container" fluid>
    <!-- 行布局，垂直和水平居中 -->
    <v-row align-content="center" class="fill-height" justify="center">
      <!-- 登录卡片容器 -->
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

            <!-- 右侧登录表单区域 -->
            <v-col
              class="pa-8 d-flex flex-column justify-center"
              cols="12"
              md="6"
            >
              <!-- 表单标题 -->
              <div class="text-center mb-8">
                <h2 class="text-h5 font-weight-bold text-grey-darken-3">
                  欢迎回来
                </h2>
                <p class="text-body-2 text-grey">
                  请登录您的账户继续使用
                </p>
              </div>

              <!-- 登录表单 -->
              <v-form ref="loginFormRef" @submit.prevent="handleLogin">
                <!-- 用户名/邮箱输入 -->
                <v-text-field
                  v-model="loginForm.account"
                  class="mb-4"
                  color="primary"
                  label="用户名或邮箱"
                  prepend-inner-icon="mdi-account"
                  required
                  :rules="accountRules"
                  variant="outlined"
                />

                <!-- 密码输入 -->
                <v-text-field
                  v-model="loginForm.password"
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  class="mb-2"
                  color="primary"
                  label="密码"
                  prepend-inner-icon="mdi-lock"
                  required
                  :rules="passwordRules"
                  :type="showPassword ? 'text' : 'password'"
                  variant="outlined"
                  @click:append-inner="showPassword = !showPassword"
                />

                <!-- 记住我和忘记密码 -->
                <div class="d-flex justify-space-between align-center mb-6">
                  <v-checkbox
                    v-model="loginForm.remember"
                    color="primary"
                    density="compact"
                    hide-details
                    label="记住我"
                    style="font-size: 1rem;"
                  />
                  <v-btn
                    color="primary"
                    size="default"
                    style="font-size: 1rem; min-width: auto; height: auto;"
                    variant="text"
                    @click="handleForgotPassword"
                  >
                    忘记密码?
                  </v-btn>
                </div>

                <!-- 错误提示 -->
                <div v-if="loginError" class="error-message mb-4">
                  <v-alert density="compact" type="error">
                    {{ loginError }}
                  </v-alert>
                </div>

                <!-- 登录按钮 -->
                <v-btn
                  block
                  class="mb-4"
                  color="primary"
                  :loading="loading"
                  size="large"
                  type="submit"
                >
                  <v-icon start>mdi-login</v-icon>
                  登录
                </v-btn>

                <!-- 注册链接 -->
                <div class="text-center d-flex align-center justify-center">
                  <span class="text-body-2 text-grey">
                    还没有账户?
                  </span>
                  <v-btn
                    class="pa-0 ma-0 text-body-2 ml-2"
                    color="primary"
                    size="default"
                    style="min-width: auto; height: auto; font-size: 0.875rem;"
                    variant="text"
                    @click="goToRegister"
                  >
                    立即注册
                  </v-btn>
                </div>
              </v-form>
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
  import type { VForm } from 'vuetify/components'
  import { reactive, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuth } from '@/composables/useAuth'
  import { useSnackbar } from '@/composables/useSnackbar'

  const router = useRouter()

  const { login } = useAuth()

  const { showSuccess } = useSnackbar()

  // 响应式数据定义
  const loginForm = reactive({
    account: '',
    password: '',
    remember: false,
  })

  const showPassword = ref(false)
  const loading = ref(false)
  // 用于验证规则
  const loginFormRef = ref<VForm | null>(null)
  const loginError = ref('')

  // 表单验证规则
  const accountRules = [
    (value: string) => !!value || '账号不能为空',
    (value: string) => {
      // 邮箱正则表达式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value) || '请输入有效的邮箱地址'
    },
  ]

  const passwordRules = [
    (value: string) => !!value || '密码不能为空',
    (value: string) => (value && value.length >= 6) || '密码至少6个字符',
  ]

  // 登录处理方法
  async function handleLogin () {
    // 验证表单
    if (!loginFormRef.value) return
    const { valid } = await loginFormRef.value.validate()
    if (!valid) return

    loading.value = true
    loginError.value = ''

    try {
      const resault = await login(loginForm.account, loginForm.password, loginForm.remember)
      if (resault.success === true) {
        router.push('/home')
        showSuccess('登录成功')
      }
    } finally {
      loading.value = false
    }
  }

  // 跳转到注册页面
  function goToRegister () {
    router.push('/register')
  }

  // 处理忘记密码
  function handleForgotPassword () {
    router.push('/forget')
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

/* 响应式调整 */
@media (max-width: 960px) {
  .pa-8 {
    padding: 24px;
  }
}

.error-message {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
