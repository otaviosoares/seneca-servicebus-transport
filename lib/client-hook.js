'use strict'
/**
 * @module lib/client-hook
 */
const azure = require('azure')
const Amqputil = require('./amqp-util')
const SenecaHook = require('./hook')
const AMQPSenecaClient = require('./client')
const AMQPClient = require('amqp10').Client
const Policy = require('amqp10').Policy

module.exports =
  class AMQPClientHook extends SenecaHook {
    createTransport (args, callback) {
      var that = this
      var client = new AMQPClient(args.policy || Policy.ServiceBusTopic)
      var sbService = azure.createServiceBusService(args.connection_string)
      client.connect(args.url)
      .then(function () {
        var qres = args.queues.response
        var queueName = Amqputil.resolveClientQueue(qres)

        sbService.createQueueIfNotExists(queueName, function (err, created, response) {
          if (err) return err
          client.createReceiver(queueName, Policy.ServiceBusQueue)
            .then(function (receiver) {
              return callback.call(that, {
                receiver,
                client,
                queue: queueName
              })
            })
        })
      })
    }

    createActor (args, transport, done) {
      transport.receiver.on('error', done)
      var client = new AMQPSenecaClient(this.seneca, transport, args)
      return this.utils.make_client(this.seneca, client.callback(), args, done)
    }

  }
