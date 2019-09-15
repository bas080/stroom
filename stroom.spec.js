const {Writable, pipeline} = require('stream')
const {test} = require('tape')
const {
  wrap,
  concat,
  once,
  empty,
  map,
  flatMap,
  always,
  fromPromise,
  ifEmpty,
} = require('./stroom')

const identity = v => v

const testObject = {}
const testError = new Error('test')
const testNumber = 42

const errorStream = (error = testError) => {
  const stream = once('value')

  stream.destroy(error)

  return stream
}

function equals(values, assert) {
  let index = 0

  return new Writable({
    objectMode: true,
    write(value, _, cb) {
      assert(value, values[index])

      index++
      cb()
    }
  })
}

test('once(1)', t => {
  const c = once(1)

  c.on('data', a => t.equals(a, 1))
  c.on('end', () => t.end())
})

test('concat([1,2,3,4])', t => {
  const c = concat([
    once(1),
    once(2),
    once(3),
    once(4),
  ])
    .pipe(equals([1, 2, 3, 4], t.equals))

  c.on('finish', () => t.end())
})

test('concat([])', t => {
  concat([])
    .pipe(equals([], t.equals))
    .on('finish', () => t.end())
})

test('concat empties', t => {
  concat([empty(), empty()])
    .pipe(equals([], t.equals))
    .on('finish', () => t.end())
})

test('map over empty', t => {
  empty()
    .pipe(map(identity))
    .pipe(equals([], t.equals))
    .on('finish', () => t.end())
})

test('flatMap empty', t => {
  once(1).pipe(flatMap(v => empty()))
    .pipe(equals([], t.equals))
    .on('finish', () => t.end())
})

test('map over empty twice', t => {
  t.plan(2)

  const emptyStream = empty()

  emptyStream
    .pipe(equals([], t.equals))
    .on('finish', () => t.pass('once'))

  emptyStream
    .pipe(equals([], t.equals))
    .on('finish', () => t.pass('twice'))
})

test('stream errors are propagated', t => {
  const streamFns = [
    () => map(identity),
    () => flatMap(() => empty()),
    empty,
    () => always(1),
  ]

  t.plan(streamFns.length)

  streamFns.forEach(streamFn => {
    const str = pipeline(
      errorStream(),
      streamFn(), error => {
        t.equals(error, testError)
      })
  })
})

test('fromPromise resolves', t => {
  const c = fromPromise(Promise.resolve(testNumber))
    .pipe(equals([testNumber], t.equals))

  c.on('finish', () => t.end())
})

test('fromPromise rejects', t => {
  const c = fromPromise(Promise.reject(testError))
    .pipe(equals([testError], t.equals))

  c.on('finish', () => t.end())
})

test('wrap', t => {
  const c = once(2)
    .pipe(wrap(1, 3))
    .pipe(equals([1,2,3], t.equals))

  c.on('finish', () => t.end())
})

test('ifEmpty when empty', t => {
  const c = ifEmpty(empty(), once(testObject))
    .pipe(equals(([testObject]), t.equals))

  c.on('finish', () => t.end())
})

test('ifEmpty when not empty', t => {
  const c = ifEmpty(once(testNumber), once(testObject))
    .pipe(equals(([testNumber]), t.equals))

  c.on('finish', () => t.end())
})
