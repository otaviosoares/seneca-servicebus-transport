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
        transport.client.disconnect()
          .then(function () {
            prior(args, done)
          })
      })
    }

    hook (options) {
      return (args, done) => {
        args = this.seneca.util.clean(this.seneca.util.deepextend(options[args.type], args))
        args.url = 'amqps://' + encodeURIComponent(args.key_name) + ':' + encodeURIComponent(args.key) + '@' + args.host
        args.connection_string = 'Endpoint=sb://' + args.host + '/;SharedAccessKeyName=' + args.key_name + ';SharedAccessKey=' + args.key

        return this.createTransport(args, function (transport) {
          this.addCloseCmd(transport)
          this.createActor(args, transport, done)
        })
      }
    }
  }
