const fs = require('fs');
const CONFIG = JSON.parse(fs.readFileSync(__dirname + '/../config.json'));
if (!CONFIG) process.exit(1);

module.exports = CONFIG;