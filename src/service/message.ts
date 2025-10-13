interface Message {
  type: string;          // 消息类型
  data: any;             // 消息数据
  timestamp: number;     // 时间戳
  messageId: string;     // 消息ID
  print(): void;         // 日志输出
}

abstract class BaseMessage implements Message {
  type: string;
  data: any;
  timestamp: number;
  messageId: string;
  constructor(type: string, data: any, timestamp: number, messageId: string) {
    this.type = type;
    this.data = data;
    this.timestamp = timestamp;
    this.messageId = messageId;
  }
  print(): void {
    console.log(`type: ${this.type}, data: ${this.data}, timestamp: ${this.timestamp}, messageId: ${this.messageId}`);
  }
}

class MessageText extends BaseMessage {
  constructor(data: string, timestamp: number, messageId: string) {
    super('text', data, timestamp, messageId);
  }
  print(): void {
    console.log(`[${this.type}] ${this.data} at ${new Date(this.timestamp)}`);
  }
}


class MessagePing extends BaseMessage {
  constructor(){
    super('heartbeat', 'ping', Date.now(), '1');
  }
  print(): void {
    console.log(`[${this.type}] ${this.data} at ${new Date(this.timestamp)}`);
  }
}

function MessageHandler(message: Message) {
  message.print();
}


export type { Message };
export { MessageText, MessagePing };
export { MessageHandler };