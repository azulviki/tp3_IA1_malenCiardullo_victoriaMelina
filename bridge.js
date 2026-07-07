const WebSocket = require('ws');
const osc = require('osc');

//servidor WebSocket para enviarle los datos a p5.js
const wss = new WebSocket.Server({ port: 3333 });
console.log("🚀 Servidor WebSocket corriendo en el puerto 3333");

let socketConectado = null;

wss.on('connection', (ws) => {
    console.log("🔌 p5.js se conectó al puente correctamente.");
    socketConectado = ws;
});

//servidor UDP para escuchar el OSC que viene del celular (Puerto 12000)
const udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 12000,
    metadata: true
});

udpPort.on("message", (oscMsg) => {
    
    console.log("📱 OSC recibido:", oscMsg.address, "->", oscMsg.args[0].value);
    
    // Si el navegador está abierto, le mandamos el paquete procesado
    if (socketConectado && socketConectado.readyState === WebSocket.OPEN) {
        const datos = {
            address: oscMsg.address,
            value: [oscMsg.args[0].value]
        };
        socketConectado.send(JSON.stringify(datos));
    }
});

udpPort.open();
console.log("Escuchando OSC del celular en el puerto 12000");