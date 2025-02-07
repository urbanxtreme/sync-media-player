const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const sessions = {};

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    socket.on('create-session', () => {
        const sessionId = uuidv4();
        sessions[sessionId] = { clients: [] };
        socket.join(sessionId);
        sessions[sessionId].clients.push(socket.id);
        socket.emit('session-created', sessionId);
        console.log(`Session created: ${sessionId}`);
    });

    socket.on('join-session', (sessionId) => {
        if (sessions[sessionId]) {
            socket.join(sessionId);
            sessions[sessionId].clients.push(socket.id);
            socket.emit('session-joined', sessionId);
            console.log(`User joined session: ${sessionId}`);
        } else {
            socket.emit('error', 'Invalid session ID');
        }
    });

    socket.on('video-control', (data) => {
        const { sessionId, action, time } = data;
        socket.to(sessionId).emit('video-control', { action, time });
    });

    socket.on('chat-message', (data) => {
        const { sessionId, message } = data;
        io.to(sessionId).emit('chat-message', message);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Cleanup: Remove user from any sessions
        for (const sessionId in sessions) {
            const index = sessions[sessionId].clients.indexOf(socket.id);
            if (index !== -1) {
                sessions[sessionId].clients.splice(index, 1);
                if (sessions[sessionId].clients.length === 0) {
                    delete sessions[sessionId];
                }
                break;
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
