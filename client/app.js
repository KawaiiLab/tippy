const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { exec } = require('child_process');
const request = require('request');

if (!fs.existsSync(__dirname + '/config.json')) process.exit();
if (!fs.existsSync(__dirname + '/data.json')) fs.writeFileSync(__dirname + '/data.json', '{}');

const CONFIG = JSON.parse(fs.readFileSync(__dirname + '/config.json'));
const func = {
    getData: () => {
        return JSON.parse(fs.readFileSync(__dirname + '/data.json'));
    },

    updateData: (data) => {
        fs.writeFileSync(__dirname + '/data.json', JSON.stringify(data));
    },

    checkCert: (certInfo) => {
        let data = func.getData();
        let certName = certInfo['name'];
        let token = CONFIG['token'];
        let nameHash = crypto.createHash('md5').update(certName).digest('hex');
        let certHash = 'none';
        if (data[nameHash]) certHash = data[nameHash];

        return new Promise((resolve) => {
            request.post(CONFIG['apiServer'], {
                body: JSON.stringify({
                    token: token,
                    nameHash: nameHash,
                    certHash: certHash,
                }),
            }, (error, response, body) => {
                if (!body || error || response.statusCode !== 200) return;
                body = JSON.parse(body);
                console.log(body);
            
                let certDir = path.dirname(certInfo['certPath']);
                let keyDir = path.dirname(certInfo['keyPath']);
                if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, {recursive: true});
                if (!fs.existsSync(keyDir)) fs.mkdirSync(keyDir, {recursive: true});

                fs.writeFileSync(certInfo['certPath'], body['certContent']);
                fs.writeFileSync(certInfo['keyPath'], body['certKey']);
                data[nameHash] = body['certHash'];
                console.log(body['certHash']);
                func.updateData(data);

                exec(certInfo['afterPull'], (error, stdout, stderr) => {
                    if (error) {
                      console.error(`exec error: ${error}`);
                      return;
                    }
                    if (stdout) console.log(`stdout: ${stdout}`);
                    if (stderr) console.error(`stderr: ${stderr}`);
                    resolve();
                  });
            });
        });
    }
};

(async () => {
    for (let index in CONFIG.reqList) {
        await func.checkCert(CONFIG.reqList[index]);
    }
})();