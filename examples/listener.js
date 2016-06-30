#!/usr/bin/env node

'use strict'

require('seneca')()
  .use('..')
  .add('role:create', function (message, done) {
    return done(null, {
      pid: process.pid,
      id: Math.floor(Math.random() * (message.max - message.min + 1)) + message.min
    })
  })
  .listen({
    type: 'servicebus',
    pin: 'role:create',
    connection_string: process.env.AZURE_CONNECTION_STRING || 'Endpoint=sb://artyou-events.servicebus.windows.net;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=60z+8mgjS8NciLSvjgiTbYPjT5K59UTFpcNoT48MGMU='
  })
