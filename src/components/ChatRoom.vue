<!-- src/components/ChatRoom.vue -->
<template>
  <div class="chat-container">
    <el-container>
      <!-- 左侧边栏 - 聊天室列表 -->
       <el-aside :width="showChatRooms ? '250px' : '60px'" class="room-list">
        <div class="room-list-header">
          <el-button 
            @click="showChatRooms = !showChatRooms"
            :icon="showChatRooms ? 'ArrowLeft' : 'ArrowRight'"
            size="small"
          />
          <h3 v-show="showChatRooms">聊天室列表</h3>
          <div v-show="showChatRooms" class="room-actions-buttons">
            <el-button type="info" size="small" @click="goToFriends">
              好友管理
            </el-button>
            <el-button type="primary" size="small" @click="showCreateRoomDialog = true">
              创建
            </el-button>
            <el-button type="success" size="small" @click="showJoinRoomDialog = true">
              加入
            </el-button>
          </div>
        </div>
        
        <el-scrollbar v-show="showChatRooms">
          <div 
            v-for="room in chatRooms" 
            :key="room.chatroom_id"
            class="room-item"
            :class="{ 'active-room': activeRoomId === room.chatroom_id }"
            @click="selectRoom(room.chatroom_id)"
          >
            <div class="room-info">
              <span class="room-id">ID: {{ room.chatroom_id }}</span>
              <span class="room-name">{{ room.name }}</span>
              <span class="room-creator">创建者: {{ room.creator_username }}</span>
            </div>
            <div class="room-actions">
              <el-button 
                v-if="activeRoomId === room.chatroom_id" 
                type="danger" 
                size="small" 
                @click.stop="leaveRoom(room.chatroom_id)"
              >
                离开
              </el-button>
            </div>
          </div>
        </el-scrollbar>
      </el-aside>

      <!-- 主内容区 - 聊天区域 -->
      <el-main class="chat-area">
        <div v-if="activeRoomId" class="chat-room-container">
          <div class="chat-header">
            <h3>{{ activeRoom?.name }}</h3>
            <span>在线用户: {{ onlineUsers.length }}</span>
          </div>
          
          <div class="message-container" ref="messageContainer">
            <div 
              v-for="message in messages" 
              :key="message.id"
              class="message-item"
              :class="{ 'my-message': message.account === currentUser.account }"
            >
              <div class="message-header">
                <span class="sender-name">{{ message.username }}</span>
                <span class="send-time">{{ formatTime(message.send_at) }}</span>
              </div>
              <div class="message-content">
                {{ message.content }}
              </div>
            </div>
          </div>
          
          <div class="message-input">
            <el-input 
              v-model="inputMessage" 
              placeholder="输入消息..." 
              @keyup.enter="sendMessage"
            >
              <template #append>
                <el-button type="primary" @click="sendMessage">
                  发送
                </el-button>
              </template>
            </el-input>
          </div>
        </div>
        
        <div v-else class="no-room-selected">
          <el-empty description="请选择一个聊天室" />
        </div>
      </el-main>

      <!-- 右侧边栏 - 在线用户列表 -->
       <el-aside :width="showOnlineUsers ? '250px' : '60px'" class="online-users">
        <div class="online-users-header">
          <el-button 
            @click="showOnlineUsers = !showOnlineUsers"
            :icon="showOnlineUsers ? 'ArrowRight' : 'ArrowLeft'"
            size="small"
          />
          <h3 v-show="showOnlineUsers">在线用户 ({{ onlineUsers.length }})</h3>
        </div>
        <el-scrollbar v-show="showOnlineUsers">
          <div 
            v-for="user in onlineUsers" 
            :key="user.account"
            class="user-item"
          >
            <div class="user-info">
              <span class="username">{{ user.username }}</span>
              <span class="user-account">({{ user.account }})</span>
            </div>
            <el-tag v-if="user.account === currentUser.account" size="small" type="success">我</el-tag>
          </div>
        </el-scrollbar>
      </el-aside>
    </el-container>

    <!-- 创建聊天室对话框 -->
    <el-dialog 
      v-model="showCreateRoomDialog" 
      title="创建聊天室" 
      width="400px"
    >
      <el-form :model="newRoomForm">
        <el-form-item label="房间名称">
          <el-input v-model="newRoomForm.name" placeholder="请输入聊天室名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateRoomDialog = false">取消</el-button>
        <el-button type="primary" @click="createRoom">创建</el-button>
      </template>
    </el-dialog>

    <!-- 加入聊天室对话框 -->
    <el-dialog 
      v-model="showJoinRoomDialog" 
      title="加入聊天室" 
      width="400px"
    >
      <el-form :model="joinRoomForm">
        <el-form-item label="聊天室ID">
          <el-input v-model="joinRoomForm.chatroomId" placeholder="请输入聊天室ID" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showJoinRoomDialog = false">取消</el-button>
        <el-button type="primary" @click="joinNewRoom">加入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import axios from 'axios';
import { ElMessage } from 'element-plus';

export default {
  name: 'ChatRoom',
  data() {
    return {
      showChatRooms: true,
      showOnlineUsers: true,
      // 用户信息
      currentUser: {
        account: '',
        username: '',
        token: ''
      },
      
      // 聊天室相关数据
      chatRooms: [],          // 用户已加入的聊天室列表
      activeRoomId: null,     // 当前选中的聊天室ID
      activeRoom: null,       // 当前选中的聊天室详情
      onlineUsers: [],        // 当前聊天室在线用户列表
      messages: [],           // 当前聊天室消息记录
      inputMessage: '',       // 输入的消息内容
      
      // 创建聊天室相关
      showCreateRoomDialog: false,
      newRoomForm: {
        name: ''
      },
      
      // WebSocket相关
      socket: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,

      showJoinRoomDialog: false,
      joinRoomForm: {
        chatroomId: null
      }
    };
  },
  async created() {
    // 从本地存储获取用户信息
    this.currentUser.account = localStorage.getItem('account') || '';
    this.currentUser.username = localStorage.getItem('username') || '';
    this.currentUser.token = localStorage.getItem('token') || '';
    
    if (!this.currentUser.account || !this.currentUser.token) {
      ElMessage.error('用户未登录，请重新登录');
      this.$router.push('/');
      return;
    }
    
    // 获取已加入的聊天室列表
    await this.fetchJoinedChatrooms();
  },
  watch: {
    activeRoomId(newRoomId) {
      if (newRoomId) {
        // 离开之前的聊天室（仅断开WebSocket）
        this.leaveCurrentRoom();
        // 加入新的聊天室
        this.joinRoom(newRoomId);
      }
    }
  },
  methods: {
    // 跳转到好友页面
    goToFriends() {
      this.$router.push('/friends');
    },
    
    // 获取用户已加入的聊天室列表
    async fetchJoinedChatrooms() {
      try {
        const response = await axios.get('http://127.0.0.1:3000/chatrooms/joined', {
          headers: {
            Authorization: `Bearer ${this.currentUser.token}`
          }
        });
        
        this.chatRooms = response.data;
        
        // 默认选中第一个聊天室
        if (this.chatRooms.length > 0 && !this.activeRoomId) {
          this.activeRoomId = this.chatRooms[0].chatroom_id;
        }
      } catch (error) {
        ElMessage.error('获取聊天室列表失败');
        console.error('Error fetching joined chatrooms:', error);
      }
    },
    
    // 选择聊天室
    selectRoom(roomId) {
      this.activeRoomId = roomId;
      this.activeRoom = this.chatRooms.find(room => room.chatroom_id === roomId);
    },
    
    // 加入聊天室（连接WebSocket）
    async joinRoom(roomId) {
      try {
        // 加入聊天室（更新后端状态）
        await axios.post('http://127.0.0.1:3000/chatrooms/join', {
          chatroom_id: roomId
        }, {
          headers: {
            Authorization: `Bearer ${this.currentUser.token}`
          }
        });
        
        // 获取在线用户列表
        await this.fetchOnlineUsers(roomId);
        
        // 建立WebSocket连接
        this.connectWebSocket(roomId);
        
      } catch (error) {
        ElMessage.error('加入聊天室失败');
        console.error('Error joining room:', error);
      }
    },
    
    async joinNewRoom() {
      if (!this.joinRoomForm.chatroomId) {
        ElMessage.warning('请输入聊天室ID');
        return;
      }
      
      try {
        const chatroomId = Number(this.joinRoomForm.chatroomId);
        
        // 调用后端API加入聊天室
        const response = await axios.post(
          'http://127.0.0.1:3000/chatrooms/join',
          { chatroom_id: chatroomId },
          {
            headers: {
              Authorization: `Bearer ${this.currentUser.token}`
            }
          }
        );

        if (response.data.success) {
          ElMessage.success('成功加入聊天室');
          
          // 重新获取已加入的聊天室列表
          await this.fetchJoinedChatrooms();
          
          // 设置当前活跃的聊天室为新加入的聊天室
          this.activeRoomId = chatroomId;
          
          // 关闭对话框
          this.showJoinRoomDialog = false;
          this.joinRoomForm.chatroomId = null;
        } else {
          ElMessage.error(response.data.message || '加入聊天室失败');
        }
      } catch (error) {
        console.error('加入聊天室失败:', error);
        if (error.response) {
          // 根据后端返回的错误状态码显示不同提示
          if (error.response.status === 404) {
            ElMessage.error('聊天室不存在');
          } else if (error.response.status === 400) {
            ElMessage.error('您已是该聊天室成员');
          } else {
            ElMessage.error('加入聊天室失败');
          }
        } else {
          ElMessage.error('网络请求失败，请稍后再试');
        }
      }
    },

    // 连接WebSocket
    connectWebSocket(roomId) {
      // 关闭之前的连接
      if (this.socket) {
        this.socket.close();
      }
      
      const wsUrl = `ws://127.0.0.1:3000/ws/${roomId}?token=${this.currentUser.token}`;
      this.socket = new WebSocket(wsUrl);
      
      // WebSocket事件处理
      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0; // 重置重连计数
      };
      
      this.socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.message_type === 'online_list') {
          try {
            // 更新在线用户列表
            const usernameList = JSON.parse(message.content);
            this.onlineUsers = usernameList.map(username => ({
              username,
              // 实际项目中应从API获取账号，这里简化处理
              account: username === this.currentUser.username 
                ? this.currentUser.account 
                : username // 作为占位符
            }));
          } catch (e) {
            console.error('Error parsing online list:', e);
          }
        } else {
          // 修复消息显示格式
          let content = message.content;
          
          // 尝试解析嵌套的JSON内容
          try {
            const parsed = JSON.parse(message.content);
            if (parsed.content) {
              content = parsed.content;
            }
          } catch (e) {
            // 不是JSON格式，保持原内容
          }
          
          // 添加新消息
          this.messages.push({
            id: message.id,
            account: message.account,
            username: message.username,
            content: content, // 使用处理后的内容
            send_at: new Date(message.send_at)
          });
          
          // 滚动到底部
          this.$nextTick(() => {
            const container = this.$refs.messageContainer;
            if (container) {
              container.scrollTop = container.scrollHeight;
            }
          });
        }
      };
      
      this.socket.onclose = (event) => {
        console.log('WebSocket closed', event);
        
        // 非主动断开时尝试重连
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(3000, 1000 * Math.pow(2, this.reconnectAttempts));
          console.log(`Reconnecting in ${delay}ms...`);
          
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connectWebSocket(roomId);
          }, delay);
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    },
    
    // 离开当前聊天室（仅断开WebSocket，不退出聊天室）
    leaveCurrentRoom() {
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      this.messages = [];
      this.onlineUsers = [];
    },
    
    // 离开聊天室（完全退出）
    async leaveRoom(roomId) {
      try {
        // 发送离开请求
        await axios.post('http://127.0.0.1:3000/chatrooms/leave', {
          chatroom_id: roomId
        }, {
          headers: {
            Authorization: `Bearer ${this.currentUser.token}`
          }
        });
        
        // 断开WebSocket
        this.leaveCurrentRoom();
        
        // 从列表中移除该聊天室
        this.chatRooms = this.chatRooms.filter(room => room.chatroom_id !== roomId);
        
        // 如果离开的是当前活跃的聊天室，选择另一个
        if (this.activeRoomId === roomId) {
          this.activeRoomId = this.chatRooms.length > 0 ? this.chatRooms[0].chatroom_id : null;
          this.activeRoom = this.activeRoomId ? this.chatRooms[0] : null;
        }
        
        ElMessage.success('已离开聊天室');
      } catch (error) {
        ElMessage.error('离开聊天室失败');
        console.error('Error leaving room:', error);
      }
    },
    
    // 创建新聊天室
    async createRoom() {
      if (!this.newRoomForm.name.trim()) {
        ElMessage.warning('请输入聊天室名称');
        return;
      }
      
      try {
        const response = await axios.post('http://127.0.0.1:3000/chatrooms/create', {
          name: this.newRoomForm.name
        }, {
          headers: {
            Authorization: `Bearer ${this.currentUser.token}`
          }
        });
        
        // 修复创建后立即显示问题
        const newRoom = {
          chatroom_id: response.data.chatroom_id,
          name: this.newRoomForm.name,
          created_by: this.currentUser.account,
          creator_username: this.currentUser.username, // 直接使用当前用户名
          created_at: new Date()
        };
        
        this.chatRooms.push(newRoom);
        
        this.showCreateRoomDialog = false;
        this.newRoomForm.name = '';
        
        // 自动加入新创建的聊天室
        this.activeRoomId = response.data.chatroom_id;
        this.activeRoom = newRoom;
        
        ElMessage.success('聊天室创建成功');
      } catch (error) {
        ElMessage.error('创建聊天室失败');
        console.error('Error creating room:', error);
      }
    },
    
    // 获取在线用户列表
    async fetchOnlineUsers(roomId) {
      try {
        const response = await axios.get(`http://127.0.0.1:3000/online-users/${roomId}`, {
          headers: {
            Authorization: `Bearer ${this.currentUser.token}`
          }
        });
        
        // 将用户名转换为用户对象数组
        this.onlineUsers = response.data.map(username => {
          return {
            username: username,
            // 实际项目中应从API获取账号，这里简化处理
            account: username === this.currentUser.username 
              ? this.currentUser.account 
              : username // 作为占位符
          };
        });
        
        // 确保当前用户始终在在线列表中
        if (!this.onlineUsers.some(u => u.account === this.currentUser.account)) {
          this.onlineUsers.push({
            username: this.currentUser.username,
            account: this.currentUser.account
          });
        }
      } catch (error) {
        console.error('Error fetching online users:', error);
      }
    },
    
    // 根据用户名获取账号（简化实现）
    getAccountByUsername(username) {
      if (!username) {
        return null;
      }
      return this.currentUser.account;
    },
    
    // 发送消息
    sendMessage() {
      if (!this.inputMessage.trim() || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
        return;
      }
      
      this.socket.send(JSON.stringify({
        content: this.inputMessage
      }));
      
      this.inputMessage = '';
    },
    
    // 格式化时间
    formatTime(date) {
      if (!(date instanceof Date)) {
        date = new Date(date);
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  },
  beforeUnmount() {
    // 组件卸载前关闭WebSocket连接
    if (this.socket) {
      this.socket.close();
    }
  },
};
</script>

<style scoped>
.room-list-header, .online-users-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
}

.room-list-header h3, .online-users-header h3 {
  margin: 0;
  flex: 1;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.username {
  font-weight: bold;
}

.user-account {
  font-size: 12px;
  color: #888;
}

.chat-container {
  height: 100vh;
  display: flex;
  background-color: #f5f7fa;
}

.room-actions-buttons {
  display: flex;
  gap: 5px;
}

.room-list, .online-users {
  background-color: #fff;
  border-right: 1px solid #e6e6e6;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.room-list-header, .online-users-header {
  padding: 15px;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9f9f9;
  flex-wrap: wrap;
  gap: 10px;
}

.room-item {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-item:hover {
  background-color: #f5f7fa;
}

.active-room {
  background-color: #e6f7ff;
  border-left: 3px solid #1890ff;
}

.room-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.room-id {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.room-name {
  display: block;
  font-weight: 500;
  margin-bottom: 4px;
}

.room-creator {
  font-size: 12px;
  color: #888;
}

.room-actions {
  margin-left: 10px;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  background-color: #fff;
}

.chat-room-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 15px;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.message-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message-item {
  margin-bottom: 20px;
  max-width: 80%;
}

.my-message {
  margin-left: auto;
}

.message-header {
  margin-bottom: 5px;
  font-size: 12px;
}

.sender-name {
  font-weight: bold;
  margin-right: 10px;
}

.send-time {
  color: #999;
}

.message-content {
  padding: 10px 15px;
  border-radius: 4px;
  background-color: #f0f2f5;
  display: inline-block;
}

.my-message .message-content {
  background-color: #1890ff;
  color: white;
}

.message-input {
  padding: 15px;
  border-top: 1px solid #e6e6e6;
}

.no-room-selected {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.user-item {
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-item:last-child {
  border-bottom: none;
}

.username {
  flex: 1;
}

.el-scrollbar {
  flex: 1;
}

.room-list-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
}

.room-list-header .el-button {
  margin-top: 5px;
}
</style>