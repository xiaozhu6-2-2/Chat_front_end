// 用于好友列表
interface FriendWithUserInfo {
  fid: string;               // 好友编号
  uid: string;               // 好友用户ID
  username: string;
  remark?: string;           // 备注
  tag?: string;              // 分组标签
  createdAt: string;       // 添加时间
  isBlacklisted: boolean;     // 是否黑名单
  avatar: string;
  bio?: string;
  info?: UserInfo;     //用户详细资料, 点击查看时获取
}

//挂载详细资料
interface UserInfo{
  account?: string;
  gender?: string;
  region?: string;
  email?: string;
}

//获取好友资料API的响应体
interface FriendProfileFromApi{
  fid: string;
  uid: string;
  account: string;
  username: string;
  remark?: string;
  group_by?: string; // 对应前端的 tag
  is_blacklisted: boolean;
  created_at: string;
  bio?: string;
  avatar: string;
  gender?: string;
  region?: string;
  email?: string;
}


//更新好友设置请求体
interface UpdateFriendProfileParams {
  fid: string;
  remark: string;
  is_blacklisted: boolean;
  group_by: string;
}

// =================联系人相关组件props与emits===============


/** 联系人数据联合类型 */
// type ContactData = FriendWithUserInfo;

/** 类型守卫函数：判断是否为好友类型 */
function isFriend(contact: FriendWithUserInfo | UserProfile): contact is FriendWithUserInfo {
  return 'fid' in contact;
}

/** 联系人卡片 Props */
interface ContactCardProps {
  contact: FriendWithUserInfo;
}


// =================结构体类型转换函数==================
//将API的响应体转为好友列表的结构体
function FriendApiToFriendWithUserInfo(apiData: FriendProfileFromApi): FriendWithUserInfo{
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

export type {
  FriendWithUserInfo,
  UserInfo,
  ContactCardProps,
  ContactData,
  UpdateFriendProfileParams
}
export  {
  FriendApiToFriendWithUserInfo,
  isFriend //类型守卫函数：判断是否为好友类型
}