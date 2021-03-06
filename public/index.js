const { body } = document

if (window.location === window.parent.location) {
  canvas.style.background = '#1f1f1f'
}

const BACKGROUND = '#00000000'

const { innerWidth, innerHeight } = window
canvas.width = innerWidth
canvas.height = innerHeight

colorPicker.style.left = `150px`

let ctx = canvas.getContext('2d')

let color = 'hsl(180, 100%, 50%)'
let r = 18

ctx.lineWidth = 2 * r
ctx.strokeStyle = color
ctx.lineJoin = 'round'
ctx.lineCap = 'round'

let w = 2 * r
let h = 2 * r

let cursorX = 0
let cursorY = 0

let isCursorOnCanvas = false

const restingPosition = { x: '50%', y: '5vh' }

cursor.style.width = `${w}px`
cursor.style.height = `${h}px`

const setCursorPosition = (x, y) => {
  cursorX = x
  cursorY = y

  cursor.style.left = `${cursorX}px`
  cursor.style.top = `${cursorY}px`
}

setCursorPosition(innerWidth / 2, r + 12)

cursorInner.style.borderColor = color

let onWheelAction = 0

let pathPoints = []

let session = []

let buttonDown = false
let buttonDownColorBar = false

let lastUserIndex = {}

let lastUserPoint = {}

const clamp = (a, min, max) => {
  return Math.min(Math.max(a, min), max)
}

const throttle = (func, limit) => {
  let lastFunc
  let lastRan
  return function() {
    const context = this
    const args = arguments
    if (!lastRan) {
      func.apply(context, args)
      lastRan = Date.now()
    } else {
      clearTimeout(lastFunc)
      lastFunc = setTimeout(function() {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args)
          lastRan = Date.now()
        }
      }, limit - (Date.now() - lastRan))
    }
  }
}

// https://github.com/sindresorhus/ip-regex/blob/main/index.js

const word = '[a-fA-F\\d:]'
const b = options =>
  options && options.includeBoundaries
    ? `(?:(?<=\\s|^)(?=${word})|(?<=${word})(?=\\s|$))`
    : ''

const v4 =
  '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}'

const v6seg = '[a-fA-F\\d]{1,4}'
const v6 = `
	(?:
	(?:${v6seg}:){7}(?:${v6seg}|:)|                                    // 1:2:3:4:5:6:7::  1:2:3:4:5:6:7:8
	(?:${v6seg}:){6}(?:${v4}|:${v6seg}|:)|                             // 1:2:3:4:5:6::    1:2:3:4:5:6::8   1:2:3:4:5:6::8  1:2:3:4:5:6::1.2.3.4
	(?:${v6seg}:){5}(?::${v4}|(?::${v6seg}){1,2}|:)|                   // 1:2:3:4:5::      1:2:3:4:5::7:8   1:2:3:4:5::8    1:2:3:4:5::7:1.2.3.4
	(?:${v6seg}:){4}(?:(?::${v6seg}){0,1}:${v4}|(?::${v6seg}){1,3}|:)| // 1:2:3:4::        1:2:3:4::6:7:8   1:2:3:4::8      1:2:3:4::6:7:1.2.3.4
	(?:${v6seg}:){3}(?:(?::${v6seg}){0,2}:${v4}|(?::${v6seg}){1,4}|:)| // 1:2:3::          1:2:3::5:6:7:8   1:2:3::8        1:2:3::5:6:7:1.2.3.4
	(?:${v6seg}:){2}(?:(?::${v6seg}){0,3}:${v4}|(?::${v6seg}){1,5}|:)| // 1:2::            1:2::4:5:6:7:8   1:2::8          1:2::4:5:6:7:1.2.3.4
	(?:${v6seg}:){1}(?:(?::${v6seg}){0,4}:${v4}|(?::${v6seg}){1,6}|:)| // 1::              1::3:4:5:6:7:8   1::8            1::3:4:5:6:7:1.2.3.4
	(?::(?:(?::${v6seg}){0,5}:${v4}|(?::${v6seg}){1,7}|:))             // ::2:3:4:5:6:7:8  ::2:3:4:5:6:7:8  ::8             ::1.2.3.4
	)(?:%[0-9a-zA-Z]{1,})?                                             // %eth0            %1
	`
  .replace(/\s*\/\/.*$/gm, '')
  .replace(/\n/g, '')
  .trim()

const v46Exact = new RegExp(`(?:^${v4}$)|(?:^${v6}$)`)
const v4exact = new RegExp(`^${v4}$`)
const v6exact = new RegExp(`^${v6}$`)

const ip = options =>
  options && options.exact
    ? v46Exact
    : new RegExp(
        `(?:${b(options)}${v4}${b(options)})|(?:${b(options)}${v6}${b(
          options
        )})`,
        'g'
      )

ip.v4 = options =>
  options && options.exact
    ? v4exact
    : new RegExp(`${b(options)}${v4}${b(options)}`, 'g')
ip.v6 = options =>
  options && options.exact
    ? v6exact
    : new RegExp(`${b(options)}${v6}${b(options)}`, 'g')

// https://github.com/sindresorhus/is-ip/blob/main/index.js

const isIp = str => ip({ exact: true }).test(str)
isIp.v4 = str => ip.v4({ exact: true }).test(str)
isIp.v6 = str => ip.v6({ exact: true }).test(str)
isIp.version = str => (isIp(str) ? (isIp.v4(str) ? 4 : 6) : undefined)

const isLocalHost = hostname => {
  return hostname === 'localhost' || hostname.endsWith('.localhost')
}

function getDocumentCookieByName(name) {
  const _name = name + '='
  const decodedCookie = decodeURIComponent(document.cookie)
  const ca = decodedCookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) == ' ') {
      c = c.substring(1)
    }
    if (c.indexOf(_name) === 0) {
      return c.substring(_name.length, c.length)
    }
  }
  return ''
}

const userId = getDocumentCookieByName('userId')

console.log('userId', userId)

function norm(x, y) {
  return Math.sqrt(x * x + y * y)
}

function distance(ax, ay, bx, by) {
  return norm(ax - bx, ay - by)
}

function normalize(point) {
  const { x, y } = point
  const d = norm(point.x, point.y)
  return { x: x / d, y: y / d }
}

function unitVector(x0, y0, x1, y1) {
  const dx = x1 - x0
  const dy = y1 - y0
  const d = norm(dx, dy)
  if (d === 0) {
    return randomUnitVector()
  }
  return { x: dx / d, y: dy / d }
}

function randomUnitVector() {
  return normalize({ x: 0.5 - Math.random(), y: 0.5 - Math.random() })
}

const drawScreen = () => {
  session.forEach(userPoint => {
    drawUserPoint(userPoint)
  })
}

const throttleRedraw = throttle(() => {
  _clear()
  drawScreen()
}, 300)

const drawPoint = point => {
  const { pos, color, r } = point
  ctx.fillStyle = color
  ctx.strokeStyle = '#00000000'
  ctx.lineWidth = 0
  ctx.arc(pos[0], pos[1], r, 0, 2 * Math.PI)
  ctx.fill()
}

const drawLineTo = point => {
  const { pos, color, r } = point
  ctx.fillStyle = '#00000000'
  ctx.strokeStyle = color
  ctx.lineWidth = 2 * r
  ctx.lineTo(pos[0], pos[1])
  ctx.stroke()
}

const drawMoveTo = point => {
  const { pos } = point
  ctx.moveTo(pos[0], pos[1])
}

const drawPathPoint = (userId, pathPoint) => {
  const { index, point } = pathPoint

  let lastPoint = lastUserPoint[userId] || point
  let lastIndex = lastUserIndex[userId] || 0

  ctx.beginPath()
  drawMoveTo(lastPoint)

  if (index === lastIndex) {
    drawLineTo(point)
    drawPoint(point)
  } else {
    // ctx.beginPath()
    drawPoint(point)
    // ctx.beginPath()
  }

  lastIndex = index
  lastPoint = point

  lastUserPoint[userId] = lastPoint
  lastUserIndex[userId] = lastIndex
}

const drawUserPoint = userPoint => {
  const { userId, pathPoint } = userPoint
  drawPathPoint(userId, pathPoint)
}

const clear = () => {
  session = []

  _clear()
}

const _clear = () => {
  lastUserIndex = {}
  lastUserPoint = {}

  __clear()
}

const __clear = () => {
  // ctx.fillStyle = BACKGROUND
  // ctx.fillRect(0, 0, canvas.clientWidth, canvas.height)
  canvas.width = canvas.width
}

const onWindowResize = () => {
  const { innerWidth, innerHeight } = window
  canvas.width = innerWidth
  canvas.height = innerHeight

  throttleRedraw()
}

const onPointerDown = ({ clientX, clientY, pointerId }) => {
  buttonDown = true

  canvas.setPointerCapture(pointerId)

  const pos = [clientX, clientY]
  //   const pos = [Math.floor(clientX), Math.floor(clientY)]

  const point = { pos, color, r }

  if (lastUserIndex[userId] === undefined) {
    lastUserIndex[userId] = 0
  }

  const index = lastUserIndex[userId] + 1

  const pathPoint = { index, point }

  const userPoint = { userId, pathPoint }

  session.push(userPoint)

  drawPathPoint(userId, pathPoint)

  sendPathPoint(pathPoint)

  lastUserIndex[userId] = index
}

const onPointerMove = ({ clientX, clientY }) => {
  isCursorOnCanvas = true

  if (buttonDown) {
    const pos = [clientX, clientY]
    // const pos = [Math.floor(clientX), Math.floor(clientY)]

    const point = { pos, color, r }

    const index = lastUserIndex[userId]

    const pathPoint = { index, point }

    const userPoint = { userId, pathPoint }

    drawPathPoint(userId, pathPoint)

    session.push(userPoint)

    sendPathPoint(pathPoint)
  }
}

const onPointerUp = event => {
  buttonDown = false
  canvas.releasePointerCapture(event.pointerId)
}

const onColorBarPointerDown = event => {
  buttonDownColorBar = true

  colorBar.setPointerCapture(event.pointerId)

  colorPicker.style.left = event.offsetX + 'px'

  setColor(event.offsetX)
}

const onColorBarPointerUp = event => {
  buttonDownColorBar = false
  colorBar.releasePointerCapture(event.pointerId)
}

const onColorBarPointerMove = event => {
  if (!buttonDownColorBar) {
    return
  }

  const x = clamp(event.offsetX, 0, 300)

  colorPicker.style.left = `${x}px`

  setColor(x)
}

const onDoubleClick = () => {
  //   console.log('onDoubleClick')

  clear()

  send({
    type: 'clear',
    data: {
      sessionId,
    },
  })
}

const onWheel = ({ deltaY }) => {
  ctx.beginPath()
  switch (onWheelAction) {
    case 0: {
      r = clamp(r - deltaY / 30, 1, 300)

      w = 2 * r
      h = 2 * r

      ctx.lineWidth = 2 * r

      cursor.style.width = `${w}px`
      cursor.style.height = `${h}px`

      break
    }
    case 1: {
      const barPosition = parseInt(colorPicker.style.left, 10)

      const x = clamp(barPosition - deltaY / 5, 0, 300)

      colorPicker.style.left = `${x}px`

      setColor(x)
      break
    }
  }
}

let cursorMoveFrame

// TODO mobile

let pointerX = 0
let pointerY = 0

const animateMoveCursor = () => {
  if (cursorMoveFrame !== undefined) {
    cancelAnimationFrame(cursorMoveFrame)
  }

  cursorMoveFrame = requestAnimationFrame(() => {
    const d = distance(pointerX, pointerY, cursorX, cursorY)

    const D = 3
    const L = 9

    if (d > D) {
      let nextCursorX
      let nextCursorY
      if (d >= D + L) {
        const u = unitVector(cursorX, cursorY, pointerX, pointerY)
        nextCursorX = cursorX + (u.x * d) / 5
        nextCursorY = cursorY + (u.y * d) / 5
      } else {
        const dx = cursorX - pointerX
        const dy = cursorY - pointerY
        nextCursorX = cursorX - (dx * D) / d
        nextCursorY = cursorY - (dy * D) / d
      }
      setCursorPosition(nextCursorX, nextCursorY)
      animateMoveCursor()
    } else {
      setCursorPosition(pointerX, pointerY)
      cursorMoveFrame = undefined
    }
  })
}

const onDocumentPointerEnter = ({ clientX, clientY }) => {
  // console.log('onDocumentPointerEnter')
  pointerX = clientX
  pointerY = clientY

  animateMoveCursor()
}

const onDocumentPointerMove = ({ clientX, clientY }) => {
  pointerX = clientX
  pointerY = clientY

  if (cursorMoveFrame === undefined) {
    setCursorPosition(pointerX, pointerY)
  }
}

const onPointerLeave = () => {
  const { innerWidth, innerHeight } = window
  pointerX = innerWidth / 2
  pointerY = r + 12

  buttonDown = false
  animateMoveCursor()
}

const onKeyDown = e => {
  const { keyCode } = e

  if (keyCode === 16) {
    onWheelAction = 1
  }

  function download(filename, session) {
    var element = document.createElement('a')
    const text = JSON.stringify(session)

    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
    )
    element.setAttribute('download', filename)

    element.style.display = 'none'
    document.body.appendChild(element)

    element.click()

    document.body.removeChild(element)
  }

  if (keyCode === 83) {
    download('chalkboard.it.json', session)
  }
}

const onKeyUp = e => {
  const { keyCode } = e

  if (keyCode === 16) {
    onWheelAction = 0
  }
}

const setColor = xPos => {
  color = `hsl(${(xPos * 360) / 300}, 100%, 50%)`

  ctx.strokeStyle = color
  cursorInner.style.borderColor = color
}

const sendPathPoint = pathPoint => {
  send({
    type: 'point',
    data: {
      sessionId,
      pathPoint,
    },
  })
}

window.addEventListener('resize', onWindowResize)

document.addEventListener('pointerenter', onDocumentPointerEnter)
document.addEventListener('pointermove', onDocumentPointerMove)
document.addEventListener('keydown', onKeyDown)
document.addEventListener('keyup', onKeyUp)

canvas.addEventListener('pointerdown', onPointerDown)
canvas.addEventListener('pointerup', onPointerUp)
canvas.addEventListener('pointermove', onPointerMove)
canvas.addEventListener('pointerleave', onPointerLeave)
canvas.addEventListener('wheel', onWheel)
canvas.addEventListener('dblclick', onDoubleClick)

colorBar.addEventListener('pointerdown', onColorBarPointerDown)
colorBar.addEventListener('pointermove', onColorBarPointerMove)
colorBar.addEventListener('pointerup', onColorBarPointerUp)

const { hostname, pathname, protocol } = location

console.log('protocol', protocol)
console.log('hostname', hostname)
console.log('pathname', pathname)

const sessionId = pathname

const localhost = isLocalHost(hostname) || isIp(hostname)

const secure = protocol === 'https:'

const WS_PORT = 4000

let socket = null
let connected = false
let connecting = false

function send(data) {
  if (!connected) {
    throw new Error('WebSocket is not connected')
  }
  const value = JSON.stringify(data)
  socket.send(value)
}

function connect() {
  connecting = true

  let url

  if (localhost) {
    url = `ws://${hostname}`
  } else {
    if (secure) {
      url = `wss://${hostname}`
    } else {
      url = `ws://${hostname}`
    }
  }

  console.log('socket', 'url', url)

  socket = new WebSocket(url)

  socket.addEventListener('open', function(event) {
    console.log('socket', 'open')
    connected = true
    send({
      type: 'init',
      data: {
        pathPoints,
        sessionId,
      },
    })
  })

  socket.addEventListener('close', function(event) {
    console.log('socket', 'close')
    connected = false
  })

  socket.addEventListener('message', event => {
    const { data: message } = event
    const data = JSON.parse(message)

    console.log('socket', 'message', data)

    const { type, data: _data } = data

    switch (type) {
      case 'init': {
        const { session: _session } = _data

        session = _session

        __clear()

        drawScreen()
        break
      }
      case 'point': {
        const { userPoint } = _data

        session.push(userPoint)

        drawUserPoint(userPoint)
        break
      }
      case 'clear': {
        clear()
        break
      }
      default:
        break
    }
  })

  socket.addEventListener('error', event => {
    console.log('socket', 'error', event)
  })
}

function disconnect() {
  socket.close()
  socket = null
}

connect()
