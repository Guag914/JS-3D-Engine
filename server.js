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

// server.listen(PORT); //Do this for simpler approach

const wss = new WebSocket.Server({ server });
  
  	function generateRandomHexColor() {
  		return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
	}


  
  wss.on('connection', (socket) => {
	  // give each client a unique ID when they connect
	  const id = Date.now();
	  clients.set(id, { x: 0, y: 0, name: "user", color: generateRandomHexColor() });
	
	  socket.on('message', (data) => {
	    const coords = JSON.parse(data);
	    
	    //merge with existing data
	    const existing = clients.get(id);
		clients.set(id, { ...existing, ...coords }); //use of spread operator "..." to combine
	
	    // broadcast everyone's coords to all clients
	    const allCoords = Object.fromEntries(clients);
	    wss.clients.forEach((client) => {
	      if (client.readyState === WebSocket.OPEN) {
	        client.send(JSON.stringify(allCoords));
	      }
	    });
	  });
	
	  socket.on('close', () => {
	    clients.delete(id); // clean up when they disconnect
	    console.log(`Client ${id} disconnected`);
	  });
	});