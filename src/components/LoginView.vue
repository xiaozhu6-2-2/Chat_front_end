<!-- src/components/LoginView.vue -->
<template>
  <div class="login-container">
    <div class="login">
      <h1>用户登录</h1>

      <el-form
        :model="form"
        status-icon
        :rules="rules"
        ref="formRef"
        label-width="100px"
        class="demo-ruleForm"
        @keyup.enter="submitForm"
      >
        <!-- 用户名 -->
        <el-form-item label="账号" prop="account">
          <el-input 
            v-model="form.account" 
            placeholder="请输入用户名"
            clearable
            ref="accountInput"
          ></el-input>
        </el-form-item>

        <!-- 密码 -->
        <el-form-item label="密码" prop="password">
          <el-input 
            type="password" 
            v-model="form.password" 
            placeholder="请输入密码"
            show-password
            clearable
            @keyup.enter="submitForm"
          ></el-input>
        </el-form-item>

        <!-- 提交按钮 -->
        <el-form-item class="button-group">
          <el-button 
            type="primary" 
            @click="submitForm" 
            :loading="loading"
            size="medium"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
          <el-button @click="resetForm" size="medium">重置</el-button>
        </el-form-item>

        <!-- 跳转到注册页 -->
        <p class="tab-link">
          没有账号？
          <router-link to="/register" class="register-link">去注册</router-link>
        </p>
      </el-form>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'LoginView',
  data() {
    // 验证账号规则函数
    const validateAccount = (rule, value, callback) => {
      if (!value) {
        return callback(new Error('请输入账号'));
      }
      if (value.length < 3 || value.length > 15) {
        return callback(new Error('账号长度3-15个字符'));
      }
      callback();
    };
    
    // 验证密码规则函数
    const validatePassword = (rule, value, callback) => {
      if (!value) {
        return callback(new Error('请输入密码'));
      }
      if (value.length < 6) {
        return callback(new Error('密码至少6位'));
      }
      callback();
    };

    return {
      loading: false,
      form: {
        account: '',
        password: ''
      },
      rules: {
        account: [{ validator: validateAccount, trigger: 'blur' }],
        password: [{ validator: validatePassword, trigger: 'blur' }]
      }
    };
  },
  methods: {
    async submitForm() {
      if (this.loading) return; // 防止重复提交
      
      const valid = await this.$refs.formRef.validate();
      if (!valid) return;
      
      this.loading = true;
      try {
        const response = await axios.post('http://127.0.0.1:3000/login', {
          account: this.form.account,
          password: this.form.password
        });

        if (response.status === 200 && response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('account', this.form.account); 
          localStorage.setItem('username', response.data.username || this.form.account);
          
          this.$message.success('登录成功');
          // 添加延迟让用户看到成功消息
          setTimeout(() => this.$router.push('/chat'), 500);
        } else {
          this.$message.error(response.data.message || '登录验证失败');
        }
      } catch (error) {
        console.error('登录请求失败:', error);
        
        let message = '网络请求失败';
        if (error.response) {
          message = error.response.data.message || 
                   `服务器错误 (${error.response.status})`;
        } else if (error.request) {
          message = '服务器未响应';
        }
        
        this.$message.error(message);
      } finally {
        this.loading = false;
      }
    },
    resetForm() {
      this.$refs.formRef.resetFields();
      this.$refs.accountInput.focus();
    }
  },
  mounted() {
    // 自动聚焦到用户名输入框
    this.$nextTick(() => {
      this.$refs.accountInput.focus();
    });
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;
  background-image: url('/src/img/backImg.jpg');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  background-attachment: fixed;
}

.login {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 420px; /* 稍微加宽 */
  padding: 40px 30px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  background-color: rgba(255, 255, 255, 0.93); /* 半透明白色背景 */
  backdrop-filter: blur(2px); /* 毛玻璃效果 */
  transform: translateY(-5%); /* 垂直居中调整 */
}

h1 {
  margin-bottom: 25px;
  color: #333;
  font-weight: 600;
  letter-spacing: 1px;
}

.demo-ruleForm {
  width: 100%;
}

.button-group {
  justify-content: center;
  margin-top: 25px;
  margin-bottom: 15px;
}

.tab-link {
  text-align: center;
  margin-top: 15px;
  font-size: 14px;
  color: #666;
}

.register-link {
  color: #1890ff;
  text-decoration: none;
  transition: color 0.3s;
  font-weight: 500;
}

.register-link:hover {
  color: #40a9ff;
  text-decoration: underline;
}

/* 输入框样式增强 */
.el-form-item ::v-deep .el-input__inner {
  padding: 10px 15px;
  border-radius: 4px;
}

/* 按钮样式 */
.el-button {
  padding: 10px 20px;
  border-radius: 4px;
  transition: all 0.3s;
}

.button-group {
  display: flex;           /* Flex 布局 */
  justify-content: center; /* 水平居中 */
  align-items: center;     /* 垂直居中 */
  margin-top: 25px;
  margin-bottom: 15px;
  gap: 20px;               /* 按钮之间的间距 */
  width: 100%;             /* 确保宽度填充 */
  margin-left: 0;          /* 移除原来的左边距 */
}

.button-group .el-button--primary {
  background-color: #1890ff;
  border-color: #1890ff;
}

.button-group .el-button--primary:hover {
  background-color: #40a9ff;
  border-color: #40a9ff;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
}
</style>