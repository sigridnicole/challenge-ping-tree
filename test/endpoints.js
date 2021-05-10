process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')

var server = require('../lib/server')
var targetsDb = require('../lib/targets.db')

/** Mock inputs for all tests except last route url: /route method: post */
var targetSample = {
  id: '1',
  url: 'http://example.com',
  value: '0.5',
  maxAcceptsPerDay: '3',
  accept: {
    geoState: {
      $in: ['ca', 'ny']
    },
    hour: {
      $in: ['13', '14', '15']
    }
  }
}

var multipleTargets = [
  {
    id: '1',
    url: 'http://example.com',
    value: '0.5',
    maxAcceptsPerDay: '3',
    accept: {
      geoState: {
        $in: ['ca', 'ny']
      },
      hour: {
        $in: ['13', '14', '15']
      }
    }
  },
  {
    id: '2',
    url: 'http://example2.com',
    value: '5',
    maxAcceptsPerDay: '1',
    accept: {
      geoState: {
        $in: ['ok', 'la']
      },
      hour: {
        $in: ['1', '2', '3']
      }
    }
  }
]

test.serial.cb('healthcheck', function (t) {
  var url = '/health'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('REJECT TARGET - no targets in db | url: /route  method: post', function (t) {
  const url = '/route'
  const visitorInfo = {
    geoState: 'ri',
    publisher: 'abc',
    timestamp: '2018-07-19T13:28:59.513Z'
  }
  servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.decision, 'reject', 'correct decision')
    t.end()
  }).end(JSON.stringify(visitorInfo))
})

test.serial.cb('POST A TARGET | url: /api/targets  method: post', function (t) {
  const url = '/api/targets'
  servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
    const check = await targetsDb.getTarget(targetSample.id)
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.assert(check.id === targetSample.id, 'added sample target to db')
    t.end()
  }).end(JSON.stringify(targetSample))
})

test.serial.cb('GET A TARGET BY ID | url: /api/targets/:id  method: get', function (t) {
  const url = '/api/target/1'
  servertest(server(), url, { encoding: 'json' }, async function (err, res) {
    t.falsy(err, 'no error')
    t.deepEqual(res.body.target, targetSample, 'returned target')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.end()
  })
})

test.serial.cb('GET ALL TARGETS | url: /api/targets  method: get', function (t) {
  const url = '/api/targets'

  multipleTargets.map(target => {
    servertest(server(), url, { encoding: 'json', method: 'POST' }).end(JSON.stringify(target))
  })

  servertest(server(), url, { encoding: 'json' }, async function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.assert(res.body.targets.length === 2, 'get all targets successful')
    t.end()
  })
})

test.serial.cb('UPDATE A TARGET | url: /api/targets/:id  method: post', function (t) {
  const url = '/api/target/1'

  const updatedTarget = {
    ...targetSample,
    maxAcceptsPerDay: '5',
    accept: {
      geoState: {
        $in: ['ny', 'ca']
      },
      hour: {
        $in: ['5', '6', '7']
      }
    }
  }

  servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
    const check = await targetsDb.getTarget(targetSample.id)
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.deepEqual(check, updatedTarget, 'updated target successfully')
    t.end()
  }).end(JSON.stringify(updatedTarget))
})

/**
 * DECISION MAKING ROUTE Test targets
 */
const testTargets = [
  {
    id: '1001',
    url: 'http://nd-tx.com',
    value: '5',
    maxAcceptsPerDay: '5',
    accept: {
      geoState: {
        $in: ['nd', 'tx']
      },
      hour: {
        $in: ['11', '12', '13']
      }
    }
  },
  {
    id: '1002',
    url: 'http://wy-mn.com',
    value: '5',
    maxAcceptsPerDay: '10',
    accept: {
      geoState: {
        $in: ['wy', 'mn']
      },
      hour: {
        $in: ['4', '5', '11']
      }
    }
  },
  {
    id: '1002',
    url: 'http://wy.com',
    value: '10',
    maxAcceptsPerDay: '1',
    accept: {
      geoState: {
        $in: ['wy']
      },
      hour: {
        $in: ['1', '2', '3']
      }
    }
  },
  {
    id: '1003',
    url: 'http://tx-higher.com',
    value: '10',
    maxAcceptsPerDay: '5',
    accept: {
      geoState: {
        $in: ['tx']
      },
      hour: {
        $in: ['1', '12', '3']
      }
    }
  },
  {
    id: '1004',
    url: 'http://nd-higher.com',
    value: '10',
    maxAcceptsPerDay: '0',
    accept: {
      geoState: {
        $in: ['sc']
      },
      hour: {
        $in: ['1', '2', '3']
      }
    }
  }
]

test.serial.cb('POSTING TEST TARGETS | url: /api/targets  method: post', function (t) {
  const url = '/api/targets'
  testTargets.map(target => {
    servertest(server(), url, { encoding: 'json', method: 'POST' }).end(JSON.stringify(target))
  })
  t.end()
})

test.serial.cb('REJECT TARGET - no targets related | url: /route  method: post', function (t) {
  const url = '/route'
  const visitorInfo = {
    geoState: 'ri',
    publisher: 'abc',
    timestamp: '2018-07-19T13:28:59.513Z'
  }
  servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.decision, 'reject', 'correct decision')
    t.end()
  }).end(JSON.stringify(visitorInfo))
})

test.serial.cb('REJECT TARGET - target related has 0 maxAcceptsPerDay | url: /route  method: post', function (t) {
  const url = '/route'
  const visitorInfo = {
    geoState: 'sc',
    publisher: 'abc',
    timestamp: '2018-07-19T13:28:59.513Z'
  }
  servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.decision, 'reject', 'correct decision')
    t.end()
  }).end(JSON.stringify(visitorInfo))
})

test.serial.cb('ACCEPT TARGET - target with only 1 match | url: /route  method: post', function (t) {
  const url = '/route'
  const visitorInfo = {
    geoState: 'wy',
    publisher: 'abc',
    timestamp: '2018-07-19T03:28:59.513Z'
  }
  servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.target.url, 'http://wy.com', 'correct decision')
    t.end()
  }).end(JSON.stringify(visitorInfo))
})

test.serial.cb('REJECT TARGET - testing with previous test input, since target has only 1 maxAcceptsPerDay, this should be rejected | url: /route  method: post', function (t) {
  const url = '/route'
  const visitorInfo = {
    geoState: 'wy',
    publisher: 'abc',
    timestamp: '2018-07-19T03:28:59.513Z'
  }
  servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.decision, 'reject', 'correct decision')
    t.end()
  }).end(JSON.stringify(visitorInfo))
})

test.serial.cb('ACCEPT TARGET | NEW DAY- testing with previous test input and a day has passed, accept target counts should be reinitialized | url: /route  method: post', function (t) {
  const redis = require('../lib/redis')
  const { promisify } = require('util')
  const hset = promisify(redis.hset).bind(redis)

  // Simulating a different date by direct update to targetsTraffic
  hset('targetsTraffic', '1002', JSON.stringify({
    count: 0,
    date: 'Sun March 9 2021'
  })).then(() => {
    const url = '/route'
    const visitorInfo = {
      geoState: 'wy',
      publisher: 'abc',
      timestamp: '2018-07-19T03:28:59.513Z'
    }
    servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 200, 'correct statusCode')
      t.is(res.body.decision, 'accept', 'correct decision')
      t.end()
    }).end(JSON.stringify(visitorInfo))
  })
})

test.serial.cb('ACCEPT TARGET WITH HIGHER VALUE | url: /route  method: post', function (t) {
  const url = '/route'
  const visitorInfo = {
    geoState: 'tx',
    publisher: 'abc',
    timestamp: '2018-07-19T12:28:59.513Z'
  }
  servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.target.url, 'http://tx-higher.com', 'correct decision')
    t.end()
  }).end(JSON.stringify(visitorInfo))
})
