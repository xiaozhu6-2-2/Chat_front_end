## 📑 模块快速导航

| 模块 | 功能描述 |
| :--- | :--- |
| [🔐 auth](#1-auth-认证模块) | 用户认证与登录 |
| [👤 user](#2-user-用户模块) | 用户信息管理 |
| [💬 chat](#3-chat-会话模块) | 会话列表管理 |
| [📧 message](#4-message-消息模块) | 消息发送与接收 |
| [🤝 friend](#5-friend-好友模块) | 好友关系管理 |
| [👥 group](#6-group-群组模块) | 群组管理 |
| [📨 FriendRequest](#7-friendrequest-好友请求模块) | 好友请求处理 |
| [👥 GroupRequest](#8-grouprequest-群聊申请模块) | 群聊申请处理 |
| [🔍 Search](#9-search-搜索模块) | 用户搜索功能 |
| [📂 file](#10-file-文件模块) | 文件上传下载 |

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

#### 整体概述：
用户个人信息管理模块，负责当前用户信息的获取、更新和头像上传。在用户登录后由auth模块自动初始化，登出时自动重置。

#### Service 职责

负责所有用户信息相关的 API 交互：
- `getCurrentUser()`: 获取当前用户详细信息，API 端点 `GET /auth/user/user-info`
- `updateProfile(options)`: 更新用户信息，API 端点 `POST /auth/user/update-user-info`
- `uploadAvatar(file)`: 上传用户头像，API 端点 `POST /auth/user/upload-avatar`
- 文件验证：检查文件类型和大小（最大5MB）

#### Store 职责

维护用户信息的本地状态管理：
- **数据存储**：
  - `currentUser`: 当前用户信息对象
  - `isLoading`: 加载状态标识
- **计算属性**：
  - `isLoggedIn`: 是否已登录
  - `currentUserId`: 当前用户ID
  - `currentUsername`: 当前用户名
  - `currentUserAvatar`: 当前用户头像
  - `currentAccount`: 当前用户账号
- **操作方法**：
  - `fetchCurrentUser()`: 获取用户信息（智能缓存，避免重复请求）
  - `refreshCurrentUser()`: 强制刷新用户信息
  - `updateUserProfile(options)`: 更新用户资料
  - `setCurrentUser/clearCurrentUser`: 设置/清除用户信息
  - `reset()`: 重置所有状态

#### Composable 职责

封装用户头像上传的业务逻辑（涉及多个步骤）：
- `uploadAvatar(file)`:
  * 调用service上传文件
  * 成功后更新store中的头像信息
  * 显示成功提示给用户
  * 返回头像URL

**注意**：组件应直接使用userStore获取状态和简单方法，composable只封装复杂的业务逻辑

#### Types

用户相关的数据结构体：
- `User`: 用户信息接口（继承BaseProfile）
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
- `UserFromApi`: API返回的用户信息格式
- `UserProfileUpdateOptions`: 更新用户资料的选项
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
- `UserApiToUser()`: API数据转换函数

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
处理好友关系的申请、响应和管理，包括发送好友请求、接受/拒绝请求、查看请求历史等功能。

#### Service 职责

负责所有好友请求相关的 API 交互：
- `sendFriendRequest(receiver_id, message)`: 发送好友请求，API 端点 `POST /auth/friends/request`
- `respondFriendRequest(req_id, action)`: 响应好友请求（接受/拒绝），API 端点 `POST /auth/friends/respond`
- `getFriendRequestList()`: 获取好友请求列表（发送和接收），API 端点 `GET /auth/friends/request-list`
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

#### Service 职责

* 负责搜索相关的 API 交互。

#### Store 职责

* 负责搜索结果的状态管理。

#### Composable 职责

* 封装搜索的业务逻辑。

#### Types

* 搜索相关的数据结构体。

### 10. 📂 `file` 文件模块 <a id="10-file-文件模块"></a>

#### Service 职责

* 负责 **文件上传** 和 **下载** API 交互。

#### Store 职责

* 负责 **文件管理** 的状态存储。

#### Composable 职责

* 封装 **文件操作** 的业务逻辑。

#### Types

* 文件相关的数据结构体。

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

#### Store 层（状态管理层）
- **职责**：本地状态管理和数据缓存
- **规范**：
  - 使用 Map 结构优化查询性能
  - 提供丰富的计算属性供组件使用
  - 批量操作方法优化性能
  - 组件直接调用的方法可包含 snackbar 反馈
  - 智能缓存策略避免重复请求
- **设计原则**：
  - 状态只读暴露（使用 readonly）
  - 提供灵活的查询方法
  - 支持强制刷新和缓存命中

#### Composable 层（业务逻辑层）
- **职责**：封装业务逻辑和用户交互
- **规范**：
  - 协调 Service 和 Store 层的交互
  - 提供增值功能（如智能搜索、增强列表）
  - 统一的错误处理和用户提示
  - WebSocket 推送处理
  - 批量操作支持
- **设计原则**：
  - 向后兼容：保留基础方法
  - 提供丰富的使用示例
  - 支持可选参数和高级配置

### 2. Snackbar 使用原则

#### 使用层级
- **Composable 层**：✅ 鼓励使用
  - 提供用户操作反馈
  - 统一的错误提示
  - 批量操作结果统计

- **Store 层**：⚠️ 仅限组件直接调用的方法
  - `createGroup`, `updateGroupInfo`, `leaveGroup` 等方法
  - 纯内部方法不应包含 snackbar

- **Service 层**：❌ 严格禁止
  - 保持纯粹性，不包含 UI 逻辑

#### 使用规范
```typescript
// ✅ 正确：在 Composable 中使用
const sendRequest = async () => {
  try {
    await service.sendRequest(params);
    showSuccess('发送成功');
  } catch (error) {
    showError('发送失败：' + error.message);
  }
};

// ✅ 正确：在 Store 的组件调用方法中使用
const createGroup = async (params) => {
  try {
    await service.createGroup(params);
    addGroup(group);
    showSuccess('创建成功');
  } catch (error) {
    showError(error.message);
  }
};

// ❌ 错误：在 Service 中使用
async sendRequest(params) {
  try {
    // API 调用
    showSuccess('成功'); // 不应该在这里
  } catch (error) {
    showError('失败'); // 不应该在这里
  }
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