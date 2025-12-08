<template>
  <!-- 主容器，使用全屏高度 -->
  <v-container fluid class="fill-height container">
    <!-- 行布局，垂直和水平居中 -->
    <v-row align-content="center" justify="center" class="fill-height">
      <!-- 登录卡片容器 -->
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

            <!-- 右侧登录表单区域 -->
            <v-col
              cols="12"
              md="6"
              class="pa-8 d-flex flex-column justify-center"
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
              <v-form @submit.prevent="handleLogin" ref="loginFormRef">
                <!-- 用户名/邮箱输入 -->
                <v-text-field
                  v-model="loginForm.account"
                  :rules="accountRules"
                  label="用户名或邮箱"
                  prepend-inner-icon="mdi-account"
                  variant="outlined"
                  color="primary"
                  class="mb-4"
                  required
                />

                <!-- 密码输入 -->
                <v-text-field
                  v-model="loginForm.password"
                  :rules="passwordRules"
                  label="密码"
                  prepend-inner-icon="mdi-lock"
                  variant="outlined"
                  color="primary"
                  :type="showPassword ? 'text' : 'password'"
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showPassword = !showPassword"
                  class="mb-2"
                  required
                />

                <!-- 记住我和忘记密码 -->
                <div class="d-flex justify-space-between align-center mb-6">
                  <v-checkbox
                    v-model="loginForm.remember"
                    label="记住我"
                    color="primary"
                    density="compact"
                    hide-details
                    style="font-size: 1rem;"
                  />
                  <v-btn
                    variant="text"
                    color="primary"
                    size="default"
                    style="font-size: 1rem; min-width: auto; height: auto;"
                    @click="handleForgotPassword"
                  >
                    忘记密码?
                  </v-btn>
                </div>

                <!-- 错误提示 -->
                <div v-if="loginError" class="error-message mb-4">
                  <v-alert type="error" density="compact">
                    {{ loginError }}
                  </v-alert>
                </div>

                <!-- 登录按钮 -->
                <v-btn
                  type="submit"
                  color="primary"
                  size="large"
                  block
                  :loading="loading"
                  class="mb-4"
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
                    variant="text"
                    color="primary"
                    size="default"
                    class="pa-0 ma-0 text-body-2 ml-2"
                    style="min-width: auto; height: auto; font-size: 0.875rem;"
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
import { ref, reactive } from 'vue'
import type { VForm } from 'vuetify/components'
import { useRouter } from 'vue-router';
import { generateSecureCredentials } from '@/service/crypto';
import { noauthApi } from '@/service/api';
import { websocketService } from '@/service/websocket';
import { messageService } from '@/service/message';

const router = useRouter();

// 响应式数据定义
const loginForm = reactive({
  account: '',
  password: '',
  remember: false
})

const showPassword = ref(false)
const loading = ref(false)
//匹配ref="loginForm"的表单，用于表单验证
const loginFormRef = ref<VForm | null>(null)
const loginError = ref('')

// 左侧功能特色列表
const features = ref([
  { icon: 'mdi-flash', text: '轻量快捷聊天' },
  { icon: 'mdi-rocket-launch', text: '极速消息传递' },
  { icon: 'mdi-group', text: '多人群组聊天' },
  { icon: 'mdi-cloud', text: '云端消息同步' }
])

// 表单验证规则
const accountRules = [
  (value: string) => !!value || '账号不能为空',
  (value: string) => {
    //邮箱正则表达式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || '请输入有效的邮箱地址'
  }
]

const passwordRules = [
  (value: string) => !!value || '密码不能为空',
  (value: string) => (value && value.length >= 6) || '密码至少6个字符'
]

// 登录处理方法
const handleLogin = async () => {
  // 验证表单
  if (!loginFormRef.value) return
  const { valid } = await loginFormRef.value.validate()
  if (!valid) return

  loading.value = true
  loginError.value = ''

  try {
    // 加密账号密码
    const { encryptedAccount, encryptedPassword } = await generateSecureCredentials(
      loginForm.account,
      loginForm.password
    );

    // 发送登录请求
    const response = await noauthApi.post("/login", {
      account: encryptedAccount,
      password: encryptedPassword
    })

    // 登录成功后的处理
    if (response.status === 200) {
      const userName = response.data.userName;
      const userId = response.data.userId;
      const token = response.data.token;

      if (token && userName && userId) {
        // 保存登录状态
        localStorage.setItem('token', token);
        localStorage.setItem('username', userName);
        localStorage.setItem('userid', userId);

        // 初始化消息服务
        messageService.init(token, userId);

        // 连接WebSocket
        await websocketService.connect(token, userId);

        // 跳转到聊天页面
        router.push('/chat');
      } else {
        loginError.value = '登录响应数据不完整'
      }
    } else {
      loginError.value = '登录失败，请检查账号密码'
    }

  } catch (error: any) {
    console.error('登录失败:', error)

    if (error.response?.status === 401) {
      loginError.value = '账号或密码错误'
    } else if (error.response?.status === 500) {
      loginError.value = '服务器错误，请稍后重试'
    } else if (error.code === 'NETWORK_ERROR') {
      loginError.value = '网络连接失败，请检查网络'
    } else {
      loginError.value = '登录失败，请重试'
    }
  } finally {
    loading.value = false
  }
}

// 跳转到注册页面
const goToRegister = () => {
  router.push('/Register')
}

// 处理忘记密码
const handleForgotPassword = () => {
  alert('请联系管理员重置密码')
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