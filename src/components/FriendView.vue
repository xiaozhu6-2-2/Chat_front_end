<template>
  <div class="common-layout">
    <!-- 主体容器 -->
    <div class="main-content">
      <!-- 左侧好友列表 -->
      <div class="friend-list">
        <div class="header" style="display: flex; justify-content: center; align-items: center; margin-bottom: 20px">
          <h2>好友列表</h2>
        </div>

        <!-- 表格部分 -->
        <el-table :data="friends" style="width: 100%">
          <el-table-column prop="username" label="用户名" />
          <el-table-column label="操作">
            <template #default="{ row }">
              <el-button 
                size="small" 
                type="danger" 
                plain
                @click="removeFriend(row.account)"
                icon="Delete"
              >删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 右侧功能区 -->
      <div class="right-aside">
        <!-- 功能列表标题 -->
        <div style="margin-bottom: 20px; font-weight: bold; text-align: center; font-size: 18px;">功能列表</div>

        <!-- 添加好友区域 -->
        <div class="add-friend-section">
          <el-form :model="form" label-position="top">
            <el-form-item label="添加好友">
              <el-input 
                v-model="form.account" 
                placeholder="输入对方账号" 
                clearable
              />
            </el-form-item>
          </el-form>
          <el-button 
            type="primary" 
            @click="sendFriendRequest" 
            style="width: 100%"
            icon="Plus"
          >发送好友请求</el-button>
        </div>

        <!-- 其他功能按钮 -->
        <div class="other-functions">
          <div class="function-item">
            <el-button 
              @click="goToFriendRequests" 
              style="width: 100%"
              type="warning"
              icon="Bell"
            >查看通知</el-button>
          </div>
          <div class="function-item">
            <el-button 
              @click="goToChatRoom" 
              style="width: 100%"
              type="info"
              icon="Close"
            >退出好友列表</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { ElMessage,ElMessageBox } from 'element-plus'

const router = useRouter()

const friends = ref([])
const form = ref({
  account: ''
})

// 获取当前登录用户的好友列表
const fetchFriends = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      router.push('/login')
      return
    }
    
    const response = await axios.get('http://127.0.0.1:3000/friends', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    // 确保返回的是数组
    friends.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('获取好友列表失败:', error)
    ElMessage.error('获取好友列表失败')
  }
}

// 发送好友请求
const sendFriendRequest = async () => {
  const targetAccount = form.value.account.trim()
  if (!targetAccount) {
    ElMessage.warning('请输入对方账号')
    return
  }

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      router.push('/login')
      return
    }
    
    const response = await axios.post(
      'http://127.0.0.1:3000/friend-requests',
      { receiver_account: targetAccount },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    if (response.data.success) {
      ElMessage.success('好友请求已发送')
      form.value.account = '' // 清空输入框
    } else {
      ElMessage.warning('发送好友请求失败')
    }
  } catch (error) {
    console.error('发送好友请求失败:', error)
    let errorMessage = '发送请求失败'
    if (error.response) {
      // 解析后端返回的错误信息
      errorMessage = error.response.data.message || errorMessage
    }
    ElMessage.error(errorMessage)
  }
}

// 删除好友
const removeFriend = async (friendAccount) => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      router.push('/login')
      return
    }
    
    // 确认操作
    const confirm = await ElMessageBox.confirm(
      `确定要删除好友 ${friendAccount} 吗？`,
      '删除好友',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    if (confirm) {
      const response = await axios.delete(
        `http://127.0.0.1:3000/friends/${friendAccount}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (response.data.success) {
        ElMessage.success('好友删除成功')
        await fetchFriends() // 刷新列表
      } else {
        ElMessage.warning('删除好友失败')
      }
    }
  } catch (error) {
    console.error('删除好友失败:', error)
    if (error !== 'cancel') { // 用户点击取消不提示错误
      ElMessage.error('删除好友失败')
    }
  }
}

// 路由跳转：去聊天室
const goToChatRoom = () => {
  router.push('/chat')
}

// 路由跳转：查看通知
const goToFriendRequests = () => {
  router.push('/friend-requests')
}

// 页面加载时获取数据
onMounted(async () => {
  await fetchFriends()
})
</script>

<style scoped>
.common-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  margin: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.friend-list {
  flex: 1;
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
}

.right-aside {
  width: 300px;
  background-color: #f9f9f9;
  padding: 20px;
  box-sizing: border-box;
  border-left: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
}

.add-friend-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.other-functions {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: auto; /* 将按钮组推到下方 */
}

.function-item {
  width: 100%;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  
  .right-aside {
    width: 100%;
    border-left: none;
    border-top: 1px solid #ebeef5;
  }
}
</style>