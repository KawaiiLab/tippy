const sha1 = require('sha1')
const request = require('request')
const copy = require('copy-to')
const crypto = require('crypto')
const logger = require('../logger')

const defaultOptions = {
  // API版本: https://help.aliyun.com/document_detail/29741.html
  apiVerison: '2018-05-10',
  timeout: 120000
}

const config = {
  // DNS API的服务接入地址为：https://help.aliyun.com/document_detail/29744.html
  endpoint: 'https://cdn.aliyuncs.com/'
}

const ALICDN = function (options) {
  if (!(this instanceof ALICDN)) {
    return new ALICDN(options)
  }
  this.options = defaultOptions
  options && copy(options)
    .toCover(this.options)
  // 创建AccessKey
  // https://help.aliyun.com/document_detail/53045.html
  if (!this.options.accesskeyId ||
    !this.options.accesskeySecret) {
    throw new Error('accesskeyId and accesskeySecret is required')
  }
}

module.exports = ALICDN

const proto = ALICDN.prototype

proto.deployCert = function (domain, certName, serverCertificate, privateKey) {
  const certNameHash = certName + '_' + sha1(serverCertificate).substr(0, 8)
  return (new Promise((resolve, reject) => {
    this.queryData({
      Action: 'DescribeDomainCertificateInfo',
      DomainName: domain
    }, function (err, res) {
      logger.debug(err, res)
      if (err) {
        logger.error(err)
        reject(new Error(err))
      }

      if (res.CertInfos.CertInfo[0].CertName === certNameHash) resolve(true)
      resolve(false)
    })
  })).then((bool) => {
    return new Promise((resolve, reject) => {
      if (bool) {
        resolve()
        return
      }
      this.queryData({
        Action: 'SetDomainServerCertificate',
        DomainName: domain,
        ServerCertificateStatus: 'on',
        CertType: 'upload',
        CertName: certNameHash,
        ServerCertificate: serverCertificate,
        PrivateKey: privateKey,
        ForceSet: '1'
      }, function (err, res) {
        logger.debug(err, res)
        if (err) {
          logger.error(err)
          reject(new Error(err))
        }

        resolve({ res })
      })
    })
  })
}

proto.queryData = function (conditions = {}, fn) {
  this._request('GET', conditions, fn)
}

// GET参数生成
proto._generateUrl = function (customParams) {
  const params = this._getBasicParams()
  for (const i in customParams) {
    let value = customParams[i]
    if (typeof value !== 'string') {
      value = JSON.stringify(value)
    }
    params[i] = value
  }
  params.Signature = this._computeSignature(params, 'GET')
  let url = ''
  for (const i in params) {
    url += '&' + this._percentEncode(i) + '=' + this._percentEncode(params[i])
  }
  url = url.substring(1)

  return config.endpoint + '?' + url
}

// POST参数生成
proto._generateBody = function (customParams) {
  const params = this._getBasicParams()
  for (const i in customParams) {
    let value = customParams[i]
    if (typeof value !== 'string') {
      value = JSON.stringify(value)
    }
    params[i] = value
  }
  params.Signature = this._computeSignature(params, 'POST')
  let fieldsString = ''
  for (const i in params) {
    fieldsString += '&' + this._percentEncode(i) + '=' + this._percentEncode(params[i])
  }
  fieldsString = fieldsString.substring(1)
  return fieldsString
}

// 签名机制: https://help.aliyun.com/document_detail/29747.html
proto._computeSignature = function (params, method) {
  let keys = Object.keys(params)
  keys = keys.sort()
  let canonicalizedQueryString = ''
  for (let i = 0; i < keys.length; i++) {
    canonicalizedQueryString += '&' + this._percentEncode(keys[i]) + '=' + this._percentEncode(params[keys[i]])
  }

  canonicalizedQueryString = this._percentEncode(canonicalizedQueryString.substring(1))
  const stringToSign = method + '&%2F&' + canonicalizedQueryString
  const signature = crypto.createHmac('sha1', this.options.accesskeySecret + '&')
    .update(stringToSign)
    .digest()
    .toString('base64')
  return signature
}

// 生成公共请求参数
// 公共请求参数说明: https://help.aliyun.com/document_detail/29745.html
proto._getBasicParams = function () {
  const now = new Date()
  const nonce = now.getTime() + '' + parseInt((Math.random() * 1000000000))
  return {
    AccessKeyId: this.options.accesskeyId,
    Format: 'JSON',
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: nonce,
    Timestamp: now.toISOString(),
    Version: this.options.apiVerison
  }
}

// 规范化字符串,URL编码
proto._percentEncode = function (str) {
  str = encodeURIComponent(str)
  str = str.replace(/\*/g, '%20')
  str = str.replace(/'/g, '%27')
  str = str.replace(/\(/g, '%28')
  str = str.replace(/\)/g, '%29')
  return str
}

// 调用请求
proto._request = function (method, body, fn) {
  const reqOptions = {
    timeout: this.options.timeout,
    method: method
  }

  if (method.toUpperCase() === 'GET') {
    reqOptions.url = this._generateUrl(body)
  } else {
    reqOptions.url = config.endpoint
    reqOptions.body = this._generateBody(body)
    reqOptions.headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }

  request(reqOptions, function (err, response, body) {
    if (err) {
      return fn(err, null)
    } else {
      try {
        const result = JSON.parse(response.body)
        if (result.Message) {
          return fn(new Error(result.Message), null)
        }
        return fn(null, result)
      } catch (e) {
        console.error(e)
        return fn(new Error('Request MetricStore failed: ' + response.body), null)
      }
    }
  })
}
