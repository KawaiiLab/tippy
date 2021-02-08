const app = require('./source/main')

module.exports.handler = async (event, context, callback) => {
  try {
    await app.cronJob()
  } catch (e) {
    callback(e, null)
  }

  callback(null, 'success')
}
