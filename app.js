const fs = require('fs');
const apply = require(__dirname + '/apply');
const objHash = require('object-hash');
const CONFIG = require(__dirname + '/modules/config');
let CERTS = {};

if (!fs.existsSync(__dirname + '/certs/data.json'))
{
    fs.writeFileSync(__dirname + '/certs/data.json', '{}');
    CERTS = {};
} else {
    CERTS = fs.readFileSync(__dirname + '/certs/data.json').toString();
    CERTS = JSON.parse(CERTS);
}

CONFIG.certs.forEach((cert) => {
    let hash = objHash(cert);
    let info = CERTS[hash]
    if (info && (info.notAfter > (3600 * 24 * 10 + (new Date()).getTime())))
    {
        return;
    }

    apply.run(cert, hash);
});
