#!/usr/bin/env node

'use strict'

var client = require('seneca')()
  .use('..')
  .client({
    type: 'servicebus',
    pin: ['action:get_time', 'level:*', 'proc:status'],
    connection_string: process.env.AZURE_CONNECTION_STRING || 'Endpoint=sb://artyou-events.servicebus.windows.net;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=60z+8mgjS8NciLSvjgiTbYPjT5K59UTFpcNoT48MGMU='
  })

setInterval(function () {
  client.act('action:get_time', {
    id: Math.floor(Math.random() * 91) + 10
  }, console.log)

  client.act('level:log', {
    id: Math.floor(Math.random() * 91) + 10,
    text: '[level:log] Print out this random number: ' + 100 * Math.random()
  }, console.log)

  client.act('proc:status', {
    id: Math.floor(Math.random() * 91) + 10
  }, console.log)
}, 500)
