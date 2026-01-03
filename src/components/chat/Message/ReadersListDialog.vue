<template>
  <v-menu v-model="dialog" :close-on-content-click="false" location="left" :offset="10">
    <template #activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps" />
    </template>

    <v-card min-width="600" max-width="700" class="readers-menu-card">
      <!-- 标题：已读人数/总人数 -->
      <v-card-title class="pa-3">
        <span class="text-subtitle-1">已读人员列表</span>
        <v-spacer />
        <v-chip size="small" variant="outlined">
          已读 {{ readers.length }} / 总共 {{ totalCount }} 人
        </v-chip>
      </v-card-title>

      <v-divider />

      <!-- 加载状态 -->
      <div v-if="isLoading" class="text-center pa-8">
        <v-progress-circular indeterminate />
        <div class="mt-2">加载中...</div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="text-center pa-8">
        <v-icon color="error" size="48">mdi-alert-circle</v-icon>
        <div class="mt-2">{{ error }}</div>
        <v-btn variant="outlined" class="mt-4" size="small" @click="loadData">重试</v-btn>
      </div>

      <!-- 左右分栏内容 -->
      <v-card-text v-else class="pa-3">
        <v-row no-gutters>
          <!-- 左侧：未读列表 -->
          <v-col cols="6" class="pr-2">
            <div class="text-caption mb-2 text-grey-darken-1">
              <v-icon size="x-small">mdi-checkbox-blank-circle-outline</v-icon>
              未读 ({{ unreadMembers.length }})
            </div>
            <v-list border rounded density="compact" max-height="350" class="overflow-y-auto">
              <v-list-item v-for="member in unreadMembers" :key="member.id" class="min-height-48">
                <template #prepend>
                  <Avatar :clickable="true" :name="member.name" :size="32" :url="member.avatar" @click="handleAvatarClick(member.id, member.avatar)" />
                </template>
                <v-list-item-title class="text-body-2">{{ member.name }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="unreadMembers.length === 0">
                <v-list-item-title class="text-grey text-center text-caption">暂无未读成员</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-col>

          <!-- 右侧：已读列表 -->
          <v-col cols="6" class="pl-2">
            <div class="text-caption mb-2 text-success">
              <v-icon size="x-small" color="success">mdi-check-circle</v-icon>
              已读 ({{ readers.length }})
            </div>
            <v-list border rounded density="compact" max-height="350" class="overflow-y-auto">
              <v-list-item v-for="reader in readers" :key="reader.uid" class="min-height-48">
                <template #prepend>
                  <Avatar :clickable="true" :name="reader.username" :size="32" :url="reader.avatar" @click="handleAvatarClick(reader.uid, reader.avatar)" />
                </template>
                <v-list-item-title class="text-body-2">{{ reader.username }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="readers.length === 0">
                <v-list-item-title class="text-grey text-center text-caption">暂无已读成员</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-col>
        </v-row>
      </v-card-text>

      <!-- 用户卡片弹窗 -->
      <ContactCardModal
        v-if="showContactCard && selectedContactInfo"
        v-model="showContactCard"
        :contact="selectedContactInfo"
        @send-message="handleSendMessage"
        @add-friend="handleAddFriend"
      />
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import Avatar from '@/components/global/Avatar.vue'
import ContactCardModal from '@/components/global/ContactCardModal.vue'
import type { ReaderInfo } from '@/types/message'
import type { GroupMember } from '@/types/group'
import type { FriendWithUserInfo } from '@/types/friend'
import { messageService } from '@/service/messageService'
import { strangerUserService } from '@/service/strangerUserService'
import { useFriendStore } from '@/stores/friendStore'
import { useGroupStore } from '@/stores/groupStore'
import { useGroup } from '@/composables/useGroup'
import { computed, ref, watch } from 'vue'

defineOptions({
  name: 'ReadersListDialog',
})

interface Props {
  modelValue: boolean
  messageId: string
  chatId: string
  chatType?: 'group'
  readCount?: number
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  readCount: 0,
})

const emit = defineEmits<Emits>()

const groupStore = useGroupStore()
const friendStore = useFriendStore()
const { getGroupMembers } = useGroup()

const isLoading = ref(false)
const error = ref<string | null>(null)
const readers = ref<ReaderInfo[]>([])
const unreadMembers = ref<GroupMember[]>([])
const showContactCard = ref(false)
const selectedContactInfo = ref<FriendWithUserInfo>()

const dialog = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const totalCount = computed(() => {
  return readers.value.length + unreadMembers.value.length
})

const loadData = async () => {
  if (!props.messageId || !props.chatId) return

  isLoading.value = true
  error.value = null

  try {
    // 1. 获取已读列表
    const readersData = await messageService.getShowReaders(
      props.messageId,
      props.chatId,
      props.chatType || 'group',
    )
    readers.value = readersData

    // 2. 获取群成员
    let allMembers = groupStore.getGroupMembers(props.chatId)
    if (allMembers.length === 0) {
      // 缓存为空，需要先获取
      allMembers = await getGroupMembers({ gid: props.chatId }, true)
    }

    // 3. 计算未读列表 = 群成员 - 已读成员
    const readUids = new Set(readersData.map(r => r.uid))
    unreadMembers.value = allMembers.filter(member => !readUids.has(member.id))

    console.log('[ReadersListDialog] 加载完成', {
      messageId: props.messageId,
      readCount: readers.value.length,
      unreadCount: unreadMembers.value.length,
      totalCount: totalCount.value,
    })
  } catch (err) {
    console.error('[ReadersListDialog] 加载失败:', err)
    error.value = '加载失败，请重试'
  } finally {
    isLoading.value = false
  }
}

// 处理头像点击事件
async function handleAvatarClick(userId: string, userAvatar: string) {
  // 首先检查是否为好友
  const friendInfo = friendStore.getFriendByUid(userId)

  if (friendInfo) {
    // 如果是好友，直接使用好友信息
    selectedContactInfo.value = friendInfo
    showContactCard.value = true
  } else {
    // 如果是陌生人，调用 strangerUserService 获取用户信息
    try {
      const strangerProfile = await strangerUserService.getUserProfile(userId)
      // 将 StrangerUserProfile 转换为 FriendWithUserInfo 格式
      selectedContactInfo.value = {
        id: strangerProfile.uid,
        fid: 'stranger',
        name: strangerProfile.username,
        avatar: strangerProfile.avatar || userAvatar,
        createdAt: undefined,
        isBlacklisted: false,
        bio: strangerProfile.bio || undefined,
        info: {
          account: strangerProfile.account,
          gender: strangerProfile.gender || undefined,
          region: strangerProfile.region || undefined,
          email: strangerProfile.email || undefined,
        },
      }
      showContactCard.value = true
    } catch (error) {
      console.error('[ReadersListDialog] 获取陌生人用户信息失败:', error)
    }
  }
}

// 处理发送消息事件
function handleSendMessage(contact: FriendWithUserInfo) {
  console.log('[ReadersListDialog] 发送消息:', contact)
  showContactCard.value = false
  dialog.value = false
  // TODO: 实现跳转到私聊
}

// 处理添加好友事件
function handleAddFriend(contact: FriendWithUserInfo) {
  console.log('[ReadersListDialog] 添加好友:', contact)
  // ContactCardModal 会自动处理添加好友逻辑
}

// 监听弹窗打开时加载数据
watch(() => props.modelValue, isOpen => {
  if (isOpen) {
    loadData()
  }
})
</script>

<style scoped>
/* 无需额外样式，使用 Vuetify 工具类 */
</style>
