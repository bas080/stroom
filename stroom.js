const {Transform, Readable, PassThrough, Duplex} = require('stream')

const identity = v => v
const last = arr => arr.slice(-1).pop()

module.exports = {
  json,
  stringify,
  fromPromise: of,
  head,
  interval,
  flatMap,
  source,
  concat,
  once,
}

function stringify(...args) {
  return new Transform({
    writableObjectMode: true,
    transform(value, _, cb) {
      this.push(JSON.stringify(value, ...args))
      cb()
    }
  })
}

function json(isObject = false) {
  let first = true
  const transform = new Transform({
    writableObjectMode: true,
    transform(value, _, cb) {
      if (first) {
        this.push('[\n')
        first = false
        this.push(`${JSON.stringify(value, null, 2)}`)
      } else {
        this.push(`, ${JSON.stringify(value, null, 2)}`)
      }

      cb()
    },
    flush(cb) {
      this.push('\n]')
      cb()
    }
  })

  return transform
}

function always(value) {
  return new Readable({
    readableObjectMode: true,
    read() {
      this.push(value)
    }
  })
}

function flatMap(fn) {
  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(value, _, cb) {
      console.log(value)
      const output = fn(value)

      output.on('data', d => this.push(d))
      output.on('end', () => cb())
      output.on('error', e => cb(e))
    }
  })
}

function interval(milliseconds) {
  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(value, _, cb) {
      setTimeout(() => {
        this.push(value)
        cb()
      }, milliseconds)
    }
  })
}

function head() {
  let first = true

  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(value, _, cb) {
      if (first)
        this.push(value)

      first = false

      cb()
    }
  })
}

function of(value) {
  const readable = new Readable({
    objectMode: true,
    read() {}
  })

  Promise.resolve(value)
    .then(value => {
      readable.push(value)
      readable.push(null)
    })

  return readable
}

function once(value) {
  return new Readable({
    objectMode: true,
    read(a, b) {
      this.push(value)
      this.push(null)
    }
  })
}

// Creates an infinitie source stream
function source(doFn, items = identity) {
  return new Readable({
    objectMode: true,
    read() {
      Promise.resolve(doFn()).then(
        result => items(result).forEach(d => this.push(d)),
        error => this.push(null)
      )
    }
  })
}

// Should handle when streams is an empty array
// Should hide destination stream in internal recur fn
function concat(streams, destination) {
  if (!destination)
    return concat(streams, new PassThrough({
      readableObjectMode: true,
      writableObjectMode: true,
    }))

  const [x, ...xs] = streams

  if (!x) {
    destination.end()

    return destination
  }

  x.on('end', () => {
    if (xs.length > 0)
      concat(xs, destination)
  })

  return x.pipe(destination, {end: xs.length === 0})
}
