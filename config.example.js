module.exports = {
  logLevel: 'debug',
  email: 'i@lyn.moe',
  certPath: './cert',
  token: [
    'abc123!@#'
  ],
  dnsProvider: {
    ali: {
      provider: 'alidns',
      accesskeyId: '',
      accesskeySecret: ''
    },
    cf: {
      provider: 'cloudflaredns',
      key: 'abc',
      email: 'i@lyn.moe',
      zoneId: {
        'lyn.moe': 'abc'
      }
    }
  },
  domainDnsMap: {
    'cgl.li': 'ali',
    'lyn.moe': 'cf'
  },
  certs: {
    for_root: {
      'cgl.li': [
        'www',
        '@'
      ],
      'lyn.moe': [
        '*',
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
