<!-- todo:虚拟滚动 -->
<template>
  <div class="wechat-sidebar">
    <!-- 分类列表 -->
    <v-list class="contactList" density="comfortable">
      <!-- 群聊分组 -->
      <v-list-group value="群聊" v-model:opened="openGroups['群聊']">
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-account-group"
            title="群聊"
          >
          </v-list-item>
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
              <v-icon icon="mdi-account-group" color="white"></v-icon>
            </div>
            <div class="contact-name">{{ group.name }}</div>
          </div>
        </v-list-item>
      </v-list-group>

      <!-- 公众号分组 -->
      <v-list-group value="公众号" v-model:opened="openGroups['公众号']">
        <template #activator="{ props }">
          <v-list-item v-bind="props" prepend-icon="mdi-wechat" title="公众号">
          </v-list-item>
        </template>

        <v-list-item
          class="contact-item"
          :class="{ 'active-contact': activeItem === 'officialAccounts' }"
          @click="setActiveItem('officialAccounts')"
        >
        </v-list-item>
      </v-list-group>

      <!-- 联系人分组 -->
      <v-list-group value="联系人" v-model:opened="openGroups['联系人']">
        <template #activator="{ props }">
          <v-list-item v-bind="props" prepend-icon="mdi-account" title="联系人">
          </v-list-item>
        </template>

        <template v-for="(contacts, letter) in groupedContacts" :key="letter">
          <div class="letter-divider">{{ letter }}</div>
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
              <div class="contact-name">{{ contact.name }}</div>
            </div>
          </v-list-item>
        </template>
      </v-list-group>

      <!-- 添加好友 -->
      <v-list-item
        class="contact-item add-friend-item"
        @click="navigateToAddFriend"
      >
        <div class="contact_content">
          <div class="contact-avatar add-friend-avatar">
            <v-icon icon="mdi-account-plus" color="white"></v-icon>
          </div>
          <div class="contact-name">添加好友</div>
        </div>
      </v-list-item>
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import type { ContactListProps } from '@/types/componentProps';

interface Contact {
  id: string;
  name: string;
  initial: string;
}

interface Group {
  id: string;
  name: string;
}

// 响应式状态
const activeItem = ref<string | null>(null);
const openGroups = ref({
  群聊: true,
  公众号: true,
  联系人: true,
});

// 静态群聊数据
const groups: Group[] = [
  { id: "g1", name: "前端开发交流群" },
  { id: "g2", name: "Vue技术讨论组" },
  { id: "g3", name: "全家桶学习小组" },
  { id: "g4", name: "项目协作群" },
  { id: "g5", name: "设计资源分享" },
  { id: "g6", name: "产品经理交流" },
];

// 静态联系人数据
const contacts: Contact[] = [
  { id: "c1", name: "张三", initial: "Z" },
  { id: "c2", name: "李四", initial: "L" },
  { id: "c3", name: "王五", initial: "W" },
  { id: "c4", name: "赵六", initial: "Z" },
  { id: "c5", name: "钱七", initial: "Q" },
  { id: "c6", name: "孙八", initial: "S" },
  { id: "c7", name: "周九", initial: "Z" },
  { id: "c8", name: "吴十", initial: "W" },
  { id: "c9", name: "郑十一", initial: "Z" },
  { id: "c10", name: "王小明", initial: "W" },
  { id: "c11", name: "刘芳", initial: "L" },
  { id: "c12", name: "陈华", initial: "C" },
  { id: "c13", name: "杨帆", initial: "Y" },
  { id: "c14", name: "黄蓉", initial: "H" },
  { id: "c15", name: "欧阳锋", initial: "O" },
];

// 计算属性 - 排序后的群聊
const sortedGroups = computed(() => {
  return [...groups].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
});

// 计算属性 - 排序后的联系人
const sortedContacts = computed(() => {
  return [...contacts].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
});

// 计算属性 - 按首字母分组的联系人
const groupedContacts = computed(() => {
  const groupsMap: Record<string, Contact[]> = {};
  sortedContacts.value.forEach((contact) => {
    const initial = contact.initial;
    if (!groupsMap[initial]) {
      groupsMap[initial] = [];
    }
    groupsMap[initial].push(contact);
  });
  return groupsMap;
});

// 定义 props 和 emits
defineProps<ContactListProps>();

const emit = defineEmits<{
  (e: "itemClick", type: "contact" | "group", data: Contact | Group): void;
}>();

// Router 实例
const router = useRouter();

// 导航到添加好友页面
const navigateToAddFriend = () => {
  router.push('/AddFriend');
};

// 修改 setActiveItem 方法
const setActiveItem = (id: string) => {
  activeItem.value = id;

  // 查找并发射对应数据
  let found = groups.find((g) => g.id === id);
  if (found) {
    emit("itemClick", "group", found);
    return;
  }

  found = contacts.find((c) => c.id === id);
  if (found) {
    emit("itemClick", "contact", found);
    return;
  }

  // 处理公众号点击
  if (id === "officialAccounts") {
    // 可以添加公众号处理逻辑
  }
};

// 切换分组展开状态
const toggleGroup = (groupName: '群聊' | '公众号' | '联系人') => {
  openGroups.value[groupName] = !openGroups.value[groupName];
};
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