const body = require('body/json')
const sendJSON = require('send-data/json')
const targetsDb = require('./targets.db')

const updateTarget = async (req, res, opts, cb) => {
  body(req, res, async function (err, data) {
    if (err) return cb(err)
    const targetKey = await targetsDb.keysAsync('target:id:' + opts.params.id + '*')
    targetsDb.setAsync(targetKey[0], JSON.stringify(data))
    res.end('200')
  })
}

const getTarget = async (req, res, opts, cb) => {
  const targetKey = await targetsDb.keysAsync('target:id:' + opts.params.id + '*')
  const data = await targetsDb.getAsync(targetKey[0])
  sendJSON(req, res, { target: JSON.parse(data) })
}

const saveTarget = async (req, res, opts, cb) => {
  body(req, res, async function (err, data) {
    if (err) return cb(err)
    const redisKey = targetsDb.formatTargetKey(data)
    data.acceptCount = 0
    data.maxAcceptReached = !Number(data.maxAcceptsPerDay) > 0
    await targetsDb.setAsync(redisKey, JSON.stringify(data))
    res.end('200')
  })
}

const getAllTargets = async (req, res, opts, cb) => {
  const targets = []
  const targetKeys = await targetsDb.keysAsync('target*')
  for (const key of targetKeys) {
    const target = await targetsDb.getAsync(key)
    targets.push(JSON.parse(target))
  }
  sendJSON(req, res, { targets })
}

const postAcceptedTarget = async (key, target) => {
  target.acceptCount += 1
  if (target.acceptCount === Number(target.maxAcceptsPerDay)) target.maxAcceptReached = true
  targetsDb.setAsync(key, JSON.stringify(target))
}

const evaluateTarget = async (req, res, opts, cb) => {
  body(req, res, async function (err, data) {
    if (err) return cb(err)
    let hour = new Date(data.timestamp).getUTCHours()
    hour = hour < 10 ? '0' + hour : hour
    const keysPattern = 'target:id:*:geostate:*' + data.geoState + '*:hour:*' + hour + '*'
    const targetKeys = await targetsDb.keysAsync(keysPattern)
    if (targetKeys.length) {
      const targets = []
      for (const key of targetKeys) {
        const target = JSON.parse(await targetsDb.getAsync(key))
        if (target.maxAcceptReached === false) targets.push({ target, key })
      }
      if (targets.length) {
        const acceptTarget = targets.sort((a, b) => b.target.value - a.target.value)[0]
        postAcceptedTarget(acceptTarget.key, acceptTarget.target)
        sendJSON(req, res, { url: acceptTarget.target.url })
      } else {
        sendJSON(req, res, { decision: 'reject' })
      }
    } else {
      sendJSON(req, res, { decision: 'reject' })
    }
  })
}

const resetTargetCount = async () => {
  console.log('reset')
  const targetKeys = await targetsDb.keysAsync('target*')
  for (const key of targetKeys) {
    console.log(key)
    var target = JSON.parse(await targetsDb.getAsync(key))
    target.acceptCount = 0
    target.maxAcceptReached = !Number(target.maxAcceptsPerDay) > 0
    await targetsDb.setAsync(key, JSON.stringify(target))
  }
}

module.exports = {
  saveTarget,
  getTarget,
  getAllTargets,
  evaluateTarget,
  updateTarget,
  resetTargetCount
}
