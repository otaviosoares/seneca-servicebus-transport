'use strict'
/**
 * @module lib/listen-hook
 */
const _ = require('lodash')
const async = require('async')
const azure = require('azure')
const Amqputil = require('./amqp-util')
const SenecaHook = require('./hook')
const ServiceBusSenecaListener = require('./listener')
const AMQPClient = require('amqp10').Client
const Policy = require('amqp10').Policy
const Constants = require('amqp10').Constants

module.exports =
  class AMQPListenHook extends SenecaHook {
    createTransport (args, callback) {
      var client = new AMQPClient(Policy.merge({
        receiverLink: {
          attach: {
            receiverSettleMode: Constants.receiverSettleMode.settleOnDisposition
          }
        }
      }, Policy.ServiceBusTopic))
      var sbService = azure.createServiceBusService(args.connection_string)
      var that = this
      var _receivers = []

      var url = Amqputil.parseConnectionString(args.connection_string)
      client.connect(url)
        .then(function () {
          return that.utils.resolve_pins(args)
        })
        .then(function (pins) {
          var topics = Amqputil.resolveListenTopics(pins)

          var qact = args.queues.action
          var queue = _.trim(args.name) || Amqputil.resolveListenQueue(pins, qact)

          var tsub = args.topics.subscription
          var subscriptionName = Amqputil.resolveSubscriptionName(tsub)

          async.each(topics, create_links(subscriptionName), function (err) {
            if (err) {
              console.error(err)
              return
            }

            return callback.call(that, {
              client,
              receiver: _receivers,
              queue
            })
          })

          function create_links (subscriptionName) {
            return function (topic, callback) {
              async.series({
                topic: create_topic(topic),
                subscription: create_subscription(topic, subscriptionName),
                receiver: create_topic_subscription_link(topic, subscriptionName)
              }, function (err, results) {
                if (err) return callback(err, null)
                _receivers.push(results.receiver)
                callback(null)
              })
            }
          }
          function create_topic (topic) {
            return function (callback) {
              sbService.createTopicIfNotExists(topic, callback)
            }
          }

          function create_subscription (topic, subscriptionName) {
            return function (callback) {
              return sbService.createSubscription(topic, subscriptionName, function (err, created, result) {
                if (err && result.statusCode === 409) return callback(null, result)
                callback(err, null)
              })
            }
          }

          function create_topic_subscription_link (topic, subscriptionName) {
            return function (callback) {
              return client.createReceiver(topic + '/Subscriptions/' + subscriptionName).then(function (receiver) {
                callback(null, receiver)
              })
            }
          }
        })
    }

    createActor (args, transport, done) {
      var listener = new ServiceBusSenecaListener(this.seneca, transport, args)
      listener.listen()
      done()
    }
  }
