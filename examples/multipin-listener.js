#!/usr/bin/env node

'use strict'

require('seneca')()
  .use('..')
  .add('action:get_time', function (message, done) {
    console.log(`[action:get_time] Action ${message.id} received`)
    return done(null, {
      pid: process.pid,
      time: 'Current time is ' + Date.now() + 'ms'
    })
  })
  .add('level:log', function (message, done) {
    console[message.level](`[level:log] Action ${message.id} wants to log: ${message.text}`)
    return done(null, {
      pid: process.pid,
      status: `Message ${message.id} logged successfully`
    })
  })
  .add('proc:status', function (message, done) {
    console.log(`[action:status] Action ${message.id} received`)
    return done(null, {
      pid: process.pid,
      status: `Process ${process.pid} status: OK`
    })
  })
  .listen({
    type: 'servicebus',
    pin: ['action:get_time', 'level:log', 'proc:status'],
    connection_string: process.env.AZURE_CONNECTION_STRING || 'Endpoint=sb://artyou-events.servicebus.windows.net;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=60z+8mgjS8NciLSvjgiTbYPjT5K59UTFpcNoT48MGMU='
  })
