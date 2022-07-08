const net = require('net')


const example = (() => {
  const axis = () => Math.random() * 2.0 - 1.0

  const button = () => {
    const pressed = Math.random() > 0.5
    return { pressed, value: (pressed ? 1 : 0) }
  }

  return () => ({
    axes: [ axis(), axis(), axis(), axis() ],
    buttons : [
      button(), button(), button(), button(), button(), button(), button(), button(),
      button(), button(), button(), button(), button(), button(), button(), button(),
    ],
    connected : true,
    id        : 'Nintendo Switch',
    index     : 0,
    mapping   : 'standard',
    timestamp : 0,
  })
})()


const server = net.createServer()
server
  .on('connection', (client) => {
    client.setNoDelay()
    client.on('data', () => {
      client.write(JSON.stringify(example()))
      process.stdout.write('.')
    })
    client.on('error', () => {})
  })
  .on('error', () => {})
  .listen(56709)
