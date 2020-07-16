const fs = require('fs')
const crypto = require('crypto')
const path = require('path')
const objectHash = require('object-hash')
const { exec } = require('child_process')
const request = require('request')

if (!fs.existsSync(path.join(__dirname, 'config.json'))) process.exit()
if (!fs.existsSync(path.join(__dirname, 'data.json'))) fs.writeFileSync(path.join(__dirname, 'data.json'), '{}')

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')))
const func = {
  getData () {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json')))
  },

  updateData (data) {
    fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data))
  },

  checkCert (certInfo) {
    const data = func.getData()
    const certName = certInfo.name
    const token = CONFIG.token
    const nameHash = crypto.createHash('md5').update(certName).digest('hex')
    let certHash = 'none'
    if (data[nameHash]) certHash = data[nameHash]

    return new Promise((resolve) => {
      request.post(CONFIG.apiServer, {
        body: JSON.stringify({
          token: token,
          certName
        })
      }, (error, response, body) => {
        if (!body || error || response.statusCode !== 200) return
        body = JSON.parse(body)
        console.log(body)

        const newCertHash = objectHash(body)
        if (certHash === newCertHash) return

        const certDir = path.dirname(certInfo.certPath)
        const keyDir = path.dirname(certInfo.keyPath)
        if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true })
        if (!fs.existsSync(keyDir)) fs.mkdirSync(keyDir, { recursive: true })

        fs.writeFileSync(certInfo.certPath, body.certPem)
        fs.writeFileSync(certInfo.keyPath, body.keyPem)

        data[nameHash] = newCertHash
        console.log(newCertHash)
        func.updateData(data)

        exec(certInfo.afterPull, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`)
            return
          }
          if (stdout) console.log(`stdout: ${stdout}`)
          if (stderr) console.error(`stderr: ${stderr}`)
          resolve()
        })
      })
    })
  }
};

(async () => {
  for (const index in CONFIG.reqList) {
    await func.checkCert(CONFIG.reqList[index])
  }
})()
