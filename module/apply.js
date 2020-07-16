const fs = require('fs')
const dns = require('./dns')
const path = require('path')
const logger = require('./logger')
const config = require('./config')
const acme = require('acme-client')
const objectHash = require('object-hash')
const replaceLast = require('replace-last')
const randomString = require('randomstring')
const { default: PQueue } = require('p-queue')

const randomStrDb = {}

const getAltName = (domains) => {
  const altNames = []
  for (const domain in domains) {
    const domainData = domains[domain]
    for (const record of domainData) {
      altNames.push(((record === '@') ? '' : (record + '.')) + domain)
    }
  }

  return altNames
}

module.exports = {
  async process (certData, hash) {
    let altNames = []
    altNames = getAltName(certData)
    logger.debug('Alt names: ', altNames)
    const allDomains = [...altNames]

    let [key, csr] = await acme.forge.createCsr({
      commonName: altNames.shift(),
      altNames: altNames
    })
    key = key.toString().replace('\r\n', '\n')

    const domainList = []
    for (const domain in certData) domainList.push(domain)

    const cert = await this.auto({
      csr,
      email: config('email'),
      termsOfServiceAgreed: true,
      challengeCreateFn: (authz, challenge, keyAuthorization) => {
        let host = ''

        for (const domain of domainList) {
          const index = authz.identifier.value.indexOf(domain)
          if (index !== -1 && ((index + domain.length) === authz.identifier.value.length)) {
            host = domain
            break
          }
        }

        return this.onChallengeCreate(authz, challenge, keyAuthorization, host)
      },
      challengeRemoveFn: this.onChallengeRemove,
      challengePriority: ['dns-01'],
      skipChallengeVerification: true
    })

    /* Done */
    // logger.debug(`Private key:\n`, key.toString())
    // logger.debug(`Certificate:\n`, cert)

    const certPath = path.resolve(config('certPath', './cert'), `${hash}/`)
    const certInfo = {
      notBefore: (new Date()).getTime(),
      notAfter: (new Date()).getTime() + 5184000000,
      certHash: objectHash({ cert: cert, ket: key.toString() }),
      domainHash: objectHash(allDomains),
      altNames: altNames,
      commonName: allDomains[0]
    }

    if (!fs.existsSync(certPath)) fs.mkdirSync(certPath, { recursive: true })
    fs.writeFileSync(path.join(certPath, 'cert.pem'), cert)
    fs.writeFileSync(path.join(certPath, 'key.pem'), key)
    fs.writeFileSync(path.join(certPath, 'info.json'), JSON.stringify(certInfo))

    return certInfo
  },

  async auto (opts) {
    const defaultOpts = {
      csr: null,
      email: null,
      termsOfServiceAgreed: false,
      skipChallengeVerification: false,
      challengePriority: ['dns-01'],
      challengeCreateFn: async () => {
        throw new Error('Missing challengeCreateFn()')
      },
      challengeRemoveFn: async () => {
        throw new Error('Missing challengeRemoveFn()')
      }
    }

    opts = Object.assign({}, defaultOpts, opts)
    logger.debug('Options: ', opts)

    const accountPayload = {
      termsOfServiceAgreed: true
    }

    if (!Buffer.isBuffer(opts.csr)) {
      opts.csr = Buffer.from(opts.csr)
    }

    if (opts.email) {
      accountPayload.contact = [`mailto:${opts.email}`]
    }

    const client = new acme.Client({
      directoryUrl: acme.directory.letsencrypt.production,
      accountKey: await acme.forge.createPrivateKey()
    })

    try {
      client.getAccountUrl()
      logger.debug('Account URL already exists, skipping account registration')
    } catch (e) {
      logger.debug('Registering an account')
      await client.createAccount(accountPayload)
    }

    /**
      * Parse domains from CSR
      */
    logger.debug('Parsing domains from Certificate Signing Request')
    const csrDomains = await acme.forge.readCsrDomains(opts.csr)
    const domains = [csrDomains.commonName].concat(csrDomains.altNames)
    logger.info(`Resolved ${domains.length} domains from parsing the Certificate Signing Request`)

    /**
      * Place order
      */
    logger.info('Placing new certificate order with ACME provider')
    const orderPayload = {
      identifiers: domains.map((d) => ({
        type: 'dns',
        value: d
      }))
    }
    const order = await client.createOrder(orderPayload)
    const authorizations = await client.getAuthorizations(order)
    logger.debug(`Placed certificate order successfully, received ${authorizations.length} identity authorizations`)

    /**
      * Resolve and satisfy challenges
      */
    logger.info('Resolving and satisfying authorization challenges')
    const queue = new PQueue({ concurrency: 1 })

    const challengePromises = authorizations.map(async (authz) => {
      const d = authz.identifier.value

      /* Select challenge based on priority */
      const challenge = authz.challenges.sort((a, b) => {
        const aidx = opts.challengePriority.indexOf(a.type)
        const bidx = opts.challengePriority.indexOf(b.type)

        if (aidx === -1) return 1
        if (bidx === -1) return -1
        return aidx - bidx
      }).slice(0, 1)[0]

      if (!challenge) {
        throw new Error(`Unable to select challenge for ${d}, no challenge found`)
      }

      logger.debug(`[${d}] Found ${authz.challenges.length} challenges, selected type: ${challenge.type}`)

      /* Trigger challengeCreateFn() */
      logger.debug(`[${d}] Trigger challengeCreateFn()`)
      const keyAuthorization = await client.getChallengeKeyAuthorization(challenge)

      let randomStr
      try {
        await queue.add(async () => {
          randomStr = await opts.challengeCreateFn(authz, challenge, keyAuthorization)
        })

        /* Challenge verification */
        if (opts.skipChallengeVerification !== true) {
          await client.verifyChallenge(authz, challenge)
        }

        logger.info('Wait 5s for DNS varifing')
        await new Promise(resolve => setTimeout(resolve, 5000))

        logger.info('Completing chanllenge')
        await client.completeChallenge(challenge)
        await client.waitForValidStatus(challenge)
        logger.info('Challenge completed')
      } finally {
        /* Trigger challengeRemoveFn(), suppress errors */
        logger.debug(`[${d}] Trigger challengeRemoveFn()`)
        try {
          await opts.challengeRemoveFn(randomStr)
        } catch (e) {
          logger.error(e)
        }
      }
    })

    logger.info('Waiting for challenge valid status')
    await Promise.all(challengePromises)

    /**
      * Finalize order and download certificate
      */
    logger.info('Finalizing order and downloading certificate')
    await client.finalizeOrder(order, opts.csr)
    return client.getCertificate(order)
  },

  async onChallengeCreate (authz, challenge, keyAuthorization, host) {
    let dnsRecord = authz.identifier.value
    const dnsValue = keyAuthorization

    dnsRecord = '_acme-challenge.' + replaceLast(dnsRecord, host, '')
    dnsRecord = replaceLast(dnsRecord, '.', '')
    if (dnsRecord === '') dnsRecord = '@'
    logger.debug('DNS Record: ', dnsRecord)
    logger.debug('DNS Value: ', dnsValue)
    const randomStr = randomString.generate(6)

    const oriResponse = await dns.createRecord(host, dnsRecord, dnsValue)
    randomStrDb[randomStr] = {
      host,
      dnsRecord,
      oriResponse
    }

    return randomStr
  },

  async onChallengeRemove (randomStr) {
    const data = randomStrDb[randomStr]
    if (!data) return
    const { host, dnsRecord, oriResponse } = data
    await dns.removeRecord(host, dnsRecord, oriResponse)

    delete randomStrDb[randomStr]
  }
}
