module.exports = {
  logLevel: 'debug',
  email: 'i@xiaol.in',
  certPath: './cert',
  token: [
    'abc123!@#'
  ],
  dnsProvider: {
    ali: {
      provider: 'alidns',
      accesskeyId: '',
      accesskeySecret: ''
    }
  },
  domainDnsMap: {
    'cgl.li': 'ali'
  },
  certs: {
    for_root: {
      'cgl.li': [
        'www',
        '@'
      ]
    }
  },
  cdnProvider: {
    ali: {
      type: 'alicdn',
      accesskeyId: '',
      accesskeySecret: ''
    }
  },
  cdnCertMap: [
    {
      provider: 'ali',
      cert: 'for_root',
      domain: 'www.cgl.li'
    }
  ]
}
