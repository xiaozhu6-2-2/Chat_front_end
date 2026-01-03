<!-- todo:虚拟滚动 -->
<template>
  <div class="wechat-sidebar">
    <!-- 分类列表 -->
    <v-list class="contactList" density="comfortable">
      <!-- 群聊分组 -->
      <v-list-group v-model:opened="openGroups['群聊']" value="群聊">
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-account-group"
            title="群聊"
          />
        </template>

        <v-list-item
          v-for="group in sortedGroups"
          :key="group.id"
          class="contact-item"
          :class="{ 'active-contact': activeItemId === group.id }"
          @click="setActiveItem(group.id)"
        >
          <div class="contact_content">
            <Avatar
              avatar-class="profile-avatar"
              :name="group.name || '群聊'"
              :size="40"
              :url="group.avatar"
            />
            <div class="contact-name">{{ group.name }}</div>
          </div>
        </v-list-item>
        <div v-if="allGroups.length === 0" class="no-results">
          <v-icon class="mb-2" icon="mdi-account-off" size="24" />
          <p>暂未加入群聊</p>
          <p class="text-caption text-grey">加入群聊后，即可在此查看</p>
        </div>
      </v-list-group>

      <!-- 联系人分组 -->
      <v-list-group :opened="openGroups['联系人']" @click="toggleGroup('联系人')" value="联系人">
        <template #activator="{ props }">
          <v-list-item v-bind="props" prepend-icon="mdi-account" title="联系人">
            <template #append>
              <!-- 分组切换按钮 -->
              <v-btn-toggle
                v-model="groupBy"
                class="ml-2"
                density="compact"
                mandatory
                variant="outlined"
                @click.stop
              >
                <v-btn size="x-small" value="initial">
                  <v-icon icon="mdi-sort-alphabetical-descending-variant" size="12" />
                </v-btn>
                <v-btn size="x-small" value="tag">
                  <v-icon icon="mdi-tag-multiple" size="12" />
                </v-btn>
              </v-btn-toggle>
            </template>
          </v-list-item>
        </template>

        <template v-for="(contacts, groupName) in currentGroupedContacts" :key="groupName">
          <div class="letter-divider">
            <span v-if="groupBy === 'tag'">
              <v-icon class="mr-1" icon="mdi-tag" size="12" />
              {{ groupName }}
            </span>
            <span v-else>{{ groupName }}</span>
          </div>
          <v-list-item
            v-for="contact in contacts"
            :key="contact.id"
            class="contact-item"
            :class="{ 'active-contact': activeItemId === contact.id }"
            @click="setActiveItem(contact.id)"
          >
            <div class="contact_content">
              <div>
                <Avatar
                  avatar-class="profile-avatar"
                  :name="contact.name || '用户'"
                  :size="40"
                  :url="contact.avatar"
                />
              </div>
              <div class="d-flex flex-column align-start flex-grow-1">
                <div class="contact-name">{{ contact.name }}</div>
                <v-chip
                  v-if="groupBy === 'tag' && contact.tag"
                  class="mt-1 ma-2"
                  :color="getTagColor(contact.tag)"
                  size="x-small"
                  variant="tonal"
                >
                  {{ contact.tag }}
                </v-chip>
              </div>
            </div>
          </v-list-item>
        </template>

        <!-- 空状态提示 -->
        <div v-if="Object.keys(currentGroupedContacts).length === 0" class="no-results">
          <v-icon class="mb-2" :icon="groupBy === 'tag' ? 'mdi-tag-off' : 'mdi-account-off'" size="24" />
          <p>{{ groupBy === 'tag' ? '暂无带标签的联系人' : '暂无联系人' }}</p>
          <p class="text-caption text-grey">{{ groupBy === 'tag' ? '为好友设置标签后，即可在此查看' : '添加好友后，即可在此查看' }}</p>
        </div>
      </v-list-group>

      <!-- 添加好友 -->
      <v-list-item
        class="contact-item add-friend-item"
        @click="navigateToAddFriend"
      >
        <template #append>
          <v-badge
            v-if="totalPendingRequests > 0"
            color="error"
            :content="totalPendingRequests"
          />
        </template>
        <div class="contact_content">
          <div class="contact-avatar add-friend-avatar">
            <v-icon color="white" icon="mdi-account-plus" />
          </div>
          <div class="contact-name">新的朋友</div>
        </div>
      </v-list-item>

      <!-- 创建群聊 -->
      <v-list-item
        class="contact-item create-group-item"
        @click="navigateToCreateGroup"
      >
        <div class="contact_content">
          <div class="contact-avatar create-group-avatar">
            <v-icon color="white" icon="mdi-account-multiple" />
          </div>
          <div class="contact-name">创建群聊</div>
        </div>
      </v-list-item>
    </v-list>
  </div>
</template>

<script setup lang="ts">
  import type { ContactListEmits } from '../../types/global'
  import { computed, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { pinyin } from 'pinyin-pro'
  import Avatar from '../global/Avatar.vue'
  import { useFriend } from '../../composables/useFriend'
  import { useGroup } from '../../composables/useGroup'
  import { useSnackbar } from '../../composables/useSnackbar'
  import { useFriendRequestStore } from '../../stores/friendRequestStore'
  import { useGroupRequestStore } from '../../stores/groupRequestStore'
  // 定义 emits

  const emit = defineEmits<ContactListEmits>()

  // Router 实例
  const router = useRouter()
  const { allGroups } = useGroup()
  // 用于展示在contactlist中的结构体
  // 该结构体只在这个组件内使用，未泄露
  interface Contact {
    id: string // 对应 friend.fid
    uid: string // 对应 friend.uid
    name: string
    initial: string // 必须要有一个initial来按首字母排序
    tag?: string
    avatar?: string
  }

  interface Group {
    id: string
    name: string
  }

  // 响应式状态
  const activeItemId = ref<string | null>(null)
  const groupBy = ref<'initial' | 'tag'>('initial') // 分组模式
  const openGroups = ref({
    群聊: true,
    联系人: true,
  })

  // 使用 useFriend composable
  const { activeFriends, getFriendByUid } = useFriend()
  const { showError } = useSnackbar()

  // 获取请求 store
  const friendRequestStore = useFriendRequestStore()
  const groupRequestStore = useGroupRequestStore()

  // 未处理请求总数 = 收到的好友请求 + 需要审核的群聊请求
  const totalPendingRequests = computed(() => {
    return friendRequestStore.pendingReceivedRequests.length +
           groupRequestStore.pendingApprovalRequests.length
  })

  // 从usegroup拿到所在的群聊
  const groups = allGroups

  // 将好友数据转换为联系人格式
  const contacts = computed(() => {
    return activeFriends.value.map(friend => ({
      id: friend.fid,
      uid: friend.id,
      name: friend.remark || friend.name, // 优先显示备注，没有则显示用户名
      initial: getInitial(friend.remark || friend.name), // 提取首字母
      tag: friend.tag, // 好友标签
      avatar: friend.avatar, // 头像
    }))
  })

  // 提取首字母的辅助函数
  function getInitial (name: string): string {
    if (!name) return '#'

    const firstChar = name.charAt(0)

    // 检查是否为英文字母
    if (/^[a-zA-Z]$/.test(firstChar)) {
      return firstChar.toUpperCase()
    }

    // 对于中文，使用拼音获取首字母
    // pinyin 函数会返回中文字符的拼音
    const pinyinResult = pinyin(firstChar, { pattern: 'first', toneType: 'none' })

    // 如果成功获取拼音首字母，返回大写形式
    if (pinyinResult && /^[a-zA-Z]$/.test(pinyinResult)) {
      return pinyinResult.toUpperCase()
    }

    // 如果无法识别，返回 # 号作为默认分组
    return '#'
  }

  // 计算属性 - 排序后的群聊
  const sortedGroups = computed(() => {
    return [...groups.value].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  })

  // 计算属性 - 排序后的联系人
  const sortedContacts = computed(() => {
    return [...contacts.value].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  })

  // 计算属性 - 按首字母分组的联系人
  const groupedContacts = computed(() => {
    const groupsMap: Record<string, Contact[]> = {}
    // 遍历每个contact
    for (const contact of sortedContacts.value) {
      const initial = contact.initial
      if (!groupsMap[initial]) {
        groupsMap[initial] = []
      }
      groupsMap[initial].push(contact)
    }
    return groupsMap
  })

  // 计算属性 - 按标签分组的联系人
  const groupedContactsByTag = computed(() => {
    const groupsMap: Record<string, Contact[]> = {}
    // 遍历每个contact
    for (const contact of sortedContacts.value) {
      if (contact.tag) {
        if (!groupsMap[contact.tag]) {
          groupsMap[contact.tag] = []
        }
        // 已经检查了tag非空，报错忽略
        groupsMap[contact.tag]!.push(contact)
      }
    }
    return groupsMap
  })
  // 根据分组模式返回对应的分组数据
  const currentGroupedContacts = computed(() => {
    return groupBy.value === 'tag' ? groupedContactsByTag.value : groupedContacts.value
  })

  // 获取标签颜色
  function getTagColor (tag: string): string {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'purple', 'indigo', 'teal']
    const hash = (tag || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const index = Math.abs(hash) % colors.length
    return colors[index] || 'primary' // 提供默认值
  }

  // 导航到添加好友页面
  function navigateToAddFriend () {
    router.push('/AddFriend')
  }

  // 导航到创建群聊页面
  function navigateToCreateGroup () {
    router.push('/CreateGroup')
  }

  // 修改 setActiveItem 方法
  function setActiveItem (id: string) {
    activeItemId.value = id

    // 查找并发射对应数据
    // 只检查id来判断是群聊还是私聊
    const groupFound = groups.value.find((g: Group) => g.id === id)
    if (groupFound) {
      emit('itemClick', 'group', groupFound)
      return
    }

    const contactFound = contacts.value.find((c: Contact) => c.id === id)
    if (contactFound) {
      // 从 activeFriends 中获取完整的 FriendWithUserInfo 数据
      const friendData = getFriendByUid(contactFound.uid)
      if (friendData) {
        emit('itemClick', 'contact', friendData)
      } else {
        console.error('找不到好友数据:', contactFound)
        // 显示错误提示
        showError('无法获取联系人信息')
      }
      return
    }
  }

  // 切换分组展开状态
  function toggleGroup (groupName: '群聊' | '联系人') {
    openGroups.value[groupName] = !openGroups.value[groupName]
  }
</script>

<style scoped>
.contactList {
  background-color: #1c1c1e;
}

.category-title {
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 500;
  color: #333;
  display: flex;
  align-items: center;
}

.contact-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.contact_content {
  display: flex;
  align-items: center;
  width: 100%;
}

.contact-item:hover {
  background-color: #b1a7a7;
}

.contact-avatar {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.add-friend-avatar {
  background-color: #1976d2;
}

.add-friend-item {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 8px;
}

.add-friend-item:hover {
  background-color: rgba(25, 118, 210, 0.1);
}

.create-group-avatar {
  background-color: #9c27b0;
}

.create-group-item:hover {
  background-color: rgba(156, 39, 176, 0.1);
}

.contact-name {
  font-size: 15px;
  margin-left: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.letter-divider {
  padding: 6px 16px;
  font-size: 13px;
  color: #666;
  border-bottom: #666;
}

.group-icon {
  background-color: #07c160 !important;
}

.official-accounts-icon {
  background-color: #576b95 !important;
}

.active-contact {
  background-color: #6a6464;
}

.no-results {
  padding: 16px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

/* 分组箭头动画 */
.v-list-group__items {
  transition: max-height 0.3s ease;
}

.v-list-group__header .v-icon {
  transition: transform 0.3s;
}

.v-list-group--active .v-list-group__header .v-icon {
  transform: rotate(180deg);
}
</style>
