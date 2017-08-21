'use strict'
/**
 * Composable module that allows clients and listeners to wrapped their
 * initialization process in a Seneca action function that will run on
 * 'role:transport,hook:*,type:amqp' patterns.
 *
 * A "hook" object serves as the bridge between the AMQP transport and the
 * Seneca world.
 *
 * @module lib/common/hooker
 */
const _ = require('lodash')
const Promise = require('bluebird')
const azure = require('azure')
const AMQPClient = require('amqp10').Client
const Policy = require('amqp10').Policy
// const deadletter = require('./dead-letter');

// Module API
module.exports = {
  hook
}

/**
 * Closes the channel and its connection.
 *
 * @param  {Channel} ch  amqplib Channel object
 * @param  {Function} done Callback to be called upon taking action
 * @return {Promise}       Fulfills when both the channel and the
 *                         connection has been closed.
 */
function closer (client, done) {
  return client.disconnect()
    // .then(() => ch.connection.close())
    .asCallback(done)
}

/**
 * Main API function that builds and returns a Seneca action function that
 * should run on 'role:transport,hook:*,type:amqp' patterns.
 *
 * The returned function initializes an actor (AMQP consumer or publisher),
 * declaring all needed queues, exchanges and bindings on the broker.
 *
 * @param  {Object} options Plugin configuration object
 * @return {Function}       A Seneca action function with
 *                          a nodejs style callback
 */
function hook (options) {
  var u = this.seneca.util
  var tu = this.seneca.export('transport/utils')
  return (args, done) => {
    args = u.clean(u.deepextend(options[args.type], args))
    if (!args.connection_string) {
      var err
      console.error(err = 'The Azure Servicebus connection string should be set.')
      return done(err)
    }
    var client = new AMQPClient(args.policy || Policy.ServiceBusTopic)
    var sbService = azure.createServiceBusService(args.connection_string)

    var url = parseConnectionString(args.connection_string)
    client.connect(url)
      .then(() => {
        client.on(AMQPClient.ErrorReceived, done);
        tu.close(this.seneca, _.curry(closer)(client))
        return Promise.join(
          this.setup(this.seneca, { client, service: sbService, options: args }, done)
          // deadletter.declareDeadLetter(ch, args.deadLetter)
        )
      }).catch(done)
  }
}

function parseConnectionString (connection_string) {
  var matchEndpoint = /\bEndpoint=sb:\/\/([^;]+)/gim.exec(connection_string)
  var matchKeyName = /\bSharedAccessKeyName=([^;]+)/gim.exec(connection_string)
  var matchKey = /\SharedAccessKey=([^;]+)/gim.exec(connection_string)
  var key_name = matchKeyName[1]
  var key = matchKey[1]
  var host = matchEndpoint[1]
  return 'amqps://' + encodeURIComponent(key_name) + ':' + encodeURIComponent(key) + '@' + host
}
