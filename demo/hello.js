import { Terminal } from "xterm"

export default function demoHelloWorld() {
    const terminalContainer = document.getElementById('terminal-container');

    const term = new Terminal({
        fontFamily: 'Fira Code, courier-new, courier, monospace'
    })
    term.open(terminalContainer);
    term.focus();
    term.writeln('$ echo hello world');
    term.writeln('hello world')
    term.write('$ ')


    // e: { key, domEvent }
    term.onKey((e) => {
        const ev = e.domEvent;
        const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;
        console.log("terminal onKey:", ev)

        if (ev.keyCode === 13) {
            term.write("\r\n$ ")
        } else if (ev.keyCode === 8) {
            // Do not delete the prompt
            if (term._core.buffer.x > 2) {
                term.write('\b \b');
            }
        } else if (ev.ctrlKey && ev.code.startsWith("Key")) {
            // CTRL-*
            term.write("^" + ev.code.slice("Key".length))
        } else if (printable) {
            term.write(e.key);
        }
    });
}
