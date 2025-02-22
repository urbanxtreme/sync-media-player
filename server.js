const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const sessions = new Map();

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    let currentSession = null;

    socket.on('create-session', (userName) => {
        const sessionId = uuidv4();
        sessions.set(sessionId, {
            participants: [{
                id: socket.id,
                name: userName,
                isHost: true
            }],
            hostName: userName
        });
        
        socket.join(sessionId);
        currentSession = sessionId;
        socket.emit('session-created', sessionId);
        updateParticipants(sessionId);
        console.log(`Session created: ${sessionId} by ${userName}`);
    });

    socket.on('join-session', ({ sessionId, userName }) => {
        if (sessions.has(sessionId)) {
            const session = sessions.get(sessionId);
            session.participants.push({
                id: socket.id,
                name: userName,
                isHost: false
            });
            
            socket.join(sessionId);
            currentSession = sessionId;
            socket.emit('session-joined', sessionId);
            updateParticipants(sessionId);
            console.log(`${userName} joined session: ${sessionId}`);
        } else {
            socket.emit('session-error', 'Invalid session ID');
        }
    });

    socket.on('video-control', (data) => {
        socket.to(data.sessionId).emit('video-control', data);
    });

    socket.on('chat-message', (data) => {
        io.to(data.sessionId).emit('chat-message', data.message);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (currentSession && sessions.has(currentSession)) {
            const session = sessions.get(currentSession);
            session.participants = session.participants.filter(
                p => p.id !== socket.id
            );
            
            if (session.participants.length === 0) {
                sessions.delete(currentSession);
            } else {
                updateParticipants(currentSession);
            }
        }
    });

    function updateParticipants(sessionId) {
        const session = sessions.get(sessionId);
        if (session) {
            io.to(sessionId).emit('update-participants', 
                session.participants.map(p => ({
                    name: p.name,
                    isHost: p.isHost
                }))
            );
        }
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});