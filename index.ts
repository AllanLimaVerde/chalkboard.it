import * as express from 'express'
import * as WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'
import * as cookieParser from 'cookie-parser'
import * as path from 'path'
import * as cors from 'cors'
import * as os from 'os'
import * as fs from 'fs'
import * as http from 'http'
import * as https from 'https'
import * as tls from 'tls'
import { SecureContext } from 'tls'

type Dict<T = any> = {
  [name: string]: T
}

const nameGenerator = require('username-generator')

const app = express()

const HTTP_PORT = 80
const HTTPS_PORT = 443

const { NODE_ENV = 'development' } = process.env

const dev = NODE_ENV === 'development'
const prod = NODE_ENV === 'production'

const CWD = process.cwd()

console.log(
  Object.values(os.networkInterfaces()).reduce(
    (r, list) =>
      r.concat(
        list.reduce(
          (rr, i) =>
            rr.concat((i.family === 'IPv4' && !i.internal && i.address) || []),
          []
        )
      ),
    []
  )[0] +
    ':' +
    HTTP_PORT
)

console.log('NODE_ENV', NODE_ENV)
console.log('CWD', CWD)

type Point = {
  pos: [number, number]
  color: string
  r: number
}

type UserPoint = {
  userId: string
  pathPoint: PathPoint
}

type PathPoint = {
  index: number
  point: Point
}

type PathPoints = PathPoint[]

type UserPoints = UserPoint[]

type Points = Point[]

type Session = UserPoints

type Sessions = {
  [sessionId: string]: Session
}

type User = {
  username: string
}

type Users = {
  [userId: string]: User
}

export interface Req extends express.Request<any> {
  userId?: string
  sessionId?: string
}

const _USER: Users = {}
const _USER_TO_SOCKET: {
  [userId: string]: Set<string>
} = {}
const _USER_SESSION_SOCKET: {
  [userId: string]: {
    [socketId: string]: Set<string>
  }
} = {}
const _SOCKET_SESSION: {
  [socketId: string]: string
} = {}
const _SESSION_SOCKET: {
  [sessionId: string]: Set<string>
} = {}
const _SOCKET_USER: {
  [socketId: string]: string
} = {}
const _SESSION: Sessions = {}
const _SESSION_USER: {
  [sessionId: string]: Set<string>
} = {}
const _SOCKET: {
  [userId: string]: WebSocket
} = {}

const COOKIE_NAME_USER_ID = 'userId'

function uuidNotIn(obj: object): string {
  let id = uuidv4()
  while (obj[id]) {
    id = uuidv4()
  }
  return id
}

function newUserId(): string {
  return uuidNotIn(_USER)
}

function newSocketId(): string {
  return uuidNotIn(_SOCKET_USER)
}

export function parseCookies(str: string): { [name: string]: string } {
  let rx = /([^;=\s]*)=([^;]*)/g
  let obj = {}
  for (let m; (m = rx.exec(str)); ) obj[m[1]] = decodeURIComponent(m[2])
  return obj
}

app.use(cors({}))

app.use(cookieParser())

app.use(async function(req: Req, res, next) {
  const { hostname, cookies } = req
  let { [COOKIE_NAME_USER_ID]: userId } = cookies
  if (!userId || !_USER[userId]) {
    userId = await newUserId()
    _USER[userId] = {
      username: nameGenerator.generateUsername(),
    }
    res.cookie(COOKIE_NAME_USER_ID, userId, {
      httpOnly: false,
      domain: hostname,
    })
  }
  req.userId = userId
  next()
})

app.use(async function(req: Req, res, next) {
  // console.log('req.url', req.url)
  req.sessionId = req.url
  next()
})

app.use(async function(req, res, next) {
  const INDEX_HTML_PATH = path.join(CWD, 'public', 'index.html')
  res.sendFile(INDEX_HTML_PATH)
})

// HTTP

const HTTPServer = http.createServer({}, app)

HTTPServer.listen(HTTP_PORT)

// HTTPS

if (prod) {
  function getSecureContext(domain: string): SecureContext {
    return tls.createSecureContext({
      key: fs.readFileSync(`/etc/letsencrypt/live/${domain}/privkey.pem`),
      cert: fs.readFileSync(`/etc/letsencrypt/live/${domain}/fullchain.pem`),
    })
  }

  const DOMAIN = ['chalkboard.it']

  const secureContext = DOMAIN.reduce(
    (acc: Dict<tls.SecureContextOptions>, domain: string) => {
      return { ...acc, [domain]: getSecureContext(domain) }
    },
    {}
  ) as Dict<SecureContext>

  const HTTPSOpt = {
    SNICallback: function(
      domain: string,
      cb: (err: Error | null, ctx: SecureContext) => void
    ) {
      const segments = domain.split('.')
      const l = segments.length
      const root = `${segments[l - 2]}.${segments[l - 1]}`
      const ctx: SecureContext = secureContext[root]
      if (ctx) {
        cb(null, ctx)
      } else {
        cb(new Error(''), null)
      }
    },
  }

  const HTTPSServer = https.createServer(HTTPSOpt, app)

  HTTPSServer.listen(HTTPS_PORT)
}

const wss = new WebSocket.Server({
  port: 4000,
  // noServer: true,
  path: '/',
})

const send = (ws: WebSocket, data: any): void => {
  const value = JSON.stringify(data)
  ws.send(value)
}

const broadcast = (sessionId: string, socketId: string, data: any): void => {
  const session_socket = _SESSION_SOCKET[sessionId]

  for (const _socketId of session_socket) {
    if (_socketId !== socketId) {
      const _ws = _SOCKET[_socketId]
      send(_ws, data)
    }
  }
}

wss.on('connection', function connection(ws: WebSocket, req: Req) {
  const { headers } = req

  const { cookie = '' } = headers
  const cookies = parseCookies(cookie)
  const { userId } = cookies

  const user = _USER[userId]

  if (!user) {
    ws.close()
    return
  }

  const socketId = newSocketId()

  _SOCKET[socketId] = ws

  _SOCKET_USER[socketId] = userId

  _USER_TO_SOCKET[userId] = _USER_TO_SOCKET[userId] || new Set()
  _USER_TO_SOCKET[userId].add(socketId)

  function _send(data: any): void {
    send(ws, data)
  }

  ws.on('message', function incoming(message) {
    const data_str = message.toString()

    try {
      const _data = JSON.parse(data_str)

      const { type, data } = _data

      switch (type) {
        case 'init': {
          const { pathPoints, sessionId } = data as {
            pathPoints: PathPoints
            sessionId: string
          }

          // console.log('init', userId)

          if (_SESSION[sessionId]) {
            const session = _SESSION[sessionId]

            _send({
              type: 'init',
              data: {
                session,
              },
            })
          } else {
            _SESSION[sessionId] = pathPoints.map(pathPoint => ({
              userId,
              pathPoint,
            }))
          }

          _SESSION_USER[sessionId] = _SESSION_USER[sessionId] || new Set()
          _SESSION_USER[sessionId].add(userId)

          _SOCKET_SESSION[socketId] = sessionId

          _SESSION_SOCKET[sessionId] = _SESSION_SOCKET[sessionId] || new Set()
          _SESSION_SOCKET[sessionId].add(socketId)

          _USER_SESSION_SOCKET[userId] = _USER_SESSION_SOCKET[userId] || {}
          _USER_SESSION_SOCKET[userId][sessionId] =
            _USER_SESSION_SOCKET[userId][sessionId] || new Set()

          _USER_SESSION_SOCKET[userId][sessionId].add(socketId)

          break
        }
        case 'point': {
          const { pathPoint, sessionId } = data

          // console.log('point', userId, socketId)

          const session = _SESSION[sessionId]

          const userPoint = {
            userId,
            pathPoint,
          }

          session.push(userPoint)

          broadcast(sessionId, socketId, {
            type: 'point',
            data: { userPoint },
          })
          break
        }
        case 'clear': {
          const { sessionId } = data

          // console.log('clear', sessionId)

          _SESSION[sessionId] = []

          broadcast(sessionId, socketId, { type: 'clear', data: {} })
          break
        }
      }
    } catch (err) {
      console.error('wss', 'message', 'failed to parse JSON', data_str)
    }
  })

  ws.on('pong', () => {
    // TODO
  })

  ws.on('close', () => {
    delete _SOCKET[socketId]

    delete _SOCKET_USER[socketId]

    _USER_TO_SOCKET[userId].delete(socketId)

    const sessionId = _SOCKET_SESSION[socketId]

    delete _SOCKET_SESSION[socketId]

    _SESSION_SOCKET[sessionId].delete(socketId)

    _USER_SESSION_SOCKET[userId][sessionId].delete(socketId)
  })
})

wss.on('close', function close() {
  console.log('wss', 'close')
})
