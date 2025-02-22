const socket = io();
const videoPlayer = document.getElementById("videoPlayer");
const videoFileInput = document.getElementById("videoFile");
const loadVideoButton = document.getElementById("loadVideo");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const messages = document.getElementById("messages");
const createSessionButton = document.getElementById("createSession");
const joinSessionButton = document.getElementById("joinSession");
const sessionIdInput = document.getElementById("sessionIdInput");
const fileName = document.getElementById("fileName");
const toast = document.getElementById("toast");
const participantsList = document.getElementById("participants");
const participantCount = document.getElementById("participantCount");
const sessionIdDisplay = document.getElementById("sessionIdDisplay");
const hostNameDisplay = document.getElementById("hostName");
const sessionHostInfo = document.getElementById("sessionHostInfo");
const nameModal = document.getElementById("nameModal");
const userNameInput = document.getElementById("userName");
const confirmNameButton = document.getElementById("confirmName");

let currentSessionId = null;
let userName = null;
let isHost = false;

// Add missing setLoading function
function setLoading(button, isLoading) {
    button.disabled = isLoading;
    button.innerHTML = isLoading
        ? `<i class="fas fa-spinner fa-spin"></i> ${button.textContent}`
        : button.innerHTML;
}

// Toast notifications
function showToast(message, duration = 3000) {
    toast.textContent = message;
    toast.style.display = "block";
    setTimeout(() => {
        toast.style.display = "none";
    }, duration);
}

// File input handler
videoFileInput.addEventListener("change", () => {
    const file = videoFileInput.files[0];
    if (file) {
        fileName.textContent = file.name;
        // Immediately create URL but don't load yet
        const url = URL.createObjectURL(file);
        document.getElementById("videoSource").src = url;
    }
});

// Fixed video loading
loadVideoButton.addEventListener("click", () => {
    const file = videoFileInput.files[0];
    if (file) {
        videoPlayer.load();
        videoPlayer.play().catch(error => {
            showToast("Click the play button to start video");
        });
    } else {
        showToast("Please select a video file first");
    }
});

// Name handling and modals
function showModal() {
    nameModal.style.display = 'flex';
}

function hideModal() {
    nameModal.style.display = 'none';
}

// Session creation
createSessionButton.addEventListener("click", () => {
    showModal();
    confirmNameButton.onclick = () => {
        userName = userNameInput.value.trim();
        if (userName) {
            hideModal();
            setLoading(createSessionButton, true);
            socket.emit("create-session", userName);
        }
    };
});

// Session joining
joinSessionButton.addEventListener("click", () => {
    const sessionId = sessionIdInput.value;
    if (sessionId) {
        showModal();
        confirmNameButton.onclick = () => {
            userName = userNameInput.value.trim();
            if (userName) {
                hideModal();
                setLoading(joinSessionButton, true);
                socket.emit("join-session", { sessionId, userName });
            }
        };
    }
});

// Session event handlers
socket.on("session-created", (sessionId) => {
    isHost = true;
    sessionHostInfo.style.display = 'block';
    hostNameDisplay.textContent = userName;
    sessionIdDisplay.textContent = sessionId;
    showToast(`Session created! ID: ${sessionId}`);
    navigator.clipboard.writeText(sessionId);
    setLoading(createSessionButton, false);
});

socket.on("session-joined", (sessionId) => {
    sessionHostInfo.style.display = 'block';
    sessionIdDisplay.textContent = sessionId;
    showToast(`Joined session: ${sessionId}`);
    setLoading(joinSessionButton, false);
});

socket.on("session-error", (error) => {
    showToast(error);
    setLoading(joinSessionButton, false);
});

// Participants handling
socket.on("update-participants", (participants) => {
    participantsList.innerHTML = '';
    participants.forEach(participant => {
        const li = document.createElement('li');
        li.textContent = participant.name;
        if (participant.isHost) li.innerHTML += ' 👑';
        participantsList.appendChild(li);
    });
    participantCount.textContent = participants.length;
});

// Video synchronization
videoPlayer.addEventListener("play", () => syncVideoState("play"));
videoPlayer.addEventListener("pause", () => syncVideoState("pause"));

function syncVideoState(action) {
    if (currentSessionId) {
        socket.emit("video-control", {
            sessionId: currentSessionId,
            action,
            time: videoPlayer.currentTime
        });
    }
}

socket.on("video-control", (data) => {
    if (data.sessionId === currentSessionId) {
        videoPlayer.currentTime = data.time;
        data.action === "play" ? videoPlayer.play() : videoPlayer.pause();
    }
});

// Chat system
function sendMessage() {
    const message = messageInput.value;
    if (message && currentSessionId) {
        socket.emit("chat-message", { 
            sessionId: currentSessionId,
            message: `${userName}: ${message}`
        });
        messageInput.value = "";
    }
}

sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

socket.on("chat-message", (msg) => {
    const li = document.createElement("li");
    li.textContent = msg;
    messages.appendChild(li);
    messages.scrollTo(0, messages.scrollHeight);
});

// Session ID copy
window.copySessionId = () => {
    navigator.clipboard.writeText(sessionIdDisplay.textContent);
    showToast('Session ID copied!');
};

// Keyboard controls
document.addEventListener("keypress", (e) => {
    if (e.target === messageInput) return;
    if (e.code === "Space") {
        e.preventDefault();
        videoPlayer[videoPlayer.paused ? "play" : "pause"]();
    }
});