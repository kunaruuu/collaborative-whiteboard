const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
 
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now, will restrict later
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    // Listen for drawing events from clients
    socket.on('drawing', (data) => {
        // Broadcast the drawing data to all other connected clients
        socket.broadcast.emit('drawing', data);
    });
    
    socket.on('clearCanvas', () => {
        console.log("Received clearCanvas event, broadcasting....");

        io.emit("clearCanvas");
    })

    socket.on('undo', () => {
        socket.broadcast.emit('undo');
    });

    socket.on('drawing-in-progress', (data) => {
        socket.broadcast.emit('drawing-in-progress', data);
    });

    socket.on('redo', () => {
        socket.broadcast.emit('redo');
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
