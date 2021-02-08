const config = require('./config')
const log4js = require('log4js')
const logger = log4js.getLogger()
logger.level = config('logLevel', 'info')

module.exports = logger
