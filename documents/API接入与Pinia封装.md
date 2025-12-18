## 📑 模块快速导航

| 模块 | 功能描述 | 架构状态 |
| :--- | :--- | :--- |
| [🔐 auth](#1-auth-认证模块) | 用户认证与登录 | ✅ 已符合 |
| [👤 user](#2-user-用户模块) | 用户信息管理 | ✅ **已完成调整** |
| [💬 chat](#3-chat-会话模块) | 会话列表管理 | ✅ **已完成调整** |
| [📧 message](#4-message-消息模块) | 消息发送与接收 | ⚠️ 临时实现 |
| [🤝 friend](#5-friend-好友模块) | 好友关系管理 | ✅ **已完成调整** |
| [👥 group](#6-group-群组模块) | 群组管理 | ✅ **已完成调整** |
| [📨 FriendRequest](#7-friendrequest-好友请求模块) | 好友请求处理 | ✅ **已完成调整** |
| [👥 GroupRequest](#8-grouprequest-群聊申请模块) | 群聊申请处理 | ✅ **已完成调整** |
| [🔍 Search](#9-search-搜索模块) | 用户搜索功能 | ✅ 已符合 |
| [📂 file](#10-file-文件模块) | 文件上传下载 | ⏳ 待调整 |
| [🔎 LocalSearch](#11-localsearch-本地搜索模块) | 本地数据搜索功能 | ✅ 已符合 |

## 🎯 架构调整完成总结

### ✅ 已完成四层架构调整的模块
- **Chat模块**: Service层纯API调用 → Store层纯数据管理 → Composable层统一门面
- **Friend模块**: 移除Store层Service调用 → 增强Composable层错误处理 → 标准化init/reset
- **FriendRequest模块**: Service层保持纯净 → Store层纯数据管理 → Composable层业务逻辑
- **Group模块**: 移除11处Store层snackbar调用 → 重构7个API方法到Composable → 统一门面模式
- **GroupRequest模块**: 优秀实现范例 → 已完全符合四层架构 → 最小化调整
- **User模块**: 严重违规重构 → 移除UI和Service调用 → 标准门面层实现

### 🏗 核心改进
1. **职责分离**: Service纯API → Store纯数据 → Composable统一门面
2. **错误处理**: Service抛出 → Composable捕获 + snackbar反馈
3. **数据流向**: 严格遵循 `UI → Composable → Service → API → Store → UI`
4. **标准化**: 所有模块都添加了`init()`和`reset()`方法
5. **文档规范**: 详细的JSDoc注释和执行流程说明

### 📋 架构合规要求
- ❌ Service层：禁止任何UI组件调用
- ❌ Store层：禁止Service调用和UI组件调用
- ✅ Composable层：唯一调用Service的层级，统一错误处理
- ✅ 数据完整性：API请求体undefined字段设为null
- ✅ 状态保护：使用readonly防止外部直接修改

## 🏗 架构概览与调用关系

您的四层架构（Service, Store, Composable, UI）有效地将关注点分离。下面是它们之间的主要调用流程。

| 层面 | 核心职责 | 调用方向 |
| :--- | :--- | :--- |
| **UI/View** | 负责渲染和用户交互。 | 调用 $\rightarrow$ **Composable** |
| **Composable** | 封装组件的业务逻辑、状态读取和操作触发。 | 调用 $\rightarrow$ **Store** (读) / **Service** (写/操作) |
| **Service** | 负责所有与后端 API 的交互（HTTP/WebSocket）。 | 调用 $\rightarrow$ **外部 API** $\rightarrow$ **Store** (更新数据) |
| **Store** | 负责本地响应式状态管理，是 UI 数据的唯一来源。 | 响应 $\rightarrow$ **Composable** |
| **Types** | 仅定义数据结构。 | - |

---

## 🧩 详细模块分工细化 (拆分 friend 和 group)

### 1. 🔐 `auth` 认证模块 <a id="1-auth-认证模块"></a>

#### 整体概述：
认证模块是用户身份管理的核心，负责用户登录、注册、登出和身份验证。采用四层架构设计，确保职责分离和代码可维护性。认证成功后会初始化其他相关服务（WebSocket、消息服务等），并在登出时清理所有相关数据。

#### Service 职责 (`src/service/authService.ts`)

负责所有认证相关的 API 交互：
- `login(credentials)`: 用户登录，API 端点 `POST /noauth/auth/login`
- `register(userData)`: 用户注册，API 端点 `POST /noauth/auth/register`
- `validateToken(token)`: Token 验证，API 端点 `GET /auth/auth/validate`
- `logout()`: 用户登出，API 端点 `POST /auth/auth/logout`
- 加密处理：使用 MD5 加密用户凭据
- 统一的错误处理和日志记录
- 返回标准化的响应格式
- 注：不在此层添加 snackbar（因为不是直接由组件调用）

#### Store 职责 (`src/stores/authStore.ts`)

管理认证状态的本地存储：
- **数据存储**：
  - `token`: 认证令牌
  - `userId`: 用户ID
  - `username`: 用户名
  - `isLoading`: 加载状态
  - `rememberMe`: 记住我状态
- **计算属性**：
  - `isAuthenticated`: 是否已认证
- **操作方法**：
  - `setAuth/clearAuthState`: 设置/清除认证状态
  - `setLoading/setRememberMe`: 状态管理
- **存储管理**：
  - 支持 localStorage 和 sessionStorage
  - 根据记住我状态选择存储位置

#### Composable 职责 (`src/composables/useAuth.ts`)

作为认证功能的统一门面，封装所有认证相关的业务逻辑：
- **核心认证功能**：
  - `login(account, password, rememberMe)`: 登录流程（含服务初始化）
  - `register(userData)`: 注册流程
  - `logout()`: 登出流程（含资源清理）
  - `validateToken()`: Token 验证
- **服务初始化**：
  - `initializeServices()`: 初始化 WebSocket 和消息服务
  - 预加载用户数据（好友列表、聊天记录等）
- **状态管理**：
  - `init()`: 应用启动时恢复认证状态
  - `updateRememberMe()`: 更新记住我状态
- **错误处理**：
  - 捕获 Service 层错误，显示用户友好的错误信息
  - 使用 snackbar 提供操作反馈
- **状态暴露**：提供认证状态和操作方法供组件使用

#### Types (`src/types/auth.ts`)

认证相关的数据结构体和转换函数：
- **API 请求类型**：
  ```typescript
  interface LoginCredentials {
    account: string
    password: string
  }

  interface RegisterData {
    account: string
    password: string
    username: string
    gender?: number  // 1: 男, 2: 女
    region?: string
    bio?: string
    avatar?: string
  }
  ```
- **响应数据类型**：
  ```typescript
  interface LoginResponse {
    success: boolean
    data?: {
      token: string
      userId: string
      username: string
    }
    message?: string
    code?: number
  }

  interface RegisterResponse {
    success: boolean
    message?: string
    code?: number
  }
  ```
- **数据转换函数**：
  - `transformLoginResponse()`: 转换登录 API 响应
  - `transformRegisterResponse()`: 转换注册 API 响应
  - `transformTokenValidationResponse()`: 转换 Token 验证响应
  - `transformGender()`: 转换性别值
  - `prepareRegisterParams()`: 准备注册请求数据

### 2. 👤 `user` 用户模块 <a id="2-user-用户模块"></a>

#### 整体概述：
用户个人信息管理模块，负责当前用户信息的获取、更新和头像上传。已调整为符合四层架构规范，用户登录后通过useAuth初始化，登出时自动重置。

#### Service 职责 (`src/service/userService.ts`)

作为纯数据访问层，负责所有用户信息相关的 API 交互：
- **getCurrentUser()**: 获取当前用户详细信息，API 端点 `GET /auth/user/user-info`
- **updateProfile(options)**: 更新用户信息，API 端点 `POST /auth/user/update-user-info`
- **uploadAvatar(file)**: 上传用户头像，API 端点 `POST /auth/user/upload-avatar`
- **错误处理**: 抛出错误供上层处理，不包含任何 UI 反馈
- **文件验证**: 检查文件类型和大小（最大5MB）

#### Store 职责 (`src/stores/userStore.ts`)

纯粹的状态管理层，不调用 Service，不处理 UI 反馈：
- **数据存储**：
  - `currentUser`: 使用 `ref<User | null>` 存储当前用户信息
  - `isLoading`: 加载状态
- **计算属性**：
  - `isLoggedIn`: 是否已登录
  - `currentUserId`: 当前用户ID
  - `currentUsername`: 当前用户名
  - `currentUserAvatar`: 当前用户头像
  - `currentAccount`: 当前用户账号
- **核心操作方法**：
  - `setLoading/loading`: 设置加载状态
  - `setCurrentUser/clearCurrentUser`: 设置/清除用户信息
  - `updateCurrentUser`: 更新用户信息
- **纯数据管理方法**（新增）：
  - `setCurrentUserFromApi(user)`: 从API响应设置用户信息
  - `updateUserFromApi(updates)`: 从API响应更新用户资料
  - `reset()`: 重置所有状态

#### Composable 职责 (`src/composables/useUser.ts`)

作为业务逻辑层和唯一门面，封装所有用户相关的操作：
- **初始化管理**：
  - `fetchCurrentUser()`: 获取用户信息（带缓存和错误处理）
  - `refreshCurrentUser()`: 强制刷新用户信息（带成功提示）
  - `init(force)`: 初始化用户模块（默认强制初始化）
  - `reset()`: 重置用户状态（用于登出）
- **用户操作**：
  - `updateUserProfile(options)`: 更新用户资料（API请求体完整性处理）
  - `uploadAvatar(file)`: 上传头像（保留复杂业务逻辑）
- **Service 调用**：作为唯一调用 Service 的层级，处理所有 API 交互
- **错误处理**：捕获所有错误并显示用户友好的 snackbar 提示
- **状态暴露**：
  - 从 Store 暴露所有只读状态

#### Types (`src/types/user.ts`)

用户相关的数据结构定义：
- **User**: 用户信息接口
- **UserProfileUpdateOptions**: 用户资料更新选项
- **API转换函数**: UserApiToUser等

#### 架构合规性

✅ 完全符合四层架构要求：
- Service 层不包含任何 UI 调用
- Store 层只管理数据，不调用 Service
- Composable 层作为唯一门面，调用 Service 并处理错误
- 数据流向：Composable → Service → Store → UI
- 错误处理：Service 抛出 → Composable 捕获 + snackbar 反馈
- **API请求体完整性**: 确保所有字段都包含，undefined字段设为null

- **User**: 用户信息接口（继承BaseProfile）
  ```typescript
  interface User extends BaseProfile {
    account?: string;    // 账号
    gender?: string;     // 性别
    region?: string;     // 地区
    email?: string;      // 邮箱
    bio?: string;        // 个人简介
    createdAt?: string;  // 创建时间
  }
  ```
- **UserFromApi**: API返回的用户信息格式
- **UserProfileUpdateOptions**: 更新用户资料的选项
  ```typescript
  interface UserProfileUpdateOptions {
    username?: string;  // 用户名
    gender?: string;    // 性别
    region?: string;    // 地区
    email?: string;     // 邮箱
    avatar?: string;    // 头像URL
    bio?: string;       // 个人简介
  }
  ```
- **UserApiToUser()**: API数据转换函数

### 3. 💬 `chat` 会话模块 <a id="3-chat-会话模块"></a>

#### 整体概述：
会话模块采用四层架构设计，符合最新的架构规范。用户登录后通过useAuth初始化会话列表；用户从联系人卡片点击"发送消息"创建或获取私聊会话；用户从群组卡片点击"进入群聊"创建或获取群聊会话；用户切换会话时自动重置未读消息数；用户可以置顶重要会话。

#### Service 职责 (`src/service/chatService.ts`)

作为纯数据访问层，负责所有会话相关的 API 交互：
- **getChatList()**: 获取用户的会话列表，API 端点 `GET /chat/list`
- **getPrivateChat(fid)**: 获取或创建与指定好友的私聊会话，API 端点 `POST /chat/soloprivate`
- **getGroupChat(gid)**: 获取或创建指定群聊会话，API 端点 `POST /chat/sologroup`
- **updateIsPinned(chatId, chatType, isPinned)**: 更新会话置顶状态，API 端点 `POST /chat/updateIsPinned`
- **数据转换**: 内部使用 transformApiChat 将 API 响应转换为标准 Chat 格式
- **错误处理**: 抛出错误供上层处理，不包含任何 UI 反馈
- **注释规范**: 每个方法都有详细的 JSDoc 注释说明执行流程

#### Store 职责 (`src/stores/chatStore.ts`)

纯粹的状态管理层，不调用 Service，不处理 UI 反馈：
- **数据存储**：
  - `chatList`: 使用 `ref<Chat[]>` 存储所有会话列表
  - `activeChatId`: 当前选中的会话ID
  - `isLoading`: 加载状态
  - `onlineBoardVisible`: 在线面板显示状态
- **状态管理**：
  - `chatById`: 根据 ID 获取会话的计算属性
- **核心操作方法**：
  - `setChatList(chats)`: 设置会话列表并排序
  - `setActiveChat(chatId)`: 设置当前活跃会话
  - `getChatByid(chatId)`: 根据ID获取会话
  - `deleteChatByid(chatId)`: 删除会话（仅前端删除）
  - `addChat(chat)`: 添加或更新单个会话
  - `updateChatLastMessage(chatId, message)`: 更新会话最新消息
  - `updateIsPinned(chatId, isPinned)`: 更新会话置顶状态（仅本地状态）
- **未读消息管理**：
  - `updateChatUnreadCount(chatId, count)`: 设置未读消息数
  - `incrementUnreadCount(chatId)`: 未读消息数+1
  - `resetUnreadCount(chatId)`: 重置未读消息数为0
- **辅助方法**：
  - `sortChatList()`: 会话列表排序（置顶优先，按更新时间）
  - `setOnlineBoardVisible(visible)`: 设置在线面板显示状态
  - `setLoading(loading)`: 设置加载状态
  - `reset()`: 重置所有状态

#### Composable 职责 (`src/composables/useChat.ts`)

作为业务逻辑层和唯一门面，封装所有会话相关的操作：
- **初始化管理**：
  - `initializeChats(force)`: 初始化聊天列表（支持 force 参数控制是否强制初始化）
  - `reset()`: 重置聊天状态（用于登出）
- **会话操作**：
  - `selectChat(chatId)`: 选择会话并重置未读数
  - `createChat(fidOrGid, chatType)`: 创建或获取会话（先从缓存查找，无缓存则调用 API）
  - `togglePinChat(chatId, type, isPinned)`: 切换会话置顶状态
- **Service 调用**：作为唯一调用 Service 的层级，处理所有 API 交互
- **错误处理**：捕获所有错误并显示用户友好的 snackbar 提示
- **状态暴露**：
  - `activeChatId`: 当前活跃会话ID
  - `activeChat`: 当前活跃会话对象
  - `chatList`: 会话列表
  - `isLoading`: 加载状态

#### Types (`src/types/chat.ts`)

会话相关的数据结构定义：
- **Chat**: 会话接口定义（已导出）
  ```typescript
  export interface Chat {
    id: string; // pid/gid
    isPinned: boolean;
    type: ChatType;
    lastMessage?: string;
    updatedAt?: string;
    unreadCount: number;
    avatar?: string;
    name: string;
  }
  ```
- **ApiChat**: API 响应的聊天数据结构
  ```typescript
  export interface ApiChat {
    id: string;
    is_pinned: boolean;
    type: ChatType;
    latest_message?: string;
    updated_at?: string;
    unread_messages?: number;
    avatar?: string;
    remark?: string;
  }
  ```
- **ChatType**: 聊天类型枚举（已导出）
  ```typescript
  export enum ChatType {
    PRIVATE = 'private',
    GROUP = 'group'
  }
  ```
- **transformApiChat()**: 将 API 响应转换为前端 Chat 格式的转换函数

#### 架构合规性

✅ 完全符合四层架构要求：
- Service 层不包含任何 UI 调用
- Store 层只管理数据，不调用 Service
- Composable 层作为唯一门面，调用 Service 并处理错误
- 数据流向：Composable → Service → Store → UI
- 错误处理：Service 抛出 → Composable 捕获 + snackbar 反馈

### 4. 📧 `message` 消息模块 <a id="4-message-消息模块"></a>

#### Service 职责

* 负责消息的 API 交互 和 **实时通信**。

#### Store 职责

* 负责消息的 **存储和状态管理**。

#### Composable 职责

* 封装消息的 **发送和展示逻辑**。

#### Types

* 消息相关的数据结构体。

### 5. 🤝 `friend` 好友模块 <a id="5-friend-好友模块"></a>

#### 整体概述：
用户登录后通过useAuth初始化好友列表；用户通过联系人管理查看好友列表，支持按标签分组筛选；用户可以查看好友详细资料、更新好友信息、删除好友；支持黑名单管理。

#### Service 职责 (`src/service/friendService.ts`)

作为纯数据访问层，负责所有好友相关的 API 交互：
- **getFriendsFromApi()**: 获取好友列表，API 端点 `GET /friends/friendlist`
- **getFriendProfile(friendId, userId)**: 获取好友详细资料，API 端点 `POST /friends/profile`
- **updateFriendProfile(friendId, options)**: 更新好友资料，API 端点 `POST /friends/update`
- **removeFriend(friendId)**: 删除好友，API 端点 `POST /friends/remove`
- **数据转换**: 内部使用 transformFriendsResponse 将 API 响应转换为标准 FriendWithUserInfo 格式
- **错误处理**: 抛出错误供上层处理，不包含任何 UI 反馈
- **注释规范**: 每个方法都有详细的 JSDoc 注释说明执行流程

#### Store 职责 (`src/stores/friendStore.ts`)

纯粹的状态管理层，不调用 Service，不处理 UI 反馈：
- **数据存储**：
  - `friends`: 使用 `Map<string, FriendWithUserInfo>` 存储所有好友（包括黑名单）
  - `isLoading`: 加载状态
- **状态管理**：
  - `activeFriends`: 活跃好友（非黑名单）的计算属性
  - `blacklistedFriends`: 黑名单好友的计算属性
  - `isFriend`: 检查是否为好友的计算属性
  - `getFriendByUid`: 根据 UID 获取好友的计算属性
- **标签管理**：
  - `getAllTags`: 获取所有标签
  - `getFriendsByTag`: 根据标签获取好友
  - `getTagStats`: 标签统计信息
- **核心操作方法**：
  - `setFriends(friends)`: 设置好友列表
  - `setFriendsFromApi(friendList)`: 从API响应设置好友列表（新增）
  - `addFriend(friend)`: 添加或更新好友
  - `removeFriend(friendId)`: 删除好友
  - `updateFriendProfile(friendId, options)`: 更新好友资料
  - `updateFriendTag(friendId, tag)`: 更新好友标签
  - `reset()`: 重置所有状态

#### Composable 职责 (`src/composables/useFriend.ts`)

作为业务逻辑层和唯一门面，封装所有好友相关的操作：
- **初始化管理**：
  - `fetchFriends(forceRefresh)`: 获取好友列表（支持 forceRefresh 参数）
  - `init(force)`: 初始化好友模块（默认强制初始化）
  - `reset()`: 重置好友状态（用于登出）
- **好友操作**：
  - `removeFriend(friendId)`: 删除好友
  - `getFriendProfile(friendId, userId)`: 获取好友资料（带缓存）
  - `updateFriendProfile(friendId, options)`: 更新好友资料
  - `refreshFriendData(friendId, uid)`: 刷新好友数据
- **标签管理**：
  - `getAllFriendTags()`: 获取所有好友标签
  - `getFriendsByTag(tag)`: 根据标签获取好友
- **Service 调用**：作为唯一调用 Service 的层级，处理所有 API 交互
- **错误处理**：捕获所有错误并显示用户友好的 snackbar 提示
- **状态暴露**：
  - `activeFriends`: 活跃好友列表
  - `blacklistedFriends`: 黑名单列表
  - `isLoading`: 加载状态

#### Types (`src/types/friend.ts`)

好友相关的数据结构定义：
- **FriendWithUserInfo**: 好友信息完整接口
- **FriendUpdateOptions**: 好友更新选项
- **FriendApiToFriendWithUserInfo()**: API数据转换函数

#### 架构合规性

✅ 完全符合四层架构要求：
- Service 层不包含任何 UI 调用
- Store 层只管理数据，不调用 Service
- Composable 层作为唯一门面，调用 Service 并处理错误
- 数据流向：Composable → Service → Store → UI
- 错误处理：Service 抛出 → Composable 捕获 + snackbar 反馈

* 负责好友的增删改查 API。
* `getFriendsFromApi()`: 获取好友列表（包括普通好友和黑名单）
* `removeFriend(friendId)`: 删除好友
* `getFriendProfile(friendId, userId)`: 获取单个好友的详细资料
* `updateFriendProfile(friendId, options)`: 更新好友资料（备注、黑名单、分组标签），使用 FriendUpdateOptions 对象参数
* `transformFriendsResponse()`: 将API响应转换为前端格式

#### Store 职责

* **数据存储**：使用 `Map<string, FriendWithUserInfo>` 存储所有好友数据（key为好友ID）
* **状态管理**：
  * `activeFriends`: 筛选非黑名单好友
  * `blacklistedFriends`: 筛选黑名单好友
  * `isLoading`: 加载状态
* **标签管理**：
  * `getAllTags`: 从好友列表中提取所有唯一标签
  * `getFriendsByTag(tag)`: 根据标签筛选好友
  * `getTagStats`: 统计每个标签的好友数量
* **操作方法**：
  * `fetchFriends()`: 从API获取好友列表
  * `updateFriendProfile(friendId, options)`: 更新本地好友资料，接收 FriendUpdateOptions 对象参数
  * `addFriend/removeFriend`: 添加/删除好友
  * `updateFriendTag/batchUpdateTags`: 标签管理

#### Composable 职责

* **封装好友操作逻辑**：
  * `removeFriend()`: 删除好友（调用API并更新本地状态）
  * `updateFriendProfile(friendId, options)`: 更新好友资料（调用API并更新本地状态），接收 FriendUpdateOptions 对象参数
  * `getFriendProfile()`: 获取好友资料（优先从缓存读取）
  * `refreshFriendData()`: 强制刷新单个好友数据
* **标签管理函数**：
  * `getAllFriendTags()`: 获取所有好友分组标签
  * `getFriendsByTag(tag)`: 根据分组标签获取好友
* **辅助功能**：
  * `checkUserRelation(uid)`: 检查用户关系（是否为好友）
  * `getFriendByUid(uid)`: 根据用户ID获取好友信息

#### Types

* `FriendWithUserInfo`: 好友详细信息（包含用户资料）
* `FriendUpdateOptions`: 更新好友资料的选项对象
  ```typescript
  interface FriendUpdateOptions {
    remark?: string;          // 备注
    isBlacklisted?: boolean;  // 是否黑名单
    tag?: string;             // 分组标签
  }
  ```
* `UpdateFriendProfileParams`: 更新好友资料的API请求参数
* `FriendProfileFromApi`: API返回的好友资料格式
* `UserInfo`: 用户详细信息（账户、性别、地区、邮箱）

**使用示例**：
```typescript
// 更新所有字段
updateFriendProfile(friendId, {
  remark: '新备注',
  isBlacklisted: false,
  tag: '好友分组'
})

// 仅更新备注
updateFriendProfile(friendId, { remark: '仅更新备注' })

// 仅更新黑名单状态
updateFriendProfile(friendId, { isBlacklisted: true })
```

### 6. 👥 `group` 群组模块 <a id="6-group-群组模块"></a>

#### 整体概述：
auth登录后，store初始化获取群聊列表；
用户点击联系人按钮，显示群聊列表；
用户点击群组卡片，获取群聊详细信息；
用户可以创建群聊、退出群聊、转让群主、设置管理员等操作；
群聊支持角色权限管理（群主、管理员、普通成员）。

#### Service 职责

负责所有群聊相关的 API 交互：
- `createGroup(params)`: 创建群聊，API 端点 `POST /api/groups/create`
- `getGroupCard(params)`: 获取群聊名片，API 端点 `POST /api/groups/card`
- `getGroupProfile(params)`: 获取群聊详细信息，API 端点 `POST /api/groups/profile`
- `getGroupList()`: 获取用户群聊列表，API 端点 `GET /api/groups/grouplist`
- `leaveGroup(params)`: 退出群聊，API 端点 `POST /api/groups/leave`
- `kickMember(params)`: 踢出群成员，API 端点 `POST /api/groups/kick_member`
- `disbandGroup(params)`: 解散群聊，API 端点 `POST /api/groups/disband`
- `setMemberInfo(params)`: 设置成员信息（免打扰、置顶、备注等），API 端点 `POST /api/groups/member_set`
- `setGroupInfo(params)`: 设置群信息，API 端点 `POST /api/groups/setting`
- `getGroupAnnouncements(params)`: 获取群公告，API 端点 `POST /api/groups/get_announcements`
- `getGroupMembers(params)`: 获取群成员列表，API 端点 `POST /api/groups/get_members`
- `transferOwnership(params)`: 转让群主，API 端点 `POST /api/groups/transfer_ownership`
- `setAdmin(params)`: 设置/取消管理员，API 端点 `POST /api/groups/set_admin`
- 数据转换：使用 transform 函数标准化 API 响应

#### Store 职责

维护群聊信息的本地状态管理：
- **数据存储**：
  - `groups`: 使用 `Map<string, Group>` 存储群聊基本信息
  - `groupCards`: 使用 `Map<string, GroupCard>` 缓存群聊名片
  - `groupProfiles`: 使用 `Map<string, GroupProfile>` 缓存群聊详细信息
  - `groupMembers`: 使用 `Map<string, GroupMember[]>` 缓存群成员列表
  - `groupAnnouncements`: 使用 `Map<string, GroupAnnouncement[]>` 缓存群公告
  - `isLoading`: 加载状态标识
  - `lastFetchTime`: 上次获取群聊列表的时间
- **计算属性**：
  - `allGroups`: 所有群聊列表
  - `groupCount`: 群聊总数
  - `getGroupById`: 根据 ID 获取群聊
  - `getGroupCard/getGroupProfile`: 获取缓存的群聊信息
  - `getGroupMembers/getGroupAnnouncements`: 获取成员和公告
  - `getGroupOwner/getGroupAdmins/getOrdinaryMembers`: 按角色筛选成员
  - `getGroupMemberCount`: 获取成员总数
  - `isGroupOwner/isGroupAdmin/isInGroup`: 权限检查方法
- **核心操作方法**：
  - `fetchGroups()`: 获取群聊列表（智能缓存）
  - `fetchGroupMembers()`: 获取群成员列表
  - `fetchGroupAnnouncements()`: 获取群公告列表
  - `setGroupCard/getOrFetchGroupCard`: 群聊名片缓存管理
  - `setGroupProfile/getOrFetchGroupProfile`: 群聊详细信息缓存管理
  - `addGroup/removeGroup/updateGroup`: 群聊增删改
  - `addGroupMember/removeGroupMember/updateGroupMember`: 成员管理
  - `batchUpdateGroupMemberRole/batchRemoveGroupMembers`: 批量操作
- **组件直接调用的 API 方法**：
  - `createGroup()`: 创建群聊（带 snackbar 反馈）
  - `updateGroupInfo()`: 更新群信息
  - `leaveGroup()`: 退出群聊
  - `kickMember()`: 踢出成员
  - `disbandGroup()`: 解散群聊
  - `transferGroupOwnership()`: 转让群主
  - `setGroupAdmin()`: 设置管理员

#### Composable 职责

封装群聊的高级业务逻辑和权限管理：
- **增强的群聊操作**：
  - `createGroupWithInitialization()`: 创建群聊并初始化（支持初始成员邀请）
  - `getGroupProfileWithPermission()`: 获取群聊详细信息（含权限检查）
  - `leaveGroupWithCheck()`: 带检查的退出群聊（群主需先转让）
  - `disbandGroupWithConfirmation()`: 解散群聊的完整流程（多重确认）
- **增强的成员管理**：
  - `transferOwnershipWithProcess()`: 转让群主的高级处理（含角色调整）
- **权限管理**：
  - `checkDetailedPermissions()`: 详细的权限检查（返回可执行的操作列表）
  - `checkPermissions()`: 基础权限检查
  - `getGroupFullStatus()`: 获取群聊的完整状态信息
- **用户视角的群聊分类**：
  - `userGroups`: 用户所在的群聊
  - `managedGroups`: 用户管理的群聊（管理员以上）
  - `ownedGroups`: 用户拥有的群聊（群主）
- **错误处理**：统一的错误处理和用户提示机制

#### Types

群聊相关的数据结构体：
- `GroupRole`: 群成员角色枚举
  ```typescript
  enum GroupRole {
    OWNER = 'owner',  // 群主
    ADMIN = 'admin',  // 管理员
    MEMBER = 'member' // 普通成员
  }
  ```
- `GroupType`: 群类型枚举
  ```typescript
  enum GroupType {
    NORMAL = 'normal', // 普通群
    LARGE = 'large',   // 大群（500人以上）
    SUPER = 'super'    // 超大群（2000人以上）
  }
  ```
- **核心数据类型**：
  ```typescript
  // 群聊基本信息（继承 BaseProfile，id 就是 gid）
  interface Group extends BaseProfile {
    group_intro?: string // 群简介
  }

  // 群聊名片（API 26: 用户获取群聊名片）
  interface GroupCard extends Group {
    manager_uid: string // 群主ID
    created_at: number // 创建时间
  }

  // 群聊详细信息（API 27: 成员获取群聊信息）
  interface GroupProfile extends GroupCard {
    do_not_disturb: boolean // 是否免打扰
    is_pinned: boolean // 是否置顶
    remark: string | null // 群备注
    nickname: string | null // 群昵称
    join_time: number // 加入时间
  }

  // 群成员信息
  interface GroupMember extends BaseProfile {
    role: GroupRole // 角色 (owner/admin/member)
    nickname?: string // 群昵称
  }

  // 群公告信息
  interface GroupAnnouncement {
    msg_id: string // 消息ID
    gid: string // 群ID
    content: string // 公告内容
    sender_uid: string // 发布者ID
    send_time: number // 发布时间
    mentioned_uids?: string[] // 提及的用户ID数组
    quote_msg_id?: string | null // 引用的消息ID
  }
  ```
- API 参数类型：
  ```typescript
  interface CreateGroupParams {
    group_name: string;
    avatar?: string;
    group_intro?: string;
  }

  interface SetMemberParams {
    gid: string;
    do_not_disturb?: boolean;
    is_pinned?: boolean;
    remark?: string;
    nickname?: string;
  }
  ```
- 数据转换函数：
  - `transformGroupCardFromAPI()`: API 响应转内部格式
  - `transformGroupProfileFromAPI()`: API 响应转内部格式
  - `transformGroupListFromApi()`: 群聊列表转换
  - `transformCreateGroupFromApi()`: 创建群聊响应转换

```


### 7. 📨 `FriendRequest` 好友请求模块 <a id="7-friendrequest-好友请求模块"></a>

#### 整体概述：
处理好友关系的申请、响应和管理。用户登录后初始化请求列表；用户可以发送好友请求、接受或拒绝请求；支持WebSocket实时推送新请求通知。

#### Service 职责 (`src/service/friendRequestService.ts`)

作为纯数据访问层，负责所有好友请求相关的 API 交互：
- **sendFriendRequest(receiver_id, message)**: 发送好友请求，API 端点 `POST /friends/request`
- **respondFriendRequest(req_id, action)**: 响应好友请求，API 端点 `POST /friends/respond`
- **getFriendRequestList()**: 获取好友请求列表，API 端点 `GET /friends/request_list`
- **错误处理**: 抛出错误供上层处理，不包含任何 UI 反馈
- **注释规范**: 每个方法都有详细的 JSDoc 注释说明执行流程

#### Store 职责 (`src/stores/friendRequestStore.ts`)

纯粹的状态管理层，不调用 Service，不处理 UI 反馈：
- **数据存储**：
  - `requests`: 使用 `ref<FriendRequest[]>` 存储所有好友请求
  - `isLoading`: 加载状态
- **状态管理**：
  - `sentRequests`: 发送的请求计算属性
  - `receivedRequests`: 接收的请求计算属性
  - `pendingRequests`: 待处理请求计算属性
  - `totalPending`: 待处理总数计算属性
- **核心操作方法**：
  - `setRequestsFromApi(response)`: 从API响应设置请求列表（新增）
  - `setLoading(loading)`: 设置加载状态（新增）
  - `addRequest(request)`: 添加或更新请求
  - `updateRequestStatus(req_id, status)`: 更新请求状态
  - `removeRequest(req_id)`: 删除请求
  - `reset()`: 重置所有状态

#### Composable 职责 (`src/composables/useFriendRequest.ts`)

作为业务逻辑层和唯一门面，封装所有好友请求相关的操作：
- **初始化管理**：
  - `fetchFriendRequests()`: 获取好友请求列表
  - `init(force)`: 初始化好友请求模块（默认强制初始化）
  - `reset()`: 重置好友请求状态（用于登出）
- **请求操作**：
  - `sendFriendRequest(receiver_id, message)`: 发送好友请求
  - `respondFriendRequest(req_id, action)`: 响应好友请求
- **WebSocket 推送处理**：
  - `handleNewFriendRequest(request)`: 处理新请求推送
  - `handleFriendRequestUpdate(req_id, status)`: 处理状态更新推送
- **Service 调用**：作为唯一调用 Service 的层级，处理所有 API 交互
- **错误处理**：捕获所有错误并显示用户友好的 snackbar 提示
- **状态暴露**：
  - 从 Store 暴露所有只读状态

#### Types (`src/types/friendRequest.ts`)

好友请求相关的数据结构定义：
- **FriendRequest**: 好友请求接口
- **FriendRequestStatus**: 请求状态枚举
- **FriendRequestListResponse**: 请求列表响应接口
- **transformFriendRequestFromApi()**: API数据转换函数

#### 架构合规性

✅ 完全符合四层架构要求：
- Service 层不包含任何 UI 调用
- Store 层只管理数据，不调用 Service
- Composable 层作为唯一门面，调用 Service 并处理错误
- 数据流向：Composable → Service → Store → UI
- 错误处理：Service 抛出 → Composable 捕获 + snackbar 反馈
- `transformFriendRequestFromApi(data)`: 将 API 响应数据转换为前端 FriendRequest 格式

#### Store 职责

管理好友请求的本地状态：
- **数据存储**：
  - `requests`: 存储所有好友请求的数组
  - `isLoading`: 加载状态标识
- **计算属性**：
  - `sentRequests`: 过滤出发送的好友请求列表
  - `receivedRequests`: 过滤出接收的好友请求列表
  - `pendingSentRequests`: 过滤出待处理的发送请求（状态为 PENDING）
  - `pendingReceivedRequests`: 过滤出待处理的接收请求（状态为 PENDING）
- **操作方法**：
  - `fetchRequests()`: 从 API 获取请求列表
  - `addRequest(request)`: 添加新请求到本地状态
  - `updateRequestStatus(req_id, status)`: 更新请求状态
  - `removeRequest(req_id)`: 从本地状态移除请求
  - `clearRequests()`: 清空所有请求

#### Composable 职责

封装好友请求的业务逻辑和用户交互：
- **核心操作**：
  - `sendFriendRequest(receiverId, message)`: 发送好友请求，包含错误处理和用户提示
  - `respondFriendRequest(reqId, action)`: 响应好友请求，接受后自动刷新好友列表
  - `refreshRequests()`: 强制刷新请求列表
- **WebSocket 集成**：
  - `handleNewFriendRequest(data)`: 处理新的好友请求推送
  - `handleFriendRequestUpdate(data)`: 处理请求状态更新推送
- **状态暴露**：提供请求列表、加载状态和各种计算属性供组件使用
- **错误处理**：统一的错误处理和用户提示机制

#### Types

- `FriendRequest`: 好友请求接口
  ```typescript
  interface FriendRequest {
    req_id: string;              // 请求ID
    sender_uid: string;          // 发送者用户ID
    receiver_uid: string;        // 接收者用户ID
    apply_text: string;          // 申请文本
    create_time: number;         // 创建时间戳
    status: FriendRequestStatus; // 请求状态
    userProfile?: BaseProfile;   // 用户资料缓存（头像、姓名等）
  }
  ```
- `FriendRequestStatus`: 好友请求状态枚举
  ```typescript
  enum FriendRequestStatus {
    PENDING = 'pending',   // 待处理
    ACCEPTED = 'accepted', // 已接受
    REJECTED = 'rejected', // 已拒绝
    EXPIRED = 'expired'    // 已过期
  }
  ```
- `SendFriendRequestParams`: 发送好友请求参数
  ```typescript
  interface SendFriendRequestParams {
    receiver_id: string;  // 接收者ID
    message: string;      // 申请消息
  }
  ```
- `RespondFriendRequestParams`: 响应好友请求参数
  ```typescript
  interface RespondFriendRequestParams {
    req_id: string;           // 请求ID
    action: 'accept' | 'reject'; // 操作类型
  }
  ```
- `FriendRequestListResponse`: API 响应格式
  ```typescript
  interface FriendRequestListResponse {
    total: number;                    // 总数
    requests: FriendRequest[];        // 发送的请求
    receives: FriendRequest[];        // 收到的请求
  }
  ```

### 8. 👥 `GroupRequest` 群聊申请模块 <a id="8-grouprequest-群聊申请模块"></a>

#### 整体概述：
处理用户申请加入群聊和管理群聊加入申请，包括发送入群申请、审核申请、查看申请历史等功能。该模块维护两个独立的申请列表：用户发送的申请记录和需要用户审核的申请。

#### Service 职责

负责所有群聊申请相关的 API 交互：
- `sendGroupRequest(gid, apply_text)`: 发送加入群聊申请，API 端点 `POST /auth/groups/send_group_request`
- `getUserGroupRequests()`: 获取用户的群聊申请记录，API 端点 `GET /auth/groups/get_request_list`
- `getAllPendingRequests()`: 获取所有待审核的群聊申请（用户有权限审核的所有申请），API 端点 `GET /auth/groups/group_request_list`
- `respondGroupRequest(req_id, action)`: 处理群聊申请（接受/拒绝），API 端点 `POST /auth/groups/respond`
- `transformUserGroupRequestFromApi(data)`: 将用户申请 API 响应转换为前端格式
- `transformGroupApprovalFromApi(data)`: 将审核申请 API 响应转换为前端格式
- `transformSendGroupRequestResponse(data)`: 转换发送申请响应
- `transformGroupRequestFromApi(data)`: 通用转换函数

#### Store 职责

管理群聊申请的本地状态，维护两个独立的申请列表：
- **数据存储**：
  - `userRequests`: 存储用户发送的群聊申请记录数组
  - `approvalRequests`: 存储需要用户审核的群聊申请数组（所有待审核申请）
  - `isLoading`: 用户申请列表加载状态标识
  - `isLoadingApprovals`: 审核申请列表加载状态标识
  - `error`: 错误信息
- **计算属性**：
  - `pendingUserRequests`: 过滤出用户待处理的申请（状态为 PENDING）
  - `pendingApprovalRequests`: 过滤出待审核的申请（状态为 PENDING）
  - `totalUserRequests`: 用户申请总数
  - `totalPendingApprovals`: 待审核申请总数
  - `getPendingRequestsByGroup(gid)`: 获取指定群聊的待审核申请
- **操作方法**：
  - `fetchUserRequests()`: 从 API 获取用户申请记录列表
  - `fetchAllApprovalRequests()`: 从 API 获取所有待审核申请列表
  - `addUserRequest(request)`: 添加或更新用户申请记录
  - `addApprovalRequest(request)`: 添加或更新审核申请记录
  - `updateRequestStatus(req_id, status)`: 更新申请状态
  - `removeApprovalRequest(req_id)`: 从审核列表中移除申请
  - `reset()`: 重置所有状态

#### Composable 职责

封装群聊申请的业务逻辑和用户交互：
- **核心操作**：
  - `sendGroupRequest(gid, apply_text)`: 发送加入群聊申请，包含错误处理和用户提示
  - `respondGroupRequest(req_id, action, gid?)`: 处理群聊申请，接受后自动刷新群聊信息
- **WebSocket 集成**：
  - `handleNewGroupRequest(request)`: 处理新的群聊申请推送
  - `handleGroupRequestUpdate(req_id, status)`: 处理申请状态更新推送
- **状态暴露**：提供用户申请列表、审核申请列表、加载状态和各种计算属性供组件使用
- **错误处理**：统一的错误处理和用户提示机制

#### Types

- `GroupRequest`: 群聊申请接口
  ```typescript
  interface GroupRequest {
    req_id: string;                    // 请求ID
    gid: string;                       // 群聊ID
    sender_uid: string;                // 发送者用户ID
    apply_text: string;                // 申请文本
    create_time: number;               // 创建时间戳
    status: GroupRequestStatus;        // 请求状态
    groupProfile?: BaseProfile;        // 群聊资料缓存（id、头像、名称）
    userProfile?: BaseProfile;         // 申请用户资料缓存（id、头像、名称）
  }
  ```
- `GroupRequestStatus`: 群聊申请状态枚举
  ```typescript
  enum GroupRequestStatus {
    PENDING = 'pending',   // 待处理
    ACCEPTED = 'accepted', // 已接受
    REJECTED = 'rejected', // 已拒绝
    EXPIRED = 'expired'    // 已过期
  }
  ```
- `SendGroupRequestParams`: 发送群聊申请参数
  ```typescript
  interface SendGroupRequestParams {
    gid: string;           // 群聊ID
    apply_text: string | null; // 申请文本（可为null）
  }
  ```
- `RespondGroupRequestParams`: 响应群聊申请参数
  ```typescript
  interface RespondGroupRequestParams {
    req_id: string;                // 请求ID
    action: 'accept' | 'reject';  // 操作类型
  }
  ```
- `SendGroupRequestResponse`: 发送群聊申请响应
  ```typescript
  interface SendGroupRequestResponse {
    req_id: string;      // 申请ID
    gid: string;         // 群聊ID
    create_time: number; // 创建时间
  }
  ```
- `UserGroupRequestListResponse`: 用户申请记录列表响应
  ```typescript
  interface UserGroupRequestListResponse {
    total: number;                    // 总数
    requests: Array<{
      req_id: string;        // 申请ID
      gid: string;           // 群聊ID
      group_name: string;    // 群聊名称
      group_avatar: string;  // 群聊头像
      apply_text: string;    // 申请文本
      create_time: number;   // 创建时间
      status: string;        // 状态
    }>;                        // 用户申请记录
  }
  ```
- `GroupApprovalListResponse`: 群聊申请审核列表响应
  ```typescript
  interface GroupApprovalListResponse {
    total: number;                    // 总数
    requests: Array<{
      req_id: string;         // 申请ID
      gid: string;            // 群聊ID
      group_name: string;     // 群聊名称
      sender_uid: string;     // 申请人ID
      sender_name: string;    // 申请人姓名
      sender_avatar: string;  // 申请人头像
      apply_text: string;     // 申请文本
      create_time: number;    // 创建时间
      status: string;         // 状态
    }>;                         // 待审核申请
  }
  ```
- `RespondGroupRequestResponse`: 响应群聊申请结果
  ```typescript
  interface RespondGroupRequestResponse {
    success: boolean;  // 是否成功
    message: string;   // 响应消息
  }
  ```

### 9. 🔍 `Search` 搜索模块 <a id="9-search-搜索模块"></a>

#### 整体概述：
提供用户和群组的搜索功能，支持按关键词搜索，采用防抖机制优化性能。搜索模块作为独立功能模块，不需要在登录时初始化。

#### Service 职责

负责所有搜索相关的 API 交互：
- `searchUsers(params)`: 搜索用户，API 端点 `GET /search/users`
- `searchGroups(params)`: 搜索群组，API 端点 `GET /search/groups`
- 自动携带 Authorization Bearer token（通过 authApi）
- 处理 API 响应和错误（使用 console.log 标记执行位置）
- 返回原始 API 响应数据，不做数据转换
- 注：不在此层添加 snackbar（因为不是直接由组件调用）

#### Store 职责

管理搜索结果的状态：
- **数据存储**：
  - `userQuery`: 用户搜索关键词
  - `groupQuery`: 群组搜索关键词
  - `userSearchResults`: 用户搜索结果数组
  - `groupSearchResults`: 群组搜索结果数组
  - `userSearchPagination`: 用户搜索分页信息
  - `groupSearchPagination`: 群组搜索分页信息
- **操作方法**：
  - `setUserSearchResults(results, pagination)`: 设置用户搜索结果
  - `appendUserSearchResults(results, pagination)`: 追加用户搜索结果
  - `setGroupSearchResults(results, pagination)`: 设置群组搜索结果
  - `appendGroupSearchResults(results, pagination)`: 追加群组搜索结果
  - `clearUserResults()`: 清空用户搜索结果
  - `clearGroupResults()`: 清空群组搜索结果
  - `clearAllResults()`: 清空所有搜索结果
  - `reset()`: 重置所有状态
- **计算属性**：
  - `hasUserResults`: 是否有用户搜索结果
  - `hasGroupResults`: 是否有群组搜索结果
  - `userTotalCount`: 用户搜索总数
  - `groupTotalCount`: 群组搜索总数
- **状态保护**：使用 readonly 防止外部直接修改状态

#### Composable 职责

作为搜索功能的统一门面，封装所有搜索相关的业务逻辑：
- **核心搜索功能**：
  - `searchUsers(query, options)`: 搜索用户（含防抖处理）
  - `searchGroups(query, options)`: 搜索群组（含防抖处理）
  - `loadMoreUsers()`: 加载更多用户结果
  - `loadMoreGroups()`: 加载更多群组结果
- **状态管理**：
  - `reset()`: 重置搜索状态（用于 logout）
  - 注：不需要 init 方法（搜索模块无需在 login 时初始化）
- **防抖处理**：
  - 默认 500ms 防抖延迟，避免频繁 API 调用
  - 可配置的防抖延迟时间
- **错误处理**：
  - 捕获 Service 层错误，显示用户友好的错误信息
  - 使用 snackbar 提供用户反馈
- **数据转换**：
  - 调用 transformUserSearchResult 和 transformGroupSearchResult
  - 将 API 响应转换为标准内部数据格式
- **状态暴露**：
  - 搜索结果列表、分页信息、加载状态等
  - 暴露 SearchType 枚举供模板使用

#### Types

搜索相关的数据结构体：
- `SearchType`: 搜索类型枚举
  ```typescript
  enum SearchType {
    USER = 'user',    // 搜索用户
    GROUP = 'group'   // 搜索群组
  }
  ```
- `SearchUsersParams`: 搜索用户参数
  ```typescript
  interface SearchUsersParams {
    query: string;    // 搜索关键词
    page?: number;    // 页码（默认1）
    limit?: number;   // 每页数量（默认20）
  }
  ```
- `SearchGroupsParams`: 搜索群组参数
  ```typescript
  interface SearchGroupsParams {
    query: string;    // 搜索关键词
    page?: number;    // 页码（默认1）
    limit?: number;   // 每页数量（默认20）
  }
  ```
- `UserSearchResult`: 用户搜索结果
  ```typescript
  interface UserSearchResult {
    uid: string;           // 用户ID
    username: string;      // 用户名
    avatar?: string;       // 头像URL
    bio?: string;          // 个人简介
    isFriend?: boolean;    // 是否为好友
  }
  ```
- `GroupSearchResult`: 群组搜索结果
  ```typescript
  interface GroupSearchResult {
    gid: string;           // 群组ID
    group_name: string;    // 群组名称
    avatar?: string;       // 群组头像
    group_intro?: string;  // 群组简介
    member_count?: number; // 成员数量
    isInGroup?: boolean;   // 是否已加入群组
  }
  ```
- `SearchUsersResponse`: 用户搜索API响应
  ```typescript
  interface SearchUsersResponse {
    results: UserSearchResult[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }
  ```
- `SearchGroupsResponse`: 群组搜索API响应
  ```typescript
  interface SearchGroupsResponse {
    results: GroupSearchResult[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }
  ```
- 数据转换函数：
  - `transformUserSearchResult(data)`: 将用户搜索API响应转换为内部格式
  - `transformGroupSearchResult(data)`: 将群组搜索API响应转换为内部格式

### 10. 📂 `file` 文件模块 <a id="10-file-文件模块"></a>

#### Service 职责

* 负责 **文件上传** 和 **下载** API 交互。

#### Store 职责

* 负责 **文件管理** 的状态存储。

#### Composable 职责

* 封装 **文件操作** 的业务逻辑。

#### Types

* 文件相关的数据结构体。

### 11. 🔎 `LocalSearch` 本地搜索模块 <a id="11-localsearch-本地搜索模块"></a>

#### 整体概述：
本地搜索模块提供客户端搜索功能，无需API调用，直接在已加载的本地数据中搜索。与search模块（服务端搜索）不同，localSearch专门搜索本地缓存的好友、群组、会话和消息数据。支持多种搜索类型、过滤条件、分页加载，并具备防抖、缓存和历史记录等性能优化功能。该模块作为独立功能模块，不需要在登录时初始化。

#### Service 职责

负责所有本地搜索相关的逻辑实现：
- `searchLocal()`: 主搜索入口，根据类型分发到具体搜索方法
- `searchFriends()`: 搜索好友列表（支持黑名单过滤、标签过滤、备注/用户名/简介匹配）
- `searchGroups()`: 搜索群组列表（群名称和群简介搜索）
- `searchChats()`: 搜索会话列表（会话名称和最后消息搜索）
- `searchMessages()`: 搜索消息内容，支持：
  - 消息类型过滤
  - 日期范围过滤
  - 特定会话过滤
  - 内容高亮生成
  - 分页支持
- `generateHighlights()`: 生成搜索内容的高亮片段（带上下文）
- `getChatName/getSenderName()`: 获取会话名称和发送者名称的辅助方法

**数据源**：
- 从 friendStore、groupStore、chatStore 等读取本地数据
- 从 messageService 的消息缓存中搜索历史消息
- 实现相关性排序（如好友搜索中备注优先于用户名）

#### Store 职责

管理本地搜索的响应式状态：
- **数据存储**：
  - `state.query`: 当前搜索关键词
  - `state.type`: 当前搜索类型
  - `state.results`: 各类型搜索结果
  - `state.stats`: 搜索结果统计
  - `state.pagination`: 各类型的分页信息
- **搜索历史管理**：
  - `searchHistory`: 存储最近10条搜索记录
  - `addToHistory/removeFromHistory/clearHistory`: 历史记录管理方法
- **计算属性**：
  - `currentTypeResults`: 根据当前类型返回对应结果
  - `hasResults`: 是否有搜索结果
  - `currentPagination`: 当前类型的分页信息
  - `loading`: 综合加载状态
- **状态管理方法**：
  - `setSearchType/setQuery`: 设置搜索参数
  - `setResults/appendResults`: 设置或追加搜索结果
  - `setLoading/setLoadingMore`: 管理加载状态
  - `updatePagination/resetPagination`: 分页管理
  - `clearResults/reset`: 清除结果或重置状态

#### Composable 职责

作为本地搜索功能的统一门面，封装所有搜索相关的业务逻辑：
- **核心搜索功能**：
  - `search(query, immediate)`: 执行搜索（带300ms防抖）
  - `switchSearchType(type)`: 切换搜索类型（自动重新搜索）
  - `loadMore()`: 加载更多结果（支持无限滚动）
  - `clearSearch()`: 清除搜索结果
  - `reset()`: 重置整个搜索状态
- **搜索历史管理**：
  - `searchFromHistory(query)`: 从历史记录执行搜索
  - `removeFromHistory(query)`: 删除特定历史记录
  - `clearHistory()`: 清空所有历史记录
- **性能优化**：
  - **防抖处理**：默认300ms延迟，避免频繁搜索
  - **结果缓存**：LRU缓存策略，最多100条缓存
  - **智能加载**：根据结果数量判断是否还有更多数据
- **错误处理**：
  - 捕获搜索过程中的错误
  - 使用snackbar显示用户友好的错误提示
- **状态暴露**：
  - 响应式的搜索状态、结果、加载状态
  - 搜索类型枚举供组件使用

#### Types

本地搜索相关的数据结构体：
- `LocalSearchType`: 本地搜索类型枚举
  ```typescript
  enum LocalSearchType {
    FRIEND = 'friend',   // 好友搜索
    GROUP = 'group',     // 群聊搜索
    CHAT = 'chat',       // 会话搜索
    MESSAGE = 'message', // 消息内容搜索
    ALL = 'all',         // 全局搜索
  }
  ```
- `LocalSearchParams`: 本地搜索参数
  ```typescript
  interface LocalSearchParams {
    query: string;                 // 搜索关键词
    type: LocalSearchType;         // 搜索类型
    limit?: number;               // 结果数量限制，默认20
    offset?: number;              // 结果偏移量，用于分页
    filters?: {                   // 过滤条件
      includeBlacklisted?: boolean; // 好友搜索：是否包含黑名单
      tags?: string[];            // 好友搜索：按标签过滤
      messageTypes?: MessageType[]; // 消息搜索：按消息类型过滤
      dateRange?: {               // 消息搜索：按日期范围过滤
        start: Date;
        end: Date;
      };
      chatIds?: string[];         // 消息搜索：限制在特定会话中
    };
  }
  ```
- `LocalSearchResult`: 综合搜索结果
  ```typescript
  interface LocalSearchResult {
    friends: UserSearchResult[];   // 好友搜索结果
    groups: GroupSearchResult[];   // 群聊搜索结果
    chats: ChatSearchResult[];     // 会话搜索结果
    messages: MessageSearchResult[]; // 消息搜索结果
  }
  ```
- `MessageSearchResult`: 消息搜索结果
  ```typescript
  interface MessageSearchResult {
    messageId: string;       // 消息ID
    chatId: string;         // 所属会话ID
    chatName: string;       // 会话名称
    chatType: 'private' | 'group'; // 会话类型
    senderId: string;       // 发送者ID
    senderName: string;     // 发送者名称
    content: string;        // 消息内容
    contentType: ContentType; // 消息内容类型
    timestamp: number;      // 消息时间戳
    highlights: string[];   // 高亮片段列表
  }
  ```
- `ChatSearchResult`: 会话搜索结果
  ```typescript
  interface ChatSearchResult {
    chatId: string;              // 会话ID
    name: string;                // 会话名称
    type: 'private' | 'group';   // 会话类型
    lastMessage?: string;        // 最后消息内容
    unreadCount?: number;        // 未读消息数量
    isPinned?: boolean;          // 是否置顶
    participantNames?: string[]; // 参与者名称列表（群聊）
  }
  ```
- `LocalSearchStats`: 搜索结果统计
  ```typescript
  interface LocalSearchStats {
    totalFriends: number;    // 好友结果数量
    totalGroups: number;     // 群聊结果数量
    totalChats: number;      // 会话结果数量
    totalMessages: number;   // 消息结果数量
    totalResults: number;    // 总结果数量
  }
  ```
- `SearchHistoryItem`: 搜索历史记录
  ```typescript
  interface SearchHistoryItem {
    query: string;              // 搜索关键词
    timestamp: number;          // 搜索时间
    type: LocalSearchType;      // 搜索类型
  }
  ```

---

## 🏗 架构决策与规范

### 1. 分层职责原则

#### Service 层（数据访问层）
- **职责**：纯粹的数据访问和 API 调用
- **规范**：
  - 不包含任何业务逻辑或 UI 相关代码
  - 负责请求参数的格式转换（undefined → null）
  - 统一的错误处理和日志记录
  - 数据转换：使用 transform 函数标准化 API 响应
- **禁止事项**：
  - ❌ 不能使用 snackbar 或任何 UI 组件
  - ❌ 不能直接操作 Store 状态
  - ❌ 不能包含业务逻辑判断
- **已完成调整的模块**：✅ Chat、✅ Friend、✅ FriendRequest、✅ User

#### Store 层（状态管理层）
- **职责**：纯粹的状态管理和数据缓存
- **规范**：
  - 使用 Map 结构优化查询性能
  - 提供丰富的计算属性供组件使用
  - 批量操作方法优化性能
  - **不包含任何Service调用和UI组件调用**
  - 智能缓存策略避免重复请求
- **设计原则**：
  - 状态只读暴露（使用 readonly）
  - 提供灵活的查询方法
  - 支持强制刷新和缓存命中
- **已完成调整的模块**：✅ Chat、✅ Friend、✅ FriendRequest、✅ Group、✅ User

#### Composable 层（业务逻辑层）
- **职责**：作为唯一门面，封装业务逻辑和用户交互
- **规范**：
  - **唯一调用Service的层级**
  - 协调 Service 和 Store 层的交互
  - 提供增值功能（如智能搜索、增强列表）
  - **统一的错误处理和snackbar用户提示**
  - WebSocket 推送处理
  - 批量操作支持
  - **标准化init()和reset()方法**
- **设计原则**：
  - 向后兼容：保留基础方法
  - 提供丰富的使用示例
  - 支持可选参数和高级配置
- **已完成调整的模块**：✅ Chat、✅ Friend、✅ FriendRequest、✅ Group、✅ GroupRequest、✅ User

### 2. Snackbar 使用原则

#### 使用层级（架构调整后）
- **Composable 层**：✅ **唯一推荐使用层级**
  - 所有UI反馈和用户提示都在此层处理
  - 统一的错误提示和成功反馈
  - 批量操作结果统计
  - Service层错误的用户友好转换

- **Store 层**：❌ **严格禁止**
  - 不包含任何UI组件调用
  - 不处理用户反馈
  - 专注于纯数据管理

- **Service 层**：❌ **严格禁止**
  - 保持纯粹性，不包含 UI 逻辑
  - 只抛出错误，不处理UI反馈

#### 使用规范（架构调整后）
```typescript
// ✅ 正确：在 Composable 中使用（唯一推荐方式）
const { showSuccess, showError } = useSnackbar();

const sendRequest = async () => {
  try {
    await service.sendRequest(params);
    store.setRequest(response);
    showSuccess('发送成功');
  } catch (error) {
    showError('发送失败：' + error.message);
  }
};

// ❌ 错误：在 Store 中使用
const store = defineStore('example', () => {
  const createGroup = async (params) => {
    try {
      await service.createGroup(params); // ❌ Store不应调用Service
      addGroup(group);
      showSuccess('创建成功'); // ❌ Store不应使用UI组件
    } catch (error) {
      showError(error.message); // ❌ Store不应使用UI组件
    }
  };
});

// ❌ 错误：在 Service 中使用
async sendRequest(params) {
  try {
    // API 调用
    showSuccess('成功'); // ❌ Service不应使用UI组件
  } catch (error) {
    showError('失败'); // ❌ Service不应使用UI组件
  }
}
```

#### 标准模式
```typescript
// Service 层 - 纯数据访问
export const exampleService = {
  async sendData(params) {
    try {
      const response = await api.post('/endpoint', params);
      console.log('exampleService: 请求成功', response.data);
      return response.data;
    } catch (error) {
      console.error('exampleService: 请求失败', error);
      throw error; // 向上抛出，不处理UI
    }
  }
};

// Store 层 - 纯数据管理
export const useExampleStore = defineStore('example', () => {
  const data = ref([]);

  const setData = (newData) => {
    data.value = newData;
    console.log('exampleStore: 数据已更新');
  };

  return { data: readonly(data), setData };
});

// Composable 层 - 唯一门面
export function useExample() {
  const store = useExampleStore();
  const { showSuccess, showError } = useSnackbar();

  const fetchData = async (params) => {
    try {
      const data = await exampleService.sendData(params);
      store.setData(data);
      showSuccess('操作成功');
      return data;
    } catch (error) {
      showError('操作失败：' + error.message);
      throw error;
    }
  };

  return { fetchData, init, reset };
}
```

### 3. 错误处理流程

#### 错误处理层级
1. **Service 层**：
   - 捕获 API 错误
   - 记录详细日志
   - 向上抛出标准化错误

2. **Composable 层**：
   - 捕获业务错误
   - 显示用户友好的错误信息
   - 可选的错误恢复逻辑

3. **组件层**：
   - 展示错误状态
   - 提供重试机制
   - 错误边界处理

#### 错误处理示例
```typescript
// Service 层
async createGroup(params) {
  try {
    const response = await api.post('/groups/create', params);
    return transformData(response.data);
  } catch (error) {
    console.error('API错误:', error);
    // 可以对特定错误进行处理
    if (error.response?.status === 409) {
      throw new Error('群聊名称已存在');
    }
    throw error; // 向上抛出
  }
}

// Composable 层
const createGroupWithFeedback = async (params) => {
  try {
    const group = await service.createGroup(params);
    store.addGroup(group);
    showSuccess('群聊创建成功');
    return group;
  } catch (error) {
    // 显示用户友好的错误信息
    showError(error.message || '创建失败，请重试');
    // 可选：记录错误上报
    trackError('create_group_failed', error);
    throw error;
  }
};
```

### 4. 请求体字段处理规则

#### 规范说明
为确保 API 兼容性，所有请求体中的 `undefined` 字段必须转换为 `null`：

```typescript
// ✅ 正确：undefined 转换为 null
const requestParams = {
  group_name: params.group_name || null,
  avatar: params.avatar || null,
  group_intro: params.group_intro || null,
  is_pinned: params.is_pinned ?? null,  // 布尔值使用 nullish coalescing
};

// ❌ 错误：直接传递 undefined
const requestParams = {
  group_name: params.group_name,  // 可能是 undefined
  avatar: params.avatar,          // 可能是 undefined
};
```

#### 实现建议
1. **Service 层统一处理**：在每个 API 调用处进行转换
2. **工具函数辅助**：可创建通用的字段转换函数
3. **TypeScript 支持**：使用可选类型明确标识可选字段

```typescript
// 工具函数示例
const cleanParams = <T extends Record<string, any>>(params: T): T => {
  const cleaned = {} as T;
  for (const key in params) {
    cleaned[key] = params[key] ?? null;
  }
  return cleaned;
};

// 使用
const requestParams = cleanParams(params);
```

### 5. 性能优化建议

#### 状态管理优化
- 使用 Map 替代数组进行频繁查询
- 实现智能缓存策略
- 批量更新减少响应式触发

#### API 请求优化
- 避免重复请求（缓存机制）
- 并行请求使用 Promise.all
- 实现请求去重和防抖

#### 组件渲染优化
- 使用 computed 缓存计算结果
- 虚拟滚动处理大列表
- 懒加载非关键数据

### 6. 代码组织最佳实践

#### 文件命名规范
- Service：`xxxService.ts`
- Store：`xxxStore.ts`
- Composable：`useXxx.ts`
- Types：`xxx.ts` 或 `index.ts`

#### 导出规范
```typescript
// Service - 默认导出
export const groupService = { ... };

// Store - 命名导出
export const useGroupStore = defineStore('group', () => { ... });

// Composable - 命名导出函数
export function useGroup() { ... }

// Types - 按需导出
export type Group = { ... };
export interface GroupMember { ... }
```

#### 依赖注入原则
- Store 不应直接依赖其他 Store
- Composable 可以组合多个 Store
- Service 保持独立，不依赖 Store

通过遵循这些架构决策和规范，可以确保代码的一致性、可维护性和可扩展性。