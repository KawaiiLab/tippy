let logger;{let _ = require(__dirname + '/../modules/logger');logger = _('AliDNS');}
const crypto = require('crypto');
const promiseQueue = require("promise-queue-plus");
let queue = promiseQueue(1,{
    "retry": 1,
    "autoRun": true,
});

class alidns {
    constructor(accesskeyId, accesskeySecret) {
        this.request = require('request');

        this.options = {
            // API版本: https://help.aliyun.com/document_detail/29741.html
            apiVerison: '2015-01-09',
            region: 'cn-hangzhou',
            timeout: 120000,
            accesskeyId: accesskeyId,
            accesskeySecret: accesskeySecret,
        }

        this.config = {
            // DNS API的服务接入地址为：https://help.aliyun.com/document_detail/29744.html
            endpoint: 'http://alidns.aliyuncs.com/'
        }
    }

    queryData(conditions = {}, fn) {
        // API概览 :
        // https://help.aliyun.com/document_detail/29740.html
        this._request('POST', conditions, fn);
    }

    _generateUrl(customParams) {
        let params = this._getBasicParams();
        for (let i in customParams) {
            let value = customParams[i];
            if (typeof value != 'string') {
                value = JSON.stringify(value);
            }
            params[i] = value;
        }
        params['Signature'] = this._computeSignature(params, 'GET');
        let url = '';
        for (let i in params) {
            url += '&' + this._percentEncode(i) + '=' + this._percentEncode(params[i]);
        }
        url = url.substring(1);
    
        return this.config.endpoint + '?' + url;
    }

    _generateBody(customParams) {
        let params = this._getBasicParams();
        for (let i in customParams) {
            let value = customParams[i];
            if (typeof value != 'string') {
                value = JSON.stringify(value);
            }
            params[i] = value;
        }
        params['Signature'] = this._computeSignature(params, 'POST');
        let fields_string = '';
        for (let i in params) {
            fields_string += '&' + this._percentEncode(i) + '=' + this._percentEncode(params[i]);
        }
        fields_string = fields_string.substring(1);
        return fields_string;
    }

    _computeSignature (params, method) {
        let keys = Object.keys(params);
        keys = keys.sort();
        let canonicalizedQueryString = '';
        for (let i = 0; i < keys.length; i++) {
            canonicalizedQueryString += '&' + this._percentEncode(keys[i]) +
                '=' + this._percentEncode(params[keys[i]]);
        }
    
        canonicalizedQueryString = this._percentEncode(canonicalizedQueryString.substring(1));
        let stringToSign = method + '&%2F&' + canonicalizedQueryString;
        let signature = crypto.createHmac('sha1', this.options.accesskeySecret + '&')
            .update(stringToSign)
            .digest()
            .toString('base64');
        return signature;
    }

    _getBasicParams() {
        let now = new Date();
        let nonce = now.getTime() + '' + parseInt((Math.random() * 1000000000));
        return {
            RegionId: this.options.region,
            AccessKeyId: this.options.accesskeyId,
            Format: 'JSON',
            SignatureMethod: 'HMAC-SHA1',
            SignatureVersion: '1.0',
            SignatureNonce: nonce,
            Timestamp: now.toISOString(),
            Version: this.options.apiVerison
        }
    }

    _percentEncode(str) {
        str = encodeURIComponent(str);
        str = str.replace(/\*/g, '%20');
        str = str.replace(/\'/g, '%27');
        str = str.replace(/\(/g, '%28');
        str = str.replace(/\)/g, '%29');
        return str;
    }

    _request(method, body, fn) {
        let reqOptions = {
            timeout: this.options.timeout,
            method: method
        };
    
        if (method.toUpperCase() == 'GET') {
            reqOptions.url = this._generateUrl(body);
        } else {
            reqOptions.url = this.config.endpoint;
            reqOptions.body = this._generateBody(body);
            reqOptions.headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            };
        }
        // logger.debug(reqOptions);
        this.request(reqOptions, (err, response, body) => {
            if (err) logger.error('Request error:', err);
            // logger.debug('Response body:', body);
            this._onRequestResponse(err, response, fn);
        });
    }

    _onRequestResponse(err, response, fn) {
        if (err) {
            return fn(err, null)
        } else {
            try {
                let result = JSON.parse(response.body);
                if (result.Message) {
                    return fn(new Error(result.Message), null);
                }
                return fn(null, result);
            } catch (e) {
                console.error(e);
                return fn(new Error('Request MetricStore failed: ' + response.body), null);
            }
        }
    }
}

module.exports = {
    createRecord: (record, value, domain, config, cb) => {
        let client = new alidns(config.accessKeyId, config.accessKeySecret);

        // API概览 :
        // https://help.aliyun.com/document_detail/29740.html
        queue.add((resolve, reject) => {
            client.queryData({
                Action: "AddDomainRecord",
                DomainName: domain,
                RR: record,
                Type: 'TXT',
                Value: value,
            }, (err, res) => {
                if (err) {
                    logger.error(err);
                    setTimeout(_ => reject(), 500);
                }
                setTimeout(_ => resolve(), 500);
                cb({
                    domain: domain,
                    config: config,
                    res: res,
                });
            });
        });
    },
    
    deleteRecord: (response, cb) => {
        let client = new alidns(response.config.accessKeyId, response.config.accessKeySecret);
    
        // API概览 :
        // https://help.aliyun.com/document_detail/29740.html
        client.queryData({
            Action: "DeleteDomainRecord",
            RecordId: response.res.RecordId,
        }, (err, res) => {
            if (err) {
                logger.error(err);
                return;
            }
            cb(res);
        });
    },
};