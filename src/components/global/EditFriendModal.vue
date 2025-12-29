<template>
  <v-dialog
    v-model="dialog"
    persistent
    transition="dialog-bottom-transition"
    width="400"
  >
    <v-card class="edit-friend-modal">
      <v-card-item>
        <v-card-title>编辑好友</v-card-title>
        <v-btn
          class="close-btn"
          icon="mdi-close"
          size="small"
          variant="text"
          @click="closeDialog"
        />
      </v-card-item>

      <v-divider />

      <v-card-text>
        <v-form v-model="formValid">
          <v-text-field
            v-model="editData.remark"
            class="mb-4"
            counter
            density="compact"
            label="备注"
            maxlength="20"
            placeholder="为好友设置备注名称"
            prepend-inner-icon="mdi-account-edit"
            :rules="remarkRules"
            variant="outlined"
          />

          <v-combobox
            v-model="editData.tag"
            chips
            class="mb-4"
            clearable
            counter
            density="compact"
            label="标签"
            maxlength="10"
            placeholder="选择或输入标签"
            prepend-inner-icon="mdi-tag"
            :rules="tagRules"
            variant="outlined"
          >
            <template #chip="{ props: chipProps, item }">
              <v-chip v-bind="chipProps" size="small" />
            </template>
          </v-combobox>

          <v-switch
            v-model="editData.isBlacklist"
            color="error"
            inset
            label="加入黑名单"
            :messages="editData.isBlacklist ? '加入黑名单后将无法接收对方消息' : ''"
            prepend-inner-icon="mdi-block-helper"
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn
          color="error"
          :disabled="saving"
          variant="text"
          @click="confirmDelete"
        >
          删除好友
        </v-btn>
        <v-spacer />
        <v-btn
          :disabled="saving"
          variant="outlined"
          @click="cancelEdit"
        >
          取消
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!formValid || saving"
          :loading="saving"
          variant="elevated"
          @click="saveEdit"
        >
          保存
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="showDeleteConfirm" max-width="400" persistent>
      <v-card>
        <v-card-title class="text-h5">确认删除好友</v-card-title>
        <v-card-text>
          确定要删除好友 <strong>{{ friendName }}</strong> 吗？删除后将无法恢复聊天记录。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="outlined" @click="showDeleteConfirm = false">
            取消
          </v-btn>
          <v-btn color="error" variant="elevated" @click="executeDelete">
            确认删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
  import { computed, reactive, ref, watch } from 'vue'
  import type { EditFriendModalEmits, EditFriendModalProps } from '../../types/global'

  const props = defineProps<EditFriendModalProps>()
  const emit = defineEmits<EditFriendModalEmits>()

  // 状态管理
  const formValid = ref(false)
  const saving = ref(false)
  const showDeleteConfirm = ref(false)

  const editData = reactive({
    remark: '',
    tag: null as string | null,
    isBlacklist: false,
  })

  const originalData = reactive({
    remark: '',
    tag: null as string | null,
    isBlacklist: false,
  })

  // 验证规则
  const remarkRules = [
    (v: string) => !v || v.length <= 20 || '备注不能超过20个字符',
  ]

  const tagRules = [
    (v: string) => !v || v.length <= 10 || '标签不能超过10个字符',
  ]

  // 对话框状态
  const dialog = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
  })

  // 好友名称（用于确认对话框）
  const friendName = computed(() => {
    return props.friend.remark || props.friend.name
  })

  // 监听对话框打开，初始化表单数据
  watch(() => props.modelValue, (isOpen) => {
    if (isOpen && props.friend) {
      initializeForm()
    }
  })

  function initializeForm() {
    originalData.remark = props.friend.remark || ''
    originalData.tag = props.friend.tag || null
    originalData.isBlacklist = props.friend.isBlacklisted || false

    editData.remark = originalData.remark
    editData.tag = originalData.tag
    editData.isBlacklist = originalData.isBlacklist
  }

  function cancelEdit() {
    // 恢复原始数据
    editData.remark = originalData.remark
    editData.tag = originalData.tag
    editData.isBlacklist = originalData.isBlacklist

    // 关闭对话框
    dialog.value = false
    emit('cancel')
  }

  async function saveEdit() {
    if (!formValid.value || !props.friend) return

    saving.value = true

    try {
      emit('save', {
        friendId: props.friend.fid,
        remark: editData.remark,
        tag: editData.tag,
        isBlacklisted: editData.isBlacklist,
      })

      // 关闭对话框
      dialog.value = false
    } finally {
      saving.value = false
    }
  }

  function closeDialog() {
    dialog.value = false
  }

  function confirmDelete() {
    showDeleteConfirm.value = true
  }

  function executeDelete() {
    if (!props.friend) return
    emit('delete', props.friend.fid)
    showDeleteConfirm.value = false
    dialog.value = false
  }
</script>

<style scoped>
.edit-friend-modal {
  border-radius: 12px !important;
}

.close-btn {
  position: absolute;
  top: 0;
  right: 0;
}
</style>
