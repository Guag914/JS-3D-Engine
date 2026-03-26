//===HTTP SERVER LOGIC===
const http = require('http');
const WebSocket = require('ws');

const clients = new Map();

const server = http.createServer((req, res) => {
	//move websocket stuff outside. this is for only http

});

const PORT = 3000;
server.listen(PORT, 'localhost', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log("^C to exit.");
});

//===WEBSOCKET LOGIC===
const wss = new WebSocket.Server({ server });
  
  const socketToId = new Map();

wss.on('connection', (socket) => {
    const id = Date.now();
    socketToId.set(socket, id);
    clients.set(id, { x: 0, y: 0, z: 1000, w: 1, color: 'red' });

    socket.on('message', (data) => {
        const coords = JSON.parse(data);
        const existing = clients.get(id);
        clients.set(id, { ...existing, ...coords });

        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                const clientId = socketToId.get(client);
                const forClient = Object.fromEntries(
                    [...clients].filter(([cid]) => cid !== clientId)
                );
                client.send(JSON.stringify(forClient));
            }
        });
    });

    socket.on('close', () => {
        clients.delete(id);
        socketToId.delete(socket);
    });
});