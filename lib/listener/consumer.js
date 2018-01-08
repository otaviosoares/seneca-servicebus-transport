'use strict'
/**
 * @module lib/listener/consumer
 */
const _ = require('lodash')

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
    return sender.send(response, {
      properties: {
        correlationId: message.properties.correlationId
      }
    })
  })

  function onMessage (receiver) {
    return (message) => {
      if (message) {
        var content = message.body ? message.body : undefined
        var props = message.properties || {}
        if (!content || !props.replyTo) {
          // or we don't know where to reply
          return receiver.reject(message, 'empty-message')
        }

        try {
          handleMessage(message, content, createReplyWith(message), receiver)
        } catch (err) {
          return receiver.release(message, err)
        }
      }
    }
  }

  const Consumer = {
    consume: (receiver) => receiver.on('message', onMessage(receiver))
  }

  return Object.create(Consumer)
}
