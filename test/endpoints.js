process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')

var server = require('../lib/server')
var targetsDb = require('../lib/targets.db')

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
  const targetSample = {
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

  servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
    const check = await targetsDb.getTarget(targetSample.id)
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.assert(check.id === targetSample.id, 'added sample target to db')
    t.end()
  }).end(JSON.stringify(targetSample))
})

test.serial.cb('GET A TARGET BY ID | url: /api/targets/:id  method: get', function (t) {
  const url = '/api/target/2'
  const targetSample = {
    id: '2',
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
  /**
   * Neseted Servertest
   * 1. /api/targets Post sample target
   * 2. Get sample target
   */
  servertest(server(), '/api/targets', { encoding: 'json', method: 'POST' }, async function (err, res) {
    t.falsy(err, 'no error')
    servertest(server(), url, { encoding: 'json' }, async function (err, res) {
      t.falsy(err, 'no error')
      t.deepEqual(res.body.target, targetSample, 'returned target')
      t.is(res.statusCode, 200, 'correct statusCode')
      t.end()
    })
  }).end(JSON.stringify(targetSample))
})

test.serial.cb('GET ALL TARGETS | url: /api/targets  method: get', function (t) {
  const url = '/api/targets'
  const multipleTargets = [
    {
      id: '3',
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
      id: '4',
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
  /**
   * Neseted Servertest
   * 1. /api/targets Post sample target 1
   * 2. /api/targets Post sample target 2
   * 2. Assert if all targets are posted
   */

  servertest(server(), '/api/targets', { encoding: 'json', method: 'POST' }, async function (err, res) {
    t.falsy(err, 'no error')
    servertest(server(), '/api/targets', { encoding: 'json', method: 'POST' }, async function (err, res) {
      t.falsy(err, 'no error')
      servertest(server(), url, { encoding: 'json' }, async function (err, res) {
        console.log('MULTI ', res.body)
        t.falsy(err, 'no error')
        t.is(res.statusCode, 200, 'correct statusCode')
        t.assert(res.body.targets.length > 2, 'get all targets successful')
        t.end()
      })
    }).end(JSON.stringify(multipleTargets[1]))
  }).end(JSON.stringify(multipleTargets[0]))
})

test.serial.cb('UPDATE A TARGET | url: /api/targets/:id  method: post', function (t) {
  const url = '/api/target/5'
  const targetSample = {
    id: '5',
    url: 'http://example.com',
    value: '0.5',
    maxAcceptsPerDay: '3',
    accept: {
      geoState: {
        $in: ['la']
      },
      hour: {
        $in: ['13', '14', '15']
      }
    }
  }
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
  /**
   * Neseted Servertest
   * 1. /api/targets Post sample target
   * 2. Update sample target
   * 3. Assert Update
   */
  servertest(server(), '/api/targets', { encoding: 'json', method: 'POST' }, async function (err, res) {
    t.falsy(err, 'no error')
    servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
      t.falsy(err, 'no error')
      const check = await targetsDb.getTarget(targetSample.id)
      t.is(res.statusCode, 200, 'correct statusCode')
      t.deepEqual(check, updatedTarget, 'updated target successfully')
      t.end()
    }).end(JSON.stringify(updatedTarget))
  }).end(JSON.stringify(targetSample))
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
  const testTarget = {
    id: '1001',
    url: 'http://nd-tx.com',
    value: '5',
    maxAcceptsPerDay: '0',
    accept: {
      geoState: {
        $in: ['sc', 'tx']
      },
      hour: {
        $in: ['11', '12', '13']
      }
    }
  }
  const visitorInfo = {
    geoState: 'sc',
    publisher: 'abc',
    timestamp: '2018-07-19T13:28:59.513Z'
  }

  /**
   * Nested servertests
   * 1. /api/targets Post the test target
   * 2. /route Make decision, reject
   */

  servertest(server(), '/api/targets', { encoding: 'json', method: 'POST' }, async function (err, res) {
    t.falsy(err, 'no error')
    servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 200, 'correct statusCode')
      t.is(res.body.decision, 'reject', 'correct decision')
      t.end()
    }).end(JSON.stringify(visitorInfo))
  }).end(JSON.stringify(testTarget))
})

test.serial.cb('ACCEPT TARGET - target with only 1 match | url: /route  method: post', function (t) {
  const url = '/route'
  const visitorInfo = {
    geoState: 'nd',
    publisher: 'abc',
    timestamp: '2018-07-19T11:28:59.513Z'
  }

  const testTarget = [
    {
      id: '1002',
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
      id: '1003',
      url: 'http://ny.com',
      value: '5',
      maxAcceptsPerDay: '5',
      accept: {
        geoState: {
          $in: ['ny']
        },
        hour: {
          $in: ['11', '16', '17']
        }
      }
    }
  ]

  /**
   * Nested servertests
   * 1. /api/targets Post the test target 1
   * 1. /api/targets Post the test target 2
   * 2. /route Make decision, accept
   */

  servertest(server(), '/api/targets', { encoding: 'json', method: 'POST' }, async function (err, res) {
    t.falsy(err, 'no error')
    servertest(server(), '/api/targets', { encoding: 'json', method: 'POST' }, async function (err, res) {
      t.falsy(err, 'no error')
      servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
        t.falsy(err, 'no error')
        t.is(res.statusCode, 200, 'correct statusCode')
        t.is(res.body.decision, 'accept', 'correct decision')
        t.is(res.body.url, 'http://nd-tx.com', 'correct url')
        t.end()
      }).end(JSON.stringify(visitorInfo))
    }).end(JSON.stringify(testTarget[1]))
  }).end(JSON.stringify(testTarget[0]))
})

test.serial.cb('ACCEPT then REJECT TARGET - testing /route twice matching with target with 1 maxAccept per day only | url: /route  method: post', function (t) {
  const url = '/route'
  const visitorInfo = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T20:28:59.513Z'
  }
  const testTarget = {
    id: '1004',
    url: 'http://ca.com',
    value: '5',
    maxAcceptsPerDay: '1',
    accept: {
      geoState: {
        $in: ['ca']
      },
      hour: {
        $in: ['11', '16', '20']
      }
    }
  }

  /**
   * Nested servertests
   * 1. /api/targets Post the test target
   * 2. /route Make decision, accept
   * 3. /route Make decision, reject, since target's maxAcceptsPerDay is only 1
   */

  servertest(server(), '/api/targets', { encoding: 'json', method: 'POST' }, async function (err, res) {
    t.falsy(err, 'no error')
    servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
      t.falsy(err, 'no error')
      t.is(res.body.decision, 'accept', 'correct decision')
      t.is(res.body.url, 'http://ca.com', 'correct url')
      servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
        t.falsy(err, 'no error')
        t.is(res.statusCode, 200, 'correct statusCode')
        t.is(res.body.decision, 'reject', 'correct decision')
        t.end()
      }).end(JSON.stringify(visitorInfo))
    }).end(JSON.stringify(visitorInfo))
  }).end(JSON.stringify(testTarget))
})

test.serial.cb('ACCEPT TARGET | NEW DAY- testing with previous test input and a day has passed, accept target counts should be reinitialized | url: /route  method: post', function (t) {
  const redis = require('../lib/redis')
  const { promisify } = require('util')
  const hset = promisify(redis.hset).bind(redis)

  const url = '/route'
  const visitorInfo = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T20:28:59.513Z'
  }
  const testTarget = {
    id: '1005',
    url: 'http://ca-ca.com',
    value: '5',
    maxAcceptsPerDay: '1',
    accept: {
      geoState: {
        $in: ['ca']
      },
      hour: {
        $in: ['11', '16', '20']
      }
    }
  }
  /**
   * Nested servertests
   * 1. /api/targets Post the target with max 1 accept per day
   * 2. /route Make decision, accepted
   * 3. /route Make decision, rejected since target has max 1 accept per day only
   * 4. Simulate date change, reset target accept counts
   * 3. /route Make decision, accepted
   */
  servertest(server(), '/api/targets', { encoding: 'json', method: 'POST' }, async function (err, res) {
    t.falsy(err, 'no error')
    servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
      t.falsy(err, 'no error')
      t.is(res.body.decision, 'accept', 'correct decision')
      servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
        t.falsy(err, 'no error')
        t.is(res.body.decision, 'reject', 'correct decision')
        await hset('targetsTraffic', '1005', JSON.stringify({
          count: 0,
          date: 'Sun March 9 2021'
        }))
        servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
          t.falsy(err, 'no error')
          t.is(res.statusCode, 200, 'correct statusCode')
          t.is(res.body.decision, 'accept', 'correct decision')
          t.is(res.body.url, 'http://ca-ca.com', 'correct url')
          t.end()
        }).end(JSON.stringify(visitorInfo))
      }).end(JSON.stringify(visitorInfo))
    }).end(JSON.stringify(visitorInfo))
  }).end(JSON.stringify(testTarget))
})

test.serial.cb('ACCEPT TARGET WITH HIGHER VALUE | url: /route  method: post', function (t) {
  const url = '/route'
  const visitorInfo = {
    geoState: 'ks',
    publisher: 'abc',
    timestamp: '2018-07-19T12:28:59.513Z'
  }

  const testTarget = [
    {
      id: '1006',
      url: 'http://ks-higher.com',
      value: '1',
      maxAcceptsPerDay: '5',
      accept: {
        geoState: {
          $in: ['ks']
        },
        hour: {
          $in: ['11', '12', '13']
        }
      }
    },
    {
      id: '1007',
      url: 'http://ks.com',
      value: '0.7',
      maxAcceptsPerDay: '5',
      accept: {
        geoState: {
          $in: ['ks']
        },
        hour: {
          $in: ['11', '12', '17']
        }
      }
    }
  ]

  /**
   * Nested servertests
   * 1. /api/targets Post the test target 1
   * 2. /api/targets Post the test target 2
   * 3. /route Make decision, accept target with higher value
   */

  servertest(server(), '/api/targets', { encoding: 'json', method: 'POST' }, async function (err, res) {
    t.falsy(err, 'no error')
    servertest(server(), '/api/targets', { encoding: 'json', method: 'POST' }, async function (err, res) {
      t.falsy(err, 'no error')
      servertest(server(), url, { encoding: 'json', method: 'POST' }, async function (err, res) {
        t.falsy(err, 'no error')
        t.is(res.statusCode, 200, 'correct statusCode')
        t.is(res.body.url, 'http://ks-higher.com', 'correct url')
        t.end()
      }).end(JSON.stringify(visitorInfo))
    }).end(JSON.stringify(testTarget[1]))
  }).end(JSON.stringify(testTarget[0]))
})
