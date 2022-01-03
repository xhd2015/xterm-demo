import demoHelloWorld from "./demo/hello";
import demoWebsocket from "./demo/websocket";

function onSelect(e) {
    const container = document.getElementById("terminal-container")
    for (let child of container.children) {
        child.remove()
    }
    const value = e.value
    console.log("select value:", value)
    const map = {
        'hello world': demoHelloWorld,
        'websocket': demoWebsocket,
    }
    map[value]()
}

window.onload = function () {
    onSelect(document.getElementById("select"))
}
window.onSelect = onSelect
// render what ever you want
// demoHelloWorld();
// demoWebsocket();