<template>
  <div class="chat-container">
    <el-container>
      <!-- 左侧边栏 - 用户列表 -->
      <el-aside width="200px" class="user-list">
        <div class="user-list-header">
          <h3>在线用户 ({{ onlineUsers.length }})</h3>
        </div>
        <el-scrollbar>
          <div class="user-item" v-for="user in onlineUsers" :key="user.id"
            :class="{ 'current-user': user.id === currentUser.id }">
            <span class="username">{{ user.username }}</span>
            <el-tag v-if="user.id === currentUser.id" size="small" type="success">我</el-tag>
          </div>
        </el-scrollbar>
      </el-aside>

      <!-- 主内容区 - 聊天区域 -->
      <el-main class="chat-area">
        <div class="message-container" ref="messageContainer">
          <div v-for="message in messages" :key="message.id"
            :class="['message-item', message.userId === currentUser.id ? 'my-message' : 'other-message']">
            <div class="message-header">
              <span class="sender-name">{{ getUsername(message.userId) }}</span>
              <span class="send-time">{{ formatTime(message.timestamp) }}</span>
            </div>
            <div class="message-content">
              {{ message.content }}
            </div>
          </div>
        </div>

        <!-- 消息输入框 -->
        <div class="message-input">
          <el-input v-model="inputMessage" placeholder="输入消息..." @keyup.enter="sendMessage()">
            <template #append>
              <el-button type="primary" @click="sendMessage()">
                发送
              </el-button>
            </template>
          </el-input>
        </div>
      </el-main>

      <!-- 右侧边栏 - 聊天室列表 -->
      <el-aside width="200px" class="room-list">
        <div class="room-list-header">
          <h3>聊天室 ({{ chatRooms.length }})</h3>
        </div>
        <el-scrollbar>
          <div class="room-item" v-for="room in chatRooms" :key="room.id"
               :class="{ 'active-room': activeRoomId === room.id }"
               @click="joinRoom(room.id)">
            <span class="room-name">{{ room.name }}</span>
            <el-button 
              class="delete-room-btn" 
              type="danger" 
              size="small" 
              circle 
              @click.stop="deleteRoom(room.id)"
              v-if="room.id !== 1" 
            >
              <el-icon><Minus /></el-icon>
            </el-button>
          </div>
          <div class="add-room-container">
            <el-button 
              class="add-room-btn" 
              type="primary" 
              size="small" 
              circle 
              @click="showAddRoomDialog = true"
            >
              <el-icon><Plus /></el-icon>
            </el-button>
          </div>
        </el-scrollbar>
      </el-aside>
    </el-container>

    <!-- 添加聊天室对话框 -->
    <el-dialog v-model="showAddRoomDialog" title="添加聊天室" width="400px">
      <el-form :model="newRoomForm" label-width="80px">
        <el-form-item label="房间名称">
          <el-input v-model="newRoomForm.name" placeholder="请输入聊天室名称"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddRoomDialog = false">取消</el-button>
        <el-button type="primary" @click="addRoom">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>


<script>
import { Plus, Minus } from '@element-plus/icons-vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

export default {
  components: {
    Plus,
    Minus
  },
  data() {
    return {
      currentUser: {
        id: localStorage.getItem('userId') || '',
        username: localStorage.getItem('username') || ''
      },
      onlineUsers: [],
      messages: [],
      inputMessage: '',
      chatRooms: [],
      activeRoomId: null,
      showAddRoomDialog: false,
      newRoomForm: {
        name: ''
      },
      socket: null
    }
  },
  async created() {
    await this.fetchChatRooms()
    if (this.chatRooms.length > 0) {
      this.joinRoom(this.chatRooms[0].id)
    }
  },
  methods: {
    async fetchChatRooms() {
      try {
        const response = await axios.get('/chatrooms', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        this.chatRooms = response.data
      } catch (error) {
        ElMessage.error('获取聊天室列表失败')
        console.error(error)
      }
    },
    
    async joinRoom(roomId) {
      try {
        // 离开当前房间
        if (this.activeRoomId) {
          await axios.post('/chatrooms/leave', {
            room_id: this.activeRoomId
          }, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
          
          if (this.socket) {
            this.socket.close()
          }
        }
        
        // 加入新房间
        await axios.post('/chatrooms/join', {
          room_id: roomId
        }, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        this.activeRoomId = roomId
        this.connectWebSocket(roomId)
        this.fetchOnlineUsers(roomId)
        this.fetchMessages(roomId)
      } catch (error) {
        ElMessage.error('加入聊天室失败')
        console.error(error)
      }
    },
    
    connectWebSocket(roomId) {
      const token = localStorage.getItem('token')
      this.socket = new WebSocket(`ws://localhost:8000/ws/${roomId}?token=${token}`)
      
      this.socket.onopen = () => {
        console.log('WebSocket连接已建立')
      }
      
      this.socket.onmessage = (event) => {
        const message = JSON.parse(event.data)
        this.messages.push(message)
        
        // 如果是新用户加入或离开消息，更新在线用户列表
        if (message.type === 'user_join' || message.type === 'user_leave') {
          this.fetchOnlineUsers(roomId)
        }
      }
      
      this.socket.onclose = () => {
        console.log('WebSocket连接已关闭')
      }
    },
    
    async fetchOnlineUsers(roomId) {
      try {
        const response = await axios.get(`/online-users/${roomId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        this.onlineUsers = response.data
      } catch (error) {
        ElMessage.error('获取在线用户列表失败')
        console.error(error)
      }
    },
    
    async fetchMessages(roomId) {
      try {
        const response = await axios.get(`/messages?room_id=${roomId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        this.messages = response.data
      } catch (error) {
        ElMessage.error('获取消息历史失败')
        console.error(error)
      }
    },
    
    async sendMessage() {
      if (!this.inputMessage.trim()) return
      
      try {
        const message = {
          room_id: this.activeRoomId,
          content: this.inputMessage
        }
        
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify(message))
        } else {
          await axios.post('/messages', message, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        }
        
        this.inputMessage = ''
      } catch (error) {
        ElMessage.error('发送消息失败')
        console.error(error)
      }
    },
    
    async addRoom() {
      if (this.newRoomForm.name.trim() === '') {
        ElMessage.error('请输入聊天室名称')
        return
      }
      
      try {
        const response = await axios.post('/chatrooms/create', {
          name: this.newRoomForm.name
        }, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        this.chatRooms.push(response.data)
        this.newRoomForm.name = ''
        this.showAddRoomDialog = false
        ElMessage.success('聊天室添加成功')
      } catch (error) {
        ElMessage.error('添加聊天室失败')
        console.error(error)
      }
    },
    
    async deleteRoom(roomId) {
      try {
        await this.$confirm('确定要删除该聊天室吗?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        await axios.delete(`/chatrooms/${roomId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        const index = this.chatRooms.findIndex(room => room.id === roomId)
        if (index !== -1) {
          this.chatRooms.splice(index, 1)
          ElMessage.success('聊天室已删除')
          
          // 如果删除的是当前活跃的房间，切换到默认房间
          if (roomId === this.activeRoomId) {
            this.joinRoom(1) // 假设ID为1的是默认房间
          }
        }
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除聊天室失败')
          console.error(error)
        }
      }
    },
    
    getUsername(userId) {
      const user = this.onlineUsers.find(u => u.id === userId)
      return user ? user.username : '未知用户'
    },
    
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString()
    }
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.close()
    }
  }
}
</script>

<style scoped>
.chat-container {
  height: 100vh;
  display: flex;
}

.user-list {
  border-right: 1px solid #e6e6e6;
  height: 100vh;
  background-color: #f5f5f5;
}

.user-list-header {
  padding: 15px;
  border-bottom: 1px solid #e6e6e6;
}

.user-item {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-item:hover {
  background-color: #ebebeb;
}

.current-user {
  background-color: #e1f3ff;
}

.chat-area {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.message-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message-item {
  margin-bottom: 15px;
  max-width: 70%;
}

.my-message {
  margin-left: auto;
  text-align: right;
}

.other-message {
  margin-right: auto;
}

.message-header {
  font-size: 12px;
  color: #999;
  margin-bottom: 5px;
}

.message-content {
  padding: 10px 15px;
  border-radius: 4px;
  display: inline-block;
}

.my-message .message-content {
  background-color: #409eff;
  color: white;
}

.other-message .message-content {
  background-color: #f5f5f5;
  color: #333;
}

.message-input {
  padding: 15px;
  border-top: 1px solid #e6e6e6;
}

.active-room {
  background-color: #e6f7ff;
}

.room-item {
  cursor: pointer;
  padding: 12px 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
}

.room-item:hover {
  background-color: #ebedf0;
}
</style>