#!/usr/bin/env node

'use strict'

var client = require('seneca')()
  .use('..')
  .client({
    type: 'servicebus',
    pin: 'role:create',
    connection_string: process.env.AZURE_CONNECTION_STRING || 'Endpoint=sb://artyou-events.servicebus.windows.net;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=60z+8mgjS8NciLSvjgiTbYPjT5K59UTFpcNoT48MGMU='
  })

setInterval(function () {
  client.act('role:create', {
    max: 100,
    min: 25
  }, console.log)
}, 2000)
