import WebSocket from 'ws';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { URL } from "url";

// 接口
interface LinkConfig {
    apiUrl: string,
    verifyKey: string,
    qq: number
}

interface SendInfo {
    msgType: MsgType,
    target: number,
    message: Message
}

interface ReqFormat {
    syncId: number,
    command: string,
    subCommand: null | string,
    content: any
}

interface RepFormat {
    syncId: number | string,
    data: any
}

type MsgType = 'FriendMessage' | 'GroupMessage'; // 消息类型
type EventType = 'FriendMessage' | 'GroupMessage'; // 事件类型

/**
 * 消息类
 */
class Message {
    protected message: Array<{}>;

    /**
     * @description 构造函数
     */
    public constructor() {
        this.message = [];
    }

    /**
     * @description 添加文本消息
     * @param text 文本
     * @returns Message
     */
    public addText(text: string): Message {
        this.message.push({ "type": "Plain", "text": text });
        return this;
    }

    /**
     * @description 添加图片消息
     * @param imgUrl 图片链接
     * @returns Message
     */
    public addImage(imgUrl: string): Message {
        this.message.push({ "type": "Image", "url": imgUrl });
        return this;
    }

    /**
     * @description 获取message
     * @returns message数组
     */
    public getMessage(): Array<{}> {
        return this.message;
    }
}

/**
 * QQ机器人类
 */
class Bot {
    protected sessionKey: string;
    // @ts-ignore 在link()中初始化
    protected rwsClient: ReconnectingWebSocket;
    protected tasks: Array<() => void>; // 任务队列
    protected eventHandlers: Array<{ eventType: EventType, handler: (msg: any) => void }>; // 事件处理器集

    /**
     * @description 构造函数
     */
    public constructor() {
        this.sessionKey = '';
        this.tasks = [];
        this.eventHandlers = [];
    }

    /**
     * @description 与API建立WebSocket连接
     * @param linkConfig 连接设置
     */
    public link(linkConfig: LinkConfig): void {
        const apiUrl: URL = new URL(linkConfig.apiUrl);
        const wsUlr: string = `${apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'}//${apiUrl.host}/all`;
        const wsParam: string = `?verifyKey=${linkConfig.verifyKey}&qq=${linkConfig.qq}`;
        // 建立连接
        this.rwsClient = new ReconnectingWebSocket(wsUlr + wsParam, [], {
            WebSocket: WebSocket,
            connectionTimeout: 1000,
            maxRetries: 10
        });

        let taskTimer: NodeJS.Timer;
        this.rwsClient.addEventListener('open', (event) => {
            console.log(`WebSocket连接成功！`);
            // 每0.1秒检查任务队列并执行
            taskTimer = setInterval(() => {
                this.tasks.forEach((task) => {
                    task();
                    this.tasks.shift();
                });
            }, 100);
        });
        this.rwsClient.addEventListener('message', (event) => {
            console.log(`收到消息：${event.data}`);
            const msg: RepFormat = JSON.parse(event.data);
            if (msg.data.code !== undefined) {
                if (msg.data.code === 0) {
                    // 拿到session
                    if (msg.data.session) { this.sessionKey = msg.data.session; }
                } else {
                    throw new Error(`接口响应异常：${event.data}`)
                }
            } else if (msg.data.type !== undefined) {
                // 检查是否有对应的事件处理器
                this.eventHandlers.forEach((eventHandler) => {
                    if (eventHandler.eventType === msg.data.type) {
                        eventHandler.handler(msg.data);
                    }
                });
            } else {
                throw new Error(`接口响应不正确：${event.data}`);
            }
        });
        this.rwsClient.addEventListener('error', (event) => {
            console.log(`错误：${event.message}`);
            clearInterval(taskTimer);
        });
        this.rwsClient.addEventListener('close', (event) => {
            console.log(`WebSocket连接关闭!`);
            clearInterval(taskTimer);
        });
    }

    /**
     * @description 添加事件监听器
     * @param eventType 监听的事件名
     * @param handler 对应的处理器，参数msg为API响应的JSON解析后的对象
     */
    public on(eventType: EventType, handler: (msg: any) => void): void {
        this.eventHandlers.push({ eventType, handler });
    }

    /**
     * @description 发送消息
     * @param sendInfo 发送消息的配置信息
     */
    public sendMessage(sendInfo: SendInfo): void {
        const task = () => {
            const request: ReqFormat = {
                syncId: 1,
                command: `send${sendInfo.msgType}`,
                subCommand: null,
                content: {
                    sessionKey: this.sessionKey,
                    target: sendInfo.target,
                    messageChain: sendInfo.message.getMessage()
                }
            }
            this.rwsClient.send(JSON.stringify(request));
        }
        this.tasks.push(task);
    }

    /**
     * @description 关闭WebSocket连接
     */
    public close(): void {
        this.rwsClient.close();
    }
}

export { Bot, Message }