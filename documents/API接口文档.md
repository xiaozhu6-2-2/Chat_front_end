# 畅聊应用 API 接口文档

## 目录

- [基础信息](#基础信息)
- [响应格式](#响应格式)
- [认证相关API](#认证相关api)
- [个人用户相关API](#个人用户相关api)
- [会话管理API](#会话管理api)
- [消息管理API](#消息管理api)
- [好友管理API](#好友管理api)
- [群聊管理API](#群聊管理api)
- [在线状态API](#在线状态api)
- [文件管理API](#文件管理api)
- [WebSocket API](#websocket-api)
- [常见HTTP状态码](#常见http状态码)
- [待办事项](#待办事项)

## 基础信息

- **基础URL**: `/api/v1`
- **认证方式**: JWT Token (Bearer Token)
- **数据格式**: JSON

## 响应格式

所有API响应都遵循统一的JSON格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1630000000000
}
```

## 认证相关API

### 1. 获取公钥 (√√√)

**URL**: `/noauth/auth/session-key`
**方法**: GET
**场景**: 获取公钥，在后续API的调用过程中，使用公钥加密传输的数据，提高数据安全性。

**响应体**:

成功响应 (200):
```json
{
  "public_key": "公钥字符串"
}
```

错误响应:
- 500 Internal Server Error: 服务器内部错误
- 其他网络错误

### 2. 用户注册 (√√√)

**URL**: `/noauth/auth/register`
**方法**: POST
**场景**: 新用户通过提供必要信息完成账号注册。系统验证输入合法性、检查唯一性约束，若校验通过则创建用户账号，并返回注册成功响应；否则返回相应错误信息。

**请求体**:
```json
{
  "account": "encrypted_email",      // 加密后的邮箱
  "password": "encrypted_password",  // 加密后的密码
  "username": "用户名",
  "gender": "male|female|other",
  "region": "地区",
  "bio": "个人简介",                  // 可选
  "avator": "头像"                    // 可选
}
```

**响应体**:

成功响应 (200):
```json
{
  "success": "true"
}
```

错误处理:
- 409 Conflict: 邮箱已被注册
- 500 Internal Server Error: 服务器错误
- 其他错误: 网络连接失败等

### 3. 用户登录 (√√√)

**URL**: `/noauth/auth/login`
**方法**: POST
**场景**: 已注册用户通过提供身份凭证进行登录。系统验证凭证有效性，若匹配成功，则生成并返回访问令牌及用户基本信息；若凭证错误、账号不存在或被禁用，则返回相应错误提示。

**请求体**:
```json
{
  "account": "encrypted_email",      // 加密后的邮箱
  "password": "encrypted_password"   // 加密后的密码
}
```

**成功响应 (200)**:
```json
{
  "username": "用户名",
  "token": "token",
  "uid": "用户ID"
}
```

**错误处理**:
- 401 Unauthorized: 账号或密码错误
- 500 Internal Server Error: 服务器错误
- 网络连接失败: NETWORK_ERROR

## 个人用户相关API

### 4. 验证用户token是否有效

**URL**: `/auth/user/validate`
**方法**: GET
**场景**: 前端进入home界面，需要验证token是否有效（错误、过期），否则退回到登录界面

**请求头**: `Authorization: Bearer {token}`

**成功响应（200）**:
```json
{
  "valid": bool
}
```

### 5. 用户本人获取个人信息（√√）

**URL**: `/auth/user/user-info`
**方法**: GET
**场景**: 用户登录后右上角显示用户名和头像；用户查看个人资料

**请求头**: `Authorization: Bearer {token}`

**响应体**:

成功响应 (200):
```json
{
  "uid": "123",
  "account": "123@666.com",
  "username": "Lihua",
  "gender": "male|female|other",
  "region": "GuangXi",
  "email": "aaa",
  "create_time": "timestamp",
  "avatar": "url",
  "bio": "Hello World!"  // 简介
}
```

### 6. 用户本人更新个人信息 （√√）

**URL**: `/auth/user/update-user-info`
**方法**: POST
**场景**: 已登录的用户修改本人的个人资料（如地区、性别）。

**请求头**: `Authorization: Bearer {token}`

**请求体**:
```json
{
  "username": "Lihua",
  "gender": "male|female|other",
  "region": "GuangXi",
  "email": "aaa",
  "avatar": "url",
  "bio": "Hello World!"  // 简介
}
```

**成功响应 (200)**:
```json
{
  "success": "true"
}
```

### 7. 获取非好友用户资料（√√）

**URL**: `/auth/user/profile`
**方法**: POST
**场景**: 用户查看非好友的用户的个人资料。

**请求头**:
- `Authorization: Bearer {token}`
- `Content-Type: application/json`

**请求体**:
```json
{
  "uid": "user_67890"
}
```

**成功响应（200 OK）**:
```json
{
  "uid": "123",
  "account": "123@666.com",
  "username": "Lihua",
  "gender": "male|female|other",
  "region": "GuangXi",
  "email": "aaa",
  "avatar": "url",
  "bio": "Hello World!"  // 简介
}
```

## 会话管理API

### 8. 获取会话列表（√√）

**URL**: `/auth/chat/list`
**方法**: GET
**场景**: 主页面渲染时，消息栏的获取。拉取置顶会话+有未读消息的会话。

**请求头**:
```
Authorization: Bearer {token}
```

**响应体**:

成功响应 (200):
```json
{
  // 按照时间顺序排序
  // 注意私聊和群聊放在一起
  "chats": [
    {
      "id": "chat_67890",
      "is_pinned": true,
      "type": "private",
      "latest_message": "Hey! How are you?",  // 最新消息
      "updated_at": "2024-01-20T10:30:00Z",  // 最新消息的时间(时间戳）
      "unread_messages": 32,
      "avatar": "url",  // 好友头像
      "remark": "work-software"  // 备注/名字(后端实现判断）
    },
    {
      "id": "group_11111",
      "is_pinned": true,
      "type": "group",
      "latest_message": "Meeting at 3pm",
      "updated_at": "2024-01-20T09:15:00Z",
      "unread_messages": 31,
      "avatar": "url",
      "remark": "work-software"  // 备注/名字(后端实现判断）
    }
  ]
}
```

### 9. 获取指定私聊（√√）

**URL**: `/auth/chat/soloprivate`
**方法**: POST
**场景**: 在点击用户头像进入私聊，联系人表进入私聊，如果会话列表没有该会话，则获取私聊并加入会话列表

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "fid": "chat_67809"
}
```

**成功响应（200 OK）**:
```json
{
  "id": "chat_67890",
  "is_pinned": true,
  "type": "private",
  "latest_message": "Hey! How are you?",  // 最新消息
  "updated_at": "2024-01-20T10:30:00Z",  // 最新消息的时间
  "avatar": "url",
  "remark": "work-software"  // 备注/名字(后端实现判断）
}
```

### 10. 获取指定群聊（√√）

**URL**: `/auth/chat/sologroup`
**方法**: POST
**场景**: 在点击群头像进入私聊，联系人表进入群聊，如果会话列表没有该会话，则获取群聊并加入会话列表

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "gid": "123"
}
```

**成功响应（200 OK）**:
```json
{
  "id": "chat_67890",
  "is_pinned": true,
  "type": "group",
  "latest_message": "Hey! How are you?",  // 最新消息
  "updated_at": "2024-01-20T10:30:00Z",  // 最新消息的时间
  "avatar": "url",
  "remark": "work-software"  // 备注/名字(后端实现判断）
}
```

## 消息管理API

### 11. 获取私聊会话历史消息（√）

**URL**: `/auth/message/private_history`
**方法**: POST
**场景**:
1. 用户选取一个私聊时，获取该私聊历史消息，存储在chatstore.messages数组中
2. 获取会话列表后。初次拉取并统计未读消息数有两个方案：
   - 每页100条（未读消息数最为99+比较合适，但是会话一多会消耗资源），统计带未读标签的数量
   - 再设计一个API，拉取每个会话的未读消息并由前端计数，缩短初次加载时间，但是已经拉取的消息数量不统一，后续分页拉取需要处理一下；从而得到未读消息数

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "pid": "chat_67890",
  "limit": 50,  // 返回的数目限制
  "offset": 0   // 页数，前50页。。。50-100页等等
}
```

**成功响应（200 OK）**:
```json
{
  "messages": [
    {
      "type": "Private",
      "payload": {
        "messageId": "msg_001",
        "timestamp": 1705738600000,
        "chatId": "chat_67890",
        "senderId": "user_12345",
        "receiverId": "user_67890",
        "contentType": "text",
        "detail": "Hey! How are you?",
        "is_revoked": false,
        "is_read": true
      }
    },
    {
      "type": "Private",
      "payload": {
        "messageId": "msg_002",
        "timestamp": 1705738660000,
        "chatId": "chat_67890",
        "senderId": "user_67890",
        "receiverId": "user_12345",
        "contentType": "text",
        "detail": "I'm good, thanks! You?",
        "is_revoked": false,
        "is_read": true
      }
    }
  ],
  "hasMore": true,
  "total": 125
}
```

### 12. 获取群聊会话历史消息（√）

**URL**: `/auth/message/group_history`
**方法**: POST
**场景**: 用户选取一个群聊时，获取该群聊历史消息，存储在chatstore.messages数组中。初次拉取数量有两个方案：
1. 每页100条（未读消息数最为99+比较合适，但是会话一多会消耗资源），统计带未读标签的数量
2. 再设计一个API，拉取每个会话的未读消息并由前端计数，缩短初次加载时间，但是已经拉取的消息数量不统一，后续分页拉取需要处理一下；从而得到未读消息数

**请求体**:
```json
{
  "gid": "group_11111",
  "limit": 50,
  "offset": 0
}
```

**响应体**:
```json
{
  "messages": [
    {
      "type": "Group",
      "payload": {
        "messageId": "msg_001",
        "timestamp": 1705738600000,
        "gid": "chat_67890",
        "sender_id": "user_12345",
        "Type": "text",
        "detail": "Hey! How are you?",
        "is_revoked": false,
        "mentioned_uids": "123",
        "quote_msg_id": "666"
      },
      {
        "type": "Group",
        "payload": {
          "messageId": "msg_001",
          "timestamp": 1705738600000,
          "gid": "chat_67890",
          "sender_id": "user_12345",
          "Type": "text",
          "detail": "Hey! How are you?",
          "is_revoked": false,
          "mentioned_uids": "123",
          "quote_msg_id": "666"
        }
      }
    ],
    "hasMore": true,
    "total": 125
}
```

### 13. 标记消息为已读（√）

**URL**: `/auth/message/read`
**方法**: POST
**场景**:
1. 用户进入会话界面时，标记该会话时间戳之前该接收者未读的消息为已读
2. 用户在当前会话收到新消息，标记该会话时间戳之前该接收者未读的消息为已读(前端需要防抖)。在线状态的消息通过websocket通知对方。

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "chatId": "chat_67890",  // 会话ID
  "type": "private/group", // 标记类型为私聊
  "timestamp": "timestamp" // 时间戳
}
```

**成功响应（200 OK）**: 空响应

### 14. 获取群聊消息已读状态

**URL**: `/auth/message/read_count`
**方法**: POST
**场景**: 只显示用户发送的群聊消息的已读人数。
1. 消息即将进入视窗时，调用API并显示已读人数
2. 按时间轮询，对于当前视窗的消息，调用API获取已读人数。为避免频繁调用，前端需要在pinia缓存消息的已读状态。

**请求体**:
```json
{
  "message_ids": ["msgid1", "msgid2", "msgid3", ...]
}
```

**响应体**:
```json
{
  "msgid1": { "read_count": 10 },
  "msgid2": { "read_count": 25 },
  "msgid3": { "read_count": 5 }
}
```

## 好友管理API

### 15. 搜索用户（√√）

**URL**: `/auth/friends/search`
**方法**: POST
**场景**: 已登录用户可通过关键词搜索平台上的其他用户。系统根据关键词匹配符合条件的用户列表，并返回简要信息，用于添加好友、发起聊天或查看资料等后续操作。

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "query": "john",  // 用户ID，用户名，用户账号
  "limit": 20,      // 返回的数目限制
  "offset": 0       // 页数，前50页。。。50-100页等等
}
```

**响应体**:
```json
{
  "total_pages": 55,  // 总页数
  "current_page": 55, // 当前页数
  "total_items": 1100, // 总条目
  "users": [
    {
      "uid": "123",
      "username": "Lihua",
      "gender": "male|female|other",
      "avatar": "url",
      "bio": "Hello World!"  // 简介
    },
    {
      "uid": "123",
      "username": "Lihua",
      "gender": "male|female|other",
      "avatar": "url",
      "bio": "Hello World!"  // 简介
    }
  ]
}
```

### 16. 获取好友用户资料（√√）

**URL**: `/auth/friends/profile`
**方法**: POST
**场景**: 用户点击好友头像查看好友个人信息，用户新添加好友时根据返回的uid与fid获取好友用户资料，插入好友列表。

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "uid": "user_67890",
  "fid": "fid123"
}
```

**成功响应（200 OK）**:
```json
{
  "fid": "friend_001",
  "uid": "user_67890",
  "account": "123@666.com",
  "username": "YYJ",
  "remark": "Alice - Work",
  "group_by": "work",
  "is_blacklisted": "false",
  "created_at": "2023-07-20T14:30:00Z",
  "bio": "Hello",
  "avatar": "url",
  "gender": "male|female|other",
  "region": "GuangXi",
  "email": "aaa"
}
```

### 17. 获取好友列表（√√）

**URL**: `/auth/friends/friendlist`
**方法**: GET
**场景**: 用户点击进入好友界面时拉取好友列表。

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**响应体**:
```json
{
  "total": 25,
  "friends": [
    {
      "fid": "friend_001",
      "uid": "user_67890",
      "username": "YYJ",
      "remark": "Alice - Work",
      "groupBy": "work",
      "isBlacklisted": "false",
      "createdAt": "2023-07-20T14:30:00Z",
      "bio": "Hello",
      "avatar": "url"
    }
  ],
  "blacklist": [
    {
      "fid": "friend_001",
      "uid": "user_67890",
      "username": "YYJ",
      "remark": "Alice - Work",
      "groupBy": "work",
      "isBlacklisted": "false",
      "createdAt": "2023-07-20T14:30:00Z",
      "bio": "Hello",
      "avatar": "url"
    }
  ]
}
```

### 18. 发送好友请求（√√）

**URL**: `/auth/friends/request`
**方法**: POST
**场景**: 用户在搜索页面，群聊成员页面，个人主页等界面向非好友的用户发送请求。

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "receiver_id": "user_67890",
  "message": "Hi! I'd like to connect with you",
  "create_time": "timestamp"
}
```

**成功响应 (200)**:
```json
{
  "req_id": "reqId123",
  "sender_uid": "uid13",
  "receiver_uid": "uid666",
  "apply_text": "Hello",
  "create_time": "timestamp",
  "status": "pending"
}
```

### 19. 处理好友请求（√√）

**URL**: `/auth/friends/respond`
**方法**: POST
**场景**: 用户在"好友添加"页面中的"处理申请"列表中，对收到的好友请求进行同意或拒绝操作。成功响应后，调用获取好友用户资料，根据fid和uid获取好友信息，并加入到好友列表。

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "req_id": "req_12345",
  "action": "accept",  // acceept or reject
  "handle_time": "timestamp"  // Use YYYY-MM-DD HH:MM:SS
}
```

**成功响应（200 OK）**:
```json
{
  "uid": "user111",  // 如果拒绝的话，两个字段都是Rejected
  "fid": "fid111"
}
```

### 20. 获取好友请求消息列表（√√）

**URL**: `/auth/friends/request-list`
**方法**: GET
**场景**: 用户切换到"好友添加"页面中的"处理申请"页面时，拉取好友请求消息列表。保证待处理的请求位于前面，已经处理的置后。若要查看申请者信息调用API6.获取非好友用户资料。

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**成功响应（200 OK）**:
```json
{
  "total": 4,
  "requests": [
    {
      "req_id": "reqId123",
      "sender_uid": "uid13",
      "apply_text": "Hello",
      "create_time": "timestamp",
      "status": "pending"
    },
    {
      "req_id": "reqId123",
      "sender_uid": "uid13",
      "apply_text": "Hello",
      "create_time": "timestamp",
      "status": "pending"
    }
  ],
  "receives": [
    {
      "req_id": "reqId123",
      "sender_uid": "uid13",
      "apply_text": "Hello",
      "create_time": "timestamp",
      "status": "pending"
    },
    {
      "req_id": "reqId123",
      "sender_uid": "uid13",
      "apply_text": "Hello",
      "create_time": "timestamp",
      "status": "pending"
    }
  ]
}
```

### 21. 删除好友（√√）

**URL**: `/auth/friends/remove`
**方法**: POST
**场景**: 用户在好友的个人主页的设置分页中删除好友，成功响应后前端在好友列表根据fid删除好友信息。

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "fid": "friend_001"
}
```

**成功响应（200 OK）**: 空响应

### 22. 更新好友备注\黑名单状态\分组（√√）

**URL**: `/auth/friends/update`
**方法**: POST
**场景**: 用户在好友的个人主页的设置分页中更新好友备注\黑名单状态\分组，成功响应后前端在好友列表根据fid修改好友备注。

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "fid": "friend_001",
  "remark": "Alice - Design Team",
  "is_blacklisted": true,
  "group_by": "work"
}
```

**成功响应（200 OK）**: 空响应

## 群聊管理API

### 23. 创建群聊（√）

**URL**: `/auth/groups/create`
**方法**: POST
**场景**: 已登录用户可发起创建一个新的群聊。用户需提供群名称、可选群头像。系统将自动创建群组，将创建者设为群主，同时返回新群的基本信息。

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "manager_uid": "uid_123",
  "groupName": "Software",  // 可选
  "avatar": "https://example.com/avatars/alice.jpg",  // 可选
  "createdAt": "timestamp",
  "groupintro": "简介"  // 可选
}
```

**成功响应（200 OK）**:
```json
{
  "gid": "gid_123",
  "group_name": "room309",  // 默认
  "manager_uid": "user111",
  "avatar": "https://example.com/avatars/alice.jpg",
  "group_intro": "简介",
  "created_at": "timestamp"
}
```

### 24. 搜索群聊（√）

**URL**: `/auth/groups/search`
**方法**: POST
**场景**: 已登录用户可通过关键词搜索平台上的群聊。系统根据关键词匹配符合条件的群聊列表，并返回简要信息，用于加入群聊、查看资料等后续操作。

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "query": "109393993",
  "limit": 20,  // 返回的数目限制
  "offset": 0   // 页数，前50页。。。50-100页等等
}
```

**成功响应（200 OK）**:
```json
{
  "groups": [
    {
      "gid": "123",
      "group_name": "Lihua",
      "avatar": "url",
      "bio": "Hello World!"  // 简介
    },
    {
      "gid": "123",
      "group_name": "Lihua",
      "avatar": "url",
      "bio": "Hello World!"  // 简介
    }
  ],
  "total": 50
}
```

### 25. 用户获取群聊名片（√）

**URL**: `/auth/groups/card`
**方法**: POST
**场景**: 用户点击群聊头像查看群聊名片

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "gid": "group_67890"
}
```

**成功响应（200 OK）**:
```json
{
  "is_member": "true",
  "gid": "group_001",
  "group_name": "room309",
  "manager_uid": "user111",
  "avatar": "https://example.com/avatars/alice.jpg",
  "group_intro": "简介",
  "created_at": "timestamp"
}
```

### 26. 成员获取群聊信息（√）

**URL**: `/auth/groups/profile`
**方法**: POST
**场景**: 用户点击群聊的设置分页查看群聊具体信息和可设置的字段

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "gid": "group_67890"
}
```

**成功响应（200 OK）**:
```json
{
  "is_member": "true",
  "gid": "group_001",
  "group_name": "room309",
  "manager_uid": "user111",
  "avatar": "https://example.com/avatars/alice.jpg",
  "group_intro": "简介",
  "created_at": "timestamp",
  "do_not_disturb": "true",
  "is_pinned": "true",
  "remark": "workplace",
  "nickname": "mm",
  "join_time": "timestamp"
}
```

### 27. 获取群聊列表（√）

**URL**: `/auth/groups/grouplist`
**方法**: GET
**场景**: 用户点击进入群聊界面时拉取群聊列表。

**请求头**:
```
Authorization: Bearer {token}
```

**响应体**:

成功响应（200 OK）:
```json
{
  "groups": [
    {
      "gid": "123",
      "groupName": "Lihua",
      "avatar": "url",
      "bio": "Hello World!"  // 简介
    },
    {
      "gid": "123",
      "groupName": "Lihua",
      "avatar": "url",
      "bio": "Hello World!"  // 简介
    }
  ],
  "total": 25
}
```

### 28. 发送加入群聊申请（√）

**URL**: `/auth/groups/send_group_request`
**方法**: POST
**场景**: 用户加入群聊前需申请。

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "gid": "group_123",
  "uid": "user_123",
  "applyText": "I want to join",
  "create_time": "timestamp"
}
```

**成功响应（200 OK）**:
```json
{
  "success": "true",
  "req_id": "request_id123",
  "gid": "gid123",
  "sender_uid": "uid13",
  "apply_text": "Hello",
  "create_time": "timestamp",
  "status": "pending"
}
```

### 29. 获取群聊加入申请列表（√）

**URL**: `/auth/groups/group_request_list`
**方法**: POST
**场景**: 用户申请加入该群后，其申请将进入待审核队列。群主或管理员可通过本接口查询指定群聊的所有待处理加入申请列表，用于后续批准或拒绝操作。
普通成员无权访问此接口；仅群主/管理员可查看自己管理的群的申请列表。

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "gid": "group_123",
  "uid": "uid_123"
}
```

**成功响应（200 OK）**:
```json
{
  "requests": [
    {
      "reqId": "request_id123",
      "gid": "gid123",
      "senderUid": "uid13",
      "applyText": "Hello",
      "createTime": "timestamp",
      "status": "pending"
    },
    {
      "reqId": "request_id123",
      "gid": "gid123",
      "senderUid": "uid13",
      "applyText": "Hello",
      "createTime": "timestamp",
      "status": "pending"
    }
  ],
  "total": 25
}
```

### 30. 处理加入群聊申请（√）

**URL**: `/auth/groups/respond`
**方法**: POST
**场景**: 用户切换到"群聊管理"页面中的"处理申请"页面时，拉取群聊加入申请消息列表。保证待处理的请求位于前面，已经处理的置后。若要查看申请者信息调用API6.获取非好友用户资料。
普通成员无权访问此接口；仅群主/管理员可处理自己管理的群的申请列表。

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "req_id": "req_12345",
  "approver_uid": "user_123",
  "action": "accept",
  "handle_time": "timestamp"
}
```

**成功响应（200 OK）**:
```json
{
  "success": true
}
```

### 31. 退出群聊（√）

**URL**: `/auth/groups/leave`
**方法**: POST
**场景**: 已加入群聊的普通成员可主动退出该群。
- 如果当前用户是群主，则不允许直接退出，必须先转让群主身份或解散群聊
- 普通成员和管理员可正常退出

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "gid": "gid123",
  "uid": "user_123"
}
```

**成功响应（200 OK）**:
```json
{
  "success": true,
  "message": "You leave the group"
}
```

### 32. 踢出群成员（√）

**URL**: `/auth/groups/kick_member`
**方法**: POST
**场景**: 群主或管理员可将某位普通成员从群聊中移除。
- 群主可以踢出任何人（包括管理员）
- 普通管理员不能踢出群主
- 用户不能踢自己（应使用"退出群聊"接口）

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "gid": "gid123",
  "uid": "user_123",      // 被踢出的群员
  "approver_uid": "user_666"  // 管理员
}
```

**成功响应（200 OK）**:
```json
{
  "message": "user_123被user_666踢出群聊"
}
```

### 33. 解散群聊（√）

**URL**: `/auth/groups/disband`
**方法**: POST
**场景**: 群主可主动解散自己创建的群聊，所有成员自动退出。

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "gid": "gid123"
}
```

**成功响应（200 OK）**:
```json
{
  "success": true,
  "message": "You disband the group"
}
```

### 34. 设置群免打扰状态、置顶状态、群备注、群昵称（√）

**URL**: `/auth/groups/member_set`
**方法**: POST
**场景**: 已加入群聊的用户可自定义与该群相关的本地化设置

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "gid": "gid666",
  "do_not_disturb": "true",
  "is_pinned": "true",
  "remark": "workplace",
  "nickname": "mm"
}
```

**响应体**:

成功响应（200 OK）:
```json
{
  "success": true,
  "message": "666"
}
```

### 35. 设置群名称、群头像、群简介（√）

**URL**: `/auth/groups/setting`
**方法**: POST
**场景**: 群聊的群主和管理员可自定义与该群信息相关的设置，如群名称、群头像、群简介。

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "gid": "gid666",
  "group_name": "Soft",
  "group_avater": "url",
  "group_intro": "Hello",
  "uid": "uid123"  // 修改者uid
}
```

**响应体**:

成功响应（200 OK）:
```json
{
  "message": "xxx修改了群聊信息"
}
```

### 36. 获取群公告列表（√）

**URL**: `/auth/groups/get_announcements`
**方法**: POST
**场景**: 群成员查看群内由管理员或群主发布的公告列表，按发布时间倒序排列。

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "gid": "gid666"
}
```

**响应体**:

成功响应（200 OK）:
```json
{
  "announcements": [
    {
      "msg_id": "123",
      "content": "HELLO",
      "sender_uid": "user123",
      "send_time": "timestamp",
      "mentioned_uids": "json",
      "quote_msg_id": "msg_123"
    },
    {
      "msg_id": "123",
      "content": "HELLO",
      "sender_uid": "user123",
      "send_time": "timestamp",
      "mentioned_uids": "json",
      "quote_msg_id": "msg_123"
    }
  ],
  "total": 66
}
```

### 37. 获取全部群成员（√）

**URL**: `/auth/groups/get_members`
**方法**: POST
**场景**: 用户进入群聊资料页时，可查看该群的所有成员列表。返回信息包括每位成员的基本资料、在群内的角色（群主 / 管理员 / 普通成员）

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "gid": "gid666"
}
```

**响应体**:

成功响应（200 OK）:
```json
{
  "members": [
    {
      "role": "admin",
      "uid": "user123",
      "username": "YYJ",
      "avatar": "url",
      "nickname": "mm"
    },
    {
      "role": "admin",
      "uid": "user123",
      "username": "YYJ",
      "avatar": "url",
      "nickname": "mm"
    }
  ],
  "total": 25
}
```

### 38. 转让群主（√）

**URL**: `/auth/groups/transfer_ownership`
**方法**: POST
**场景**: 群主可将群主身份转让给群内的一名现有成员（通常需为普通成员或管理员）。转让后：
- 原群主降级为普通成员
- 目标成员升级为新群主
- 群聊继续存在，所有历史数据保留
- 转让操作不可逆（除非新群主再转回）

**限制**:
- 仅群主可发起转让
- 目标用户必须已在群内
- 不能转让给自己

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "gid": "gid",
  "manager_uid": "uid123",  // 转让者uid
  "uid": "uid23"            // 被转让者uid
}
```

**响应体**:

成功响应（200 OK）:
```json
{
  "message": "xxx转让群主给xxx"
}
```

### 39. 设置管理员（√）

**URL**: `/auth/groups/set_admin`
**方法**: POST
**场景**: 群主可将群内的普通成员提升为管理员，赋予其部分管理权限（如踢人、发布公告、审批入群申请等，具体权限由业务定义）。

**限制**:
- 仅群主可操作
- 目标用户必须已在群内且为普通成员（不能重复设为管理员）
- 管理员不能设置其他管理员（防止权限扩散）

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "gid": "gid",
  "uid": "uid23"  // 管理者uid
}
```

**响应体**:

成功响应（200 OK）: 空响应

## 在线状态API

### 40. 获取好友列表在线状态

**URL**: `/auth/online/friends-online`
**方法**: POST

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "limit": 50
}
```

**响应**:
```json
{
  "status": 200,
  "data": {
    "onlineFriends": [
      {
        "userId": "user_67890",
        "username": "alice_smith",
        "avatar": "https://example.com/avatars/alice.jpg",
        "status": "online",
        "lastSeenAt": "2024-01-20T10:45:00Z"
      }
    ],
    "total": 15
  }
}
```

### 41. 获取群聊在线状态

**URL**: `/auth/online/group-online`
**方法**: POST

*注：文档中提供了URL但未提供具体实现细节*

## 文件管理API

### 42. 上传文件

**URL**: `/auth/file/upload`
**方法**: POST
**场景**: 已登录用户可上传文件（如图片、文档、音视频等），用于聊天消息、群公告附件、个人资料等场景。

**请求头**:
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求体**:
```
file: [file]
chatId: "chat_67890"
contentType: "image"
```

**成功响应（200 OK）**:
```json
{
  "url": "https://cdn.example.com/chat/files/file_1705740000.pdf",
  "filename": "document.pdf",
  "size": 999,
  "mimeType": "application/pdf"
}
```

### 43. 预览文件

**URL**: `/auth/file/preview`
**方法**: POST

**请求头**:
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求体**:
```
file: [file]
chatId: "chat_67890"
contentType: "image"
```

**响应**:
```json
{
  "status": 200,
  "data": {
    "url": "https://cdn.example.com/chat/files/file_1705740000.pdf",
    "filename": "document.pdf",
    "size": 1048576,
    "mimeType": "application/pdf"
  }
}
```

### 44. 下载文件

**URL**: `/auth/file/download`
**方法**: POST

**请求头**:
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求体**:
```
file: [file]
chatId: "chat_67890"
contentType: "image"
```

**响应**:
```json
{
  "status": 200,
  "data": {
    "url": "https://cdn.example.com/chat/files/file_1705740000.pdf",
    "filename": "document.pdf",
    "size": 1048576,
    "mimeType": "application/pdf"
  }
}
```

### 45. 删除文件

**URL**: `/auth/file/delete`
**方法**: POST

**请求头**:
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求体**:
```
file: [file]
chatId: "chat_67890"
contentType: "image"
```

**响应**:
```json
{
  "status": 200,
  "data": {
    "url": "https://cdn.example.com/chat/files/file_1705740000.pdf",
    "filename": "document.pdf",
    "size": 1048576,
    "mimeType": "application/pdf"
  }
}
```

## WebSocket API

### 46. WebSocket连接API

**URL**: `/auth/connection/ws?token={jwt_token}`
**方法**: POST
**场景**: 升级为WebSocket连接

### 47. WebSocket消息格式

#### 发送消息 (Client → Server):

```json
{
  "type": "message",
  "payload": {
    "chatId": "chat_67890",
    "receiverId": "user_67890",
    "contentType": "text",
    "content": "Hello, how are you?",
    "tempId": "temp_msg_12345"
  }
}
```

#### 接收消息 (Server → Client):

```json
{
  "type": "new_message",
  "payload": {
    "id": "server_msg_67891",
    "chatId": "chat_67890",
    "senderId": "user_67890",
    "contentType": "text",
    "content": "I'm doing great, thanks!",
    "timestamp": "2024-01-20T11:01:00Z"
  }
}
```

#### 好友请求通知:

```json
{
  "type": "friend_request",
  "payload": {
    "reqId": "req_99999",
    "senderId": "user_44444",
    "message": "Hi, let's connect!",
    "senderInfo": {
      "username": "new_friend",
      "avatar": "https://example.com/avatars/new.jpg"
    },
    "timestamp": "2024-01-20T11:02:00Z"
  }
}
```

#### 在线状态变化:

```json
{
  "type": "friend_status_changed",
  "payload": {
    "userId": "user_67890",
    "status": "online",
    "timestamp": "2024-01-20T11:03:00Z"
  }
}
```

#### 心跳:

```json
// Client → Server
{"type": "ping"}

// Server → Client
{"type": "pong"}
```

## 常见HTTP状态码

- **200** - Success
- **201** - Created
- **400** - Bad Request
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **409** - Conflict
- **422** - Validation Error
- **429** - Rate Limited
- **500** - Internal Server Error

## 待办事项

- [ ] 登录成功时，将token置于响应头而非响应体

---

*文档状态标记说明：*
- (√√√) - 已完成并测试
- (√√) - 已完成
- (√) - 部分完成