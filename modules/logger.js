const CONFIG = require(__dirname + '/config');
const log4js = require('log4js');
const logger = log4js.getLogger('CertMan');

logger.level = CONFIG['logLevel'];
module.exports = logger;