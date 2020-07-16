const config = require('./config')
const DeployAli = require('./provider/alicdn')

module.exports = async (cdnData, certPem, keyPem) => {
  const providerList = config('cdnProvider')
  if (providerList[cdnData.provider]) {
    const provider = providerList[cdnData.provider]
    let instance
    if (provider.type === 'alicdn') {
      instance = new DeployAli(provider)
    }

    if (!instance) throw new Error('Unknown provider type ' + provider.type)
    await instance.deployCert(cdnData.domain, certPem, keyPem)
  } else {
    throw new Error('Unknown provider ' + cdnData.provider)
  }
}
