<template>
  <v-dialog v-model="dialogVisible" scrollable transition="dialog-bottom-transition" max-width="600px">
    <v-card>
      <v-toolbar>
        <v-toolbar-title>聊天设置</v-toolbar-title>
        <v-btn icon @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-4">
        <v-list nav>
          <v-list-item v-for="item in settingItems" :key="item.key" @click="handleItemClick()">
            <template #prepend>
              <v-icon>{{ item.icon }}</v-icon>
            </template>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
            <v-list-item-subtitle>{{ item.subtitle }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const dialogVisible = defineModel<boolean>("modelValue", { default: false });
const settingItems = [
  {
    key: "theme",
    title: "主题设置",
    subtitle: "切换明暗主题",
    icon: "mdi-palette",
  },
  {
    key: "notifications",
    title: "通知设置",
    subtitle: "管理消息通知",
    icon: "mdi-bell",
  },
  {
    key: "privacy",
    title: "隐私设置",
    subtitle: "隐私保护选项",
    icon: "mdi-shield-account",
  },
];
const closeDialog = () => {
  dialogVisible.value = false;
};

const handleItemClick = () => {
  closeDialog();
};
</script>