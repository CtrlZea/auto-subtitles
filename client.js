let socket = new WebSocket("ws://localhost:8001");
let displayDiv = document.getElementById('textDisplay');
let server_available = false;
let sentenceHistory = []; // History of completed sentences
let currentSentence = { text: "", timestamp: Date.now() }; // Current sentence being constructed
const maxSentencesToShow = 3; // Maximum number of sentences to show at once
const sentenceDisplayTime = 2000; // Time in ms to keep sentences in history (10 seconds)

const serverCheckInterval = 5000; // Check every 5 seconds
const cleanupInterval = 2000; // Check for old sentences every second

let sentenceIdCounter = 0; // Unique ID for each sentence

function connectToServer() {
    socket = new WebSocket("ws://localhost:8001");

    socket.onopen = function (event) {
        server_available = true;
        sentenceHistory = []; // Clear previous sentences when server connects
        currentSentence = { text: "", timestamp: Date.now() }; // Reset current sentence
        updateDisplay();
    };

    socket.onmessage = function (event) {
        let data = JSON.parse(event.data);

        if (data.type === 'realtime') {
            // Update the current sentence with realtime text
            currentSentence.text = data.text;
            currentSentence.timestamp = Date.now();
        } else if (data.type === 'fullSentence') {
            // Add the completed sentence to history - but only once
            // Replace the current sentence with the full sentence instead of adding both
            const currentEl = displayDiv.querySelector('[data-sentence-id="current"]');
            const newId = 's' + (sentenceIdCounter++);

            // If we have a current element, just update its ID and class
            if (currentEl && currentSentence.text) {
                currentEl.classList.remove('current-sentence');
                currentEl.classList.add('completed-sentence');
                currentEl.dataset.sentenceId = newId;

                // Add to history with the same ID
                sentenceHistory.push({
                    text: data.text,
                    timestamp: Date.now(),
                    id: newId
                });
            } else {
                // Otherwise add to history as normal
                sentenceHistory.push({
                    text: data.text,
                    timestamp: Date.now(),
                    id: newId
                });
            }

            // Reset the current sentence
            currentSentence = { text: "", timestamp: Date.now() };
        }

        updateDisplay();
    };

    socket.onclose = function (event) {
        server_available = false;
        sentenceHistory = []; // Clear previous sentences when server disconnects
        currentSentence = { text: "", timestamp: Date.now() }; // Reset current sentence
        updateDisplay();
    };
}

function updateDisplay() {
    // Track which sentence IDs should be present
    let sentencesToShow = sentenceHistory.slice(-maxSentencesToShow);
    let idsToShow = sentencesToShow.map(s => s.id);
    if (currentSentence.text) idsToShow.push('current');

    // Remove elements that should no longer be present (with fade-out)
    Array.from(displayDiv.children).forEach(child => {
        const id = child.dataset.sentenceId;
        // If it's the server message, handle separately
        if (child.classList.contains('yellow')) {
            if (server_available || sentenceHistory.length > 0 || currentSentence.text) {
                child.classList.add('fade-out');
                setTimeout(() => { if (child.parentNode) child.parentNode.removeChild(child); }, 500);
            }
            return;
        }
        if (id && !idsToShow.includes(id)) {
            child.classList.add('fade-out');
            setTimeout(() => { if (child.parentNode) child.parentNode.removeChild(child); }, 500);
        }
    });

    // Show server unavailable message if not connected and nothing to show
    if (!server_available && sentenceHistory.length === 0 && !currentSentence.text) {
        if (!displayDiv.querySelector('.yellow')) {
            const msg = document.createElement('p');
            msg.className = 'yellow fade-in';
            msg.textContent = 'Start the server please';
            displayDiv.appendChild(msg);
            setTimeout(() => msg.classList.remove('fade-in'), 500);
        }
        return;
    }

    // Display completed sentences
    for (let i = 0; i < sentencesToShow.length; i++) {
        const sentence = sentencesToShow[i];
        let el = displayDiv.querySelector(`[data-sentence-id="${sentence.id}"]`);
        if (!el) {
            el = document.createElement('div');
            el.className = 'sentence completed-sentence';
            el.textContent = sentence.text;
            el.dataset.sentenceId = sentence.id;
            displayDiv.appendChild(el);
        } else {
            el.className = 'sentence completed-sentence';
            el.textContent = sentence.text;
        }
    }

    // Display current sentence if it has text
    if (currentSentence.text) {
        let currentEl = displayDiv.querySelector('[data-sentence-id="current"]');
        if (!currentEl) {
            currentEl = document.createElement('div');
            currentEl.className = 'sentence current-sentence';
            currentEl.textContent = currentSentence.text;
            currentEl.dataset.sentenceId = 'current';
            displayDiv.appendChild(currentEl);
        } else {
            currentEl.className = 'sentence current-sentence';
            currentEl.textContent = currentSentence.text;
        }
    }
}

// Clean up old sentences
function cleanupOldSentences() {
    const now = Date.now();
    const expiredIds = sentenceHistory
        .filter(sentence => (now - sentence.timestamp) >= sentenceDisplayTime)
        .map(sentence => sentence.id);

    // Add fade-out class to expired sentences
    expiredIds.forEach(id => {
        const el = displayDiv.querySelector(`[data-sentence-id="${id}"]`);
        if (el && !el.classList.contains('fade-out')) {
            el.classList.add('fade-out');
            setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
        }
    });

    // Remove expired sentences from history
    sentenceHistory = sentenceHistory.filter(sentence => {
        return (now - sentence.timestamp) < sentenceDisplayTime;
    });
}

// Check server availability periodically
setInterval(() => {
    if (!server_available) {
        connectToServer();
    }
}, serverCheckInterval);

// Clean up old sentences periodically
setInterval(cleanupOldSentences, cleanupInterval);

// Initial connection attempt
connectToServer();