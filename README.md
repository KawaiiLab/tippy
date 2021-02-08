<p align="center">
  <img src="https://user-images.githubusercontent.com/20554060/107155056-35f04a00-69b1-11eb-9597-1f8596e44924.png">
</p>

<p align="center">🔒 Deploy LE cert in a kawaii way</p>

<p align="center">
<a href="https://lyn.moe"><img alt="Author" src="https://img.shields.io/badge/Author-Lyn-blue.svg?style=for-the-badge"/></a>
<a href="https://github.com/kawaiilab/tippy"><img alt="Version" src="https://img.shields.io/github/package-json/v/kawaiilab/tippy?style=for-the-badge"/></a>
<img alt="License" src="https://img.shields.io/github/license/kawaiilab/tippy.svg?style=for-the-badge"/>
</p>

***

## Usage

### Aliyun Function Computing

1. Select a region that not in China Mainland
2. Create a VPC network([console](https://vpc.console.aliyun.com/vpc/cn-hongkong/vpcs)) and a NAS bucket([console](https://nasnext.console.aliyun.com/cn-hongkong/filesystem)), please ensure they are in the same available-region
3. Enter [Function Computing console](fc.console.aliyun.com)
4. Select `Service`
    - If you don't have an existing service/function, system will guide you to create a new one
    - While creating function, select template `Event function`
    - While configuring function, please fill as follow:
        - Name: `cron`
        - Runtime: `Node.JS 12.x`
        - Upload Code: `Source pack upload`
        - Function entry: `app-ali_cron.handler`
        - Memory: `128MB`
        - Timeout: `600s`
5. Enter the service you created, select `Service Configuration` and click `Edit configuration`
    - In `Network Configuring`
        - Allow function access internet: `True`
        - Allow function access resoucres in VPC: `True`
        - Configure the VPC settings
    - In `NAS File System`, `NAS Mount Point`
        - Dir: select the NAS you created before
        - Remote Dir: `/`
        - Local Dir: `/mnt/cert`
    - In `Permission Configuring`, create a new role which includes follow
        - `AliyunVPCFullAccess`
        - `AliyunNASFullAccess`
        - `AliyunFCFullAccess`
        - `AliyunECSNetworkInterfaceManagementAccess`
    - Save configuration
6. Enter the function `cron`, setect `Code running` and click `Online editing`
    - Rename `config.example.js` to `config.js` and open it
    - Fill the file (certPath: `/mnt/cert`, other instructions please see [Configuration](#Configuration))
    - Click Save & Execute
7. Back to `service` page, create a new function same as above with the name `http`, and enter the function
    - Update function entry from `app-ali_cron.handler` to `app-ali_http.handler`
    - Copy the config.js file from cron function to http function
    - Now you can access your Tippy instance by post JSON object {"token": "your_token", "certName": "my_cert"} to the endpoint(like `https://12345678.cn-hongkong.fc.aliyuncs.com/2016-08-15/proxy/Tippy/http/`) to get the latest cert you request
8. Enjoy~

### API

```
POST https://12345678.cn-hongkong.fc.aliyuncs.com/2016-08-15/proxy/Tippy/http/
{
  "token": "your_token",
  "certName": "my_cert"
}

Response:
{
  "code": 0,
  "certPem": "-----BEGIN CERTIFICATE-----\n....",
  "keyPem": "-----BEGIN RSA PRIVATE KEY-----\n...."
}
{
  "code": -1
}
```

## Configuration

```javascript
module.exports = {
  logLevel: 'debug',
  email: 'i@lyn.moe',
  certPath: '/mnt/cert',
  token: [
    'abc123!@#'
  ],
  dnsProvider: {
    ali: {
      provider: 'alidns',
      accesskeyId: '',
      accesskeySecret: ''
    },
    cf: {
      provider: 'cloudflaredns',
      key: 'abc',
      email: 'i@lyn.moe',
      zoneId: {
        'lyn.moe': 'abc'
      }
    }
  },
  domainDnsMap: {
    'cgl.li': 'ali',
    'lyn.moe': 'cf'
  },
  certs: {
    for_root: {
      'cgl.li': [
        'www',
        '@'
      ],
      'lyn.moe': [
        '*',
        '@'
      ]
    }
  },
  cdnProvider: {
    ali: {
      type: 'alicdn',
      accesskeyId: '',
      accesskeySecret: ''
    }
  },
  cdnCertMap: [
    {
      provider: 'ali',
      cert: 'for_root',
      domain: 'www.cgl.li'
    }
  ]
}

```

- `dnsProvider` is for `domainDnsMap`, `cdnProvider` is for `cdnCertMap`
- `dnsProvider` is used to deploy cert to CDN services, in which `provider` stands for `cdnProvider{}`, cert stands for `certs{}`, domain stands for the domain you configured in CDN Provider

### Credit

[Illustration: Tippy but Cube](https://dewo-art.tumblr.com/post/184175945061/tippy-but-cube)

### Name

[Tippy](https://myanimelist.net/character/103091/Tippy) from [Gochuumon wa Usagi Desu ka?](https://myanimelist.net/anime/21273/Gochuumon_wa_Usagi_Desu_ka)

### LICENSE

MIT
