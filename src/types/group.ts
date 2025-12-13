/** 群组信息接口 */
interface GroupInfo {
  id: string;
  name: string;
}

/** 群组卡片 Props */
interface GroupCardProps {
  group: GroupInfo;
}

export type {
    GroupInfo,
    GroupCardProps
}