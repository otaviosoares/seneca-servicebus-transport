'use strict'
/**
 * @module lib/listener
 */

const _ = require('lodash')
const Policy = require('amqp10').Policy

var _senders = {}

module.exports =
  class ServiceBusSenecaListener {
    constructor (seneca, transport, options) {
      this.seneca = seneca
      this.transport = transport
      this.options = options
      this.utils = seneca.export('transport/utils')
    }

    handleMessage (message, data) {
      return this.utils.handle_request(this.seneca, data, this.options, (out) => {
        if (!out) {
          return
        }
        var outstr = this.utils.stringifyJSON(this.seneca, `listen-${this.options.type}`, out)
        var sender = _senders[message.properties.replyTo]
        if (sender) {
          sender.send(outstr)
        } else {
          this.transport.client.createSender(message.properties.replyTo, Policy.ServiceBusQueue)
            .then(function (reply_sender) {
              _senders[message.properties.replyTo] = reply_sender
              reply_sender.send(outstr)
            })
            // this.transport.channel.sendToQueue(message.properties.replyTo, new Buffer(outstr))
            // this.transport.channel.ack(message)
        }
      })
    }

    consume () {
      return (message) => {
        var data = message.body || void 0
        var props = message.properties || {}
        if (!data || !props.replyTo) {
          return this.transport.receiver.nack(message)
        }
        return this.handleMessage(message, data)
      }
    }

    listen () {
      return _.each(this.transport.receiver, (receiver) => {
        receiver.on('message', this.consume())
      })
    }
  }
