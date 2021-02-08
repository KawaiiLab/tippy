const configData = require('./../../config')

module.exports = (pathString = '', defaultValue = '') => {
  const splitedString = pathString.trim().split('.')

  let lastValue = configData
  for (const i in splitedString) {
    const value = lastValue[splitedString[i]]
    if (value === undefined) return defaultValue
    lastValue = value
  }

  return lastValue
}
