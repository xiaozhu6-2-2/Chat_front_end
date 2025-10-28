/*
1、群聊私聊区分：chatType
2、消息ID生成：采用时间戳+随机数，首次获取历史消息时，按时间戳排列。
3、接收的/发送的新消息无脑入队尾
4、send封装需要ws实例
*/
import { reactive } from 'vue';
import type {Ref} from 'vue';
import { websocketService } from './websocket';
import { authApi } from './api';


type MessageType = "Group" | "Private" | "Notification" | "System" | "Ping" | "Pong";

interface Message {
  type: string;          // 消息类型 分私聊/群聊/pingpong/通知 

  payload: {
    messageId: string; //时间戳+随机数，保证唯一性，由基类生成
    timestamp: number; //由基类生成
    chatId?: string;   //群聊是receiverId/私聊是两个用户的senderId组合，由小到大
    senderId?: string;
    receiverId?: string;
    chatType?: string; //区分text/img/file，决定detail的识别方法;对于通知消息，chatType是通知类型，如好友请求/群邀请等
    detail?: string;
  };

  toJSON(): string;     // 序列化为json字符串
  print(): void;         // 日志输出 
}

abstract class BaseMessage implements Message {
  type: string;

  payload : {
    messageId: string;  
    timestamp: number; 
    chatId?: string;
    senderId?: string;
    receiverId?: string;
    chatType?: string;
    detail?: string;
  };

  constructor(type: string,  payload: Omit<Message['payload'], 'messageId' | 'timestamp'>) {
    this.type = type;
    this.payload = {
      //基类生成messageId和timestamp
      messageId: `${Date.now()}${Math.floor(Math.random() * 10000)}`, //时间戳+随机数,保证唯一性
      timestamp: Date.now(),
      ...payload, //合并实参的payload
    }
    if((type === "Group" || type === "Private") && payload.senderId && payload.receiverId){
      this.payload.chatId = this.generateChatId(type, payload.senderId, payload.receiverId);
    }
  }

  private generateChatId(type: string, senderId: string, receiverId: string): string {
    if (type === "Group") {
      return `${receiverId}`
    }else if (type === "Private") {
      //由小到大拼接两个用户的senderId
      const sortedIds = [senderId, receiverId].sort();
      return `${sortedIds[0]}-${sortedIds[1]}`
    }else{
      return "";
    }
  }

  toJSON(): string {
    return JSON.stringify({
      type: this.type,
      payload: this.payload,
    });
  }

  print(): void {
    console.log(`type: ${this.type}, payload: ${this.toJSON()}`);
  }
}

class MessageText extends BaseMessage {
  //需要senderId, receiverId, chatType, detail
  constructor(type: string, payload: Omit<Message['payload'], 'messageId' | 'timestamp'>) {
    super(type, payload);
  }
}


class MessagePing extends BaseMessage {
  constructor(senderId:string){
    //心跳，需要senderId
    super('Ping', {senderId:senderId});
  }
}

class MessagePong extends BaseMessage {
  constructor(senderId:string){
    //响应心跳，需要senderId
    super('Pong', {senderId:senderId});
  }
}

function MessageHandler(message: Message) {
  message.print();
}

class MessageService {
  //消息map，group、private、Notification
  //每个群聊、私聊维护一个数组，按时间戳排列
  //初始化时，通过api从服务器拉取历史消息
  //对于在线状态的维护，好友在线状态实时更新，群聊成员在线状态轮询更新
  //好友上/下线采用通知的方法
  groupMessages = reactive(new Map<string, Message[]>())
  privateMessages = reactive(new Map<string, Message[]>())
  notificationMessages = reactive(new Map<string, Message[]>())


  token: string | undefined = undefined;
  isInitialized: boolean = false;
  //用于记录已加载历史消息的群聊
  loadedChats: Set<string> = new Set();

  constructor() {}

  async init(token: string): Promise<void> {
    this.token = token;
    //必须先拿到token才能拉取历史通知
    await this.fetchHistoryNotificationMessages();
    this.notificationMessages.forEach(messages => {
      this.sortMessages(messages);
    });
    this.isInitialized = true;
  }

  //入列操作，判断消息类型，入队尾
  enqueueMessage(message: Message) {
    switch (message.type) {
      case "Group": {
        let chatId = message.payload.chatId;
        if(!chatId){
          console.warn('群聊消息缺少receiverId');
          return;
        }
        if (!this.groupMessages.has(chatId)) {
          //创建的消息数组必须是reactive
          this.groupMessages.set(chatId, reactive([]))
        }
        //判断是否已存在相同的消息
        const arr = this.groupMessages.get(chatId)!;
        if (arr.some(m => m.payload.messageId === message.payload.messageId)) return;
        arr.push(message);
        break;
      }
      case "Private": {
        //私聊消息
        let chatId = message.payload.chatId;
        if(!chatId){
          console.warn('私聊消息缺少receiverId');
          return;
        }
        if (!this.privateMessages.has(chatId)) {
          this.privateMessages.set(chatId, reactive([]));
        }
        //判断是否已存在相同的消息
        const arr = this.privateMessages.get(chatId)!;
        if (arr.some(m => m.payload.messageId === message.payload.messageId)) return;
        arr.push(message);
        break;
      }
      case "Notification": {
        //通知消息，通过chatType区分
        let notificationId = message.payload.chatType;
        if(!notificationId){
          console.warn('通知消息缺少chatType');
          return;
        }
        if (!this.notificationMessages.has(notificationId)) {
          this.notificationMessages.set(notificationId, reactive([]));
        }
        //判断是否已存在相同的消息
        const arr = this.notificationMessages.get(notificationId)!;
        if (arr.some(m => m.payload.messageId === message.payload.messageId)) return;
        arr.push(message);
        break;
      }
      default: {
        console.warn(`非法消息类型：${message.type} 尝试入列`);
      }
    }
  }

  //排序操作，找到chatId和消息类型对应的消息数组，按时间戳排序
  sortMessages(messages: Message[]|undefined) {
    if (!messages) {
      return;
    }
    messages.sort((a, b) => a.payload.timestamp - b.payload.timestamp);
  }

  //初始化加载，用于拉取通知
  async fetchHistoryNotificationMessages():Promise<void> {
    if(!this.token){
      console.error('token为空, 无法拉取历史通知');
      return;
    }
    //TODO: 实现拉取历史通知消息
    try{
      const response = await authApi.post('/history/notifications');
      if (response.status === 200) {
        const messages:Message[] = response.data.messages;
        messages.forEach(message => {
          this.enqueueMessage(message);
        });
      }else{
        console.error(`拉取历史通知失败：${response.status} ${response.data.message}`);
        alert(`拉取历史通知失败：${response.status} ${response.data.message}`);
      }
    }catch(error){
      console.error(`调用拉取历史通知接口失败：${error}`);
    }
  }

  //历史消息按需加载并排序，需要传入聊天号
  //todo: 实现按页加载，不需要一次性获取该群聊的所有的历史消息
  async fetchHistoryPrivateMessages(chatId: string): Promise<void> {
    if(this.loadedChats.has(chatId)){
      return;
    }
    this.loadedChats.add(chatId);
    try{
      const response = await authApi.post('/history/private', { chatId });
      if (response.status === 200) {
        const messages:Message[] = response.data.messages;
        messages.forEach(message => {
          this.enqueueMessage(message);
        });
        if(this.privateMessages.has(chatId)){
          this.sortMessages(this.privateMessages.get(chatId));
        }
      }else{
        console.error(`拉取历史私聊失败：${response.status} ${response.data.message}`);
        alert(`拉取历史私聊失败：${response.status} ${response.data.message}`);
      }
    }catch(error){
      this.loadedChats.delete(chatId);
      console.error(`拉取历史私聊失败：${error}`);
      alert(`拉取历史私聊失败：${error}`);
    }
  }

  async fetchHistoryGroupMessages(chatId: string): Promise<void> {
    if(this.loadedChats.has(chatId)){
      return;
    }
    this.loadedChats.add(chatId);
    try{
      const response = await authApi.post('/history/group', { chatId });
      if (response.status === 200) {
        const messages:Message[] = response.data.messages;
        messages.forEach(message => {
          this.enqueueMessage(message);
        });
        if(this.groupMessages.has(chatId)){
          this.sortMessages(this.groupMessages.get(chatId));
        }
      }else{
        console.error(`拉取历史群聊失败：${response.status} ${response.data.message}`);
        alert(`拉取历史群聊失败：${response.status} ${response.data.message}`);
      }
    }catch(error){
      this.loadedChats.delete(chatId);
      console.error(`拉取历史群聊失败：${error}`);
      alert(`拉取历史群聊失败：${error}`);
    }
  }

  //ws的onmessage中调用，根据type决定接收的新消息是否入列
  updateMessage(message: Message) {
    switch (message.type) {
      case "Group":
      case "Private":
      case "Notification": {
        this.enqueueMessage(message);
        break;
      }
      case "System": {
        //todo:系统消息，需要根据chatType分别维护状态列表
        break;
      }
      default: {
        console.warn(`未知消息类型：${message.type} 尝试更新`);
      }
    }
  }

  //todo: 发送消息后端的ack确认机制以及id生成机制
  //这里的send是用于需要入列的消息，比如私聊、群聊、通知等
  sendWithUpdate(message: Message) {
    console.log(`发送消息：${message.toJSON()} 入列`)
    //ws连接检测、消息发送队列都在wsService中维护
    websocketService.send(message);
    this.enqueueMessage(message);
  }

  //ping/pong不入列可以直接用ws的send方法
  sendWithoutUpdate(message: Message) {
    console.log(`发送消息：${message.toJSON()} 不入列`)
    websocketService.send(message);
  }

  //组件获取消息列表，返回computed是为了保证map.get(id)时，id变化时，messages也会响应式更新
  //reactive(map)并不能监测 .get(id) 的变化，所以需要用computed包裹
  getMessages(mapType: 'Group' | 'Private' | 'Notification', idRef: Ref<string>) {
    const map = mapType === 'Group'
      ? this.groupMessages
      : mapType === 'Private'
      ? this.privateMessages
      : this.notificationMessages

    return computed(() => map.get(idRef.value) || [])
  }
}


export type { Message };
export { MessageText, MessagePing, MessagePong };
//整个服务都响应式导出，可以检测到服务的任何变化
export const messageService = new MessageService();