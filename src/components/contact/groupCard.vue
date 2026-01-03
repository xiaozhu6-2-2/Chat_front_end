<!-- components/GroupCard.vue -->
<template>
  <div class="group-card">
    <v-card class="mx-auto" max-width="400">
      <v-card-item>
        <div class="group-header">
          <Avatar
            :name="formattedData?.groupName || '群聊'"
            :size="60"
            :url="groupDetail?.avatar"
            avatar-class="custom-avatar"
          />
          <div class="group-info">
            <v-card-title>{{ formattedData?.groupName }}</v-card-title>
            <v-card-subtitle>群聊 ID: {{ formattedData?.groupId }}</v-card-subtitle>
          </div>
        </div>
      </v-card-item>

      <v-card-text>
        <div class="group-details">
          <v-list lines="two">
            <v-list-item prepend-icon="mdi-account" title="群主">
              <template #subtitle>
                {{ formattedData?.groupManager || '未知' }}
              </template>
            </v-list-item>

            <v-list-item prepend-icon="mdi-calendar" title="创建时间">
              <template #subtitle>
                {{ formattedData?.createTime }}
              </template>
            </v-list-item>

            <v-list-item prepend-icon="mdi-information" title="群公告">
              <template #subtitle>
                {{ formattedData?.groupIntro }}
              </template>
            </v-list-item>
          </v-list>
        </div>

        <!-- todo：展示群成员头像 -->
        <!-- <div class="group-members">
          <h4>群成员</h4>
          <div class="member-list">
            <div v-for="n in 6" :key="n" class="member-item">
              <div class="member-avatar">
                {{ String.fromCharCode(65 + n) }}
              </div>
              <span class="member-name">用户{{ n }}</span>
            </div>
          </div>
        </div> -->
      </v-card-text>

      <v-card-actions>
        <v-btn color="primary" prepend-icon="mdi-message" @click="handleEnterGroupChat">
          进入群聊
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup lang="ts">
  import type { ChatType } from '../../types/chat'
  import type { GetGroupCardParams, GroupCard, GroupCardProps } from '../../types/group'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import Avatar from '../global/Avatar.vue'
  import { useChat } from '../../composables/useChat'
  import { useGroup } from '../../composables/useGroup'
  import { strangerUserService } from '../../service/strangerUserService'

  const props = defineProps<GroupCardProps>()
  const { getGroupCard } = useGroup()
  const { createChat, selectChat } = useChat()
  const router = useRouter()

  // 进入群聊处理函数
  async function handleEnterGroupChat () {
    if (!props.group?.id) return

    try {
      // 创建群聊
      const chat = await createChat(props.group.id, 'group' as ChatType)
      if (chat) {
        // 设置为活跃聊天
        selectChat(chat.id)
        // 跳转到聊天页面
        await router.push('/chat')
      }
    } catch (error) {
      console.error('创建群聊失败:', error)
    }
  }
  // 存储详细的群组数据
  const groupDetail = ref<GroupCard | null>(null)
  const groupManagerName = ref<string>('')
  const loading = ref(false)

  // 计算属性格式化显示数据
  const formattedData = computed(() => {
    if (!groupDetail.value) return null

    return {
      groupManager: groupManagerName.value || groupDetail.value.manager_uid,
      createTime: new Date(groupDetail.value.created_at).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
      }),
      groupName: groupDetail.value.name,
      groupId: groupDetail.value.id,
      groupIntro: groupDetail.value.group_intro || '暂无群介绍',
    }
  })

  // 获取群组详细数据的函数
  async function fetchGroupDetail (groupId: string) {
    if (!groupId) return

    loading.value = true
    try {
      const params: GetGroupCardParams = {
        gid: groupId,
      }
      groupDetail.value = await getGroupCard(params)

      // 获取群主名称
      if (groupDetail.value.manager_uid) {
        try {
          const ownerProfile = await strangerUserService.getUserProfile(groupDetail.value.manager_uid)
          groupManagerName.value = ownerProfile.username || ''
        } catch (error) {
          console.error('获取群主信息失败:', error)
          groupManagerName.value = ''
        }
      }
    } catch (error) {
      console.error('获取群组详情失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 组件挂载时获取详细数据
  onMounted(() => {
    if (props.group?.id) {
      fetchGroupDetail(props.group.id)
    }
  })

  // 监听群聊ID的变化，当切换群聊时重新获取数据
  watch(() => props.group?.id, newGroupId => {
    if (newGroupId) {
      fetchGroupDetail(newGroupId)
    }
  }, { immediate: false })
</script>

  <style scoped>
  .group-card {
    padding: 20px;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .group-info {
    flex: 1;
  }

  .group-details {
    margin-bottom: 24px;
  }

  .group-members h4 {
    margin: 16px 0 8px 0;
    color: #666;
  }

  .member-list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .member-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .member-avatar {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    background-color: #576b95;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 12px;
  }

  .member-name {
    font-size: 12px;
    color: #666;
  }
  </style>
