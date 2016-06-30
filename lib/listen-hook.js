'use strict'
/**
 * @module lib/listen-hook
 */
const _ = require('lodash')
const async = require('async')
const azure = require('azure')
const Promise = require('bluebird')
const Amqputil = require('./amqp-util')
const SenecaHook = require('./hook')
const ServiceBusSenecaListener = require('./listener')
const AMQPClient = require('amqp10').Client
const Policy = require('amqp10').Policy

module.exports =
  class AMQPListenHook extends SenecaHook {
    createTransport (args, callback) {
      var client = new AMQPClient(args.policy || Policy.ServiceBusTopic)
      var sbService = azure.createServiceBusService(args.connection_string)
      var that = this
      client.connect(args.url)
      .then(function () {
        return that.utils.resolve_pins(args)
      })
      .then(function (pins) {
        var topics = Amqputil.resolveListenTopics(pins)
        console.log('resolved topics', topics)
        var qact = args.queues.action
        var queue = _.trim(args.name) || Amqputil.resolveListenQueue(pins, qact)

        async.each(topics, create_topic, function (err) {
          if (err) return
          Promise.all(
            _.map(topics, function (topic) {
              return client.createReceiver(topic + '/Subscriptions/sub1')
            })
          )
          .spread(function () {
            console.log(arguments.length)
            var receiver = arguments
            return callback.call(that, {
              client,
              receiver,
              queue
            })
          })
        })
        // _.forEach(topics, function (topic) {
        //   sbService.createTopicIfNotExists(topic, function (err, created, response) {
        //     sbService.createSubscription(topic, 'sub1', function (err, created, response) {
        //       if (err && response.body.Error.Code !== '409') {
        //         return console.log('ERROR', err)
        //       }
        //       client.createReceiver(topic + '/Subscriptions/sub1').then(function (receiver) {
        //         callback.call(that, {
        //           client,
        //           receiver,
        //           queue
        //         })
        //       })
        //     })
        //   })
        // })

        function create_topic (topic, callback) {
          sbService.createTopicIfNotExists(topic, callback)
        }
      })

      // return Amqp.connect(args.url, args.socketOptions)
      //   .then((conn) => conn.createChannel())
      //   .then((channel) => {
      //     var ex = args.exchange
      //     channel.prefetch(1)
      //     return Promise.all([
      //       channel,
      //       channel.assertExchange(ex.name, ex.type, ex.options),
      //       this.utils.resolve_pins(args)
      //     ])
      //   })
      //   .spread((channel, exchange, pins) => {
      //     var topics = Amqputil.resolveListenTopics(pins)
      //     var qact = args.queues.action
      //     var queue = _.trim(args.name) || Amqputil.resolveListenQueue(pins, qact)
      //     return channel.assertQueue(queue, qact.options)
      //       .then((q) => Promise.map(topics,
      //         (topic) => channel.bindQueue(q.queue, exchange.exchange, topic))
      //       )
      //       .then(() => {
      //         return {
      //           channel,
      //           exchange: exchange.exchange,
      //           queue
      //         }
      //       })
      //   })
    }

    createActor (args, transport, done) {
      var listener = new ServiceBusSenecaListener(this.seneca, transport, args)
      listener.listen()
      done()
    }
  }
