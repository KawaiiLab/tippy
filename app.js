const apply = require('./module/apply')
const deploy = require('./module/deploy')
const config = require('./module/config')
const objectHash = require('object-hash')
const path = require('path')
const fs = require('fs')

module.exports = {
  async cronJob () {
    const list = config('certs')

    for (const index in list) {
      const certData = list[index]
      const hash = objectHash(certData)
      const certPath = path.resolve(config('certPath', './cert'), `${hash}/`)
      if (fs.existsSync(path.join(certPath, 'info.json'))) {
        const certData = JSON.parse(fs.readFileSync(path.join(certPath, 'info.json')).toString())

        if (((new Date()).getTime() + 3600 * 24 * 5 * 1000) < certData.notAfter) {
          continue
        }
      }

      await apply.process(certData, hash)
    }

    await this.deployCert()
  },

  getCert (name) {
    if (config('certs')[name]) {
      const hash = objectHash(config('certs')[name])
      const certPath = path.resolve(config('certPath', './cert'), `${hash}/`)
      if (fs.existsSync(path.join(certPath, 'info.json'))) {
        const certPem = fs.readFileSync(path.join(certPath, 'cert.pem')).toString()
        const keyPem = fs.readFileSync(path.join(certPath, 'key.pem')).toString()

        return {
          certPem,
          keyPem
        }
      }
    }
  },

  async deployCert () {
    const cdnList = config('cdnCertMap')
    for (const i in cdnList) {
      const data = cdnList[i]
      const { certPem, keyPem } = this.getCert(data.cert)
      await deploy(data, certPem, keyPem)
    }
  }
}
