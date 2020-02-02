# CertMan

## 简介

最近 Alpha 泛域名快绝版了, 为了方便以后的证书签发及部署, 就自己写了一个 LE 证书签发与部署程序

看了下发现现在的 LE 自动签发都是单点使用, 而且提供的服务也不是很符合国情(误), 所以这玩意儿大概不算疯狂造轮子? (小声

目前程序还在开始阶段, 仅有签发功能, ~~客户端及~~主动推送还没写(咕咕咕), 如果有菊苣发现有什么问题或者可以改进的地方还望多多指教

欢迎 PR 新的 DNS Provider 哦~ (逃

## Feautres

- [x] 自动签发/更新证书
- [x] 泛域名支持
- [x] 客户端及客户端 API
- [ ] 主动推送至 CDN 服务商

## TODO

- [x] Azure Function 支持
- [ ] Azure DNS 支持
- [ ] DNSPods 支持
- [ ] 阿里 CDN 支持
- [ ] 腾讯 CDN 支持

## Quick Start

### 需求
- Azure 账户 (Azure Function 提供免费额度, 正常来讲应该够用了)
- 装了 Node JS 的服务器
- 脑子

### 服务端

1. 在 Azure Portal 中创建一个函数计算服务 (为了方便调试选择 Windows / Node JS 10 即可)
2. 在应用部署中心中将源设置为 `GitHub:LoliLin/CertMan` 并配置自动拉取
3. 创建 `Api` 及 `Core` 两个函数, 并分别填写一下两段代码:
    ```JavaScript
    const api = require(__dirname + '/../functions/azure/api');

    module.exports = (context, req) => {
        api(context, req);
    }
    ```

    ```JavaScript
    require(__dirname + '/../functions/azure/core');

    module.exports = async function (context, myTimer) {
        
    };
    ```

4. 在平台工具中打开 `高级工具(Kudu)` 并在页面中的 `Debug Console` 创建并修改 `config.json`
5. Done

### 客户端

1. 拉取 `CertMan` 源码并在根目录执行 `npm i` 指令安装依赖
2. 进入到 `client` 子文件夹创建并填写 `config.json`
3. 使用 `crontab` 或类似工具创建定时任务执行 `client/app.js` 即可

## 配置

Example:
```json
{
    "logLevel": "debug",
    "email": "i@amxiaol.in",
    "tokens": [
        "abc123!@#"
    ],
    "providers": {
        "name_for_alidns": {
            "type": "alidns",
            "accessKeyId": "",
            "accessKeySecret": ""
        }
    },
    "domains": {
        "xiaolin.in": "name_for_alidns",
        "xll.li": "name_for_alidns"
    },
    "certs": {
        "for_blog": {
            "xiaolin.in": [
                "@",
                "api",
                "*.api"
            ],
            "xll.li": [
                "api",
                "*.api"
            ]
        }
    }
}
```
简单解释一下吧

`tokens` 是用于 API 身份验证的字符串, 可由自己随意填写

`providers` 是指用于 DNS 验证的 DNS 服务商, 目前只支持 AliDNS CN, 后续会增加 Azure DNS 和 DNSPod (也欢迎 PR 嗷

`certs` 是需要申请的证书, 键是证书的名字, 需要唯一, 用于客户端获取, 示例中的证书名字为 `for_blog`, 包含的域名是 `xiaolin.in`、 `api.xiaolin.in`、`*.api.xiaolin.in`、`api.xll.li`、`*.api.xll.li` 

## LICENSE

MIT