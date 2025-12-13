import type { FriendRequest, UserSearchResult } from "@/service/messageTypes";
import type { FriendWithUserInfo } from "./friend";

/** 好友请求项 Props */
interface FriendRequestItemProps {
  request: FriendRequest;
  type: 'received' | 'sent';
}

/** 用户搜索结果卡片 Props */
interface UserSearchResultCardProps {
  user: UserSearchResult;
}

/** 好友列表面板 Emits */
interface FriendsListPanelEmits {
  (e: 'add-friend'): void;
  (e: 'chat', friend: FriendWithUserInfo): void;
  (e: 'remove', friend: FriendWithUserInfo): void;
  (e: 'edit-remark', friend: FriendWithUserInfo): void;
  (e: 'set-tag', friend: FriendWithUserInfo): void;
  (e: 'set-blacklist', friend: FriendWithUserInfo, isBlacklist: boolean): void;
}

/** 好友请求项 Emits */
interface FriendRequestItemEmits {
  (e: 'accept', request: FriendRequest): void;
  (e: 'reject', request: FriendRequest): void;
}

/** 用户搜索结果卡片 Emits */
interface UserSearchResultCardEmits {
  (e: 'send-request', user: UserSearchResult, message?: string, tags?: string[]): void;
  (e: 'handle-request', user: UserSearchResult): void;
}

export type {
    FriendRequestItemProps,
    UserSearchResultCardProps,
    FriendsListPanelEmits,
    FriendRequestItemEmits,
    UserSearchResultCardEmits,
}