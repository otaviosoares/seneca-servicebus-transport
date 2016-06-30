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
      console.log('create client transport')
      var that = this
      var client = new AMQPClient(args.policy || Policy.ServiceBusTopic)
      var sbService = azure.createServiceBusService(args.connection_string)
      client.connect(args.url)
      .then(function () {
        var qres = args.queues.response
        var queueName = Amqputil.resolveClientQueue(qres)

        sbService.createQueueIfNotExists(queueName, function (err, created, response) {
          if (err) return err
          console.log('queue', queueName, 'created')
          client.createReceiver(queueName, Policy.ServiceBusQueue)
            .then(function (receiver) {
              console.log('queue receiver created')
              return callback.call(that, {
                receiver,
                client,
                queue: queueName
              })
            })
        })
      })

      // return Amqp.connect(args.url, args.socketOptions)
      //   .then((conn) => conn.createChannel())
      //   .then((channel) => {
      //     var ex = args.exchange
      //     var qres = args.queues.response
      //     var queueName = Amqputil.resolveClientQueue(qres)
      //     channel.prefetch(1)
      //     return Promise.props({
      //       channel,
      //       exchange: channel.assertExchange(ex.name, ex.type, ex.options),
      //       queue: channel.assertQueue(queueName, qres.options)
      //     }).then((transport) => {
      //       return {
      //         channel: transport.channel,
      //         exchange: transport.exchange.exchange,
      //         queue: transport.queue.queue
      //       }
      //     })
      //   })
    }

    createActor (args, transport, done) {
      transport.receiver.on('error', done)
      var client = new AMQPSenecaClient(this.seneca, transport, args)
      console.log('make_client')
      return this.utils.make_client(this.seneca, client.callback(), args, done)
    }

  }
