<!-- components/ContactCard.vue -->
<template>
    <div class="contact-card">
      <v-card class="mx-auto" max-width="400">
        <v-card-item>
          <div class="contact-header">
            <div class="avatar-large">
              {{ contact.name.charAt(0) }}
            </div>
            <div class="contact-info">
              <v-card-title>{{ contact.name }}</v-card-title>
              <v-card-subtitle>联系人 ID: {{ contact.id }}</v-card-subtitle>
            </div>
          </div>
        </v-card-item>
  
        <v-card-text>
          <div class="contact-details">
            <v-list lines="two">
              <v-list-item prepend-icon="mdi-email" title="邮箱">
                <template v-slot:subtitle>
                  {{ contact.name.toLowerCase() }}@example.com
                </template>
              </v-list-item>
              
              <v-list-item prepend-icon="mdi-phone" title="手机">
                <template v-slot:subtitle>
                  +86 138****{{ contact.id.slice(-4) }}
                </template>
              </v-list-item>
              
              <v-list-item prepend-icon="mdi-account" title="备注">
                <template v-slot:subtitle>
                  {{ contact.initial }} - {{ contact.name }}
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
  
        <v-card-actions>
          <v-btn color="primary" prepend-icon="mdi-message">
            发送消息
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </template>
  
  <script setup lang="ts">
import type { ContactCardProps } from '../../types/componentProps'

  defineProps<ContactCardProps>()
  </script>
  
  <style scoped>
  .contact-card {
    padding: 20px;
  }
  
  .contact-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .avatar-large {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    background-color: #07c160;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
    font-weight: bold;
  }
  
  .contact-info {
    flex: 1;
  }
  
  .contact-details {
    margin-top: 16px;
  }
  </style>