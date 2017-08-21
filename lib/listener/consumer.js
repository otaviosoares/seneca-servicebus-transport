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

  function createReplyWith (message, response, sender) {
    return sender.send(Buffer.from(response), {
      correlationId: message.properties.correlationId
    })
  }

  function onMessage (receiver) {
    return (message) => {
      if (message) {
        var content = message.body ? message.body.toString() : undefined
        var props = message.properties || {}
        if (!content || !props.replyTo) {
          // Do not requeue message if there is no payload
          // or we don't know where to reply
          return receiver.reject(message, 'empty-message')
        }

        try {
          handleMessage(content, _.curry(createReplyWith)(message), receiver)
        } catch (err) {
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
