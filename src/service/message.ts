/*
1、群聊私聊区分：chatType
2、消息ID生成：采用时间戳+随机数，首次获取历史消息时，按时间戳排列。
3、接收的/发送的新消息无脑入队尾
*/

interface Message {
  type: string;          // 消息类型 分私聊/群聊/pingpong/通知 

  payload: {
    messageId: string;
    timestamp: number; 
    senderId?: string;
    receiverId?: string;
    chatType?: string;
    detail?: string;
  };

  print(): void;         // 日志输出 
}

abstract class BaseMessage implements Message {
  type: string;

  payload : {
    messageId: string;  //时间戳+随机数，保证唯一性，由基类生成
    timestamp: number; //由基类生成
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
  }
  print(): void {
    console.log(`type: ${this.type}, payload: ${JSON.stringify(this.payload)}`);
  }
}

class MessageText extends BaseMessage {
  //需要senderId, receiverId, chatType, detail
  constructor(payload: Omit<Message['payload'], 'messageId' | 'timestamp'>) {
    super('text', payload);
  }
}


class MessagePing extends BaseMessage {
  constructor(senderId:string){
    //心跳，需要senderId
    super('ping', {senderId:senderId});
  }
}

function MessageHandler(message: Message) {
  message.print();
}


export type { Message };
export { MessageText, MessagePing };
export { MessageHandler };