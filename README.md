![Seneca](http://senecajs.org/files/assets/seneca-logo.png)

> A [Seneca.js][1] transport plugin

# seneca-servicebus-transport
[![Build Status](https://travis-ci.org/otaviosoares/seneca-servicebus-transport.svg?branch=master)](https://travis-ci.org/otaviosoares/seneca-servicebus-transport) [![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/otaviosoares/seneca-servicebus-transport/blob/master/LICENSE)

This plugin allows seneca listeners and clients to communicate over [Azure Service Bus][2].

## Install

```sh
npm install seneca-servicebus-transport
```

## Usage
The following snippets showcase the most basic usage examples.

### Listener

```javascript
require('seneca')()
  .use('seneca-servicebus-transport')
  .add('role:create', function(message, done) {
    return done(null, {
      pid: process.pid,
      id: Math.floor(Math.random() * (message.max - message.min + 1)) + message.min
    });
  })
  .listen({
    type: 'servicebus',
    pin: 'role:create',
    connection_string: '****************'
  });
```

#### How it works
A listener creates a topic and and a subscription for each pattern.

In the example above, the following things are declared:

- A **topic** named `role.create`.
- A **subscription** to `role.create`

### Client

```javascript
var client = require('seneca')()
  .use('seneca-servicebus-transport')
  .client({
    type: 'servicebus',
    pin: 'role:create',
    connection_string: '****************'
  });

setInterval(function() {
  client.act('role:create', {
    max: 100,
    min: 50
  }, console.log);
}, 500);
```

#### How it works
A client creates an exclusive, randomly named response queue (something similar to `seneca.res.x42jK0l`) and starts consuming from it - much like a listener would do. On every `act`, the client publishes the message to the  `seneca.topic` topic built from the _pin that matches the act pattern_. In the simple example above, the _pattern_ is `role:create` which equals the only declared pin. With that, the routing key `role.create` is inferred. An AMQP `replyTo` header is set to the name of the random queue, in an [RPC-schema][7] fashion.

> Manual queue naming on a client (using the `name` parameter as seen in the listener configuration) is not supported. Client queues are deleted once the client disconnect and re-created each time.

As you can see, pins play an important role on routing messages on the broker, so in order for a listener to receive messages from a client, **their pins must match**.

In the example, the following things are declared:

- An exclusive **queue** with a random alphanumeric name (like `seneca.res.x42jK0l`).

> Clients _do not_ declare the queue of their listener counterpart. So, if the message does not reach its destination and is discarded, the `seneca` instance will fail with a `TIMEOUT` error on the client side.

## Options
The following object describes the available options for this transport. These are applicable to both clients and listeners.

```json
{
  "servicebus": {
    "type": "topic",
    "topics": {},
    "queues": {
      "action": {
        "prefix": "seneca",
        "separator": ".",
        "options": {
          "durable": true
        }
      },
      "response": {
        "prefix": "seneca.res",
        "separator": ".",
        "options": {
          "autoDelete": true,
          "exclusive": true
        }
      }
    }
  }
}
```

<!-- To override this settings, pass them to the plugin's `.use` declaration:

```javascript
require('seneca')()
  .use('seneca-servicebus-transport', {
    queues: {
      action: {
        durable: false,
        prefix: 'my.namespace'
      }
    }
  });
``` -->


## Run the examples

There are simple examples under the `/examples` directory. To run them, just execute:

```sh
# Start listener.js
cd examples
SERVICEBUS_CONNECTION_STRING='Endpoint=sb://lorem.servicebus.windows.net/;SharedAccessKeyName=******;SharedAccessKey=***' node listener.js
2016-07-01T02:48:47.164Z wo1nwx8oq3xp/1467341327145/21846/- INFO  hello Seneca/2.1.0/wo1nwx8oq3xp/1467341327145/21846/- 
2016-07-01T02:48:47.957Z wo1nwx8oq3xp/1467341327145/21846/- INFO  listen  {type:servicebus,pin:role:create,connection_string:Endpoint=sb://------.servicebus.windows.net;SharedAcc

# Start client.js
cd examples
SERVICEBUS_CONNECTION_STRING='Endpoint=sb://lorem.servicebus.windows.net/;SharedAccessKeyName=******;SharedAccessKey=***' node listener.js
2016-07-01T02:50:40.230Z ul9sgk41i253/1467341440211/21948/- INFO  hello Seneca/2.1.0/ul9sgk41i253/1467341440211/21948/- 
2016-07-01T02:50:41.020Z ul9sgk41i253/1467341440211/21948/- INFO  client  {type:servicebus,pin:role:create,connection_string:Endpoint=sb://------.servicebus.windows.net;SharedAcc 
null { pid: 21846, id: 42 } { id: 'mgpk8ggtnh01/3oax9b5p695w',
  accept: 'wo1nwx8oq3xp/1467341327145/21846/-',
  track: [ 'ul9sgk41i253/1467341440211/21948/-' ],
  time: 
   { client_sent: 1467341443033,
     listen_recv: 1467341443174,
     listen_sent: 1467341443179,
     client_recv: 1467341443353 } }
null { pid: 21846, id: 83 } { id: 'cw258tsdm6t
```

## Known issues
- Not possible to declare pins with wildcards

## License
MIT

Any help/contribution is appreciated!

[1]: https://senecajs.org/
[2]: https://azure.microsoft.com/en-us/services/service-bus/