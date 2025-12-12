<!-- From Uiverse.io by 0xnihilism -->
<template>
    <div class="input__container">
        <div class="shadow__input"></div>
        <!-- 工具栏 -->
        <div class="toolbar">
            <v-btn icon variant="text" @click="toggleEmojiPicker" color="#000000">
                <v-icon>mdi-emoticon-outline</v-icon>
            </v-btn>
            <v-btn icon variant="text" @click="handleFileUpload" color="#000000">
                <v-icon>mdi-image-outline</v-icon>
            </v-btn>
            <v-btn icon variant="text" @click="handleFileUpload" color="#000000">
                <v-icon>mdi-file-outline</v-icon>
            </v-btn>
            <v-btn icon variant="text" @click="handleVoiceRecord" color="#000000">
                <v-icon>mdi-microphone</v-icon>
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn icon variant="text">
                <v-icon>mdi-dots-horizontal</v-icon>
            </v-btn>
        </div>
        <input type="text" name="chat_input" class="chat_input" placeholder="请输入消息" :value="modelValue"
            @input="$emit('update:modelValue', $event.target.value)"
            @keydown.enter.exact.prevent="$emit('keydown.enter.exact.prevent', $event)" />

        <!-- 发送按钮 -->
        <div class="send-button-container">
            <v-btn class="input__button__shadow" color="primary" variant="flat" :loading="isSending" @click="handleSendMessage">
                发送
            </v-btn>
        </div>
    </div>
</template>

<script setup>
defineProps({
    modelValue: {
        type: String,
        default: ''
    }
})

defineEmits(['update:modelValue', 'keydown.enter.exact.prevent'])
</script>

<style>
/* From Uiverse.io by 0xnihilism */
.input__container {
    position: relative;
    background: #f0f0f0;
    padding-left: 30px;
    padding-right: 30px;
    padding-top: 20px;
    padding-bottom: 20px;
    margin-right: 20px;
    margin-bottom: 30px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    /* align-items: flex-start; */
    gap: 15px;
    border: 4px solid #000;
    transition: all 400ms cubic-bezier(0.23, 1, 0.32, 1);
    transform-style: preserve-3d;
    perspective: 1000px;
    box-shadow: 10px 10px 0 #000;
}

.input__container:hover {
    transform: rotateX(5deg) rotateY(1 deg) scale(1.05);
    box-shadow: 25px 25px 0 -5px #1976d2, 25px 25px 0 0 #000;
}

.shadow__input {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    bottom: 0;
    z-index: -1;
    transform: translateZ(-50px);
    background: linear-gradient(45deg,
            rgba(255, 107, 107, 0.4) 0%,
            rgba(255, 107, 107, 0.1) 100%);
    filter: blur(20px);
}

.toolbar {
    display: flex;
    padding: 5px 0;
}

.input__button__shadow {
    cursor: pointer;
    border: 3px solid #000;
    background: #1976d2;
    transition: all 400ms cubic-bezier(0.23, 1, 0.32, 1);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    transform: translateZ(20px);
    position: relative;
    z-index: 3;
    font-weight: bold;
    text-transform: uppercase;
}

.input__button__shadow:hover
.input__button__shadow:focus {
    background: #1976d2;
    transform: translateZ(10px) translateX(-5px) translateY(-5px);
    box-shadow: 5px 5px 0 0 #000;
}

.input__button__shadow svg {
    fill: #000;
    width: 25px;
    height: 25px;
}

.chat_input {
    width: 100%;
    outline: none;
    border: 3px solid #000;
    padding: 15px;
    font-size: 18px;
    background: #fff;
    color: #000;
    transform: translateZ(10px);
    transition: all 400ms cubic-bezier(0.23, 1, 0.32, 1);
    position: relative;
    z-index: 3;
    font-family: "Roboto", Arial, sans-serif;
    letter-spacing: -0.5px;
}

.chat_input::placeholder {
    color: #666;
    font-weight: bold;
}

.chat_input:hover,
.chat_input:focus {
    background: #f0f0f0;
    transform: translateZ(20px) translateX(-5px) translateY(-5px);
    box-shadow: 5px 5px 0 0 #000;
}
.send-button-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 5px;
}
</style>