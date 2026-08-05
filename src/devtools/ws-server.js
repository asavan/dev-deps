import { WebSocketServer, WebSocket } from "ws";

const onConnection = (clients) => (ws, req) => {
    // https://stackoverflow.com/questions/14822708/
    // how-to-get-client-ip-address-with-websocket-websockets-ws-library-in-node-js
    console.log("WS connection established!",
        req.socket.remoteAddress,
        req.headers["sec-websocket-key"]);

    ws.on("close", () => {
        console.log("WS closed!");
    });

    ws.on("message", (message) => {
        console.log("Got ws message: " + message);
        for (const candidate of clients) {
            // send to everybody on the site, except sender
            if (candidate !== ws && candidate.readyState === WebSocket.OPEN) {
                // console.log("Send ws message: " + message);
                candidate.send(message);
            }
        }
    });
};

export function wsServerOnPort(port) {
    const wss = new WebSocketServer({port: port});
    wss.on("connection", onConnection(wss.clients));
}

export function wsServerOnServer(server, path) {
    const wss = new WebSocketServer({ noServer: true });

    // 3. Intercept the HTTP 'upgrade' event manually
    server.on('upgrade', (request, socket, head) => {

        // 4. Delegate path routing safely
        // Keep '/ws' clear so Webpack's internal HMR engine doesn't break
        if (request.url === path) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        }
        // Let webPack-dev-server automatically handle its own paths (/ws)
    });
    wss.on('connection', onConnection(wss.clients));
    console.log('Custom WebSocket Server attached safely to Webpack Dev Server.');
}
