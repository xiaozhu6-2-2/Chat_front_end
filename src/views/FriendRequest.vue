<!-- src/components/FriendRequest.vue -->
<template>
  <div class="friend-requests-container">
    <!-- 顶部导航栏 -->
    <div class="header">
      <el-page-header @back="goBack" title="返回">
        <template #content>
          <div class="header-title">好友请求管理</div>
        </template>
      </el-page-header>
    </div>

    <!-- 主体内容 -->
    <div class="content">
      <div class="stats-card">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-value">{{ stats.pendingCount }}</div>
            <div class="stat-label">待处理请求</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats.acceptedCount }}</div>
            <div class="stat-label">已接受</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats.rejectedCount }}</div>
            <div class="stat-label">已拒绝</div>
          </div>
        </el-card>
      </div>

      <!-- 请求列表区域 -->
      <div class="list-container">
        <el-card shadow="never" class="list-card">
          <template #header>
            <div class="card-header">
              <span>好友请求列表</span>
              <el-button type="primary" size="small" @click="refreshRequests" circle>
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>

          <!-- 请求列表 -->
          <el-table :data="requests" style="width: 100%" v-loading="loading">
            <el-table-column prop="sender_account" label="发送者账号" width="180" />
            <el-table-column prop="sender_username" label="发送者名称" width="180" />
            <el-table-column prop="status" label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="200">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <!-- 只有未处理的请求才显示按钮 -->
                <div v-if="row.status === 'PENDING'">
                  <el-button 
                    type="success" 
                    size="small" 
                    @click="respondToRequest(row.id, 'ACCEPTED')"
                    icon="Check"
                  >接受</el-button>
                  <el-button 
                    type="danger" 
                    size="small" 
                    @click="respondToRequest(row.id, 'REJECTED')"
                    icon="Close"
                  >拒绝</el-button>
                </div>
                <!-- 处理后显示提示文字 -->
                <div v-else style="color: #909399; font-size: 13px;">
                  已处理
                </div>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 空状态提示 -->
          <div v-if="requests.length === 0 && !loading" class="empty-state">
            <el-empty description="暂无好友请求" />
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

const router = useRouter()
const requests = ref([])
const loading = ref(false)
const stats = ref({
  pendingCount: 0,
  acceptedCount: 0,
  rejectedCount: 0
})

// 获取好友请求列表
const fetchRequests = async () => {
  try {
    loading.value = true
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      router.push('/login')
      return
    }
    
    const res = await axios.get('http://127.0.0.1:3000/friend-requests', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    // 更新请求列表
    requests.value = res.data
    
    // 更新统计数据
    updateStats()
    
    loading.value = false
  } catch (error) {
    console.error('获取好友请求失败:', error)
    ElMessage.error('获取好友请求失败')
    loading.value = false
  }
}

// 更新统计信息
const updateStats = () => {
  stats.value = {
    pendingCount: requests.value.filter(r => r.status === 'PENDING').length,
    acceptedCount: requests.value.filter(r => r.status === 'ACCEPTED').length,
    rejectedCount: requests.value.filter(r => r.status === 'REJECTED').length
  }
}

// 处理好友请求（接受 / 拒绝）
const respondToRequest = async (requestId, status) => {
  const request = requests.value.find(r => r.id === requestId)
  if (!request) return
  
  try {
    // 确认操作
    const confirmText = status === 'ACCEPTED' 
      ? `确定要接受 ${request.sender_username || request.sender_account} 的好友请求吗？`
      : `确定要拒绝 ${request.sender_username || request.sender_account} 的好友请求吗？`
    
    await ElMessageBox.confirm(
      confirmText,
      status === 'ACCEPTED' ? '接受好友请求' : '拒绝好友请求',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: status === 'ACCEPTED' ? 'success' : 'warning'
      }
    )
    
    const token = localStorage.getItem('token')
    await axios.post(
      'http://127.0.0.1:3000/friend-requests/respond',
      {
        request_id: requestId,
        status: status
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    
    // 更新本地状态
    request.status = status
    updateStats()
    
    ElMessage.success(status === 'ACCEPTED' ? '已接受好友请求' : '已拒绝好友请求')
  } catch (error) {
    console.error('处理好友请求失败:', error)
    if (error !== 'cancel') {
      ElMessage.error('处理请求失败')
    }
  }
}

// 状态标签类型
const statusTagType = (status) => {
  switch (status) {
    case 'PENDING': return 'warning'
    case 'ACCEPTED': return 'success'
    case 'REJECTED': return 'info'
    default: return ''
  }
}

// 状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'PENDING': return '待处理'
    case 'ACCEPTED': return '已接受'
    case 'REJECTED': return '已拒绝'
    default: return status
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

// 刷新请求列表
const refreshRequests = () => {
  fetchRequests()
}

// 返回上一页
const goBack = () => {
  router.go(-1)
}

// 页面加载时获取数据
onMounted(async () => {
  await fetchRequests()
})
</script>

<style scoped>
.friend-requests-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.header {
  margin-bottom: 20px;
}

.header-title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-card {
  margin-bottom: 20px;
}

.stat-item {
  display: inline-block;
  text-align: center;
  padding: 0 30px;
  border-right: 1px solid #eee;
}

.stat-item:last-child {
  border-right: none;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.list-container {
  margin-top: 20px;
}

.list-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}
</style>