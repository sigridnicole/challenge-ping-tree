const body = require('body/json')
const sendJSON = require('send-data/json')
const targetsDb = require('./targets.db')

const updateTarget = async (req, res, opts, cb) => {
  body(req, res, async function (err, data) {
    if (err) return cb(err)
    await targetsDb.setTarget(opts.params.id, data)
    res.end('200')
  })
}

const getTarget = async (req, res, opts, cb) => {
  const target = await targetsDb.getTarget(opts.params.id)
  sendJSON(req, res, { target })
}

const saveTarget = async (req, res, opts, cb) => {
  body(req, res, async function (err, data) {
    if (err) return cb(err)
    if (!data || !data?.id) {
      res.end('400')
    } else {
      await Promise.all([
        targetsDb.setTarget(data.id, data),
        targetsDb.setTraffic(data.id)
      ])
      res.end('200')
    }
  })
}

const getAllTargets = async (req, res, opts, cb) => {
  const targets = await targetsDb.getAllTargets()
  sendJSON(req, res, { targets })
}

const filterTargets = async (targets, filters) => {
  const sortedTargets = targets.sort((targeta, targetb) => Number(targetb.value) - Number(targeta.value))
  let acceptedTarget = null

  if (!filters.geoState && !filters.hour) return acceptedTarget
  filters.hour = filters.hour.toString()

  for await (const target of sortedTargets) {
    if (target.accept?.geoState && target.accept?.hour) {
      if (target.accept.geoState.$in.includes(filters.geoState) && target.accept.hour.$in.includes(filters.hour)) {
        const traffic = await targetsDb.getTraffic(target.id)
        if (traffic.count < target.maxAcceptsPerDay) {
          acceptedTarget = { target, traffic }
          break
        }
      }
    }
  }
  return acceptedTarget
}

const evaluateTarget = async (req, res, opts, cb) => {
  body(req, res, async function (err, data) {
    if (err) return cb(err)
    const targets = await targetsDb.getAllTargets()
    if (!targets.length) {
      return sendJSON(req, res, { decision: 'reject' })
    }

    const filters = {
      geoState: data?.geoState,
      hour: new Date(data?.timestamp).getUTCHours()
    }

    const filteredTarget = await filterTargets(targets, filters)
    if (filteredTarget) {
      targetsDb.incrementTraffic(filteredTarget.target.id, filteredTarget.traffic)
      sendJSON(req, res, { decision: 'accept', url: filteredTarget.target.url })
    } else {
      sendJSON(req, res, { decision: 'reject' })
    }
  })
}

module.exports = {
  saveTarget,
  getTarget,
  getAllTargets,
  evaluateTarget,
  updateTarget
}
