'use strict'
/**
 * AMQP RPC client/publisher factory. This is the underlying representantion
 * of a Seneca client using an AMQP transport.
 *
 * @module lib/client/client-factory
 */
const Promise = require('bluebird')
const Publisher = require('./publisher')
const amqputil = require('./client-util')
const debug = require('debug')('seneca-servicebus-transport')

// Module API
module.exports = createClient

var _senders = {}

function createClient (seneca, { client, queue, receiver, options = {} }) {
  var utils = seneca.export('transport/utils')

  function handleResponse (res) {
    return utils.handle_response(seneca, res, options)
  }
  var pub = Publisher(client, {
    receiver,
    replyQueue: queue,
    replyHandler: handleResponse,
    correlationId: options.correlationId
  })

  function act (args, done) {
    debug('act')
    var outmsg = utils.prepare_request(seneca, args, done)
    var outstr = utils.stringifyJSON(seneca, `client-${options.type}`, outmsg)
    var topic = amqputil.resolveClientTopic(args)

    debug('topic: %s', topic)

    var sender = _senders[topic]
    debug('Senders count: %d', _senders.length)
    if (sender) {
      debug('Sender already exists')
      return pub.publish(outstr, sender, topic)
    } else {
      debug('Create sender')
      client.createSender(topic).then(function (sender) {
        debug('Sender created')
        _senders[topic] = sender
        return pub.publish(outstr, sender, topic)
      })
    }
  }

  function callback (spec, topic, sendDone) {
    return Promise.resolve(pub.awaitReply())
      .then(() => sendDone(null, act))
      .catch(sendDone)
  }

  const Client = {
    started: false,
    /**
     * Constructs a Seneca client and immediately bounds `seneca.act` calls
     * to AMQP RPC calls (assuming the proper 'role:transport,hook:client'
     * pattern was added before).
     *
     * @param  {Function} done Async callback function.
     * @return {Promise}
     */
    start (done) {
      receiver.on('error', (err) => {
        debug('Client receiver error')
        console.log(err)
        done(err)
      })
      return Promise.resolve(utils.make_client(seneca, callback, options, done))
        .then(() => {
          this.started = true
          return this
        })
    }
  }
  return Object.create(Client)
}
