<!-- components/GroupCard.vue -->
<template>
  <div class="group-card">
    <v-card class="mx-auto" max-width="400">
      <v-card-item>
        <div class="group-header">
          <div class="group-avatar-large">
            <v-icon color="white" icon="mdi-account-group" size="28" />
          </div>
          <div class="group-info">
            <v-card-title>{{ group.name }}</v-card-title>
            <v-card-subtitle>群聊 ID: {{ group.id }}</v-card-subtitle>
          </div>
        </div>
      </v-card-item>

      <v-card-text>
        <div class="group-details">
          <v-list lines="two">
            <v-list-item prepend-icon="mdi-account-group" title="群成员">
              <template #subtitle>
                12 名成员
              </template>
            </v-list-item>

            <v-list-item prepend-icon="mdi-calendar" title="创建时间">
              <template #subtitle>
                2024年1月创建
              </template>
            </v-list-item>

            <v-list-item prepend-icon="mdi-information" title="群公告">
              <template #subtitle>
                欢迎加入{{ group.name }}，请遵守群规
              </template>
            </v-list-item>
          </v-list>
        </div>

        <div class="group-members">
          <h4>群成员</h4>
          <div class="member-list">
            <div v-for="n in 6" :key="n" class="member-item">
              <div class="member-avatar">
                {{ String.fromCharCode(65 + n) }}
              </div>
              <span class="member-name">用户{{ n }}</span>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-btn color="primary" prepend-icon="mdi-message">
          进入群聊
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

  <script setup lang="ts">
import type { GroupCardProps } from '../../types/group'

  defineProps<GroupCardProps>()
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

  .group-avatar-large {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    background-color: #07c160;
    display: flex;
    align-items: center;
    justify-content: center;
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
