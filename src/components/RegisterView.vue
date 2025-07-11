<template>
  <div class="register-container">
    <div class="register">
      <h1>用户注册</h1>

      <el-form
        :model="form"
        status-icon
        :rules="rules"
        ref="formRef"
        label-width="100px"
        class="demo-ruleForm"
      >
        <!-- 用户名 -->
        <el-form-item label="用户名" prop="account">
          <el-input v-model="form.account" autocomplete="off"></el-input>
        </el-form-item>

        <el-form-item label="昵称" prop="username">
          <el-input v-model="form.username" autocomplete="off"></el-input>
        </el-form-item>

        <!-- 密码 -->
        <el-form-item label="密码" prop="password">
          <el-input type="password" v-model="form.password" autocomplete="off"></el-input>
        </el-form-item>

        <!-- 确认密码 -->
        <el-form-item label="确认密码" prop="confirmPass">
          <el-input type="password" v-model="form.confirmPass" autocomplete="off"></el-input>
        </el-form-item>

        <!-- 提交按钮 -->
        <el-form-item class="button-group">
          <el-button type="primary" @click="submitForm" :loading="loading">注册</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>

        <!-- 跳转到登录页 -->
        <p class="tab-link">
          已有账号？
          <router-link to="/">去登录</router-link>
        </p>
      </el-form>

    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'RegisterView',
  data() {
    // 自定义验证：两次输入密码是否一致
    const validatePass = (rule, value, callback) => {
      if (value !== this.form.password) {
        callback(new Error('两次输入密码不一致'));
      } else {
        callback();
      }
    };

    return {
      loading: false,
      form: {
        account: '',
        password: '',
        confirmPass: '',
        username: ''
      },
      rules: {
        account: [
          { required: true, message: '请输入用户名', trigger: 'blur' },
          { min: 3, max: 15, message: '长度在3到15个字符之间', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码至少为6位', trigger: 'blur' }
        ],
        confirmPass: [
          { required: true, message: '请再次输入密码', trigger: 'blur' },
          { validator: validatePass, trigger: 'blur' }
        ],
        username: [
          { required: true, message: '请输入昵称', trigger: 'blur' },
          { min: 2, max: 30, message: '长度在2到30个字符之间', trigger: 'blur' }
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
            const response = await axios.post('http://127.0.0.1:3000/register', {
              account: this.form.account,
              password: this.form.password,
              username: this.form.username
            });

            if (response.data.success) {
              this.$message.success('注册成功');
              await this.$router.push('/');
            } else {
              this.$message.error(response.data.message || '注册失败');
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
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.register {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
  padding: 40px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background-color: white;
}

.demo-ruleForm {
  width: 100%;
}

.button-group {
  text-align: center;
  margin-left: 50px;
}

.tab-link {
  margin-top: 10px;
  text-align: center;
  font-size: 14px;
}
</style>