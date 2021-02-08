const getRawBody = require('raw-body')
const config = require('./source/module/config')
const app = require('./source/main')

module.exports.handler = async (req, res, context) => {
  let body = await getRawBody(req)
  try {
    body = JSON.parse(body)

    if (!body || !config('token').includes(body.token)) {
      throw new Error()
    }
  } catch (e) {
    res.setStatusCode(403)
    res.setHeader('content-type', 'application/json')
    res.send(JSON.stringify({
      code: -1
    }))
  }

  const certInfo = await app.getCert(body.certName)
  res.setStatusCode(200)
  res.setHeader('content-type', 'application/json')
  res.send(JSON.stringify({
    code: 0,
    certPem: certInfo.certPem,
    keyPem: certInfo.keyPem
  }))
}
