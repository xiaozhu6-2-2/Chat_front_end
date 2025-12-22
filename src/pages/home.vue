<template>
  <div class="d-flex justify-center align-center flex-column" style="height: 100%;">
      <img
      class="fixed-size-image"
      :class="{ 'animate-wobble': isWobbling }"
      src="@/assets/echatlogo.PNG"
      width="100"
      height="100"
      alt="Logo"
    />
    <!-- From Uiverse.io by arthur_6104 -->
    <div
      class="box-button mt-8"
      :class="{ 'disabled': isAnimating }"
      @click="handleButtonClick"
      :title="showTooltip ? '点击选择好友开始聊天' : ''"
      role="button"
      tabindex="0"
    >
      <div class="button"><span>点点我吧</span></div>
    </div>

  </div>
</template>

<script lang="ts" setup>
import { ref, nextTick } from 'vue'
import { useFriend } from '../composables/useFriend'
import { useChat } from '../composables/useChat'
import { useSnackbar } from '../composables/useSnackbar'
import router from '../router'
import type { FriendWithUserInfo } from '../types/friend'

// 状态管理
const clickCount = ref(0)  // 点击次数
const showTooltip = ref(false)  // 是否显示提示
const isAnimating = ref(false)  // 是否正在播放动画
const isWobbling = ref(false)  // 是否正在播放 wobble 动画
const { activeFriends } = useFriend()
const { selectChat } = useChat()
// 点击处理逻辑
async function handleButtonClick() {
  // 防止动画过程中的重复点击
  if (isAnimating.value) return

  clickCount.value++

  // 每次点击都播放动画
  await animateLogo()

  if (clickCount.value === 1) {
    // 第一次点击：显示提示
    showTooltip.value = true
    useSnackbar().showInfo('不知道该和谁聊天吗？点击我，我来帮你挑个朋友开始聊天吧')
  } else if (clickCount.value === 2) {
    // 第二次点击：检查好友情况并执行相应操作
    const friends = activeFriends

    if (friends.length === 0) {
      // 没有好友的情况
      useSnackbar().showInfo('没有好友的话就去加好友吧')
      // 保持 clickCount 为 2，准备处理第三次点击
    } else {
      // 有好友：随机选择一个并开始聊天
      const randomFriend = friends[Math.floor(Math.random() * friends.length)]
      await startChatWithFriend(randomFriend)
    }
  } else if (clickCount.value === 3) {
    // 第三次点击（无好友时）：跳转到添加好友页面
    router.push('/AddFriend')
    resetState()
  }
}

// Logo 动画函数
async function animateLogo() {
  isAnimating.value = true

  // 先重置动画
  isWobbling.value = false
  await nextTick()

  // 触发动画
  setTimeout(() => {
    isWobbling.value = true
  }, 50)

  // 等待动画完成
  await new Promise(resolve => setTimeout(resolve, 1050))

  // 清除动画类
  isWobbling.value = false
  isAnimating.value = false
}

// 与好友开始聊天
async function startChatWithFriend(friend: FriendWithUserInfo) {
  try {
    // 创建聊天会话
    const chat = await useChat().createChat(friend.id, 'private')
    // 设置为当前活跃聊天
    selectChat(chat.id)
    // 跳转到聊天页面
    await router.push('/chat')
    // 重置状态
    resetState()
  } catch (error) {
    useSnackbar().showError('创建聊天失败，请重试')
  }
}

// 重置所有状态
function resetState() {
  clickCount.value = 0
  showTooltip.value = false
}
</script>

<style>
/* Wobble 动画 - 模仿 animate.css - 不使用 scoped */
@keyframes wobble {
  0% {
    transform: translateX(0%);
  }
  15% {
    transform: translateX(-25%) rotate(-5deg);
  }
  30% {
    transform: translateX(20%) rotate(3deg);
  }
  45% {
    transform: translateX(-15%) rotate(-3deg);
  }
  60% {
    transform: translateX(10%) rotate(2deg);
  }
  75% {
    transform: translateX(-5%) rotate(-1deg);
  }
  100% {
    transform: translateX(0%);
  }
}


/* Logo 样式 - 全局 */
.fixed-size-image {
  flex: none !important; /* 防止图片在flex容器中拉伸 */
  object-fit: contain;
}

/* Wobble 动画类 */
.fixed-size-image.animate-wobble {
  animation: wobble 1s ease-in-out !important;
  animation-fill-mode: both !important;
}

/* 按钮脉冲动画以吸引注意 */
@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 .5em 1em -0.2em rgba(var(--secondary), .5);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 .5em 1.5em -0.2em rgba(var(--secondary), .7);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 .5em 1em -0.2em rgba(var(--secondary), .5);
  }
}

.btn-class-name:not(:disabled):hover {
  animation: pulse 1.5s ease-in-out infinite;
}

/* From Uiverse.io by arthur_6104 */
.box-button {
  cursor: pointer;
  border: 4px solid black;
  background-color: gray;
  padding-bottom: 10px;
  transition: 0.1s ease-in-out;
  user-select: none;
  position: relative;
}

.box-button.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.button {
  background-color: #dddddd;
  border: 4px solid #fff;
  padding: 3px 8px;
}

.button span {
  font-size: 1.2em;
  letter-spacing: 1px;
  color: black;
}

.box-button:not(.disabled):active {
  padding: 0;
  margin-bottom: 10px;
  transform: translateY(10px);
}

/* 按钮悬停效果 */
.box-button:not(.disabled):hover {
  background-color: #888;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}
</style>

<style scoped>
/* 其他需要 scoped 的样式可以放在这里 */
</style>
