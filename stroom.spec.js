const {Writable, pipeline} = require('stream')
const {concat, once, empty, map, flatMap, always} = require('./stroom')
const {test} = require('tape')

const identity = v => v

const testError = new Error('test');

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

