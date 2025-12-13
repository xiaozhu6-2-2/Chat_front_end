// ==================== 基础数据类型 ====================

// 用于好友列表
interface FriendWithUserInfo {
  fid: string;               // 好友编号
  uid: string;               // 好友用户ID
  username: string;
  remark?: string;           // 备注
  tag?: string;              // 分组标签
  createdAt: string;         // 添加时间
  isBlacklisted: boolean;    // 是否黑名单
  avatar: string;
  bio?: string;
  info?: UserInfo;           // 用户详细资料, 点击查看时获取
}

// 挂载详细资料
interface UserInfo {
  account?: string;
  gender?: string;
  region?: string;
  email?: string;
}

// 获取好友资料API的响应体
interface FriendProfileFromApi {
  fid: string;
  uid: string;
  account: string;
  username: string;
  remark?: string;
  group_by?: string;        // 对应前端的 tag
  is_blacklisted: boolean;
  created_at: string;
  bio?: string;
  avatar: string;
  gender?: string;
  region?: string;
  email?: string;
}

// 更新好友设置请求体
interface UpdateFriendProfileParams {
  fid: string;
  remark: string;
  is_blacklisted: boolean;
  group_by: string;
}

// ==================== 转换函数 ====================

// 将API的响应体转为好友列表的结构体
function FriendApiToFriendWithUserInfo(apiData: FriendProfileFromApi): FriendWithUserInfo {
  const userInfo: UserInfo = {
    account: apiData.account,
    gender: apiData.gender,
    region: apiData.region,
    email: apiData.email,
  }
  const friendInfo: FriendWithUserInfo = {
    fid: apiData.fid,
    uid: apiData.uid,
    username: apiData.username,
    remark: apiData.remark,

    // 字段名映射：group_by -> tag
    tag: apiData.group_by,

    // 字段名映射：created_at -> createdAt
    createdAt: apiData.created_at,

    // 字段值类型转换：'false'/'true' 字符串 -> boolean
    isBlacklisted: apiData.is_blacklisted,

    avatar: apiData.avatar,
    bio: apiData.bio,

    // 3. 挂载详细资料
    info: userInfo,
  };

  return friendInfo
}


// ==================== 导出 ====================

// 基础数据类型导出
export type {
  FriendWithUserInfo,
  UserInfo,
  FriendProfileFromApi,
  UpdateFriendProfileParams
};

// 转换函数导出
export { FriendApiToFriendWithUserInfo };