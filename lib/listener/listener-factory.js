'use strict'
/**
 * AMQP RPC listener/consumer factory. This is the underlying representantion
 * of a Seneca listener using an AMQP transport.
 *
 * @module lib/listener/listener-factory
 */
const _ = require('lodash')
const Consumer = require('./consumer')
const Policy = require('amqp10').Policy
const debug = require('debug')('seneca-servicebus-transport')

// Module API
module.exports = createListener

/**
 * Closure factory function that creates AMQP RPC Listener (consumer) objects.
 * A "Listener" is created each time a call to `Seneca#listen()` is issued. It
 * declares a queue named after the `pin` (or `pins`) options and starts
 * consuming messages from it.
 *
 * See http://senecajs.org/api/#listen-options-this
 * and https://www.rabbitmq.com/tutorials/tutorial-six-javascript.html
 *
 * @param  {Seneca}  seneca         This plugin's Seneca instance.
 * @param  {Channel} options.ch     amqplib channel used for AMQP operations.
 * @param  {String}  options.queue  Name of the queue this listener should
 *                                  consume from.
 * @param  {Object} options.options  General plugin's options.
 * @return {Listener}                 A ready AMQP RPC listener.
 */

var _senders = []
function createListener (seneca, { client, receivers, queue, options }) {
  var utils = seneca.export('transport/utils')
  function handleMessage (message, data, replyWith, receiver) {
    debug('Handle received message')
    return utils.handle_request(seneca, data, options, function (out) {
      // Here, `out` represents the reply from the Seneca add function
      // Should be sent as response to the `replyTo` callback queue
      if (!out) {
        return
      }

      debug('Accept message')
      receiver.accept(message)
      var outstr = utils.stringifyJSON(seneca, `listen-${options.type}`, out)
      var sender = _senders[message.properties.replyTo]
      debug('Senders count: %d', _senders.length)

      if (sender) {
        debug('Sender replier already exists')
        return replyWith(outstr, sender)
      } else {
        debug('Create sender replier')
        client.createSender(message.properties.replyTo, Policy.ServiceBusQueue)
          .then(function (reply_sender) {
            _senders[message.properties.replyTo] = reply_sender
            return replyWith(outstr, reply_sender)
          })
      }
    })
  }

  var consumer = Consumer(client, { messageHandler: handleMessage })

  const Listener = {
    started: false,
    /**
     * Begins consuming incoming messages from a previously declared queue, as
     * indicated by the options given to the factory function. Upon each new
     * message, it will be deserialized and lent to the appropriate Seneca
     * handler function if properties on the payload match any configured act
     * pattern.
     *
     * Any returned value from the act will be sent in as response to a callback
     * queue following an RPC schema.
     *
     * See http://www.squaremobius.net/amqp.node/channel_api.html#channel_consume
     *
     * @return {Promise} Resolves after the consumer starts waiting for
     *                   messages.
     */
    listen () {
      debug('Listen for messages')
      _.each(receivers, (r) => consumer.consume(r))
      this.started = true
      return this
    }
  }

  return Object.create(Listener)
}
