<template>
  <v-app>
    <!-- 主容器，使用全屏高度 -->
    <v-container fluid class="fill-height container">
      <!-- 行布局，垂直和水平居中 -->
      <v-row align="center" justify="center" class="fill-height">
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
                <v-form @submit.prevent="handleLogin" ref="loginForm">
                  <!-- 用户名/邮箱输入 -->
                  <v-text-field
                    v-model="loginForm.username"
                    :rules="usernameRules"
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
                    />
                    <a href="#" class="text-caption text-primary text-decoration-none">
                      忘记密码?
                    </a>
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
                  <div class="text-center">
                    <span class="text-body-2 text-grey">
                      还没有账户?
                    </span>
                    <a href="#" class="text-body-2 text-primary text-decoration-none ml-2">
                      立即注册
                    </a>
                  </div>
                </v-form>
              </v-col>
            </v-row>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-app>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useDisplay } from 'vuetify'

// 使用Vuetify的display composable获取响应式断点信息
const display = useDisplay()

// 响应式数据定义
const loginForm = reactive({
  username: '',
  password: '',
  remember: false
})

const showPassword = ref(false)
const loading = ref(false)
const loginFormRef = ref(null)

// 左侧功能特色列表
const features = ref([
  { icon: 'mdi-shield-check', text: '轻量快捷聊天' },
  { icon: 'mdi-rocket-launch', text: '极速消息传递' },
  { icon: 'mdi-group', text: '多人群组聊天' },
  { icon: 'mdi-cloud', text: '云端消息同步' }
])

// 统计信息
const onlineUsers = ref(1234)
const totalMessages = ref(56789)

// 表单验证规则
const usernameRules = [
  value => !!value || '用户名或邮箱不能为空',
  value => (value && value.length >= 3) || '用户名至少3个字符'
]

const passwordRules = [
  value => !!value || '密码不能为空',
  value => (value && value.length >= 6) || '密码至少6个字符'
]

// 计算属性：根据屏幕尺寸调整布局
const isMobile = computed(() => !display.mdAndUp.value)

// 登录处理方法
const handleLogin = async () => {
  // 验证表单
  const { valid } = await loginFormRef.value.validate()
  if (!valid) return

  loading.value = true
  
  try {
    // 模拟登录API调用
    console.log('登录信息:', loginForm)
    
    // 实际中这里会调用登录API
    // const response = await fetch('/api/login', {
    //   method: 'POST',
    //   body: JSON.stringify(loginForm)
    // })
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 登录成功后的处理
    console.log('登录成功')
    
    // 实际中这里会跳转到聊天页面或处理登录状态
    // router.push('/chat')
    
  } catch (error) {
    console.error('登录失败:', error)
    // 实际中这里会显示错误提示
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
  background-color: #1c1c1e;
   box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),  /* 下方阴影 */
    0 -4px 6px -1px rgba(0, 0, 0, 0.1), /* 上方阴影 */
    4px 0 6px -1px rgba(0, 0, 0, 0.1),  /* 右方阴影 */
    -4px 0 6px -1px rgba(0, 0, 0, 1); /* 左方阴影 */
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


/* 按钮间距调整 */
.gap-3 {
  gap: 12px;
}
</style>
