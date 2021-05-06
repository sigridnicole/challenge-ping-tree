const redis = require('./redis')
const { promisify } = require('util')

const formatTargetKey = (params) => {
  const states = params.accept.geoState.$in.join('-')
  const hours = params.accept.hour.$in.join('-')
  const redisKey = 'target:id:' + params.id + ':geostate:' + states + ':hour:' + hours
  return redisKey
}

module.exports = {
  getAsync: promisify(redis.get).bind(redis),
  setAsync: promisify(redis.set).bind(redis),
  keysAsync: promisify(redis.keys).bind(redis),
  formatTargetKey
}
