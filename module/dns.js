const config = require('./config')
const ProviderAli = require('./provider/alidns')
const logger = require('./logger')

module.exports = {
  _getProvider (host) {
    const domainDns = config('domainDnsMap')[host]
    if (!domainDns) throw new Error('Unknow host ' + host + '!')

    const domainDnsObj = config('dnsProvider')[domainDns]
    if (!domainDnsObj) throw new Error('Unknow domain DNS ' + domainDns + '!')

    switch (domainDnsObj.provider) {
    case 'alidns': {
      const instance = new ProviderAli(domainDnsObj)

      return instance
    }
    }
  },

  async createRecord (host, dnsRecord, dnsValue) {
    logger.debug('Creating DNS record', dnsRecord, 'for', host)
    const instance = this._getProvider(host)
    return await instance.createRecord(host, dnsRecord, dnsValue)
  },

  async removeRecord (host, dnsRecord, oriResponse) {
    logger.debug('Deleting DNS record', dnsRecord, 'for', host)
    const instance = this._getProvider(host)
    return await instance.removeRecord(host, dnsRecord, oriResponse)
  }
}
