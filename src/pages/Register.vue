<template>
  <!-- 主容器，使用全屏高度 -->
  <v-container class="fill-height container" fluid>
    <!-- 行布局，垂直和水平居中 -->
    <v-row align-content="center" class="fill-height" justify="center">
      <!-- 注册卡片容器 -->
      <v-col cols="12" lg="8" md="10" xl="6">
        <v-card class="elevation-24 rounded-lg overflow-hidden card">
          <v-row class="fill-height" no-gutters>
            <!-- 左侧文本信息区域 -->
            <v-col
              class="pa-8 d-flex flex-column justify-center text-white"
              cols="12"
              md="6"
            >
              <!-- 品牌信息 -->
              <BrandInfo />

              <!-- 特色功能列表 -->
              <FeatureList class="mt-8" />
            </v-col>

            <!-- 右侧注册表单区域 -->
            <v-col
              class="pa-8 d-flex flex-column justify-center"
              cols="12"
              md="6"
            >
              <!-- 步骤 1: 邮箱输入 -->
              <div v-if="currentStep === 1" class="step-content">
                <div class="text-center mb-8">
                  <h2 class="text-h5 font-weight-bold text-white">
                    创建新账户
                  </h2>
                  <p class="text-body-2 text-grey">
                    使用邮箱开始您的注册流程
                  </p>
                </div>

                <v-form @submit.prevent="step1Click">
                  <v-text-field
                    v-model="registerForm.email"
                    autofocus
                    class="mb-4"
                    color="primary"
                    label="邮箱地址"
                    prepend-inner-icon="mdi-email"
                    required
                    :rules="emailRules"
                    variant="outlined"
                  />

                  <div class="d-flex justify-end">
                    <v-btn
                      color="primary"
                      :loading="loading"
                      size="large"
                      type="submit"
                    >
                      下一步
                      <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                  </div>
                </v-form>
              </div>

              <!-- 步骤 2: 密码设置 -->
              <div v-if="currentStep === 2" class="step-content">
                <div class="text-center mb-8">
                  <h2 class="text-h5 font-weight-bold text-white">
                    设置密码
                  </h2>
                  <p class="text-body-2 text-grey">
                    请设置一个安全的密码
                  </p>
                </div>

                <v-form @submit.prevent="step2Click">
                  <v-text-field
                    v-model="registerForm.password"
                    :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    autofocus
                    class="mb-4"
                    color="primary"
                    label="密码"
                    prepend-inner-icon="mdi-lock"
                    required
                    :rules="passwordRules"
                    :type="showPassword ? 'text' : 'password'"
                    variant="outlined"
                    @click:append-inner="showPassword = !showPassword"
                  />

                  <v-text-field
                    v-model="registerForm.confirmPassword"
                    :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    class="mb-6"
                    color="primary"
                    label="确认密码"
                    prepend-inner-icon="mdi-lock-check"
                    required
                    :rules="confirmPasswordRules"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    variant="outlined"
                    @click:append-inner="showConfirmPassword = !showConfirmPassword"
                  />

                  <div class="d-flex justify-space-between">
                    <v-btn
                      color="grey"
                      size="large"
                      variant="outlined"
                      @click="goBack"
                    >
                      <v-icon start>mdi-arrow-left</v-icon>
                      上一步
                    </v-btn>
                    <v-btn
                      color="primary"
                      :loading="loading"
                      size="large"
                      type="submit"
                    >
                      下一步
                      <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                  </div>
                </v-form>
              </div>

              <!-- 步骤 3: 用户名和头像 -->
              <div v-if="currentStep === 3" class="step-content">
                <div class="text-center mb-8">
                  <h2 class="text-h5 font-weight-bold text-white">
                    设置用户名和头像
                  </h2>
                  <p class="text-body-2 text-grey">
                    创建您的个人身份标识
                  </p>
                </div>

                <v-form @submit.prevent="step3Click">
                  <!-- 头像预览区域 -->
                  <div class="avatar-upload-area mb-6">
                    <div class="avatar-preview-section mb-4">
                      <!-- 隐藏的文件输入框 -->
                      <input
                        ref="avatarInput"
                        accept="image/*"
                        style="display: none"
                        type="file"
                        @change="handleAvatarInputChange"
                      >

                      <!-- 可点击的预览区域 -->
                      <div
                        class="avatar-clickable-area"
                        @click="triggerAvatarInput"
                      >
                        <v-avatar class="avatar-preview" size="120">
                          <Avatar
                            v-if="registerForm.avatarPreview"
                            :name="registerForm.username || '预览'"
                            size="120"
                            :url="registerForm.avatarPreview"
                          />
                          <div v-else class="d-flex flex-column align-center justify-center h-100">
                            <v-icon class="mb-2" color="grey-lighten-1" size="60">
                              mdi-camera-plus
                            </v-icon>
                          </div>
                        </v-avatar>

                        <!-- 上传中指示器 -->
                        <div v-if="avatarUploading" class="upload-indicator">
                          <v-progress-circular
                            color="white"
                            indeterminate
                            size="24"
                            width="2"
                          />
                        </div>
                      </div>

                      <v-btn
                        v-if="registerForm.avatarPreview && !avatarUploading"
                        class="mt-2"
                        color="error"
                        size="small"
                        variant="text"
                        @click="clearAvatar"
                      >
                        移除头像
                      </v-btn>
                    </div>

                    <!-- 显示文件信息的文本区域（只读） -->
                    <div v-if="registerForm.avatar" class="file-info mb-4">
                      <v-chip
                        color="primary"
                        prepend-icon="mdi-image"
                        size="small"
                        variant="outlined"
                      >
                        {{ registerForm.avatar.name }}
                        <v-tooltip activator="parent" location="top">
                          大小: {{ formatFileSize(registerForm.avatar.size) }}
                        </v-tooltip>
                      </v-chip>
                    </div>
                  </div>

                  <v-text-field
                    v-model="registerForm.username"
                    autofocus
                    class="mb-6"
                    color="primary"
                    label="用户名"
                    prepend-inner-icon="mdi-account"
                    required
                    :rules="usernameRules"
                    variant="outlined"
                  />

                  <div class="d-flex justify-space-between">
                    <v-btn
                      color="grey"
                      size="large"
                      variant="outlined"
                      @click="goBack"
                    >
                      <v-icon start>mdi-arrow-left</v-icon>
                      上一步
                    </v-btn>
                    <v-btn
                      color="primary"
                      :loading="loading"
                      size="large"
                      type="submit"
                    >
                      下一步
                      <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                  </div>
                </v-form>
              </div>

              <!-- 步骤 4: 完善信息 -->
              <div v-if="currentStep === 4" class="step-content">
                <div class="text-center mb-8">
                  <h2 class="text-h5 font-weight-bold text-white">
                    完善个人信息
                  </h2>
                  <p class="text-body-2 text-grey">
                    帮助其他用户更好地了解您
                  </p>
                </div>

                <v-form @submit.prevent="step4Click">
                  <v-select
                    v-model="registerForm.gender"
                    class="mb-4"
                    clearable
                    color="primary"
                    :items="genderOptions"
                    label="性别"
                    prepend-inner-icon="mdi-gender-male-female"
                    variant="outlined"
                  />

                  <!-- 省份选择 -->
                  <v-autocomplete
                    v-model="selectedProvince"
                    class="mb-4"
                    clearable
                    color="primary"
                    :items="provinceCityData"
                    item-title="value"
                    item-value="value"
                    label="省份"
                    prepend-inner-icon="mdi-map-marker"
                    variant="outlined"
                    no-data-text="暂无数据"
                  />

                  <!-- 城市选择 -->
                  <v-autocomplete
                    v-model="registerForm.region"
                    class="mb-4"
                    clearable
                    color="primary"
                    :disabled="!selectedProvince"
                    :items="cityOptions"
                    item-title="title"
                    item-value="value"
                    label="城市"
                    :placeholder="!selectedProvince ? '请先选择省份' : ''"
                    prepend-inner-icon="mdi-city"
                    variant="outlined"
                    :no-data-text="selectedProvince ? '该省份暂无城市数据' : '请先选择省份'"
                  />

                  <v-textarea
                    v-model="registerForm.bio"
                    class="mb-6"
                    color="primary"
                    label="个人简介"
                    no-resize
                    placeholder="简单介绍一下自己..."
                    prepend-inner-icon="mdi-text"
                    rows="3"
                    variant="outlined"
                  />

                  <div class="d-flex justify-space-between">
                    <v-btn
                      color="grey"
                      size="large"
                      variant="outlined"
                      @click="goBack"
                    >
                      <v-icon start>mdi-arrow-left</v-icon>
                      上一步
                    </v-btn>
                    <v-btn
                      color="primary"
                      :loading="loading"
                      size="large"
                      type="submit"
                    >
                      完成注册
                      <v-icon end>mdi-check</v-icon>
                    </v-btn>
                  </div>
                </v-form>
              </div>

              <!-- 步骤 5: 注册成功 -->
              <div v-if="currentStep === 5" class="step-content text-center">
                <div class="mb-8">
                  <v-icon class="mb-4" color="success" size="80">
                    mdi-check-circle
                  </v-icon>
                  <h2 class="text-h5 font-weight-bold text-white mb-4">
                    注册成功！
                  </h2>
                  <div class="d-flex align-center justify-center">
                    <v-avatar
                      class="mr-3"
                      :color="registerForm.avatarPreview ? 'transparent' : 'primary'"
                      :size="40"
                    >
                      <Avatar
                        v-if="registerForm.avatarPreview"
                        :name="registerForm.username"
                        :size="40"
                        :url="registerForm.avatarPreview"
                      />
                      <v-icon
                        v-else
                        color="white"
                        size="24"
                      >
                        mdi-account
                      </v-icon>
                    </v-avatar>
                    <p class="text-h6 text-primary font-weight-medium mb-0">
                      {{ registerForm.username }}
                    </p>
                  </div>
                </div>

                <v-btn
                  class="px-8"
                  color="primary"
                  size="large"
                  @click="goToLogin"
                >
                  开始聊天
                  <v-icon end>mdi-message</v-icon>
                </v-btn>
              </div>

              <!-- 步骤指示器 -->
              <div class="mt-8 step-map">
                <v-stepper v-model="currentStep" alt-labels class="transparent-stepper">
                  <v-stepper-header>
                    <v-stepper-item
                      :complete="currentStep > 1"
                      icon="mdi-email"
                      :value="1"
                    />

                    <v-divider />

                    <v-stepper-item
                      :complete="currentStep > 2"
                      icon="mdi-lock"
                      :value="2"
                    />

                    <v-divider />

                    <v-stepper-item
                      :complete="currentStep > 3"
                      icon="mdi-account"
                      :value="3"
                    />

                    <v-divider />

                    <v-stepper-item
                      :complete="currentStep > 4"
                      icon="mdi-information"
                      :value="4"
                    />

                    <v-divider />

                    <v-stepper-item
                      icon="mdi-check"
                      :value="5"
                    />
                  </v-stepper-header>
                </v-stepper>
              </div>

            </v-col>
          </v-row>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

</template>

<route lang="yaml">
meta:
  layout: auth
</route>

<script setup lang="ts">
  import { computed, reactive, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuth } from '@/composables/useAuth'
  import { useFile } from '@/composables/useFile'
  import { useSnackbar } from '@/composables/useSnackbar'
  import { userService } from '@/service/userService'

  const router = useRouter()
  const { showError, showSuccess, showInfo } = useSnackbar()
  const { register, isLoading } = useAuth()
  const { uploadFileWithTempToken, formatFileSize } = useFile()

  // 表单数据
  const registerForm = reactive({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    gender: '',
    region: '',
    // 简介
    bio: '',
    // 头像相关
    avatar: null as File | null, // File object
    avatarPreview: '', // Blob URL for preview
  })

  // 状态管理
  const currentStep = ref(1)
  const loading = ref(false)
  const showPassword = ref(false)
  const showConfirmPassword = ref(false)

  // 头像相关状态
  const avatarError = ref('')
  const avatarInput = ref<HTMLInputElement | null>(null)
  const avatarUploading = ref(false)
  const avatarUploadProgress = ref(0)
  const uploadedAvatarFileId = ref('') // 存储已上传头像的file_id

  // 性别选项
  const genderOptions = [
    { title: '男', value: 'male' },
    { title: '女', value: 'female' },
    { title: '其他', value: 'other' },
  ]

  // 选中的省份（用于二级联动）
  const selectedProvince = ref<string>('')

  // 城市选项（根据选中省份动态计算）
  const cityOptions = computed(() => {
    if (!selectedProvince.value) return []
    const province = provinceCityData.find(p => p.value === selectedProvince.value)
    return province?.children || []
  })

  // 监听省份变化，清空城市选择
  watch(selectedProvince, () => {
    registerForm.region = ''
  })

  // 省市二级联动数据
  const provinceCityData = [
    { value: '北京', children: [{ title: '北京市', value: '北京' }] },
    { value: '天津', children: [{ title: '天津市', value: '天津' }] },
    { value: '上海', children: [{ title: '上海市', value: '上海' }] },
    { value: '重庆', children: [{ title: '重庆市', value: '重庆' }] },
    {
      value: '河北',
      children: [
        { title: '石家庄', value: '石家庄' },
        { title: '唐山', value: '唐山' },
        { title: '秦皇岛', value: '秦皇岛' },
        { title: '邯郸', value: '邯郸' },
        { title: '邢台', value: '邢台' },
        { title: '保定', value: '保定' },
        { title: '张家口', value: '张家口' },
        { title: '承德', value: '承德' },
        { title: '沧州', value: '沧州' },
        { title: '廊坊', value: '廊坊' },
        { title: '衡水', value: '衡水' },
      ],
    },
    {
      value: '山西',
      children: [
        { title: '太原', value: '太原' },
        { title: '大同', value: '大同' },
        { title: '阳泉', value: '阳泉' },
        { title: '长治', value: '长治' },
        { title: '晋城', value: '晋城' },
        { title: '朔州', value: '朔州' },
        { title: '晋中', value: '晋中' },
        { title: '运城', value: '运城' },
        { title: '忻州', value: '忻州' },
        { title: '临汾', value: '临汾' },
        { title: '吕梁', value: '吕梁' },
      ],
    },
    {
      value: '内蒙古',
      children: [
        { title: '呼和浩特', value: '呼和浩特' },
        { title: '包头', value: '包头' },
        { title: '乌海', value: '乌海' },
        { title: '赤峰', value: '赤峰' },
        { title: '通辽', value: '通辽' },
        { title: '鄂尔多斯', value: '鄂尔多斯' },
        { title: '呼伦贝尔', value: '呼伦贝尔' },
        { title: '巴彦淖尔', value: '巴彦淖尔' },
        { title: '乌兰察布', value: '乌兰察布' },
        { title: '兴安', value: '兴安' },
        { title: '锡林郭勒', value: '锡林郭勒' },
        { title: '阿拉善', value: '阿拉善' },
      ],
    },
    {
      value: '辽宁',
      children: [
        { title: '沈阳', value: '沈阳' },
        { title: '大连', value: '大连' },
        { title: '鞍山', value: '鞍山' },
        { title: '抚顺', value: '抚顺' },
        { title: '本溪', value: '本溪' },
        { title: '丹东', value: '丹东' },
        { title: '锦州', value: '锦州' },
        { title: '营口', value: '营口' },
        { title: '阜新', value: '阜新' },
        { title: '辽阳', value: '辽阳' },
        { title: '盘锦', value: '盘锦' },
        { title: '铁岭', value: '铁岭' },
        { title: '朝阳', value: '朝阳' },
        { title: '葫芦岛', value: '葫芦岛' },
      ],
    },
    {
      value: '吉林',
      children: [
        { title: '长春', value: '长春' },
        { title: '吉林', value: '吉林' },
        { title: '四平', value: '四平' },
        { title: '辽源', value: '辽源' },
        { title: '通化', value: '通化' },
        { title: '白山', value: '白山' },
        { title: '松原', value: '松原' },
        { title: '白城', value: '白城' },
        { title: '延边', value: '延边' },
      ],
    },
    {
      value: '黑龙江',
      children: [
        { title: '哈尔滨', value: '哈尔滨' },
        { title: '齐齐哈尔', value: '齐齐哈尔' },
        { title: '鸡西', value: '鸡西' },
        { title: '鹤岗', value: '鹤岗' },
        { title: '双鸭山', value: '双鸭山' },
        { title: '大庆', value: '大庆' },
        { title: '伊春', value: '伊春' },
        { title: '佳木斯', value: '佳木斯' },
        { title: '七台河', value: '七台河' },
        { title: '牡丹江', value: '牡丹江' },
        { title: '黑河', value: '黑河' },
        { title: '绥化', value: '绥化' },
        { title: '大兴安岭', value: '大兴安岭' },
      ],
    },
    {
      value: '江苏',
      children: [
        { title: '南京', value: '南京' },
        { title: '无锡', value: '无锡' },
        { title: '徐州', value: '徐州' },
        { title: '常州', value: '常州' },
        { title: '苏州', value: '苏州' },
        { title: '南通', value: '南通' },
        { title: '连云港', value: '连云港' },
        { title: '淮安', value: '淮安' },
        { title: '盐城', value: '盐城' },
        { title: '扬州', value: '扬州' },
        { title: '镇江', value: '镇江' },
        { title: '泰州', value: '泰州' },
        { title: '宿迁', value: '宿迁' },
      ],
    },
    {
      value: '浙江',
      children: [
        { title: '杭州', value: '杭州' },
        { title: '宁波', value: '宁波' },
        { title: '温州', value: '温州' },
        { title: '嘉兴', value: '嘉兴' },
        { title: '湖州', value: '湖州' },
        { title: '绍兴', value: '绍兴' },
        { title: '金华', value: '金华' },
        { title: '衢州', value: '衢州' },
        { title: '舟山', value: '舟山' },
        { title: '台州', value: '台州' },
        { title: '丽水', value: '丽水' },
      ],
    },
    {
      value: '安徽',
      children: [
        { title: '合肥', value: '合肥' },
        { title: '芜湖', value: '芜湖' },
        { title: '蚌埠', value: '蚌埠' },
        { title: '淮南', value: '淮南' },
        { title: '马鞍山', value: '马鞍山' },
        { title: '淮北', value: '淮北' },
        { title: '铜陵', value: '铜陵' },
        { title: '安庆', value: '安庆' },
        { title: '黄山', value: '黄山' },
        { title: '滁州', value: '滁州' },
        { title: '阜阳', value: '阜阳' },
        { title: '宿州', value: '宿州' },
        { title: '六安', value: '六安' },
        { title: '亳州', value: '亳州' },
        { title: '池州', value: '池州' },
        { title: '宣城', value: '宣城' },
      ],
    },
    {
      value: '福建',
      children: [
        { title: '福州', value: '福州' },
        { title: '厦门', value: '厦门' },
        { title: '莆田', value: '莆田' },
        { title: '三明', value: '三明' },
        { title: '泉州', value: '泉州' },
        { title: '漳州', value: '漳州' },
        { title: '南平', value: '南平' },
        { title: '龙岩', value: '龙岩' },
        { title: '宁德', value: '宁德' },
      ],
    },
    {
      value: '江西',
      children: [
        { title: '南昌', value: '南昌' },
        { title: '景德镇', value: '景德镇' },
        { title: '萍乡', value: '萍乡' },
        { title: '九江', value: '九江' },
        { title: '新余', value: '新余' },
        { title: '鹰潭', value: '鹰潭' },
        { title: '赣州', value: '赣州' },
        { title: '吉安', value: '吉安' },
        { title: '宜春', value: '宜春' },
        { title: '抚州', value: '抚州' },
        { title: '上饶', value: '上饶' },
      ],
    },
    {
      value: '山东',
      children: [
        { title: '济南', value: '济南' },
        { title: '青岛', value: '青岛' },
        { title: '淄博', value: '淄博' },
        { title: '枣庄', value: '枣庄' },
        { title: '东营', value: '东营' },
        { title: '烟台', value: '烟台' },
        { title: '潍坊', value: '潍坊' },
        { title: '济宁', value: '济宁' },
        { title: '泰安', value: '泰安' },
        { title: '威海', value: '威海' },
        { title: '日照', value: '日照' },
        { title: '临沂', value: '临沂' },
        { title: '德州', value: '德州' },
        { title: '聊城', value: '聊城' },
        { title: '滨州', value: '滨州' },
        { title: '菏泽', value: '菏泽' },
      ],
    },
    {
      value: '河南',
      children: [
        { title: '郑州', value: '郑州' },
        { title: '开封', value: '开封' },
        { title: '洛阳', value: '洛阳' },
        { title: '平顶山', value: '平顶山' },
        { title: '安阳', value: '安阳' },
        { title: '鹤壁', value: '鹤壁' },
        { title: '新乡', value: '新乡' },
        { title: '焦作', value: '焦作' },
        { title: '濮阳', value: '濮阳' },
        { title: '许昌', value: '许昌' },
        { title: '漯河', value: '漯河' },
        { title: '三门峡', value: '三门峡' },
        { title: '南阳', value: '南阳' },
        { title: '商丘', value: '商丘' },
        { title: '信阳', value: '信阳' },
        { title: '周口', value: '周口' },
        { title: '驻马店', value: '驻马店' },
        { title: '济源', value: '济源' },
      ],
    },
    {
      value: '湖北',
      children: [
        { title: '武汉', value: '武汉' },
        { title: '黄石', value: '黄石' },
        { title: '十堰', value: '十堰' },
        { title: '宜昌', value: '宜昌' },
        { title: '襄阳', value: '襄阳' },
        { title: '鄂州', value: '鄂州' },
        { title: '荆门', value: '荆门' },
        { title: '孝感', value: '孝感' },
        { title: '荆州', value: '荆州' },
        { title: '黄冈', value: '黄冈' },
        { title: '咸宁', value: '咸宁' },
        { title: '随州', value: '随州' },
        { title: '恩施', value: '恩施' },
        { title: '仙桃', value: '仙桃' },
        { title: '潜江', value: '潜江' },
        { title: '天门', value: '天门' },
        { title: '神农架', value: '神农架' },
      ],
    },
    {
      value: '湖南',
      children: [
        { title: '长沙', value: '长沙' },
        { title: '株洲', value: '株洲' },
        { title: '湘潭', value: '湘潭' },
        { title: '衡阳', value: '衡阳' },
        { title: '邵阳', value: '邵阳' },
        { title: '岳阳', value: '岳阳' },
        { title: '常德', value: '常德' },
        { title: '张家界', value: '张家界' },
        { title: '益阳', value: '益阳' },
        { title: '郴州', value: '郴州' },
        { title: '永州', value: '永州' },
        { title: '怀化', value: '怀化' },
        { title: '娄底', value: '娄底' },
        { title: '湘西', value: '湘西' },
      ],
    },
    {
      value: '广东',
      children: [
        { title: '广州', value: '广州' },
        { title: '韶关', value: '韶关' },
        { title: '深圳', value: '深圳' },
        { title: '珠海', value: '珠海' },
        { title: '汕头', value: '汕头' },
        { title: '佛山', value: '佛山' },
        { title: '江门', value: '江门' },
        { title: '湛江', value: '湛江' },
        { title: '茂名', value: '茂名' },
        { title: '肇庆', value: '肇庆' },
        { title: '惠州', value: '惠州' },
        { title: '梅州', value: '梅州' },
        { title: '汕尾', value: '汕尾' },
        { title: '河源', value: '河源' },
        { title: '阳江', value: '阳江' },
        { title: '清远', value: '清远' },
        { title: '东莞', value: '东莞' },
        { title: '中山', value: '中山' },
        { title: '潮州', value: '潮州' },
        { title: '揭阳', value: '揭阳' },
        { title: '云浮', value: '云浮' },
      ],
    },
    {
      value: '广西',
      children: [
        { title: '南宁', value: '南宁' },
        { title: '柳州', value: '柳州' },
        { title: '桂林', value: '桂林' },
        { title: '梧州', value: '梧州' },
        { title: '北海', value: '北海' },
        { title: '防城港', value: '防城港' },
        { title: '钦州', value: '钦州' },
        { title: '贵港', value: '贵港' },
        { title: '玉林', value: '玉林' },
        { title: '百色', value: '百色' },
        { title: '贺州', value: '贺州' },
        { title: '河池', value: '河池' },
        { title: '来宾', value: '来宾' },
        { title: '崇左', value: '崇左' },
      ],
    },
    {
      value: '海南',
      children: [
        { title: '海口', value: '海口' },
        { title: '三亚', value: '三亚' },
        { title: '三沙', value: '三沙' },
        { title: '儋州', value: '儋州' },
      ],
    },
    {
      value: '四川',
      children: [
        { title: '成都', value: '成都' },
        { title: '自贡', value: '自贡' },
        { title: '攀枝花', value: '攀枝花' },
        { title: '泸州', value: '泸州' },
        { title: '德阳', value: '德阳' },
        { title: '绵阳', value: '绵阳' },
        { title: '广元', value: '广元' },
        { title: '遂宁', value: '遂宁' },
        { title: '内江', value: '内江' },
        { title: '乐山', value: '乐山' },
        { title: '南充', value: '南充' },
        { title: '眉山', value: '眉山' },
        { title: '宜宾', value: '宜宾' },
        { title: '广安', value: '广安' },
        { title: '达州', value: '达州' },
        { title: '雅安', value: '雅安' },
        { title: '巴中', value: '巴中' },
        { title: '资阳', value: '资阳' },
        { title: '阿坝', value: '阿坝' },
        { title: '甘孜', value: '甘孜' },
        { title: '凉山', value: '凉山' },
      ],
    },
    {
      value: '贵州',
      children: [
        { title: '贵阳', value: '贵阳' },
        { title: '六盘水', value: '六盘水' },
        { title: '遵义', value: '遵义' },
        { title: '安顺', value: '安顺' },
        { title: '毕节', value: '毕节' },
        { title: '铜仁', value: '铜仁' },
        { title: '黔西南', value: '黔西南' },
        { title: '黔东南', value: '黔东南' },
        { title: '黔南', value: '黔南' },
      ],
    },
    {
      value: '云南',
      children: [
        { title: '昆明', value: '昆明' },
        { title: '曲靖', value: '曲靖' },
        { title: '玉溪', value: '玉溪' },
        { title: '保山', value: '保山' },
        { title: '昭通', value: '昭通' },
        { title: '丽江', value: '丽江' },
        { title: '普洱', value: '普洱' },
        { title: '临沧', value: '临沧' },
        { title: '楚雄', value: '楚雄' },
        { title: '红河', value: '红河' },
        { title: '文山', value: '文山' },
        { title: '西双版纳', value: '西双版纳' },
        { title: '大理', value: '大理' },
        { title: '德宏', value: '德宏' },
        { title: '怒江', value: '怒江' },
        { title: '迪庆', value: '迪庆' },
      ],
    },
    {
      value: '西藏',
      children: [
        { title: '拉萨', value: '拉萨' },
        { title: '日喀则', value: '日喀则' },
        { title: '昌都', value: '昌都' },
        { title: '林芝', value: '林芝' },
        { title: '山南', value: '山南' },
        { title: '那曲', value: '那曲' },
        { title: '阿里', value: '阿里' },
      ],
    },
    {
      value: '陕西',
      children: [
        { title: '西安', value: '西安' },
        { title: '铜川', value: '铜川' },
        { title: '宝鸡', value: '宝鸡' },
        { title: '咸阳', value: '咸阳' },
        { title: '渭南', value: '渭南' },
        { title: '延安', value: '延安' },
        { title: '汉中', value: '汉中' },
        { title: '榆林', value: '榆林' },
        { title: '安康', value: '安康' },
        { title: '商洛', value: '商洛' },
      ],
    },
    {
      value: '甘肃',
      children: [
        { title: '兰州', value: '兰州' },
        { title: '嘉峪关', value: '嘉峪关' },
        { title: '金昌', value: '金昌' },
        { title: '白银', value: '白银' },
        { title: '天水', value: '天水' },
        { title: '武威', value: '武威' },
        { title: '张掖', value: '张掖' },
        { title: '平凉', value: '平凉' },
        { title: '酒泉', value: '酒泉' },
        { title: '庆阳', value: '庆阳' },
        { title: '定西', value: '定西' },
        { title: '陇南', value: '陇南' },
        { title: '临夏', value: '临夏' },
        { title: '甘南', value: '甘南' },
      ],
    },
    {
      value: '青海',
      children: [
        { title: '西宁', value: '西宁' },
        { title: '海东', value: '海东' },
        { title: '海北', value: '海北' },
        { title: '黄南', value: '黄南' },
        { title: '海南', value: '海南' },
        { title: '果洛', value: '果洛' },
        { title: '玉树', value: '玉树' },
        { title: '海西', value: '海西' },
      ],
    },
    {
      value: '宁夏',
      children: [
        { title: '银川', value: '银川' },
        { title: '石嘴山', value: '石嘴山' },
        { title: '吴忠', value: '吴忠' },
        { title: '固原', value: '固原' },
        { title: '中卫', value: '中卫' },
      ],
    },
    {
      value: '新疆',
      children: [
        { title: '乌鲁木齐', value: '乌鲁木齐' },
        { title: '克拉玛依', value: '克拉玛依' },
        { title: '吐鲁番', value: '吐鲁番' },
        { title: '哈密', value: '哈密' },
        { title: '昌吉', value: '昌吉' },
        { title: '博尔塔拉', value: '博尔塔拉' },
        { title: '巴音郭楞', value: '巴音郭楞' },
        { title: '阿克苏', value: '阿克苏' },
        { title: '克孜勒苏', value: '克孜勒苏' },
        { title: '喀什', value: '喀什' },
        { title: '和田', value: '和田' },
        { title: '伊犁', value: '伊犁' },
        { title: '塔城', value: '塔城' },
        { title: '阿勒泰', value: '阿勒泰' },
        { title: '石河子', value: '石河子' },
        { title: '阿拉尔', value: '阿拉尔' },
        { title: '图木舒克', value: '图木舒克' },
        { title: '五家渠', value: '五家渠' },
        { title: '北屯', value: '北屯' },
        { title: '铁门关', value: '铁门关' },
        { title: '双河', value: '双河' },
        { title: '可克达拉', value: '可克达拉' },
        { title: '昆玉', value: '昆玉' },
        { title: '胡杨河', value: '胡杨河' },
      ],
    },
    {
      value: '香港',
      children: [{ title: '香港', value: '香港' }],
    },
    {
      value: '澳门',
      children: [{ title: '澳门', value: '澳门' }],
    },
    {
      value: '台湾',
      children: [
        { title: '台北', value: '台北' },
        { title: '高雄', value: '高雄' },
        { title: '台中', value: '台中' },
        { title: '台南', value: '台南' },
        { title: '新竹', value: '新竹' },
      ],
    },
    { value: '其他', children: [{ title: '其他', value: '其他' }] },
  ]

  // 表单验证规则
  const emailRules = [
    (value: string) => !!value || '邮箱不能为空',
    (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value) || '请输入有效的邮箱地址'
    },
  ]

  const passwordRules = [
    (value: string) => !!value || '密码不能为空',
    (value: string) => (value && value.length >= 6) || '密码至少6个字符',
  ]

  const confirmPasswordRules = [
    (value: string) => !!value || '请确认密码',
    (value: string) => value === registerForm.password || '两次输入的密码不一致',
  ]

  const usernameRules = [
    (value: string) => !!value || '用户名不能为空',
    (value: string) => (value && value.length >= 2) || '用户名至少2个字符',
  ]

  // 步骤 1: 邮箱验证
  async function step1Click () {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(registerForm.email)) {
      showError('请输入有效的邮箱地址')
      return
    }

    currentStep.value = 2
  }

  // 步骤 2: 密码验证
  function step2Click () {
    if (!registerForm.password) {
      showError('请输入密码')
      return
    }

    if (registerForm.password.length < 6) {
      showError('密码至少6个字符')
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      showError('两次输入的密码不一致')
      return
    }

    currentStep.value = 3
  }

  // 步骤 3: 用户名验证
  function step3Click () {
    if (!registerForm.username) {
      showError('请输入用户名')
      return
    }

    if (registerForm.username.length < 2) {
      showError('用户名至少2个字符')
      return
    }

    currentStep.value = 4
  }

  // 返回上一步
  function goBack () {
    if (currentStep.value > 1) {
      currentStep.value--
    }
  }

  // 注册成功后跳转到聊天页面
  function goToLogin () {
    router.push('/login')
  }

  // 清除头像
  function clearAvatar () {
    if (registerForm.avatarPreview) {
      URL.revokeObjectURL(registerForm.avatarPreview)
    }
    registerForm.avatar = null
    registerForm.avatarPreview = ''
    avatarError.value = ''
    uploadedAvatarFileId.value = '' // 清除已上传的头像ID
  }

  // 触发文件选择对话框
  function triggerAvatarInput () {
    avatarInput.value?.click()
  }

  // 处理文件输入变化
  function handleAvatarInputChange (event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0] || null

    // 重置输入框以允许重复选择同一文件
    if (target) {
      target.value = ''
    }

    // 调用原来的处理函数
    handleAvatarChange(file)
  }

  // 头像处理方法
  function handleAvatarChange (file: File | null) {
    avatarError.value = ''

    if (!file) {
      clearAvatar()
      return
    }

    // 验证文件
    if (!file.type.startsWith('image/')) {
      avatarError.value = '请选择图片文件'
      clearAvatar()
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      avatarError.value = '图片大小不能超过5MB'
      clearAvatar()
      return
    }

    // 保存文件对象并创建预览
    registerForm.avatar = file
    registerForm.avatarPreview = URL.createObjectURL(file)
    // 注册时不自动上传，等注册成功后再上传
  }

  // 步骤 4: 执行注册
  async function step4Click () {
    // 检查头像错误
    if (registerForm.avatar && avatarError.value) {
      showError('头像有错误，请重新选择')
      return
    }

    loading.value = true

    try {
      console.log('Register: 开始注册流程，调用 useAuth.register')

      // 准备注册数据（注册时头像设置为默认值）
      const userData = {
        account: registerForm.email,
        password: registerForm.password,
        username: registerForm.username,
        gender: registerForm.gender || 'other',
        region: registerForm.region || '',
        bio: registerForm.bio || '该用户未留下简介',
        avatar: '1', // 注册时使用默认头像
      }

      console.log('Register: 注册数据', userData)

      // 调用 useAuth 的 register 方法
      const result = await register(userData)

      if (result.success) {
        // 2. 如果用户选择了头像且返回了token，上传并更新头像
        if (registerForm.avatar && !avatarError.value && result.token) {
          try {
            showInfo('正在上传头像...')
            avatarUploading.value = true

            // 使用注册返回的token上传头像
            const uploadResult = await uploadFileWithTempToken(
              registerForm.avatar,
              result.token,
              {
                fileName: `avatar_${registerForm.username}_${Date.now()}`,
                fileType: 'image',
                context: { type: 'avatar' },
              },
            )

            // 3. 调用API更新用户头像
            await userService.updateUserAvatarWithTempToken(uploadResult.file_id, result.token)

            // 更新预览URL
            registerForm.avatarPreview = uploadResult.url || registerForm.avatarPreview
            uploadedAvatarFileId.value = uploadResult.file_id

            showSuccess('头像设置成功')
          } catch (error: any) {
            console.error('头像处理失败:', error)
            showError('头像上传失败，您可以稍后在个人资料中设置头像')
            // 头像失败不影响注册流程，继续执行
          } finally {
            avatarUploading.value = false
          }
        }

        // 4. 注册完成，跳转到成功页面
        currentStep.value = 5
        showSuccess('注册成功！')
      } else {
        showError(result.error || '注册失败')
      }
    } catch (error: any) {
      console.error('Register: 注册失败', error)
      showError(error.message || '注册失败，请重试')
    } finally {
      loading.value = false
    }
  }

</script>

<style scoped>
.container {
  background-color: #1c1c1e;
}

.card {
  border: 1px solid #1c1c11;
  background-color: #1c1c1e;
  box-shadow: 0px 0px 10px 5px rgba(0, 0, 0, 0.3);
}

.rounded-lg {
  border-radius: 16px;
}

/* 透明步骤指示器样式 */
.transparent-stepper {
  background: transparent !important;
}

.transparent-stepper .v-stepper-header {
  background: transparent !important;
  box-shadow: none !important;
}

.transparent-stepper .v-stepper-item {
  color: rgba(255, 255, 255, 0.7) !important;
}

.transparent-stepper .v-stepper-item--active {
  color: white !important;
}

.transparent-stepper .v-stepper-item--complete {
  color: #4caf50 !important;
}

.transparent-stepper .v-divider {
  border-color: rgba(255, 255, 255, 0.3) !important;
}

/* 步骤内容动画 */
.step-content {
  animation: fadeInRight 0.3s ease-in-out;
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 响应式调整 */
@media (max-width: 960px) {
  .pa-8 {
    padding: 24px;
  }

  .transparent-stepper .v-stepper-header {
    flex-direction: column;
    gap: 8px;
  }

  .transparent-stepper .v-divider {
    display: none;
  }
}

/* 表单输入框悬停效果 */
.v-text-field:hover .v-field__outline,
.v-select:hover .v-field__outline,
.v-textarea:hover .v-field__outline {
  border-color: rgba(var(--v-theme-primary), 0.8);
}

/* 按钮悬停效果 */
.v-btn:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease-in-out;
}

.step-map {
  height: 10%;
}

/* 头像上传样式 */
.avatar-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-preview-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
}

.avatar-clickable-area {
  cursor: pointer;
  position: relative;

  .avatar-preview {
    border: 2px dashed rgba(255, 255, 255, 0.3);
    transition: all 0.3s ease;

    &:hover {
      border-color: rgba(255, 255, 255, 0.6);
      transform: scale(1.02);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
  }

  .upload-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.7);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 头像区域响应式调整 */
@media (max-width: 600px) {
  .avatar-preview {
    width: 100px !important;
    height: 100px !important;
  }
}
</style>
