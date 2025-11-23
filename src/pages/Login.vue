<template>
  <v-container fluid class="container fill-height">
    <v-row justify="center" align-content="center" class="h-100 w-100">
      
      <v-col cols="5" sm="12" md="5" style="height: 35%;"> 
        
        <v-form class="form h-100"> 
          <v-row class="h-100">
            <v-col cols="12" md="6"> 
              <v-card class="card h-100" flat>
                <div>
                  <v-img
                    src="../assets/logo.svg"
                    width="100px"
                    height="100px"
                    class="img"
                  ></v-img>
                </div>
                <h1 class="h1-text">登录</h1>
                <h2 class="h2-text">使用邮箱账户进行登录</h2>
              </v-card>
            </v-col>
            
            <v-col cols="12" md="6"> 
              <v-card class="card h-100 w-100" outlined flat>
                <div class="card2-wrapper">
                  <div class="input-wrapper">
                    <v-text-field 
                    label="账号" 
                    outlined
                    class="input mb-4"></v-text-field> 
                  </div>
                  <div class="forget-wrapper">
                    <v-btn>忘记密码？</v-btn>
                  </div>
                  <div class="btn-wrapper">
                    <v-btn 
                    class="register-btn">没有账户？点击注册</v-btn>
                    <v-btn color="primary" class="next-btn">下一步</v-btn>
                  </div>
                </div>
              </v-card>
            </v-col>
            
          </v-row>
        </v-form>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
// import { ref } from 'vue';
// import { useRouter } from 'vue-router';
// import { generateSecureCredentials } from '../service/crypto';
// import { noauthApi } from '../service/api';
// import { websocketService } from '@/service/websocket';
// import { messageService } from '@/service/message';

// const router = useRouter();

// const account = ref("");
// const password = ref("");

// const loginClick = async () => {
//   if(account.value && password.value){
//     try {
//       //账户校验

//       //加密
//       const {encryptedAccount, encryptedPassword} = await generateSecureCredentials(account.value, password.value);
//       //发送请求
//       loginPost(encryptedAccount, encryptedPassword);
//     } catch (error) {
//       console.log(error);
//       alert("登录出错")
//     }
//   }else{
//     alert("请输入账号密码");
//   }
// };

// async function loginPost(encryptedAccount, encryptedPassword) {
//   if(encryptedAccount && encryptedPassword){
//     try {
//       const response = await noauthApi.post("/login", {
//         account: encryptedAccount,
//         password: encryptedPassword
//       })
//       //登录后还需要返回userId, 用于senderId
//       if (response.status === 200) {
//         const userName = response.data.userName;
//         const userId = response.data.userId;
//         const token = response.data.token;
//         if (token && userName && userId) {
//           localStorage.setItem('token', token);
//           localStorage.setItem('username', userName);
//           localStorage.setItem('userid', userId);
//           //连接ws，初始化消息服务
//           websocketService.connect(token,userId);
//           messageService.init(token);
//           alert('登录成功');
//           router.push('/chat');
//         }
//       }else{
//         alert('登录失败');
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   }
// }

</script>

<style scoped>
.container{
  background-color: #1c1c1e;
}

.form{
  /* border: 1px solid #fff; */
  border-radius: 20px;
  background-color: #111;
}

.card{
  background-color: #111;
}

.img{
  position: relative;
  top:0px;
}

.h1-text{
  font-size: 3em;
  position: relative;
}

.h2-text{
  font-size: 1.5em;
  position: relative;
}

::v-deep(.input){
  width: 100%;
  border-radius: 10px;
}

.card2-wrapper{
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-center;
  align-items: center;
  position: relative;
}

.input-wrapper{
  width: 100%;
  padding-bottom: 20px;
  position: relative;
}

.forget-wrapper{

}

.btn-wrapper{
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
}

.register-btn{

}
</style>