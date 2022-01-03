import { Terminal } from "xterm";
import { AttachAddon } from 'xterm-addon-attach';

export default async function demoWebsocket() {
    const terminalContainer = document.getElementById('terminal-container');

    const term = new Terminal({
        fontFamily: 'Fira Code, courier-new, courier, monospace'
    })

    window.term = term;

    term.open(terminalContainer);
    term.focus();
    // open a remote terminal first
    const resp = await fetch('http://127.0.0.1:3000/terminals', { method: 'POST' })
    const pid = await resp.text()
    console.log("pid:", pid)
    const socket = new WebSocket(`ws://localhost:3000/terminal?pid=${pid}`);
    const attachAddon = new AttachAddon(socket);
    // socket.binaryType = 'arraybuffer';
    socket.addEventListener('open', (e) => {
        console.log("socket open:", e)
    });
    socket.addEventListener('message', (e) => {
        // console.log("socket message:", e)
    });
    socket.addEventListener('close', function (e) {
        console.log("socket close:", e)
    })
    socket.addEventListener('error', function (e) {
        console.log("socket error:", e)
    })
    term.loadAddon(attachAddon);
}
