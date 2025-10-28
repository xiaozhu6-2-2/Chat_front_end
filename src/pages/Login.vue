<template>
  <button class="btn login-btn" @click="loginClick">login</button>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { generateSecureCredentials } from '../service/crypto';
import { noauthApi } from '../service/api';

const router = useRouter();
const baseURL = import.meta.env.VITE_API_BASE_URL;

const account = ref("123456@qq.com");
const password = ref("123456");

const loginClick = async () => {
  if(account.value && password.value){
    try {
      //账户校验

      //加密
      const {encryptedAccount, encryptedPassword} = await generateSecureCredentials(account.value, password.value);
      //发送请求
      loginPost(encryptedAccount, encryptedPassword);
    } catch (error) {
      console.log(error);
    }
  }else{
    alert("请输入账号密码");
  }
};

async function loginPost(encryptedAccount, encryptedPassword) {
  if(encryptedAccount && encryptedPassword){
    try {
      const response = await noauthApi.post("/login", {
        account: encryptedAccount,
        password: encryptedPassword
      })
      if (response.status === 200) {
        const username = response.data.username;
        const token = response.data.token;
        if (token && username) {
          localStorage.setItem('token', token);
          localStorage.setItem('username', username);
          alert('登录成功');
          router.push('/chat');
        }
      }else{
        alert('登录失败');
      }
    } catch (error) {
      console.log(error);
    }
  }
}

</script>

<style scoped>
.btn {
  height: 50px;
  width: 50px;
  background-color: aliceblue;
}
</style>