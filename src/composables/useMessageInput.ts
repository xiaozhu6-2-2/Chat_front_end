import { nextTick, ref } from 'vue'

export function useMessageInput () {
  const message = ref('')
  const showEmojiPicker = ref(false)
  const messagesContainer = ref<HTMLElement | null>(null)

  const emojis = ['😀', '😂', '😍', '👍', '👏', '🙏', '❤️', '🎉', '🤔', '🤗']

  const insertEmoji = (emoji: string) => {
    message.value += emoji
  }

  const toggleEmojiPicker = () => {
    showEmojiPicker.value = !showEmojiPicker.value
  }

  const clearInput = () => {
    message.value = ''
    showEmojiPicker.value = false
  }

  const scrollToBottom = () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  }

  const handleEnterKey = (event: KeyboardEvent, callback?: () => void) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      callback?.()
    }
  }

  return {
    // State
    message,
    showEmojiPicker,
    messagesContainer,
    emojis,

    // Actions
    insertEmoji,
    toggleEmojiPicker,
    clearInput,
    scrollToBottom,
    handleEnterKey,
  }
}
