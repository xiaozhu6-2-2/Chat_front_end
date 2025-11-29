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
              class="pa-8 d-flex flex-column justify-center text-white"
            >
              <!-- 品牌信息 -->
              <div class="text-center text-md-left">
                <v-img
                  src="@/assets/logo.svg"
                  alt="易聊图标"
                  width="100"
                  height="100"
                ></v-img>
                <h1 class="text-h4 font-weight-bold mb-4">易聊</h1>
                <p class="text-h6 mb-2">连接世界，畅聊无限</p>
              </div>

              <!-- 特色功能列表 -->
              <v-list class="transparent mt-8" density="compact">
                <v-list-item
                  v-for="feature in features"
                  :key="feature.text"
                  :prepend-icon="feature.icon"
                  class="text-white"
                >
                  <v-list-item-title class="text-body-2">
                    {{ feature.text }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>
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
                    创建新账户
                  </h2>
                  <p class="text-body-2 text-grey">
                    使用邮箱开始您的注册流程
                  </p>
                </div>

                <v-form @submit.prevent="step1Click">
                  <v-text-field
                    v-model="registerForm.email"
                    :rules="emailRules"
                    label="邮箱地址"
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

              <!-- 步骤 2: 密码设置 -->
              <div v-if="currentStep === 2" class="step-content">
                <div class="text-center mb-8">
                  <h2 class="text-h5 font-weight-bold text-grey-darken-3">
                    设置密码
                  </h2>
                  <p class="text-body-2 text-grey">
                    请设置一个安全的密码
                  </p>
                </div>

                <v-form @submit.prevent="step2Click">
                  <v-text-field
                    v-model="registerForm.password"
                    :rules="passwordRules"
                    label="密码"
                    prepend-inner-icon="mdi-lock"
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
                    v-model="registerForm.confirmPassword"
                    :rules="confirmPasswordRules"
                    label="确认密码"
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
                      下一步
                      <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                  </div>
                </v-form>
              </div>

              <!-- 步骤 3: 基本信息 -->
              <div v-if="currentStep === 3" class="step-content">
                <div class="text-center mb-8">
                  <h2 class="text-h5 font-weight-bold text-grey-darken-3">
                    基本信息
                  </h2>
                  <p class="text-body-2 text-grey">
                    完善您的个人资料
                  </p>
                </div>

                <v-form @submit.prevent="step3Click">
                  <v-text-field
                    v-model="registerForm.username"
                    :rules="usernameRules"
                    label="用户名"
                    prepend-inner-icon="mdi-account"
                    variant="outlined"
                    color="primary"
                    class="mb-4"
                    required
                    autofocus
                  />

                  <v-select
                    v-model="registerForm.gender"
                    :items="genderOptions"
                    label="性别"
                    prepend-inner-icon="mdi-gender-male-female"
                    variant="outlined"
                    color="primary"
                    class="mb-4"
                    clearable
                  ></v-select>

                  <v-text-field
                    v-model="registerForm.region"
                    label="地区"
                    prepend-inner-icon="mdi-map-marker"
                    variant="outlined"
                    color="primary"
                    class="mb-6"
                    clearable
                  ></v-text-field>

                  <v-textarea
                    v-model="registerForm.bio"
                    label="个人简介（可选）"
                    prepend-inner-icon="mdi-text"
                    variant="outlined"
                    color="primary"
                    rows="3"
                    class="mb-6"
                    no-resize
                  ></v-textarea>

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
                      完成注册
                      <v-icon end>mdi-check</v-icon>
                    </v-btn>
                  </div>
                </v-form>
              </div>

              <!-- 步骤 4: 注册成功 -->
              <div v-if="currentStep === 4" class="step-content text-center">
                <div class="mb-8">
                  <v-icon color="success" size="80" class="mb-4">
                    mdi-check-circle
                  </v-icon>
                  <h2 class="text-h5 font-weight-bold text-grey-darken-3 mb-4">
                    注册成功！
                  </h2>
                  <p class="text-body-2 text-grey mb-2">
                    欢迎加入易聊
                  </p>
                  <p class="text-h6 text-primary font-weight-medium">
                    {{ registerForm.username }}
                  </p>
                </div>

                <v-btn
                  color="primary"
                  size="large"
                  @click="goToChat"
                  class="px-8"
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
                      :value="1"
                      icon="mdi-email"
                    ></v-stepper-item>

                    <v-divider></v-divider>

                    <v-stepper-item
                      :complete="currentStep > 2"
                      :value="2"
                      icon="mdi-lock"
                    ></v-stepper-item>

                    <v-divider></v-divider>

                    <v-stepper-item
                      :complete="currentStep > 3"
                      :value="3"
                      icon="mdi-account"
                    ></v-stepper-item>

                    <v-divider></v-divider>

                    <v-stepper-item
                      :value="4"
                      icon="mdi-check"
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

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router';
import { generateSecureCredentials } from '@/service/crypto';
import { noauthApi } from '@/service/api';
import { websocketService } from '@/service/websocket';
import { messageService } from '@/service/message';

const router = useRouter();

// 表单数据
const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  username: '',
  gender: '',
  region: '',
  //简介
  bio: ''
})

// 状态管理
const currentStep = ref(1)
const loading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// 性别选项
const genderOptions = [
  { title: '男', value: 'male' },
  { title: '女', value: 'female' },
  { title: '其他', value: 'other' }
]

// 左侧功能特色列表
const features = ref([
  { icon: 'mdi-shield-check', text: '轻量快捷聊天' },
  { icon: 'mdi-rocket-launch', text: '极速消息传递' },
  { icon: 'mdi-group', text: '多人群组聊天' },
  { icon: 'mdi-cloud', text: '云端消息同步' }
])

// 表单验证规则
const emailRules = [
  (value: string) => !!value || '邮箱不能为空',
  (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || '请输入有效的邮箱地址'
  }
]

const passwordRules = [
  (value: string) => !!value || '密码不能为空',
  (value: string) => (value && value.length >= 6) || '密码至少6个字符'
]

const confirmPasswordRules = [
  (value: string) => !!value || '请确认密码',
  (value: string) => value === registerForm.password || '两次输入的密码不一致'
]

const usernameRules = [
  (value: string) => !!value || '用户名不能为空',
  (value: string) => (value && value.length >= 2) || '用户名至少2个字符'
]

// 显示错误提示
const showError = (message: string) => {
  alert(message)
}

// 步骤 1: 邮箱验证
const step1Click = async () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(registerForm.email)) {
    showError('请输入有效的邮箱地址')
    return
  }

  currentStep.value = 2
}

// 步骤 2: 密码验证
const step2Click = () => {
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

// 步骤 3: 完成注册
const step3Click = async () => {
  if (!registerForm.username) {
    showError('请输入用户名')
    return
  }

  loading.value = true

  try {
    // 前端加密
    const { encryptedAccount, encryptedPassword } = await generateSecureCredentials(
      registerForm.email,
      registerForm.password
    )

    // 发送注册请求
    const response = await noauthApi.post('/register', {
      account: encryptedAccount,
      password: encryptedPassword,
      username: registerForm.username,
      gender: registerForm.gender,
      region: registerForm.region,
      bio: registerForm.bio
    })

    if (response.status === 200) {
      const userName = response.data.userName
      const userId = response.data.userId
      const token = response.data.token

      if (token && userName && userId) {
        // 保存登录状态
        localStorage.setItem('token', token)
        localStorage.setItem('username', userName)
        localStorage.setItem('userid', userId)

        // 初始化消息服务
        messageService.init(token, userId)

        // 连接WebSocket
        await websocketService.connect(token, userId)

        // 更新用户名显示
        registerForm.username = userName
        currentStep.value = 4
      } else {
        showError('注册响应数据不完整')
      }
    } else {
      showError('注册失败，请重试')
    }

  } catch (error: any) {
    console.error('注册失败:', error)

    if (error.response?.status === 409) {
      showError('该邮箱已被注册')
    } else if (error.response?.status === 500) {
      showError('服务器错误，请稍后重试')
    } else if (error.code === 'NETWORK_ERROR') {
      showError('网络连接失败，请检查网络')
    } else {
      showError('注册失败，请重试')
    }
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

// 注册成功后跳转到聊天页面
const goToChat = () => {
  router.push('/chat')
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
</style>