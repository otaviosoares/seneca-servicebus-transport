'use strict'
/**
 * @module lib/listener
 */

const Promise = require('bluebird')
const _ = require('lodash')
const async = require('async')
const amqputil = require('./listener-util')
const Listener = require('./listener-factory')

module.exports = {
  setup
}

var _receivers = []

function createSubscription (seneca, { client, service, options }) {
  var utils = seneca.export('transport/utils')
  return new Promise((resolve, reject) => {
    const pins = utils.resolve_pins(options)
    var topics = amqputil.resolveListenTopics(pins)

    var qact = options.queues.action
    var queue = _.trim(options.name) || amqputil.resolveListenQueue(pins, qact)
    var tsub = options.topics.subscription ? options.topics.subscription.id : ''
    var subscriptionName = amqputil.resolveSubscriptionName(tsub)
    async.each(topics, create_links(subscriptionName), (err) => {
      if (err) {
        return
      }
      return resolve({
        receivers: _receivers,
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
        service.createTopicIfNotExists(topic, () => {
          callback(null)
        })
      }
    }

    function create_subscription (topic, subscriptionName) {
      return function (callback) {
        return service.createSubscription(topic, subscriptionName, function (err, created, result) {
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

function createActor (seneca, { client, receivers, queue, options }, done) {
  var listener = Listener(seneca, { client, receivers, queue, options })
  return Promise.resolve(listener.listen())
    .then(() => done())
    .thenReturn(listener)
}

function setup (seneca, { client, service, options }, done) {
  return createSubscription(seneca, { client, service, options })
    .then(function ({receivers, queue}) {
      return createActor(seneca, { client, receivers, queue, options }, done)
    })
}
