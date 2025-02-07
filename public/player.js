const socket = io();
const videoPlayer = document.getElementById('videoPlayer');
const videoFileInput = document.getElementById('videoFile');
const loadVideoButton = document.getElementById('loadVideo');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messages = document.getElementById('messages');
const createSessionButton = document.getElementById('createSession');
const joinSessionButton = document.getElementById('joinSession');
const sessionIdInput = document.getElementById('sessionIdInput');

let currentSessionId = null;

// Create a new session
createSessionButton.addEventListener('click', () => {
    socket.emit('create-session');
});

socket.on('session-created', (sessionId) => {
    alert(`Session created! Share this ID: ${sessionId}`);
    currentSessionId = sessionId;
});

// Join an existing session
joinSessionButton.addEventListener('click', () => {
    const sessionId = sessionIdInput.value;
    if (sessionId) {
        socket.emit('join-session', sessionId);
    }
});

socket.on('session-joined', (sessionId) => {
    alert(`Joined session: ${sessionId}`);
    currentSessionId = sessionId;
});

// Load local video
loadVideoButton.addEventListener('click', () => {
    const file = videoFileInput.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        document.getElementById('videoSource').src = url;
        videoPlayer.load();
    }
});

// Video control sync
videoPlayer.addEventListener('play', () => {
    if (currentSessionId) {
        socket.emit('video-control', { sessionId: currentSessionId, action: 'play', time: videoPlayer.currentTime });
    }
});

videoPlayer.addEventListener('pause', () => {
    if (currentSessionId) {
        socket.emit('video-control', { sessionId: currentSessionId, action: 'pause', time: videoPlayer.currentTime });
    }
});

socket.on('video-control', (data) => {
    if (data.action === 'play') {
        videoPlayer.currentTime = data.time;
        videoPlayer.play();
    } else if (data.action === 'pause') {
        videoPlayer.currentTime = data.time;
        videoPlayer.pause();
    }
});

// Chat feature
sendButton.addEventListener('click', () => {
    const message = messageInput.value;
    if (message && currentSessionId) {
        socket.emit('chat-message', { sessionId: currentSessionId, message });
        messageInput.value = '';
    }
});

socket.on('chat-message', (msg) => {
    const li = document.createElement('li');
    li.textContent = msg;
    messages.appendChild(li);
});
