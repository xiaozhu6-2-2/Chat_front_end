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
      >
        <!-- 用户名 -->
        <el-form-item label="账号" prop="account">
          <el-input v-model="form.account" ></el-input>
        </el-form-item>

        <!-- 密码 -->
        <el-form-item label="密码" prop="password">
          <el-input type="password" v-model="form.password" ></el-input>
        </el-form-item>

        <!-- 提交按钮 -->
        <el-form-item class="button-group" >
          <el-button type="primary" @click="submitForm" :loading="loading">登录</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>

        <!-- 跳转到注册页 -->
        <p class="tab-link">
          没有账号？
          <router-link to="/register">去注册</router-link>
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
    return {
      loading: false,
      form: {
        account: '',
        password: ''
      },
      rules: {
        account: [
          { required: true, message: '请输入账号', trigger: 'blur' },
          { min: 3, max: 15, message: '长度在3到15个字符之间', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码至少为6位', trigger: 'blur' }
        ]
      }
    };
  },
  methods: {
    submitForm() {
      this.$refs.formRef.validate(async (valid) => {
        if (valid) {
          this.loading = true;
          try {
            const response = await axios.post('http://127.0.0.1:3000/login', {
              account: this.form.account,
              password: this.form.password
            });

            if (response.status === 200) {
              const data = response.data;
              localStorage.setItem('token', data.token);
              localStorage.setItem('account', this.form.account); 
              localStorage.setItem('username', data.username);
              this.$message.success('登录成功');
              await this.$router.push('/chat');
            } else {
              this.$message.error(response.data.message || '登录失败');
            }
          } catch (error) {
            console.error(error);
            this.$message.error('网络请求失败，请稍后再试');
          } finally {
            this.loading = false;
          }
        } else {
          return false;
        }
      });
    },
    resetForm() {
      this.$refs.formRef.resetFields();
    }
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
  min-height: 100vh; /* 设置为视口高度 */
  background-color: #f5f7fa; 
}

.login {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px; /* 控制最大宽度 */
  padding: 40px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); 
  border-radius: 8px;
  background-color: white;
}

.demo-ruleForm {
  width: 100%; /* 确保表单填满父容器 */
}

.button-group {
  justify-content: center;
  margin-top: 20px;
  margin-left: 50px;
  width: 100%
}

.tab-link {
  text-align: center; /* 注册链接居中 */
  padding: auto;
}
</style>