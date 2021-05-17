"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCookies = void 0;
const express = require("express");
const WebSocket = require("ws");
const uuid_1 = require("uuid");
const cookieParser = require("cookie-parser");
const path = require("path");
const cors = require("cors");
const os = require("os");
const fs = require("fs");
const http = require("http");
const https = require("https");
const tls = require("tls");
const nameGenerator = require('username-generator');
const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const { NODE_ENV = 'development' } = process.env;
const dev = NODE_ENV === 'development';
const prod = NODE_ENV === 'production';
const CWD = process.cwd();
console.log(Object.values(os.networkInterfaces()).reduce((r, list) => r.concat(list.reduce((rr, i) => rr.concat((i.family === 'IPv4' && !i.internal && i.address) || []), [])), [])[0] +
    ':' +
    HTTP_PORT);
console.log('NODE_ENV', NODE_ENV);
console.log('CWD', CWD);
const _USER = {};
const _USER_TO_SOCKET = {};
const _USER_SESSION_SOCKET = {};
const _SOCKET_SESSION = {};
const _SESSION_SOCKET = {};
const _SOCKET_USER = {};
const _SESSION = {};
const _SESSION_USER = {};
const _SOCKET = {};
const COOKIE_NAME_USER_ID = 'userId';
function uuidNotIn(obj) {
    let id = uuid_1.v4();
    while (obj[id]) {
        id = uuid_1.v4();
    }
    return id;
}
function newUserId() {
    return uuidNotIn(_USER);
}
function newSocketId() {
    return uuidNotIn(_SOCKET_USER);
}
function parseCookies(str) {
    let rx = /([^;=\s]*)=([^;]*)/g;
    let obj = {};
    for (let m; (m = rx.exec(str));)
        obj[m[1]] = decodeURIComponent(m[2]);
    return obj;
}
exports.parseCookies = parseCookies;
app.use(cors({}));
app.use(cookieParser());
app.use(function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const { hostname, cookies } = req;
        let { [COOKIE_NAME_USER_ID]: userId } = cookies;
        if (!userId || !_USER[userId]) {
            userId = yield newUserId();
            _USER[userId] = {
                username: nameGenerator.generateUsername(),
            };
            res.cookie(COOKIE_NAME_USER_ID, userId, {
                httpOnly: false,
                domain: hostname,
            });
        }
        req.userId = userId;
        next();
    });
});
app.use(function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        // console.log('req.url', req.url)
        req.sessionId = req.url;
        next();
    });
});
app.use(function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const INDEX_HTML_PATH = path.join(CWD, 'public', 'index.html');
        res.sendFile(INDEX_HTML_PATH);
    });
});
// HTTP
const HTTPServer = http.createServer({}, app);
HTTPServer.listen(HTTP_PORT, () => {
    console.log(`HTTP server listening at port ${HTTP_PORT}`);
});
// HTTPS
if (prod) {
    function getSecureContext(domain) {
        return tls.createSecureContext({
            key: fs.readFileSync(`/etc/letsencrypt/live/${domain}/privkey.pem`),
            cert: fs.readFileSync(`/etc/letsencrypt/live/${domain}/fullchain.pem`),
        });
    }
    const DOMAIN = ['chalkboard.it'];
    const secureContext = DOMAIN.reduce((acc, domain) => {
        return Object.assign(Object.assign({}, acc), { [domain]: getSecureContext(domain) });
    }, {});
    const HTTPSOpt = {
        SNICallback: function (domain, cb) {
            const segments = domain.split('.');
            const l = segments.length;
            const root = `${segments[l - 2]}.${segments[l - 1]}`;
            const ctx = secureContext[root];
            if (ctx) {
                cb(null, ctx);
            }
            else {
                cb(new Error(''), null);
            }
        },
    };
    const HTTPSServer = https.createServer(HTTPSOpt, app);
    HTTPSServer.listen(HTTPS_PORT, () => {
        console.log(`HTTPS server listening at port ${HTTPS_PORT}`);
    });
}
const wss = new WebSocket.Server({
    port: 4000,
    // noServer: true,
    path: '/',
});
const send = (ws, data) => {
    const value = JSON.stringify(data);
    ws.send(value);
};
const broadcast = (sessionId, socketId, data) => {
    const session_socket = _SESSION_SOCKET[sessionId];
    for (const _socketId of session_socket) {
        if (_socketId !== socketId) {
            const _ws = _SOCKET[_socketId];
            send(_ws, data);
        }
    }
};
wss.on('connection', function connection(ws, req) {
    const { headers } = req;
    const { cookie = '' } = headers;
    const cookies = parseCookies(cookie);
    const { userId } = cookies;
    const user = _USER[userId];
    if (!user) {
        ws.close();
        return;
    }
    const socketId = newSocketId();
    _SOCKET[socketId] = ws;
    _SOCKET_USER[socketId] = userId;
    _USER_TO_SOCKET[userId] = _USER_TO_SOCKET[userId] || new Set();
    _USER_TO_SOCKET[userId].add(socketId);
    function _send(data) {
        send(ws, data);
    }
    ws.on('message', function incoming(message) {
        const data_str = message.toString();
        try {
            const _data = JSON.parse(data_str);
            const { type, data } = _data;
            switch (type) {
                case 'init': {
                    const { pathPoints, sessionId } = data;
                    // console.log('init', userId)
                    if (_SESSION[sessionId]) {
                        const session = _SESSION[sessionId];
                        _send({
                            type: 'init',
                            data: {
                                session,
                            },
                        });
                    }
                    else {
                        _SESSION[sessionId] = pathPoints.map(pathPoint => ({
                            userId,
                            pathPoint,
                        }));
                    }
                    _SESSION_USER[sessionId] = _SESSION_USER[sessionId] || new Set();
                    _SESSION_USER[sessionId].add(userId);
                    _SOCKET_SESSION[socketId] = sessionId;
                    _SESSION_SOCKET[sessionId] = _SESSION_SOCKET[sessionId] || new Set();
                    _SESSION_SOCKET[sessionId].add(socketId);
                    _USER_SESSION_SOCKET[userId] = _USER_SESSION_SOCKET[userId] || {};
                    _USER_SESSION_SOCKET[userId][sessionId] =
                        _USER_SESSION_SOCKET[userId][sessionId] || new Set();
                    _USER_SESSION_SOCKET[userId][sessionId].add(socketId);
                    break;
                }
                case 'point': {
                    const { pathPoint, sessionId } = data;
                    // console.log('point', userId, socketId)
                    const session = _SESSION[sessionId];
                    const userPoint = {
                        userId,
                        pathPoint,
                    };
                    session.push(userPoint);
                    broadcast(sessionId, socketId, {
                        type: 'point',
                        data: { userPoint },
                    });
                    break;
                }
                case 'clear': {
                    const { sessionId } = data;
                    // console.log('clear', sessionId)
                    _SESSION[sessionId] = [];
                    broadcast(sessionId, socketId, { type: 'clear', data: {} });
                    break;
                }
            }
        }
        catch (err) {
            console.error('wss', 'message', 'failed to parse JSON', data_str);
        }
    });
    ws.on('pong', () => {
        // TODO
    });
    ws.on('close', () => {
        delete _SOCKET[socketId];
        delete _SOCKET_USER[socketId];
        _USER_TO_SOCKET[userId].delete(socketId);
        const sessionId = _SOCKET_SESSION[socketId];
        delete _SOCKET_SESSION[socketId];
        _SESSION_SOCKET[sessionId].delete(socketId);
        _USER_SESSION_SOCKET[userId][sessionId].delete(socketId);
    });
});
wss.on('close', function close() {
    console.log('wss', 'close');
});
//# sourceMappingURL=index.js.map