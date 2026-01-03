<template>
  <v-navigation-drawer
    v-model="dialogVisible"
    location="right"
    temporary
    width="320"
  >
    <!-- 群信息头部 -->

    <v-divider />

    <!-- 群功能菜单 -->

    <v-divider />

    <!-- 群成员列表 -->

    <!-- 底部操作按钮 -->

  </v-navigation-drawer>
</template>

  <script setup lang="ts">
  import { ref } from 'vue'

  interface GroupMember {
    id: string
    name: string
    avatar: string
    role: '群主' | '管理员' | '成员'
  }

  interface GroupInfo {
    id: string
    name: string
    avatar: string
    announcement?: string
    muted: boolean
  }

  // 控制抽屉显示
  const dialogVisible = defineModel<boolean>('modelValue', { default: false })

  // 群信息
  const groupInfo = ref<GroupInfo>({
    id: '123456',
    name: '前端开发交流群',
    avatar: 'https://picsum.photos/200/300?random=1',
    announcement: '欢迎大家一起交流前端技术！',
    muted: false,
  })

  // 群成员列表
  const groupMembers = ref<GroupMember[]>([
    {
      id: '1',
      name: 'yxd',
      avatar: 'https://picsum.photos/200/300?random=1',
      role: '群主',
    },
    {
      id: '2',
      name: 'zhu',
      avatar: 'https://picsum.photos/200/300?random=2',
      role: '管理员',
    },
    {
      id: '3',
      name: 'trucker',
      avatar: 'https://picsum.photos/200/300?random=3',
      role: '成员',
    },
    {
      id: '4',
      name: 'yang',
      avatar: 'https://picsum.photos/200/300?random=4',
      role: '成员',
    },
    {
      id: '5',
      name: 'ggbond',
      avatar: 'https://picsum.photos/200/300?random=5',
      role: '成员',
    },
    {
      id: '5',
      name: 'ggbond',
      avatar: 'https://picsum.photos/200/300?random=5',
      role: '成员',
    },
    {
      id: '5',
      name: 'ggbond',
      avatar: 'https://picsum.photos/200/300?random=5',
      role: '成员',
    },
    {
      id: '5',
      name: 'ggbond',
      avatar: 'https://picsum.photos/200/300?random=5',
      role: '成员',
    },
    {
      id: '5',
      name: 'ggbond',
      avatar: 'https://picsum.photos/200/300?random=5',
      role: '成员',
    },
    {
      id: '5',
      name: 'ggbond',
      avatar: 'https://picsum.photos/200/300?random=5',
      role: '成员',
    },
    {
      id: '5',
      name: 'ggbond',
      avatar: 'https://picsum.photos/200/300?random=5',
      role: '成员',
    },
    {
      id: '5',
      name: 'ggbond',
      avatar: 'https://picsum.photos/200/300?random=5',
      role: '成员',
    },
  ])

  // 方法定义
  function editAnnouncement () {
    console.log('编辑群公告')
    // 实现编辑群公告逻辑
  }

  function searchMessages () {
    console.log('搜索聊天记录')
    // 实现搜索逻辑
  }

  function toggleMute () {
    groupInfo.value.muted = !groupInfo.value.muted
    console.log('消息免打扰:', groupInfo.value.muted)
  }

  function showMemberInfo (member: GroupMember) {
    console.log('查看成员信息:', member.name)
    // 实现查看成员信息逻辑
  }

  function sendMessage () {
    console.log('发送消息')
    dialogVisible.value = false
    // 触发发送消息事件
  }

  function exitGroup () {
    console.log('退出群聊')
    if (confirm('确定要退出该群聊吗？')) {
      // 实现退出群聊逻辑
      dialogVisible.value = false
    }
  }
  </script>

  <style scoped>
  .group-header {
    padding: 20px;
    text-align: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .group-avatar {
    margin-bottom: 12px;
    border: 3px solid rgba(255, 255, 255, 0.3);
  }

  .group-info {
    color: white;
  }

  .group-name {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .group-id, .member-count {
    font-size: 12px;
    opacity: 0.8;
    margin-bottom: 2px;
  }

  .members-section {
    flex: 1;
    overflow-y: auto;
  }

  .members-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }

  .members-list {
    background: transparent;
  }

  .custom-avatar {
    border-radius: 10px !important;
    overflow: hidden;
  }

  .action-buttons {
    padding: 16px;

  }

  /* 滚动条样式 */
  .members-section::-webkit-scrollbar {
    width: 4px;
  }

  .members-section::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  .members-section::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }

  .members-section::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
  </style>
