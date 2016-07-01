'use strict'
/**
 * @module lib/hook
 */

const async = require('async')

module.exports =
  class SenecaHook {
    constructor (seneca) {
      this.seneca = seneca
      this.utils = seneca.export('transport/utils')
    }

    addCloseCmd (transport) {
      var seneca = this.seneca
      return seneca.add('role:seneca,cmd:close', function (args, done) {
        var prior = this.prior

        async.parallel([delete_queue(transport.queue), disconnect], function (err, results) {
          if (err) console.warn(err)
          prior(args, done)
        })

        function delete_queue (queue) {
          return function (callback) {
            if (!queue) return callback(null, true)
            transport.service.deleteQueue(transport.queue, callback)
          }
        }

        function disconnect (callback) {
          transport.client.disconnect()
            .then(function () {
              callback(null, true)
            })
        }
      })
    }

    hook (options) {
      return (args, done) => {
        args = this.seneca.util.clean(this.seneca.util.deepextend(options[args.type], args))
        if (!args.connection_string) {
          return console.warn('The Azure Servicebus connection string should be set.')
        }

        return this.createTransport(args, function (transport) {
          this.addCloseCmd(transport)
          this.createActor(args, transport, done)
        })
      }
    }
  }
