const fs = require('fs');
const CONFIG = require(__dirname + '/../../modules/config');

module.exports = (context, req) => {
    let token = req.query.token || (req.body && req.body.token);
    if (!CONFIG.tokens.includes(token))
    {
        let response = {};
        response.status = 403;
        response.body = '{}';

        context.res = response;
        context.done();
        return;
    }
    let data = {};
    let dataPath = __dirname + '/../../certs/data.json';
    if (fs.existsSync(dataPath))
    {
        data = JSON.parse(fs.readFileSync(dataPath));
    }

    let nameHash = req.query.nameHash || (req.body && req.body.nameHash);
    let certHash = req.query.certHash || (req.body && req.body.certHash);

    let response = {};
    if (data[nameHash] && data[nameHash].certHash !== certHash)
    {
        response.status = 200;
        response.body = JSON.stringify({
            certHash: data[nameHash].certHash,
            certContent: fs.readFileSync(__dirname + '/../../certs/' + nameHash + '/cert.pem').toString(),
            certKey: fs.readFileSync(__dirname + '/../../certs/' + nameHash + '/key.pem').toString(),
        });

        context.res = response;
        context.done();
    }

    response.status = 204;
    response.body = '{}';

    context.res = response;
    context.done();
}