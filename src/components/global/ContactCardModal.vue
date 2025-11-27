<template>
  <v-dialog
    v-model="dialog"
    width="400"
    persistent
    transition="dialog-bottom-transition"
  >
    <template v-slot:activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps">
        <!-- 默认激活器插槽 -->
      </slot>
    </template>

    <v-card class="contact-modal-card">
      <v-card-item>
        <div class="contact-header">
          <Avatar
            :url="contactInfo.avatar"
            :name="contactInfo.name"
            :size="60"
            :clickable="false"
            avatar-class="contact-modal-avatar"
          />
          <div class="contact-info">
            <v-card-title>{{ contactInfo.name }}</v-card-title>
            <v-card-subtitle>联系人 ID: {{ contactInfo.id }}</v-card-subtitle>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="closeDialog"
          />
        </div>
      </v-card-item>

      <v-divider></v-divider>

      <v-card-text>
        <div class="contact-details">
          <v-list lines="two" density="compact">
            <v-list-item prepend-icon="mdi-email" title="邮箱">
              <template v-slot:subtitle>
                {{ contactInfo.email || `${contactInfo.name.toLowerCase()}@example.com` }}
              </template>
            </v-list-item>

            <v-list-item prepend-icon="mdi-phone" title="手机">
              <template v-slot:subtitle>
                {{ contactInfo.phone || `+86 138****${contactInfo.id.slice(-4)}` }}
              </template>
            </v-list-item>

            <v-list-item prepend-icon="mdi-account" title="备注">
              <template v-slot:subtitle>
                {{ contactInfo.remark || `${contactInfo.initial || contactInfo.name.charAt(0)} - ${contactInfo.name}` }}
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="contact-actions">
        <v-spacer />
        <v-btn
          color="primary"
          prepend-icon="mdi-message"
          @click="sendMessage"
        >
          发送消息
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Avatar from './Avatar.vue'

defineOptions({
  name: 'ContactCardModal'
})

// ContactInfo 已移至 types/componentProps.ts 中的 BaseContactInfo

import type { ContactCardModalProps, ContactCardModalEmits } from '../../types/componentProps'

const props = withDefaults(defineProps<ContactCardModalProps>(), {
  modelValue: false
})

const emit = defineEmits<ContactCardModalEmits>()

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const closeDialog = () => {
  dialog.value = false
}

const sendMessage = () => {
  emit('send-message', props.contactInfo)
  closeDialog()
}
</script>

<style scoped>
.contact-modal-card {
  border-radius: 12px !important;
}

.contact-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.contact-modal-avatar {
  border-radius: 8px !important;
  background-color: #07c160 !important;
  border: 2px solid rgba(7, 193, 96, 0.2);
}

.contact-info {
  flex: 1;
}

.contact-details {
  margin-top: 8px;
}

.contact-actions {
  padding: 16px;
}
</style>