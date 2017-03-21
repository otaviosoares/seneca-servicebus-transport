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

    handleMessage (message, data, receiver) {
      return this.utils.handle_request(this.seneca, data, this.options, (out) => {
        if (!out || out.error) {
          return
        }
        receiver.accept(message)
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
        }
      })
    }

    consume (receiver) {
      return (message) => {
        var data = message.body || void 0
        var props = message.properties || {}
        if (!data || !props.replyTo) {
          return receiver.reject(message, 'empty-message')
        }
        this.handleMessage(message, data, receiver)
      }
    }

    listen () {
      return _.each(this.transport.receiver, (receiver) => {
        receiver.on('message', this.consume(receiver))
      })
    }
  }
