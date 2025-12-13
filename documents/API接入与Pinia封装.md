## 📑 模块快速导航

| 模块 | 功能描述 |
| :--- | :--- |
| [🔐 auth](#1-auth-认证模块) | 用户认证与登录 |
| [👤 user](#2-user-用户模块) | 用户信息管理 |
| [💬 chat](#3-chat-会话模块) | 会话列表管理 |
| [📧 message](#4-message-消息模块) | 消息发送与接收 |
| [🤝 friend](#5-friend-好友模块) | 好友关系管理 |
| [👥 group](#6-group-群组模块) | 群组管理 |
| [📨 Request](#7-request-好友请求模块) | 好友请求处理 |
| [🔍 Search](#8-search-搜索模块) | 用户搜索功能 |
| [📂 file](#9-file-文件模块) | 文件上传下载 |

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

#### Service 职责

* 负责所有与 **认证** 相关的 API 交互。

#### Store 职责

* 负责 **本地存储和管理** 认证状态。

#### Composable 职责

* 封装认证相关的 UI 逻辑和操作。

#### Types

* 认证相关的数据结构体。

### 2. 👤 `user` 用户模块 <a id="2-user-用户模块"></a>

#### Service 职责

* 负责用户信息的 **获取和更新**。

#### Store 职责

* 负责 **缓存和管理** 用户信息。

#### Composable 职责

* 封装用户信息的 **展示和编辑** 逻辑。

#### Types

* 用户相关的数据结构体。

### 3. 💬 `chat` 会话模块 <a id="3-chat-会话模块"></a>

#### 整体概述：
用户登录后，store初始化获取会话列表；
用户从联系人卡片点击"发送消息"，创建或获取对应的私聊会话；
用户从群组卡片点击"进入群聊"，创建或获取对应的群聊会话；
用户切换会话时，自动重置该会话的未读消息数；
用户可以置顶重要会话，或删除不需要的会话。

#### Service 职责

* 负责会话相关的所有 API 交互：
* `getChatList()`: 获取用户的会话列表
* `getPrivateChat(fid)`: 获取或创建与指定好友的私聊会话（"获取即创建"模式）
* `getGroupChat(gid)`: 获取或创建指定群聊会话
* `updateIsPinned(chatId, chatType, isPinned)`: 更新会话置顶状态
* `transformApiChat(apiChat)`: 将API响应转换为前端Chat格式

#### Store 职责

* **数据存储**：
  * `chatList`: 使用 `ref<Chat[]>` 存储所有会话列表
  * `activeChatId`: 当前选中的会话ID
  * `isLoading`: 加载状态
  * `onlineBoardVisible`: 在线面板显示状态
* **状态管理**：
  * `chatById`: 根据 ID 获取会话的计算属性
* **核心操作方法**：
  * `fetchChatList()`: 获取会话列表
  * `setActiveChat(chatId)`: 设置当前活跃会话
  * `getChatByid(chatId)`: 根据ID获取会话
  * `deleteChatByid(chatId)`: 删除会话（仅前端删除）
  * `updateChatList(chats)`: 更新整个会话列表并排序
  * `addChat(chat)`: 添加或更新单个会话
  * `updateChatLastMessage(chatId, message)`: 更新会话最新消息
  * `updateIsPinned(chatId, type, isPinned)`: 更新会话置顶状态
* **未读消息管理**：
  * `updateChatUnreadCount(chatId, count)`: 设置未读消息数
  * `incrementUnreadCount(chatId)`: 未读消息数+1
  * `resetUnreadCount(chatId)`: 重置未读消息数为0
* **辅助方法**：
  * `sortChatList()`: 会话列表排序（置顶优先，按更新时间）
  * `setOnlineBoardVisible(visible)`: 设置在线面板显示状态
  * `setLoading(loading)`: 设置加载状态
  * `reset()`: 重置所有状态

#### Composable 职责

* **封装会话操作逻辑**：
  * `selectChat(chatId)`: 选择会话并重置未读数
  * `createChat(fidOrGid, chatType)`: 创建或获取会话（支持私聊和群聊）
* **状态暴露**：
  * `activeChatId`: 当前活跃会话ID
  * `activeChat`: 当前活跃会话对象
  * `chatList`: 会话列表
  * `isLoading`: 加载状态

#### Types

* `Chat`: 会话接口定义
  ```typescript
  interface Chat {
    id: string; // pid/gid
    isPinned: boolean;
    type: ChatType; // 'private' | 'group'
    lastMessage?: string;
    updatedAt?: string;
    unreadCount: number;
    avatar?: string;
    name: string;
  }
  ```
* `ChatType`: 聊天类型枚举
  ```typescript
  enum ChatType {
    PRIVATE = 'private',
    GROUP = 'group'
  }
  ```
* `ChatItemProps`: 聊天项组件属性
* `ChatListProps`: 聊天列表组件属性
* `ChatAreaProps`: 聊天区域组件属性

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
auth登录后，store初始化获取好友列表；
用户点击联系人按钮，显示好友列表；
用户点击标签分组按钮，先获取所有标签，再根据标签获取分组内的好友；
用户点击好友，获取详细资料；
备注：组件传值和显示的contact和FriendWithUserInfo不一致，需要统一或者转换。

#### Service 职责

* 负责好友的增删改查 API。
* `getFriendsFromApi()`: 获取好友列表（包括普通好友和黑名单）
* `removeFriend(friendId)`: 删除好友
* `getFriendProfile(friendId, userId)`: 获取单个好友的详细资料
* `updateFriendProfile(friendId, remark, isBlacklisted, tag)`: 更新好友资料（备注、黑名单、分组标签）
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
  * `updateFriendProfile()`: 更新本地好友资料
  * `addFriend/removeFriend`: 添加/删除好友
  * `updateFriendTag/batchUpdateTags`: 标签管理

#### Composable 职责

* **封装好友操作逻辑**：
  * `removeFriend()`: 删除好友（调用API并更新本地状态）
  * `updateFriendProfile()`: 更新好友资料（调用API并更新本地状态）
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
* `UpdateFriendProfileParams`: 更新好友资料的API请求参数
* `FriendProfileFromApi`: API返回的好友资料格式
* `UserInfo`: 用户详细信息（账户、性别、地区、邮箱）

### 6. 👥 `group` 群组模块 <a id="6-group-群组模块"></a>

#### Service 职责

* 负责群组的操作 API。

#### Store 职责

* 维护群组相关的状态管理。

#### Composable 职责

* 封装群组相关的展示和操作逻辑。

#### Types
* 群组相关的数据结构体。

### 7. 📨 `Request` 好友请求模块 <a id="7-request-好友请求模块"></a>

#### Service 职责

* 负责好友请求相关的 API 交互。

#### Store 职责

* 负责好友请求的状态管理。

#### Composable 职责

* 封装好友请求的业务逻辑。

#### Types

* 好友请求相关的数据结构体。

### 8. 🔍 `Search` 搜索模块 <a id="8-search-搜索模块"></a>

#### Service 职责

* 负责搜索相关的 API 交互。

#### Store 职责

* 负责搜索结果的状态管理。

#### Composable 职责

* 封装搜索的业务逻辑。

#### Types

* 搜索相关的数据结构体。

### 9. 📂 `file` 文件模块 <a id="9-file-文件模块"></a>

#### Service 职责

* 负责 **文件上传** 和 **下载** API 交互。

#### Store 职责

* 负责 **文件管理** 的状态存储。

#### Composable 职责

* 封装 **文件操作** 的业务逻辑。

#### Types

* 文件相关的数据结构体。