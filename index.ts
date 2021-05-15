import * as express from 'express'
import * as WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'
import * as cookieParser from 'cookie-parser'
import * as path from 'path'
import * as cors from 'cors'
import * as os from 'os'

const nameGenerator = require('username-generator')

const app = express()

const PORT = 3000

const { NODE_ENV = 'development' } = process.env

const dev = NODE_ENV === 'development'

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
  )[0] + ':' + PORT
)

console.log('NODE_ENV', NODE_ENV)
console.log('CWD', CWD)

type Point = {
  pos: [number, number]
  color: string
  r: number
}

type Points = Point[]

type Session = {
  [userId: string]: {
    user: User
    points: Points
  }
}

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
const _SESSION: Sessions = {}
const _CONNECTION: {
  [userId: string]: WebSocket
} = {}

const COOKIE_NAME_USER_ID = 'userId'

function createUser(): string {
  let user_id = uuidv4()
  while (_USER[user_id]) {
    user_id = uuidv4()
  }
  _USER[user_id] = {
    username: nameGenerator.generateUsername(),
  }
  return user_id
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
    userId = await createUser()
    res.cookie(COOKIE_NAME_USER_ID, userId, {
      httpOnly: true,
      domain: hostname,
    })
  }
  req.userId = userId
  next()
})

app.use(async function(req: Req, res, next) {
  console.log('req.url', req.url)
  req.sessionId = req.url
  next()
})

app.use(async function(req, res, next) {
  const INDEX_HTML_PATH = path.join(CWD, 'public', 'index.html')
  res.sendFile(INDEX_HTML_PATH)
})

const server = app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`)
})

const wss = new WebSocket.Server({
  port: 4000,
  // noServer: true,
  path: '/',
})

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

  console.log('wss', 'connection', userId, user)

  _CONNECTION[userId] = ws

  function send(data: any): void {
    const value = JSON.stringify(data)
    ws.send(value)
  }

  ws.on('message', function incoming(message) {
    const data_str = message.toString()
    try {
      const _data = JSON.parse(data_str)
      const { type, data } = _data

      switch (type) {
        case 'init':
          const { points, sessionId } = data as {
            points: Points
            sessionId: string
          }
          console.log('wss', 'message', 'init', points, sessionId)
          if (!_SESSION[sessionId]) {
            _SESSION[sessionId] = {}
          }
          const session = _SESSION[sessionId]
          session[userId] = {
            user,
            points,
          }
          send({
            type: 'init',
            data: {
              session,
            },
          })
          break
        case 'point':
          const { point } = data
          console.log('wss', 'message', 'point', data)
          break
      }
    } catch (err) {
      console.error('wss', 'message', 'failed to parse JSON', data_str)
    }
  })

  ws.on('pong', () => {
    // TODO
  })

  ws.on('close', () => {
    delete _CONNECTION[userId]
  })
})

wss.on('close', function close() {
  console.log('wss', 'close')
})
