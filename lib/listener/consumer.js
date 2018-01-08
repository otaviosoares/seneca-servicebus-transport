'use strict'
/**
 * @module lib/listener/consumer
 */
const _ = require('lodash')
const debug = require('debug')('seneca-servicebus-transport')

// Module API
module.exports = createConsumer

function createConsumer (client, { queue, messageHandler } = {}) {
  if (!_.isObject(client)) {
    throw new TypeError('Channel parameter `client` must be provided (got: [' +
      typeof client + '])')
  }

  const handleMessage = _.isFunction(messageHandler) ? messageHandler
    : Function.prototype

  const createReplyWith = _.curry((message, response, sender) => {
    debug('Send reply - %s', message.properties.correlationId)
    const opts = {
      properties: {
        correlationId: message.properties.correlationId
      }
    }
    return sender.send(response, opts)
  })

  function onMessage (receiver) {
    return (message) => {
      debug('Message received')
      if (message) {
        var content = message.body ? message.body : undefined
        var props = message.properties || {}
        if (!content || !props.replyTo) {
          debug('Empty message or without replyTo - Reject')
          return receiver.reject(message, 'empty-message')
        }

        try {
          handleMessage(message, content, createReplyWith(message), receiver)
        } catch (err) {
          debug('Error on handling message - Reject')
          return receiver.reject(message, err)
        }
      }
    }
  }

  const Consumer = {
    consume: (receiver) => receiver.on('message', onMessage(receiver))
  }

  return Object.create(Consumer)
}
