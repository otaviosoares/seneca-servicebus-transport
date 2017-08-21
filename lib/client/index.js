'use strict'
/**
 * @module lib/client
 */
const Promise = require('bluebird')
const Client = require('./client-factory')
const amqputil = require('./client-util')
const Policy = require('amqp10').Policy

module.exports = {
  setup
}

function createQueue (client, service, options) {
  var qres = options.queues.response
  var queueName = amqputil.resolveClientQueue(qres)

  service.createQueueIfNotExists(queueName, function (err, created, response) {
    if (err) return err
    return Promise.props({
      queue: queueName,
      receiver: client.createReceiver(queueName, Policy.ServiceBusQueue)
    })
  })
}

function createActor (seneca, { client, queue, receiver, options }, done) {
  var transportClient = Client(seneca, { client, queue, receiver, options })
  return Promise.resolve(client.start(done))
    .thenReturn(transportClient)
}

function setup (seneca, { client, service, options }, done) {
  return createQueue(client, service, options)
    .then(function ({queue, receiver}) {
      return createActor(seneca, { client, queue, receiver, options }, done)
    })
}
