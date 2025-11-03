<template>
  <div class="register-container">
    <div class="form-container" v-if="currentStep === 1">
      <div class="logo"></div>
      <h1 class="up-content">通过邮箱账户注册</h1>
      <input 
        class="input email-input" 
        type="email"
        v-model="email"
        placeholder="请输入邮箱地址"
      >
      <button class="btn step1-btn" @click="step1Click">下一步</button>
    </div>

    <div class="form-container" v-if="currentStep === 2">
      <div class="logo"></div>
      <h1 class="up-content">设置密码</h1>
      <input 
        class="input password-input" 
        type="password"
        v-model="password"
        placeholder="请输入密码"
      >
      <button class="btn step2-btn" @click="step2Click">下一步</button>
    </div>

    <div class="form-container" v-if="currentStep === 3">
      <div class="logo"></div>
      <h1 class="up-content">填写用户名</h1>
      <input 
        class="input username-input" 
        type="text"
        v-model="username"
        placeholder="请输入用户名"
      >
      <button class="btn step3-btn" @click="registerClick">注 册</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import validator from 'validator';
import { useRouter } from 'vue-router';
import { generateSecureCredentials } from '../service/crypto';
import { noauthApi } from '@/service/api';

const baseURL = import.meta.env.VITE_API_BASE_URL;
const router = useRouter();
const email = ref('');
const username = ref('');
const password = ref('');

const currentStep = ref(1);

const step1Click = () => {
  if (validator.isEmail(email.value)) {
    currentStep.value = 2;
  }else{
    alert('请输入有效的邮箱地址')
  }
}

const step2Click = () => {
  if(!password.value){
    alert('请输入密码')
    return;
  }
  //密码强度校验+二次确认

  currentStep.value = 3;
}

//注册事件
const registerClick = async () => {
  console.log(email.value, password.value, username.value);
  //前端加密
  try {
    const {encryptedAccount, encryptedPassword} = await generateSecureCredentials(email.value, password.value);
    console.log(encryptedAccount, encryptedPassword);
    //注册接口调用
    await registerPost(encryptedAccount, encryptedPassword);
  }
  catch (error) {
    console.log(error);
    alert('加密失败，请重试')
    return;
  }
}

//注册请求
async function registerPost(encryptedAccount, encryptedPassword) {
  try {
    const response = await noauthApi.post('/register', {
      account: encryptedAccount,
      password: encryptedPassword,
      username: username.value
    });
    if(response.status === 200){
      alert('注册成功')
      //存储token
      if(response.data && response.data.token){
        const token = response.data.token;
        console.log(token);
        localStorage.setItem('token', token);
      }
      //跳转到chat
      router.push('/chat')
    }else{
      console.log(`注册失败：${response.data}`);
      alert(`注册失败：${response.status}`)
    }
  }catch(error) {
    alert('注册出现错误')
    console.log(error);
  }
}

</script>

<style scoped>
.register-container {
  height: 100%;
  width: 100%;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #1c1c1e;
}

.form-container {
  height: 60vh;
  width: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border-radius: 20px;
  box-shadow: 0px 0px 10px 5px rgba(0, 0, 0, 0.3);
  background-color: #1c1c1e;
  position: relative;
}

.logo {
  height: 30%;
  width: 30%;
  background-image: url(../assets/logo.svg);
  background-repeat: no-repeat;
  background-position: left;
  background-size: contain;
  position: relative;
  margin-top: 5%;
}

.up-content {
  color: #fff;
  font-size: 2vw;
  position: relative;
  margin-bottom: 3%;
}

.input {
  height: 10%;
  width: 80%;
  border: 1px solid #fff;
  border-radius: 10px;
}

.btn {
  height: 10%;
  width: 10%;
  position: relative;
  top: 10%;
  border: 1px solid #fff;
  border-radius: 5px;
  background-color: #1c1c1e;
  font-size: 0.7vw;
}
</style>