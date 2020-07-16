# CertMan

## 简介

最近 Alpha 泛域名快绝版了, 为了方便以后的证书签发及部署, 就自己写了一个 LE 证书签发与部署程序

看了下发现现在的 LE 自动签发都是单点使用, 而且提供的服务也不是很符合国情(误), 所以这玩意儿大概不算疯狂造轮子? (小声

~~目前程序还在开始阶段, 仅有签发功能, ~~客户端及~~主动推送还没写(咕咕咕), 如果有菊苣发现有什么问题或者可以改进的地方还望多多指教~~

最近重写了一遍, 支持了主动推动到阿里云 CDN

欢迎 PR 新的 DNS Provider 哦~ (逃

## Feautres

- [x] 自动签发/更新证书
- [x] 泛域名支持
- [x] 客户端及客户端 API
- [x] 主动推送至 CDN 服务商

## TODO

- [x] 阿里函数计算支持
- [x] 阿里 DNS 支持
- [ ] DNSPods 支持
- [x] 阿里 CDN 支持
- [ ] 腾讯 CDN 支持

## Quick Start

### 需求
- 阿里云账户 (阿里云函数计算提供免费额度, 正常来讲应该够用了)
- 装了 Node JS 的服务器
- 脑子

### 服务端

1. 打开[这里](https://fc.console.aliyun.com/fc/applications/cn-hongkong/webCreate), 选择 `Node.Js`, `Express`, `使用示例程序` 并创建 (`应用配置信息` 无需修改)
2. 在应用列表选择刚刚创建的函数, 点击 `资源`, 并点击 `服务/函数` 中第一个
3. 在函数管理页面中, 在概况中将超时时间设置为至少 120 秒, 函数入口修改为 `app_ali.handler`, 点击小箭头返回上一级 `服务管理`
4. 在服务管理的 `服务配置` 中修改配置
  - 开启 `网络配置->允许函数访问 VPC 内资源`(需自行创建同地域下的 VPC) 并选择 VPC
  - 在最下方 `NAS 文件系统` 中添加一个挂载点到 `/mnt/cert`(需自行创建同地域下的 NAS), 用户及用户组均填写 `10003`
  - 提交配置并等待 30 秒
5. 再次回到函数管理页面, 在代码执行中修改配置
  - [本地完成]将本项目克隆到本地, 进入目录并运行 `npm install`
  - [本地完成]将 `config.example.js` 复制为 `config.js` 并修改配置
  - [本地完成]将根目录下的**所有文件及文件夹**压缩为 zip 格式的压缩包 (可使用命令 `zip -q -r app.zip *`)
  - 在控制台中选择 `代码包上传`, 选择刚刚创建的压缩包并上传, 等待 30 秒
  - 回到在线编辑, 打开 `config.js`, 将其中的 `certPath` 修改为 `/mnt/cert/cert` (即第 4 步中创建的挂载点)
6. 为函数计算绑定自定义域名
7. 使用类似 `UptimeRobot` 的服务每天或每半天访问一次 `https://{你的 URL}/?token={你的 token}&cron=true` 来运行定时任务
8. Enjoy~

### 客户端

1. 拉取 `CertMan` 源码并在根目录执行 `npm i` 指令安装依赖
2. 进入到 `client` 子文件夹创建并填写 `config.json`
3. 使用 `crontab` 或类似工具创建定时任务执行 `client/app.js` 即可

## 配置

服务端
```js
module.exports = {
  logLevel: 'debug',
  email: 'i@xiaol.in',
  certPath: './cert',
  token: [
    'abc123!@#'
  ],
  dnsProvider: {
    ali: {
      provider: 'alidns', // 只可选择 alidns
      accesskeyId: '',
      accesskeySecret: ''
    }
  },
  domainDnsMap: {
    'cgl.li': 'ali' // 对应 dnsProvider 中的条目
  },
  certs: {
    for_root: {
      'cgl.li': [ // 对应 domainDnsMap 中的条目
        'www',
        '@'
      ]
    }
  },
  cdnProvider: {
    ali: {
      type: 'alicdn', // 只可选择 alicdn
      accesskeyId: '',
      accesskeySecret: ''
    }
  },
  cdnCertMap: [
    {
      provider: 'ali', // 对应 cdnProvider 中的条目
      cert: 'for_root', // 对应 certs 中的键
      domain: 'www.cgl.li' // CDN 中的域名名称(泛域名格式为 .example.com)
    }
  ]
}
```

客户端
```json
{
  "apiServer": "https://xxxx.cn-hongkong.fc.aliyuncs.com/2016-08-15/proxy/xxxx.xxxx/xxxx/",
  "token": "testToken",
  "reqList": [
      {
          "name": "for_root",
          "certPath": "/usr/local/nginx/ssl/for_blog.pem",
          "keyPath": "/usr/local/nginx/ssl/for_blog_key.pem",
          "afterPull": "systemctl restart nginx"
      }
  ]
}
```
