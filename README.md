# CertMan

## 简介

最近 Alpha 泛域名快绝版了, 为了方便以后的证书签发及部署, 就自己写了一个 LE 证书签发与部署程序

看了下发现现在的 LE 自动签发都是单点使用, 而且提供的服务也不是很符合国情(误), 所以这玩意儿大概不算疯狂造轮子? (小声

目前程序还在开始阶段, 仅有签发功能, 客户端及主动推送还没写(咕咕咕), 如果有菊苣发现有什么问题或者可以改进的地方还望多多指教

欢迎 PR 新的 DNS Provider 哦~ (逃

## Feautres

- [x] 自动签发/更新证书
- [x] 泛域名支持
- [ ] 客户端及客户端 API
- [ ] 主动推送至 CDN 服务商
- [ ] Docker 支持
- [ ] 函数计算支持

## 配置

Example:
```json
{
    "host": "ssl.xiaolin.in", #TODO
    "port": 8123, # TODO
    "logLevel": "debug",
    "email": "i@amxiaol.in",
    "identifiers": {
        "ali1": { # DNS 提供商名字
            "type": "alidns",
            "accessKeyId": "",
            "accessKeySecret": ""
        }
    },
    "domains": { # 指定证书中域名的 DNS 提供商
        "xiaolin.in": "ali1",
        "xll.li": "ali1"
    },
    "certs": {
        "for_api": { # 证书的名字
            "xiaolin.in": [ # 域名 1
                "api", # 子域名
                "*.api"
            ],
            "xll.li": [ # 域名 2
                "api",
                "*.api"
            ]
        }
    }
}
```

## LICENSE

MIT