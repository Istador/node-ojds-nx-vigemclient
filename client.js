const net         = require('net')
const ViGEmClient = require('vigemclient')

const { DS4Controller  } = require('vigemclient/lib/DS4Controller')
const { X360Controller } = require('vigemclient/lib/X360Controller')
const { ViGEmTarget    } = require('vigemclient/lib/ViGEmTarget')


// args
const [ ip, mode] = (() => {
  const [ , , ...args ] = process.argv
  const arg1 = args[0] || '127.0.0.1'
  const arg2 = args[1] || 'ps4'

  const mode = (arg2 === 'ps4' ? 'ps4' : (arg2 === 'xbox' ? 'xbox' : null))
  if (! mode) {
    console.error('unknown mode ' + arg2)
    process.exit()
  }

  return [ arg1 , mode ]
})()


const log = (msg) => {
  const time = '[' + (new Date).toISOString() +  ']'
  if (typeof msg === 'string') {
    console.log(time + ' ' + msg)
  }
  else if (msg instanceof Error) {
    console.error(time, msg)
  }
  else {
    console.log(time, msg)
  }
}

const json2switch = (json) => ({
  A   : json.buttons[ 0].pressed,
  B   : json.buttons[ 1].pressed,
  X   : json.buttons[ 2].pressed,
  Y   : json.buttons[ 3].pressed,
  '+' : json.buttons[10].pressed,
  '-' : json.buttons[11].pressed,
  shoulder: {
    L  : json.buttons[6].pressed,
    R  : json.buttons[7].pressed,
    ZL : json.buttons[8].pressed,
    ZR : json.buttons[9].pressed,
  },
  sticks: {
    left : {
      x       : json.axes[0],
      y       : json.axes[1],
      pressed : json.buttons[4].pressed,

    },
    right: {
      x       : json.axes[2],
      y       : json.axes[3],
      pressed : json.buttons[5].pressed,
    },
  },
  dpad: {
    left  : json.buttons[12].pressed,
    up    : json.buttons[13].pressed,
    right : json.buttons[14].pressed,
    down  : json.buttons[15].pressed,
  },
})


ViGEmTarget.prototype.fromSwitch = function (nsw) {
  //log(nsw)
  this.axis.leftX.setValue(nsw.sticks.left.x)
  this.axis.leftY.setValue(-nsw.sticks.left.y)
  this.axis.rightX.setValue(nsw.sticks.right.x)
  this.axis.rightY.setValue(-nsw.sticks.right.y)
  this.axis.dpadHorz.setValue((nsw.dpad.left ? -1.0 : 0.0) + (nsw.dpad.right ? 1.0 : 0.0))
  this.axis.dpadVert.setValue((nsw.dpad.down ? -1.0 : 0.0) + (nsw.dpad.up    ? 1.0 : 0.0))
  this.axis.leftTrigger.setValue(nsw.shoulder.ZL  ? this.axis.leftTrigger.maxValue  : this.axis.leftTrigger.minValue )
  this.axis.rightTrigger.setValue(nsw.shoulder.ZR ? this.axis.rightTrigger.maxValue : this.axis.rightTrigger.minValue)
}


DS4Controller.prototype.fromSwitch = function (nsw) {
  ViGEmTarget.prototype.fromSwitch.call(this, nsw)

  this.button.CIRCLE.setValue(nsw.A)
  this.button.CROSS.setValue(nsw.B)
  this.button.TRIANGLE.setValue(nsw.X)
  this.button.SQUARE.setValue(nsw.Y)

  this.button.SHOULDER_LEFT.setValue(nsw.shoulder.L)
  this.button.SHOULDER_RIGHT.setValue(nsw.shoulder.R)
  this.button.TRIGGER_LEFT.setValue(nsw.shoulder.ZL)
  this.button.TRIGGER_RIGHT.setValue(nsw.shoulder.ZR)

  this.button.THUMB_LEFT.setValue(nsw.sticks.left.pressed)
  this.button.THUMB_RIGHT.setValue(nsw.sticks.right.pressed)

  this.button.OPTIONS.setValue(nsw['+'])
  this.button.SHARE.setValue(nsw['-'])
}


X360Controller .prototype.fromSwitch = function (nsw, remap = false) {
  ViGEmTarget.prototype.fromSwitch.call(this, nsw)

  this.button.A.setValue(remap ? nsw.B : nsw.A)
  this.button.B.setValue(remap ? nsw.A : nsw.B)
  this.button.X.setValue(remap ? nsw.Y : nsw.X)
  this.button.Y.setValue(remap ? nsw.X : nsw.Y)

  this.button.LEFT_SHOULDER.setValue(nsw.shoulder.L)
  this.button.RIGHT_SHOULDER.setValue(nsw.shoulder.R)

  this.button.LEFT_THUMB.setValue(nsw.sticks.left.pressed)
  this.button.RIGHT_THUMB.setValue(nsw.sticks.right.pressed)

  this.button.START.setValue(nsw['+'])
  this.button.BACK.setValue(nsw['-'])
}


const lazy = (create) => {
  let obj  = undefined
  let f = () => {
    obj = create()
    f = () => obj
    return obj
  }
  return () => f()
}


const check = (type, res) => {
  if (res) {
    console.error(res)
    process.exit()
  }
}


const client = lazy(() => {
  const client = new ViGEmClient
  check(client.connect())
  return client
})


const controller = lazy(() => {
  return ( mode === 'ps4' ? client().createDS4Controller() : client().createX360Controller() )
})


const reconnect = () => {
  if (controller()._connected) { return }
  check(controller().connect())
  log('connected')
}


const disconnect = (() => {
  let counter = 0
  return () => {
    if (! controller()._connected) { return }
    if (++counter >= 20) {
      counter = 0
      controller().disconnect()
      log('disconnected')
    }
  }
})()


const getJSON = lazy(() => {
  let server = null
  let callback = null

  const connect = () => {

    const then = (data) => {
      if (server) {
        server.setTimeout(0)
      }
      if (callback) {
        const cb = callback
        callback = null
        let json = null
        if (data) {
          const str = data.toString().replace(/^[0-9]+#/, '')
          try { json = JSON.parse(str) }
          catch (err) { log(err) }
        }
        cb(json)
      }
    }

    const fail = (err) => {
      if (err) { log(err) }
      if (server) {
        server.destroy()
        server = null
      }
      then(null)
    }

    if (! server) {
      server = new net.Socket

      server
        .on('timeout', fail)
        .on('error', fail)
        .on('connect', () => server.setTimeout(0))
        .on('data', then)
        .setNoDelay()
        .setTimeout(100)
        .connect(56709, ip)
    }
  }

  return (then) => {
    callback = then
    connect()
    server.setTimeout(100)
    server.write('.')
  }
})


const interval = 50
const next = () => {
  getJSON()((json) => {
    if (json) {
      reconnect()
      const nsw = json2switch(json)
      controller().fromSwitch(nsw)
      //process.stdout.write('.')
    }
    else {
      disconnect()
    }
    timer = setTimeout(next, interval)
  })
}
let timer = setTimeout(next, 100)
