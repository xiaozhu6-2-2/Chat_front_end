<template>
  <div>
    <v-form v-model="valid">
      <v-container>
        <v-row>
          <v-col
            cols="12"
            md="4"
          >
            <v-text-field
              v-model="account"
              :rules="emailRules"
              label="E-mail"
              required
            ></v-text-field>
          </v-col>

          <v-col
            cols="12"
            md="4"
          >
            <v-text-field
              v-model="password"
              label="Password"
              required
            ></v-text-field>
          </v-col>

        </v-row>
      </v-container>
      <v-btn
        @click="loginClick"
      >
        登录
      </v-btn>
    </v-form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { generateSecureCredentials } from '../service/crypto';
import { noauthApi } from '../service/api';
import { websocketService } from '@/service/websocket';
import { messageService } from '@/service/message';

const router = useRouter();

const account = ref("");
const password = ref("");

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
      alert("登录出错")
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
      //登录后还需要返回userId, 用于senderId
      if (response.status === 200) {
        const userName = response.data.userName;
        const userId = response.data.userId;
        const token = response.data.token;
        if (token && userName && userId) {
          localStorage.setItem('token', token);
          localStorage.setItem('username', userName);
          localStorage.setItem('userid', userId);
          //连接ws，初始化消息服务
          websocketService.connect(token,userId);
          messageService.init(token);
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