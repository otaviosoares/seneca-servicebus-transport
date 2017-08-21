'use strict'
/**
 * @module lib/client
 */
const Amqputil = require('./amqp-util')

var _senders = {}

module.exports =
  class AMQPSenecaClient {
    constructor (seneca, transport, options) {
      this.seneca = seneca
      this.transport = transport
      this.options = options
      this.utils = seneca.export('transport/utils')
    }

    callback () {
      return (spec, topic, sendDone) => {
        this.awaitReply()
        sendDone(null, this.publish())
      }
    }

    publish () {
      return (args, done) => {
        var outmsg = this.utils.prepare_request(this.seneca, args, done, {})
        var opts = {
          properties: {
            replyTo: this.transport.queue
          }
        }
        var topic = Amqputil.resolveClientTopic(args)
        var sender = _senders[topic]
        if (sender) {
          sender.send(outmsg, opts)
        } else {
          this.transport.client.createSender(topic).then(function (sender) {
            _senders[topic] = sender
            return sender.send(outmsg, opts)
          })
        }
      }
    }

    consumeReply () {
      return (message) => {
        var input = message.body || undefined
        this.utils.handle_response(this.seneca, input, this.options)
      }
    }

    awaitReply () {
      // return message
      return this.transport.receiver.on('message',
        this.consumeReply(), {
          noAck: true
        })
    }
  }
