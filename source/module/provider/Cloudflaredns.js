const Cloudflare = require('cloudflare')

class Cloudflaredns {
  constructor (data) {
    this.cf = new Cloudflare(data)

    // try {
    //   console.log(this.cf.dnsRecords.browse('9fe0ff246a07c4fdbed6d7cc862a1842').then(console.log, console.log))
    // } catch (e) {
    //   console.log(e)
    // }

    // const _dns = this.cf.dnsRecords
    // console.log(this.cf, _dns)

    // this.dns = new _dns()

    // console.log(this.dns)

    this._data = data
  }

  createRecord (domain, record, value) {
    return this.cf.dnsRecords.add(this._data.zoneId[domain], {
      type: 'TXT',
      name: `${record}.${domain}`,
      content: value
    }).then((result) => {
      return result.result.id
    })
  }

  removeRecord (domain, record, oriResponse) {
    return this.cf.dnsRecords.del(this._data.zoneId[domain], oriResponse)
  }
}

module.exports = Cloudflaredns
