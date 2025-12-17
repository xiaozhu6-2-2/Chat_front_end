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
          :class="{ 'active-contact': activeItem === group.id }"
          @click="setActiveItem(group.id)"
        >
          <div class="contact_content">
            <div class="contact-avatar group-icon">
              <v-icon color="white" icon="mdi-account-group" />
            </div>
            <div class="contact-name">{{ group.name }}</div>
          </div>
        </v-list-item>
      </v-list-group>

      <!-- 公众号分组 -->
      <v-list-group v-model:opened="openGroups['公众号']" value="公众号">
        <template #activator="{ props }">
          <v-list-item v-bind="props" prepend-icon="mdi-wechat" title="公众号" />
        </template>

        <v-list-item
          class="contact-item"
          :class="{ 'active-contact': activeItem === 'officialAccounts' }"
          @click="setActiveItem('officialAccounts')"
        />
      </v-list-group>

      <!-- 联系人分组 -->
      <v-list-group v-model:opened="openGroups['联系人']" value="联系人">
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
            :class="{ 'active-contact': activeItem === contact.id }"
            @click="setActiveItem(contact.id)"
          >
            <div class="contact_content">
              <div class="contact-avatar">
                {{ contact.name.charAt(0) }}
              </div>
              <div class="d-flex flex-column align-start flex-grow-1">
                <div class="contact-name">{{ contact.name }}</div>
                <v-chip
                  v-if="groupBy === 'tag' && contact.tag"
                  class="mt-1"
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

        <!-- 标签分组模式下显示空状态提示 -->
        <div v-if="groupBy === 'tag' && Object.keys(currentGroupedContacts).length === 0" class="no-results">
          <v-icon class="mb-2" icon="mdi-tag-off" size="24" />
          <p>暂无带标签的联系人</p>
          <p class="text-caption text-grey">为好友设置标签后，即可在此查看</p>
        </div>
      </v-list-group>

      <!-- 添加好友 -->
      <v-list-item
        class="contact-item add-friend-item"
        @click="navigateToAddFriend"
      >
        <div class="contact_content">
          <div class="contact-avatar add-friend-avatar">
            <v-icon color="white" icon="mdi-account-plus" />
          </div>
          <div class="contact-name">添加好友</div>
        </div>
      </v-list-item>
    </v-list>
  </div>
</template>

<script setup lang="ts">
  import type { ContactListProps } from '@/types/componentProps'
  import { computed, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useFriend } from '@/composables/useFriend'

  interface Contact {
    id: string // 对应 friend.fid
    uid: string // 对应 friend.uid
    name: string
    initial: string
    tag?: string
    avatar?: string
    bio?: string
    remark?: string
  }

  interface Group {
    id: string
    name: string
  }

  // 响应式状态
  const activeItem = ref<string | null>(null)
  const groupBy = ref<'initial' | 'tag'>('initial') // 分组模式
  const openGroups = ref({
    群聊: true,
    公众号: true,
    联系人: true,
  })

  // 使用 useFriend composable
  const { activeFriends } = useFriend()

  // 静态群聊数据
  const groups: Group[] = [
    { id: 'g1', name: '前端开发交流群' },
    { id: 'g2', name: 'Vue技术讨论组' },
    { id: 'g3', name: '全家桶学习小组' },
    { id: 'g4', name: '项目协作群' },
    { id: 'g5', name: '设计资源分享' },
    { id: 'g6', name: '产品经理交流' },
  ]

  // 将好友数据转换为联系人格式
  const contacts = computed(() => {
    return activeFriends.value.map(friend => ({
      id: friend.fid,
      uid: friend.id, // 使用 BaseProfile 的 id 字段
      name: friend.remark || friend.name, // 优先显示备注，没有则显示 name
      initial: getInitial(friend.remark || friend.name), // 提取首字母
      tag: friend.tag, // 好友标签
      avatar: friend.avatar, // 头像
      bio: friend.bio,
      remark: friend.remark,
    }))
  })

  // 提取首字母的辅助函数
  function getInitial (name: string): string {
    // 对于中文，提取第一个字符作为首字母
    // 对于英文，提取首字母的大写形式
    return name.charAt(0).toUpperCase()
  }

  // 计算属性 - 排序后的群聊
  const sortedGroups = computed(() => {
    return [...groups].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  })

  // 计算属性 - 排序后的联系人
  const sortedContacts = computed(() => {
    return [...contacts.value].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  })

  // 计算属性 - 按首字母分组的联系人
  const groupedContacts = computed(() => {
    const groupsMap: Record<string, Contact[]> = {}
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
    for (const contact of sortedContacts.value) {
      if (contact.tag) {
        if (!groupsMap[contact.tag]) {
          groupsMap[contact.tag] = []
        }
        groupsMap[contact.tag].push(contact)
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
    return colors[hash % colors.length]
  }

  // 定义 props 和 emits
  defineProps<ContactListProps>()

  const emit = defineEmits<{
    (e: 'itemClick', type: 'contact' | 'group', data: Contact | Group): void
  }>()

  // Router 实例
  const router = useRouter()

  // 导航到添加好友页面
  function navigateToAddFriend () {
    router.push('/AddFriend')
  }

  // 修改 setActiveItem 方法
  function setActiveItem (id: string) {
    activeItem.value = id

    // 查找并发射对应数据
    let found = groups.find(g => g.id === id)
    if (found) {
      emit('itemClick', 'group', found)
      return
    }

    found = contacts.value.find(c => c.id === id)
    if (found) {
      emit('itemClick', 'contact', found)
      return
    }

    // 处理公众号点击
    if (id === 'officialAccounts') {
    // 可以添加公众号处理逻辑
    }
  }

  // 切换分组展开状态
  function toggleGroup (groupName: '群聊' | '公众号' | '联系人') {
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
  background-color: #07c160;
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
