const fs = require('fs');
const replaceLast = require('replace-last');
const acme = require('acme-client');
const objHash = require('object-hash');
const randomString = require("randomstring");
const CONFIG = require(__dirname + '/config');
let logger;{let _ = require(__dirname + '/logger');logger = _('Apply');}
const common = require(__dirname + '/common');
const alidns = require(__dirname + '/../providers/alidns_new');
let storage = {};

const apply = {
    dnsCaller(name) {
        let type = CONFIG['identifiers'][name].type;
        switch (type) {
            case "alidns":
                return alidns;
            default:
                process.exit();
        }
    },

    async run(domainData, hash, cb) {
        let altNames = [];
        altNames = common.getAltName(domainData);
        logger.info('Alt names: ', altNames);
        let allDomains = altNames;

        let [key, csr] = await acme.forge.createCsr({
            commonName: altNames.shift(),
            altNames: altNames,
        });
        key = key.toString().replace("\r\n", "\n");
        let domainList = [];
        for (let domain in domainData) domainList.push(domain);

        const cert = await this.auto({
            csr,
            email: CONFIG.email,
            termsOfServiceAgreed: true,
            challengeCreateFn: (authz, challenge, keyAuthorization) => {
                let host = '';
                domainList.forEach((domain) => {
                    let index = authz.identifier.value.indexOf(domain);
                    if (index !== -1 && ((index + domain.length) === authz.identifier.value.length))
                    {
                        host = domain;
                        return;
                    }
                });
                return this.challengeCreateFn(authz, challenge, keyAuthorization, host);
            },
            challengeRemoveFn: this.challengeRemoveFn,
            challengePriority: ['dns-01'],
            skipChallengeVerification: true,
        });

        /* Done */
        // logger.debug(`Private key:\n`, key.toString());
        // logger.debug(`Certificate:\n`, cert);

        let path = __dirname + '/..//certs/' + hash + '/';
        let certInfo = {
            notBefore: (new Date()).getTime(),
            notAfter: (new Date()).getTime() + 5184000000,
            certHash: objHash({ cert: cert, ket: key.toString() }),
            domainHash: objHash(allDomains),
            altNames: altNames,
            commonName: allDomains[0],
        };
        if (!fs.existsSync(path)) fs.mkdirSync(path);
        fs.writeFileSync(path + 'cert.pem', cert);
        fs.writeFileSync(path + 'key.pem', key);
        // fs.writeFileSync(path + 'info.json', JSON.stringify(certInfo));
        try {
            cb(certInfo);
        } catch (e) {
            throw new Error(e);
        }
    },

    challengeCreateFn(authz, challenge, keyAuthorization, host) {
        let dnsRecord = authz.identifier.value;
        let dnsValue = keyAuthorization;

        dnsRecord = '_acme-challenge.' + replaceLast(dnsRecord, host, '');
        dnsRecord = replaceLast(dnsRecord, '.', '');
        if (dnsRecord === '') dnsRecord = '@';
        logger.debug('DNS Record: ', dnsRecord);
        logger.debug('DNS Value: ', dnsValue);
        let randomStr = randomString.generate(6);

        return new Promise((resolve) => {
            this.dnsCaller(CONFIG.domains[host]).createRecord(
                dnsRecord,
                dnsValue,
                host,
                CONFIG.identifiers[CONFIG.domains[host]],
                (res) => {
                    logger.info(`Record ${dnsRecord + host} created`);
                    // logger.debug(res);
                    storage[randomStr] = {
                        that: this,
                        res: res,
                    };
                    resolve(randomStr);
                }
            );
        });
    },

    challengeRemoveFn(randomStr) {
        let res = storage[randomStr];
        if (!res) return;
        res.that.dnsCaller(CONFIG.domains[res.res.domain]).deleteRecord(res.res, (res) => {
            // logger.debug('Removed record: ', res);
        });
        delete storage[randomStr];
    },

    async auto(opts) {
        const defaultOpts = {
            csr: null,
            email: null,
            termsOfServiceAgreed: false,
            skipChallengeVerification: false,
            challengePriority: ['dns-01'],
            challengeCreateFn: async () => {
                throw new Error('Missing challengeCreateFn()');
            },
            challengeRemoveFn: async () => {
                throw new Error('Missing challengeRemoveFn()');
            }
        };

        opts = Object.assign({}, defaultOpts, opts);
        logger.debug('Options: ', opts);

        const accountPayload = {
            termsOfServiceAgreed: true
        };

        if (!Buffer.isBuffer(opts.csr)) {
            opts.csr = Buffer.from(opts.csr);
        }

        if (opts.email) {
            accountPayload.contact = [`mailto:${opts.email}`];
        }

        const client = new acme.Client({
            directoryUrl: acme.directory.letsencrypt.staging,
            accountKey: await acme.forge.createPrivateKey()
        });

        try {
            client.getAccountUrl();
            logger.debug('Account URL already exists, skipping account registration');
        } catch (e) {
            logger.debug('Registering an account');
            await client.createAccount(accountPayload);
        }

        /**
         * Parse domains from CSR
         */
        logger.debug('Parsing domains from Certificate Signing Request');
        const csrDomains = await acme.forge.readCsrDomains(opts.csr);
        const domains = [csrDomains.commonName].concat(csrDomains.altNames);
        logger.info(`Resolved ${domains.length} domains from parsing the Certificate Signing Request`);

        /**
         * Place order
         */
        logger.info('Placing new certificate order with ACME provider');
        const orderPayload = {
            identifiers: domains.map((d) => ({
                type: 'dns',
                value: d
            }))
        };
        const order = await client.createOrder(orderPayload);
        const authorizations = await client.getAuthorizations(order);
        logger.debug(`Placed certificate order successfully, received ${authorizations.length} identity authorizations`);

        /**
         * Resolve and satisfy challenges
         */
        logger.info('Resolving and satisfying authorization challenges');
        const challengePromises = authorizations.map(async (authz) => {
            const d = authz.identifier.value;

            /* Select challenge based on priority */
            const challenge = authz.challenges.sort((a, b) => {
                const aidx = opts.challengePriority.indexOf(a.type);
                const bidx = opts.challengePriority.indexOf(b.type);

                if (aidx === -1) return 1;
                if (bidx === -1) return -1;
                return aidx - bidx;
            }).slice(0, 1)[0];

            if (!challenge) {
                throw new Error(`Unable to select challenge for ${d}, no challenge found`);
            }

            logger.debug(`[${d}] Found ${authz.challenges.length} challenges, selected type: ${challenge.type}`);

            /* Trigger challengeCreateFn() */
            logger.debug(`[${d}] Trigger challengeCreateFn()`);
            const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);

            let randomStr;
            try {
                randomStr = await opts.challengeCreateFn(authz, challenge, keyAuthorization);

                /* Challenge verification */
                if (opts.skipChallengeVerification !== true) {
                    await client.verifyChallenge(authz, challenge);
                }

                logger.info('Wait 10s for DNS varifing');
                await new Promise(r => setTimeout(r, 10000));

                logger.info('Completing chanllenge');
                await client.completeChallenge(challenge);
                await client.waitForValidStatus(challenge);
                logger.info('Challenge completed');
            } finally {
                /* Trigger challengeRemoveFn(), suppress errors */
                logger.debug(`[${d}] Trigger challengeRemoveFn()`);
                try {
                    await opts.challengeRemoveFn(randomStr);
                } catch (e) {
                    logger.error(e);
                }
            }
        });

        logger.info('Waiting for challenge valid status');
        await Promise.all(challengePromises);

        /**
         * Finalize order and download certificate
         */
        logger.info('Finalizing order and downloading certificate');
        await client.finalizeOrder(order, opts.csr);
        return client.getCertificate(order);
    },
};

module.exports = apply;