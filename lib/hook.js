'use strict'
/**
 * @module lib/hook
 */

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
        console.log('TODO: delete queue')
        transport.client.disconnect()
          .then(function () {
            prior(args, done)
          })
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
