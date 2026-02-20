const WEBHOOK_URL = 'http://localhost:5678/webhook/6e416eb5-8b55-495c-af25-e9d0aa2cd250';
let chatHistory = JSON.parse(localStorage.getItem('ai_history')) || [];

const chatWindow = document.getElementById('chat-window');
const historyList = document.getElementById('history-list');

// Initialize the UI
function init() {
    renderHistory();
    addMessage("Welcome back! Select a chat or start a new one.", "ai");
}

function saveToHistory(message, role) {
    // Basic persistent storage logic
    const timestamp = new Date().toLocaleTimeString();
    chatHistory.push({ role, text: message, time: timestamp });
    localStorage.setItem('ai_history', JSON.stringify(chatHistory));
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = '';
    // Show last 10 messages as "History"
    chatHistory.slice(-10).reverse().forEach(item => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left p-2 text-xs text-slate-400 hover:bg-slate-700 rounded truncate";
        btn.textContent = `${item.time}: ${item.text}`;
        historyList.appendChild(btn);
    });
}

// Clear History Button
document.getElementById('clear-btn').addEventListener('click', () => {
    if(confirm("Delete all chat history?")) {
        localStorage.removeItem('ai_history');
        chatHistory = [];
        renderHistory();
        chatWindow.innerHTML = '';
    }
});

// Settings Placeholder
document.getElementById('settings-btn').addEventListener('click', () => {
    alert("Settings: Current Webhook is targeting n8n localhost:5678");
});

// Original Chat Logic (Improved)
document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('user-input');
    const msg = input.value.trim();
    if (!msg) return;

    addMessage(msg, 'user');
    saveToHistory(msg, 'user');
    input.value = '';

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "Claude Haiku 3.5",
                messages: [{ role: "user", content: msg }]
            })
        });
        const data = await response.json();
        const aiText = data.output || data.content || "Connection successful, but no text returned.";
        addMessage(aiText, 'ai');
        saveToHistory(aiText, 'ai');
    } catch (err) {
        addMessage("Error: Could not reach n8n. Check if 'Listen for Test Event' is active.", "ai");
    }
});

function addMessage(text, role) {
    const div = document.createElement('div');
    div.className = role === 'user' ? "self-end bg-indigo-600 p-3 rounded-xl max-w-sm" : "self-start bg-slate-800 p-3 rounded-xl max-w-sm border border-slate-700";
    div.textContent = text;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

init();