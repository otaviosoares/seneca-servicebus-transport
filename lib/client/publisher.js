'use strict'
/**
 *
 * @module client/publisher
 */
const _ = require('lodash')
const uuid = require('uuid')
const debug = require('debug')('seneca-servicebus-transport')

// Module API
module.exports = createPublisher

/**
 * IANA JSON Media Type string.
 * See https://tools.ietf.org/html/rfc4627
 *
 * @type {String}
 */
const JSON_CONTENT_TYPE = 'application/json'

function createPublisher (client, { receiver, replyQueue, replyHandler, correlationId } = {}) {
  if (!_.isObject(client)) {
    throw new TypeError('Channel parameter `client` must be provided (got: [' +
      typeof client + '])')
  }

  correlationId = correlationId || uuid.v4()
  const handleReply = _.isFunction(replyHandler) ? replyHandler
    : Function.prototype

  function publish (message, sender, rk) {
    debug('Publish message - %s', correlationId)
    var opts = {
      properties: {
        replyTo: replyQueue,
        contentType: JSON_CONTENT_TYPE,
        correlationId: correlationId
      }
    }
    return sender.send(message, opts)
  }

  function consumeReply (message) {
    debug('Received the response message - %s', message.properties.correlationId)
    if (message.properties.correlationId === correlationId) {
      // var content = message.content ? message.content.toString() : undefined

      var content = message.body ? message.body : undefined

      debug('Handle the response message')
      handleReply(content)
      // this.utils.handle_response(this.seneca, input, this.options)
    }
  }

  function awaitReply () {
    debug('Await for act response')
    receiver.on('message', consumeReply, {
      noAck: true
    })
  }

  const Publisher = {
    publish,
    awaitReply
  }

  return Object.create(Publisher)
}
