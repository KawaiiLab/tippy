const CONFIG = require(__dirname + '/config');
const log4js = require('log4js');

module.exports = (name) => {
    const logger = log4js.getLogger(name);
    logger.level = CONFIG['logLevel'];
    return logger;
}