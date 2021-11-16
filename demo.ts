import { Bot, Message } from './bot';

const API_URL: string = 'https://example.com'; // mirai-http-api地址
const VERIFY_KEY: string = '123456789'; // mirai-http-api配置的verifyKey
const QQ: number = 123456789; // 机器人QQ号
const QQ_GROUP: number = 123456789; // 监听消息的QQ群号
const ADMIN_QQ: number = 123456789; // 管理员QQ号


const bot = new Bot();
// 连接
bot.link({
    apiUrl: API_URL,
    verifyKey: VERIFY_KEY,
    qq: QQ
});
// 发送上线消息
bot.sendMessage({
    msgType: 'FriendMessage',
    target: ADMIN_QQ,
    message: new Message().addText('Hello,Admin!')
});
// 监听管理员消息“你好世界”
bot.on('FriendMessage', async (msg) => {
    if (msg.sender.id === ADMIN_QQ && msg.messageChain[1].text === '你好世界') {
        await bot.sendMessage({
            msgType: 'FriendMessage',
            target: msg.sender.id,
            message: new Message()
                .addText('Hello,World!')
                .addImage('https://cdn.jsdelivr.net/gh/zhangfh-cq/images@master/second-blog/avatar.png')
        });
    }
});
// 监听QQ群消息“你好世界”
bot.on('GroupMessage', async (msg) => {
    if (msg.sender.group.id === QQ_GROUP && msg.messageChain[1].text === '你好世界') {
        await bot.sendMessage({
            msgType: 'GroupMessage',
            target: msg.sender.group.id,
            message: new Message()
                .addText('Hello,World!')
                .addImage('https://cdn.jsdelivr.net/gh/zhangfh-cq/images@master/second-blog/avatar.png')
        })
    }
});