const redis = require('./redis')
const { promisify } = require('util')

const hget = promisify(redis.hget).bind(redis)
const hset = promisify(redis.hset).bind(redis)
const hvals = promisify(redis.hvals).bind(redis)

const getTarget = async (id) => JSON.parse(await hget('targets', id))

const setTarget = async (id, data) => await hset('targets', id, JSON.stringify(data))

const getAllTargets = async () => {
  const targets = await hvals('targets')
  return targets.map(target => JSON.parse(target))
}

const trafficInit = {
  count: 0,
  date: new Date().toDateString()
}

const getTraffic = async (id) => {
  const traffic = JSON.parse(await hget('targetsTraffic', id))
  /**
   * RESET Accept Counters for target when date today is different from existing
   */
  const dateToday = new Date().toDateString()
  const isAcceptCounterDateToday = dateToday === traffic.date
  if (isAcceptCounterDateToday) {
    return traffic
  } else {
    await setTraffic(id)
    return trafficInit
  }
}

const setTraffic = async (id) => {
  await hset('targetsTraffic', id, JSON.stringify(trafficInit))
}

const incrementTraffic = async (id, traffic) => {
  traffic.count += 1
  await hset('targetsTraffic', id, JSON.stringify(traffic))
}

module.exports = {
  getTarget,
  setTarget,
  getAllTargets,
  getTraffic,
  setTraffic,
  incrementTraffic
}
