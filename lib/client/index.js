'use strict'
/**
 * @module lib/client
 */

const Promise = require('bluebird')
const Client = require('./client-factory')
const amqputil = require('./client-util')
const Policy = require('amqp10').Policy
const debug = require('debug')('seneca-servicebus-transport')

module.exports = {
  setup
}

function createQueue (client, service, options) {
  var qres = options.queues.response
  var queueName = amqputil.resolveClientQueue(qres)

  return new Promise((resolve, reject) => {
    service.createQueueIfNotExists(queueName, function (err, created, response) {
      if (err) {
        return reject(err)
      }
      client.createReceiver(queueName, Policy.ServiceBusQueue)
        .then((receiver) => {
          return resolve({
            queue: queueName,
            receiver: receiver
          })
        })
    })
  })
}

function createActor (seneca, { client, queue, receiver, options }, done) {
  var transportClient = Client(seneca, { client, queue, receiver, options })
  return Promise.resolve(transportClient.start(done))
    .thenReturn(transportClient)
}

function setup (seneca, { client, service, options }, done) {
  debug('Setup client')
  return createQueue(client, service, options)
    .then(function ({queue, receiver}) {
      return createActor(seneca, { client, queue, receiver, options }, done)
    })
}
