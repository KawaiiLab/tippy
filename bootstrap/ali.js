const getRawBody = require('raw-body')
const config = require('../module/config')
const app = require('../app')

module.exports = async (req, res, context) => {
  if (req.queries.token && config('token').includes(req.queries.token)) {
    if (req.queries.cron === 'true') {
      await app.cronJob()
      res.setStatusCode(200)
      res.setHeader('content-type', 'application/json')
      res.send(JSON.stringify({
        status: 200
      }))
      return
    }
  }

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
      status: 403
    }))
  }

  const certInfo = await app.getCert(body.certName)
  res.setStatusCode(200)
  res.setHeader('content-type', 'application/json')
  res.send(JSON.stringify({
    status: 200,
    certPem: certInfo.certPem,
    keyPem: certInfo.keyPem
  }))
}
