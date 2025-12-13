/** 联系人列表 Props */

import type { FriendWithUserInfo } from "./friend";


/** 联系人列表 Emits */
/** 父组件监听并响应的动作，根据点击的是群聊还是私聊 */
interface ContactListEmits {
  (e: 'itemClick', type: 'contact' | 'group', data: any): void;
}

/** 联系人卡片模态框 Props */
interface ContactCardModalProps {
  contact: FriendWithUserInfo;
  modelValue?: boolean;
}

/** 联系人卡片模态框 Emits */
interface ContactCardModalEmits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'send-message', contact: FriendWithUserInfo): void;
  (e: 'add-friend', contact: FriendWithUserInfo, message?: string, tags?: string[]): void;
  (e: 'remove-friend', friend: FriendWithUserInfo): void;
  (e: 'edit-remark', friend: FriendWithUserInfo, remark: string): void;
  (e: 'set-tag', friend: FriendWithUserInfo, tag: string): void;
  (e: 'set-blacklist', friend: FriendWithUserInfo, isBlacklist: boolean): void;
  (e: 'edit-profile'): void;
}

/** 头像组件 Props */
interface AvatarProps {
  url?: string;
  size?: number | string;
  alt?: string;
  name?: string;
  clickable?: boolean;
  avatarClass?: string;
  variant?: 'flat' | 'text' | 'elevated' | 'tonal' | 'outlined' | 'plain';

  // 徽章属性
  showBadge?: boolean;
  badgeContent?: string | number;
  badgeColor?: string;
  badgeDot?: boolean;
  badgeInline?: boolean;
}

/** 头像组件 Emits */
interface AvatarEmits {
  (e: 'click', event: MouseEvent): void;
}

/** 设置对话框 Props */
interface SettingsDialogProps {
  modelValue?: boolean;
}

/** 设置对话框 Emits */
interface SettingsDialogEmits {
  (e: 'update:modelValue', value: boolean): void;
}

export type{
    ContactListEmits,
    ContactCardModalProps,
    ContactCardModalEmits,
    AvatarProps,
    AvatarEmits,
    SettingsDialogProps,
    SettingsDialogEmits,
}