const express = require('express');
const http = require('http');
const os = require('os');
const ws = require('ws');
const pty = require('node-pty');

const app = express();
//initialize a simple http server
const server = http.createServer(app);
//initialize the WebSocket server instance
const wss = new ws.Server({ server });

// Whether to use binary transport.
const USE_BINARY = os.platform() !== "win32";

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
app.use('/css', express.static(__dirname + '/css'));
app.use('/dist', express.static(__dirname + '/dist'));


const terminals = {};
const socketBind = {}
const logs = {};
app.post('/terminals', (req, res) => {
    const env = Object.assign({}, process.env);
    env['COLORTERM'] = 'truecolor';
    const cols = parseInt(req.query.cols),
        rows = parseInt(req.query.rows),
        term = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
            name: 'xterm-256color',
            cols: cols || 80,
            rows: rows || 24,
            cwd: process.platform === 'win32' ? undefined : env.PWD,
            env: env,
            encoding: USE_BINARY ? null : 'utf8',
        });

    console.log('Created terminal with PID: ' + term.pid);
    terminals[term.pid] = term;
    logs[term.pid] = '';
    term.onData(function (data) {
        if (!socketBind[term.pid]) {
            console.log("recevied term data:", data.toString())
            logs[term.pid] += data;
        }
    });
    term.onExit((code) => {
        console.log("term exit:", code)
        const ws = socketBind[term.pid]
        if (ws) {
            ws.close(1000)
        }
    })
    res.send(term.pid.toString());
    res.end();
});

wss.on('connection', (ws, req) => {
    // /api/live/ws
    // console.log("connection req:", req.url)
    if (!req.url.startsWith("/terminal?")) {
        ws.close(1000)
        return
    }
    const query = parseQuery(req.url.slice("/terminal?".length))
    const pid = parseInt(query["pid"])
    if (!pid) {
        ws.close(1000)
        return
    }
    console.log("pid connection:", pid)
    handleTerminal(ws, pid)
});

server.listen(3000, () => {
    console.log('listening on 0.0.0.0:3000');
});


function handleTerminal(ws, pid) {
    socketBind[pid] = ws
    const term = terminals[pid];
    console.log('Connected to terminal ' + term.pid);
    ws.send(logs[term.pid]);

    // string message buffering
    function buffer(socket, timeout) {
        let s = '';
        let sender = null;
        return (data) => {
            s += data;
            if (!sender) {
                sender = setTimeout(() => {
                    socket.send(s);
                    s = '';
                    sender = null;
                }, timeout);
            }
        };
    }
    // binary message buffering
    function bufferUtf8(socket, timeout) {
        let buffer = [];
        let sender = null;
        let length = 0;
        return (data) => {
            buffer.push(data);
            length += data.length;
            if (!sender) {
                sender = setTimeout(() => {
                    socket.send(Buffer.concat(buffer, length));
                    buffer = [];
                    sender = null;
                    length = 0;
                }, timeout);
            }
        };
    }
    const send = USE_BINARY ? bufferUtf8(ws, 5) : buffer(ws, 5);

    term.on('data', function (data) {
        console.log(`[DEBUG] term on data pid=${pid}:`, data.toString())
        try {
            send(data);
        } catch (ex) {
            console.error("send data error:", ex)
            // The WebSocket is not open, ignore
        }
    });
    ws.on('error', function (e) {
        console.log("[DEBUG] socket error:", pid)
    })
    ws.on('message', function (msg) {
        console.log(`[DEBUG] message pid=${pid}:`, msg)
        term.write(msg);
    });
    ws.on('close', function () {
        console.log(`[DEBUG] close pid=${pid}:`)
        term.kill();
        console.log('Closed terminal ' + term.pid);
        // Clean things up
        delete terminals[term.pid];
        delete logs[term.pid];
        delete socketBind[pid];
    });
}

function parseQuery(uri) {
    const raw = uri.split("&").map(e => e.split('=', 2))
    const query = {}
    raw.forEach(e => {
        query[decodeURIComponent(e[0])] = decodeURIComponent(e[1])
    })
    return query
}