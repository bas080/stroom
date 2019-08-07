const {Transform, Readable, PassThrough, Duplex, pipeline} = require('stream')

const identity = v => v
const last = arr => arr.slice(-1).pop()

module.exports = {
  pipeline, //TBD: make the pipeline have some nice defaults
  json,
  stringify,
  head,
  interval,
  flatMap,
  source,
  concat,
  map,

  uniqBy,

  filter,

  fromArray,

  empty,

  splitWhen,

  transform: map,
  fromPromise: of,
  once: of,
  identity: of,
  always,
}

function uniqBy(valueFn) {
  let included = {}

  return filter(value => {
    const byValue = valueFn(value)
    const exclude = included[byValue]

    included[byValue] = true;

    return !exclude
  })

}

function filter(predFn) {
  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(value, _, cb) {
      if (predFn(value))
        this.push(value)

      cb()
    }
  })
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

// function clone(stream) {
//   const readable = new Readable({
//     objectMode: true,
//     read(value, _, cb) {
//
//     })
//   });
//
//   stream.on('data', value => readable.push(value))
//   stream.on('end', readable.end())
//
//   return readable
// }

function flatMap(fn) {
  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(value, _, cb) {
      const output = fn(value)

      // consider using pipe instead with end: false
      output.on('data', d => this.push(d))
      output.on('end', () => cb())
      output.on('error', e => cb(e))
    }
  })
}

function map(transformFn) {
  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(value, _, cb) {
      this.push(transformFn(value))
      cb()
    }
  })
}

function interval(milliseconds) {
  const readable = new Readable({
    objectMode: true,
    read() {},
  })

  setInterval(() => {
    readable.push(Date.now())
  }, milliseconds)

  return readable
}

function head() {
  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(value, _, cb) {
      this.push(value)
      this.push(null)
    }
  })
}

function splitWhen(splitFn) {
  let currentStream = new Readable({objectMode: true, read() {}})

  const transform = new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(value, _, cb) {
      if (splitFn(value)) {
        currentStream.push(null)
        currentStream = new Readable({objectMode: true, read() {}})
        this.push(currentStream)
      }

      currentStream.push(value)
      cb()
    },
  })

  transform.push(currentStream)

  return transform
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

function empty() {
  return new Readable({
    objectMode: true,
    read() {
      this.push(null)
    }
  })
}

// Creates an infinitie source stream
// TODO: remove the promise stuff from here.
function source(doFn, items = identity) {
  return new Readable({
    objectMode: true,
    read() {
      Promise.resolve(doFn()).then(
        result => items(result).forEach(d => this.push(d)),
        //destroy stream with an error
        error => this.push(null)
      )
    }
  })
}

function fromArray(array) {
  const readable = new Readable({
    objectMode: true,
    read() {},
  })

  array.forEach(x => readable.push(x))
  readable.push(null)

  return readable
}

// Should handle when streams is an empty array
// Should hide destination stream in internal recur fn
function concat(streams, destination) {
  if (streams.length === 0)
    return empty()

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
