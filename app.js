const fs = require('fs');
const crypto = require('crypto');
const objHash = require('object-hash');
const apply = require(__dirname + '/modules/apply');
const CONFIG = require(__dirname + '/modules/config');
let logger;{let _ = require(__dirname + '/modules/logger');logger = _('App');}
const common = require(__dirname + '/modules/common');
const dataPath = __dirname + '/certs/data.json';

const getAllCerts = () => {
    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, '{}');
    }
    let cert = fs.readFileSync(dataPath);
    return JSON.parse(cert);
};

const updateInfo = (hash, certInfo) => {
    let file = fs.readFileSync(dataPath);
    file = JSON.parse(file);
    file[hash] = certInfo;

    fs.writeFileSync(dataPath, JSON.stringify(file));
};

const applyNew = async (cert, nameHash, name) => {
    logger.info('Starting applying process for cert ', name);
    await apply.run(cert, nameHash, (certInfo) => {
        logger.info(`Applying process for name ${name} completed`);
        logger.info('Cert name hash:', nameHash);
        updateInfo(nameHash, certInfo);
    });
}

const checkAll = async () => {
    let CERTS = getAllCerts();
    logger.debug('Checking all certs...');
    for (let name in CONFIG.certs) {
        let cert = CONFIG.certs[name];
        logger.debug('Checking cert:', name);
        logger.debug('Cert altnames:', common.getAltName(cert));
        let nameHash = crypto.createHash('md5').update(name).digest('hex');
        let domainHash = objHash(common.getAltName(cert));
        logger.debug('Cert domains\' hash:', domainHash);

        let info = CERTS[nameHash];
        if (!info)
        {
            await applyNew(cert, nameHash, name);
            continue;
        }
        logger.debug('Cert name hash: ', nameHash);
        let expTime = 3600 * 24 * 10 * 1000 + (new Date()).getTime();
        if ((domainHash !== info.domainHash) || !(info && (info.notAfter > expTime)))
        {
            await applyNew(cert, nameHash, name);
            continue;
        }

        logger.info('Check pass');
    }
}

checkAll();