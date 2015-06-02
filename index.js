var resize = require('resize-logic')
var through2 = require('through2')
var bl = require('bl')

module.exports = createStream

function createStream(width, height, options) {
  width  = typeof width  === 'number' && width
  height = typeof height === 'number' && height

  var stream = through2(write, flush)
  var concat = bl()

  if (!width && !height) {
    throw new Error(
      'At least one of "width" or "height" must be supplied'
    )
  }

  options = options || {}
  options.format = String(
    options.format || 'png'
  ).toLowerCase()

  if (!/^png|jpg$/g.test(options.format)) {
    throw new Error(
      'Invaild format supplied: "' + options.format + '". ' +
      'Must be either "png" or "jpg"'
    )
  }

  return stream

  function write(chunk, enc, next) {
    concat.append(chunk)
    next()
  }

  function flush() {
    var image = document.createElement('img')

    image.onerror = onerror
    image.onload = onload
    image.src = 'data:image/*;base64,' + concat.slice().toString('base64')

    function onerror(err) {
      stream.emit('error', err)
      stream.emit('close')
    }

    function onload() {
      var dims = resize({
          original: [image.width, image.height]
        , width:    width || null
        , height:   height || null
        , crop:     !!options.crop
        , smaller:  !!options.smaller
      })

      var canvas = document.createElement('canvas')
      canvas.width = dims.canvasDimensions[0]
      canvas.height = dims.canvasDimensions[1]

      var ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(image
        , dims.drawPosition[0]
        , dims.drawPosition[1]
        , dims.drawDimensions[0]
        , dims.drawDimensions[1]
      )

      var base64data = canvas.toDataURL()
      base64data = base64data.split(',')[1]
      stream.push(new Buffer(base64data, 'base64'))
      stream.push(null)
    }
  }
}
