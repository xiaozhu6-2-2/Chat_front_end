<!-- src/components/LoginView.vue -->
<template>
  <div class="login-container">

    <div class = header>
      <div class="logo" href="/img/logo.png" ref="logo">

      </div>
    </div>

    <div class="login-box">
      <div class="login">
          <h1>login</h1>

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

    <div class="footer">

    </div>

  </div>
</template>


<script setup>
  import { ref, reactive } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import axios from 'axios';
  import { generateSecureCredentials } from '@/utils/crypto';

  const loading = ref(false);//登录绑定的加载状态
  const form = reactive({
    account: '',
    password: ''
  });
  const formRef = ref(null);
  const router = useRouter();

  const rules = {
        account: [
          { required: true, message: '请输入账号', trigger: 'blur' },
          { min: 3, max: 15, message: '长度在3到15个字符之间', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码至少为6位', trigger: 'blur' }
        ]
  }; // elform的验证规则

  async function submitForm(){
    try{
      await formRef.value.validate();//通过会继续，否则会throw
      loading.value = true;
      const credential = await generateSecureCredentials(
        form.account,
        form.password
      );
      console.log(credential);
      const response = await axios.post(`${process.env.VUE_APP_API_BASE_URL}/login`,credential);
      if (response.status === 200) { // 状态码：200，请求成功
        const data = response.data;
        localStorage.setItem('token', data.token);
        localStorage.setItem('account', form.account); 
        localStorage.setItem('username', data.username);
        ElMessage.success('登录成功');
        await router.push('/chat');
      } else {
        ElMessage.error(response.data.message || '登录失败')
      }
    }catch(error){
      console.log(error);
    }finally{
      loading.value = false;
    }
  }


</script>

<style scoped>

.login-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background-color: #f5f7fa; 
  margin: 0;
  padding: 0;
}

.header {
  background-color: #333;
  height: 5vh;
}

.login-box {
  height: 90vh;
  width: 100vw;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  /* background: url('../assets/star_sky.jpg'); */
}

.login {
  height: 60%;
  width: 30vw;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  background: #181717ff;

  border-radius: 10px;
  border-top: 2px solid #247a39ff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); 
}

.login h1 {
  font-size: 30px;
  color: #247a39ff;
}



.footer {
  background-color: #333;
  height: 5vh;
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