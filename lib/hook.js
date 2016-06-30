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
        args.url = 'amqps://' + encodeURIComponent(options.key_name) + ':' + encodeURIComponent(options.key) + '@' + options.host
        args.connection_string = 'Endpoint=sb://' + options.host + '/;SharedAccessKeyName=' + options.key_name + ';SharedAccessKey=' + options.key

        return this.createTransport(args, function (transport) {
          this.addCloseCmd(transport)
          this.createActor(args, transport, done)
        })
      }
    }
  }
