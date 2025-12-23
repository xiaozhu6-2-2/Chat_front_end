import { nextTick, ref } from 'vue'

export function useMessageInput () {
  const inputMessage = ref('')
  const showEmojiPicker = ref(false)
  const messagesContainer = ref<HTMLElement | null>(null)

  const emojis = ['😀', '😂', '😍', '👍', '👏', '🙏', '❤️', '🎉', '🤔', '🤗']

  const insertEmoji = (emoji: string) => {
    inputMessage.value += emoji
  }

  const toggleEmojiPicker = () => {
    showEmojiPicker.value = !showEmojiPicker.value
  }

  const clearInput = () => {
    inputMessage.value = ''
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
    inputMessage,
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
