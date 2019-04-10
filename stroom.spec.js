const {Writable} = require('stream')
const {concat, once} = require('./stroom')
const {test} = require('tape')

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
