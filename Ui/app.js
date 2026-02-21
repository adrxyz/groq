let chats = JSON.parse(localStorage.getItem('nexus_mono_chats')) || [];
let currentChatId = null;

const chatWindow = document.getElementById('chat-window');
const historyList = document.getElementById('history-list');
const userInput = document.getElementById('user-input');
const chatForm = document.getElementById('chat-form');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const modalOverlay = document.getElementById('modal-overlay');

// --- API CONFIGURATION ---
const N8N_WEBHOOK_URL = "http://localhost:5678/webhook/6e416eb5-8b55-495c-af25-e9d0aa2cd250";

function updateStorage() {
    localStorage.setItem('nexus_mono_chats', JSON.stringify(chats));
}

function createNewChat() {
    const id = Date.now();
    chats.unshift({ id, title: "NEW ENTRY", messages: [] });
    currentChatId = id;
    updateStorage();
    renderAll();
}

function selectChat(id) {
    currentChatId = id;
    renderAll();
}

function deleteChat(id) {
    chats = chats.filter(c => c.id !== id);
    if (currentChatId === id) currentChatId = chats.length ? chats[0].id : null;
    updateStorage();
    renderAll();
}

function startEditing(index) {
    const activeChat = chats.find(c => c.id === currentChatId);
    const msgElement = document.getElementById(`msg-content-${index}`);
    const originalText = activeChat.messages[index].content;

    msgElement.innerHTML = `
        <textarea id="edit-input-${index}" class="w-full bg-white/10 text-white border border-white/20 p-2 rounded-lg outline-none resize-none">${originalText}</textarea>
        <div class="flex gap-2 mt-2 justify-end">
            <button onclick="saveEdit(${index})" class="text-[10px] font-black uppercase text-white hover:underline">Save</button>
            <button onclick="renderMessages()" class="text-[10px] font-black uppercase text-slate-500 hover:underline">Cancel</button>
        </div>
    `;
    document.getElementById(`edit-input-${index}`).focus();
}

function saveEdit(index) {
    const activeChat = chats.find(c => c.id === currentChatId);
    const newText = document.getElementById(`edit-input-${index}`).value;
    if (newText.trim()) {
        activeChat.messages[index].content = newText;
        updateStorage();
    }
    renderMessages();
}

function renderHistory() {
    historyList.innerHTML = '';
    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = `group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all mb-1 ${chat.id === currentChatId ? 'bg-white/10 text-white border border-white/10' : 'hover:bg-white/5 text-slate-500'}`;
        div.innerHTML = `
            <span class="text-xs font-bold truncate flex-1" onclick="selectChat(${chat.id})">${chat.title}</span>
            <button onclick="deleteChat(${chat.id})" class="opacity-0 group-hover:opacity-100 p-1 hover:text-white transition-opacity">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        `;
        historyList.appendChild(div);
    });
}

function renderMessages() {
    const activeChat = chats.find(c => c.id === currentChatId);
    if (!activeChat || activeChat.messages.length === 0) {
        chatWindow.innerHTML = `<div id="empty-state" class="h-full flex flex-col items-center justify-center opacity-20"><h2 class="text-6xl font-black italic tracking-tighter">NEXUS</h2></div>`;
        document.getElementById('active-title').innerText = "STANDBY MODE";
        return;
    }

    document.getElementById('active-title').innerText = activeChat.title;
    chatWindow.innerHTML = activeChat.messages.map((m, index) => `
        <div class="flex gap-6 max-w-3xl ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}">
            <div class="w-6 h-6 mt-1 flex-shrink-0 flex items-center justify-center text-[10px] font-black border ${m.role === 'user' ? 'bg-white text-black border-white' : 'border-white/20 text-white'}">
                ${m.role === 'user' ? 'U' : 'N'}
            </div>
            <div class="flex-1 group ${m.role === 'user' ? 'text-right' : ''}">
                <div id="msg-content-${index}" class="text-[13px] leading-relaxed inline-block ${m.role === 'user' ? 'text-white bg-white/5 p-3 rounded-xl rounded-tr-none' : 'text-slate-400'}">
                    ${m.content}
                </div>
                ${m.role === 'user' ? `
                    <div class="mt-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="startEditing(${index})" class="text-slate-600 hover:text-white p-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
}

function showThinking() {
    // TWEAK: Remove any existing thinking bubbles first so they don't stack up
    document.getElementById('thinking')?.remove(); 

    const div = document.createElement('div');
    div.id = 'thinking';
    div.className = 'flex gap-6 max-w-3xl';
    div.innerHTML = `
        <div class="w-6 h-6 border border-white/20 text-white flex items-center justify-center text-[10px] font-black">N</div>
        <div class="flex items-center gap-1.5">
            <div class="dot w-1 h-1 rounded-full bg-white/50 animate-pulse"></div>
            <div class="dot w-1 h-1 rounded-full bg-white/50 animate-pulse" style="animation-delay: 0.2s"></div>
            <div class="dot w-1 h-1 rounded-full bg-white/50 animate-pulse" style="animation-delay: 0.4s"></div>
        </div>`;
    chatWindow.appendChild(div);
    chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
}

// --- NEW ASYNC API HANDLER ---
async function callN8N(userText, activeChat) {
    showThinking();
    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                chatId: activeChat.id,
                message: userText 
            })
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();
        
        // n8n usually returns an object. Adjust 'data.output' to match your n8n output key.
        const aiMessage = data.output || data.text || JSON.stringify(data);

        document.getElementById('thinking')?.remove();
        activeChat.messages.push({ role: 'assistant', content: aiMessage });
        updateStorage();
        renderMessages();

    } catch (error) {
        console.error("API Error:", error);
        
        // TWEAK: Ensure the thinking bubble is removed even if the API fails
        document.getElementById('thinking')?.remove(); 
        
        activeChat.messages.push({ role: 'assistant', content: "CRITICAL ERROR: CONNECTION TO NEXUS CORE FAILED." });
        updateStorage(); // Ensure error saves to local storage
        renderMessages();
    }
}

function renderAll() {
    renderHistory();
    renderMessages();
}

sidebarToggle.onclick = () => sidebar.classList.toggle('collapsed');
document.getElementById('new-chat-btn').onclick = createNewChat;

document.getElementById('clear-all-trigger').onclick = () => modalOverlay.classList.remove('hidden');
document.getElementById('modal-cancel').onclick = () => modalOverlay.classList.add('hidden');
document.getElementById('modal-confirm').onclick = () => {
    chats = [];
    currentChatId = null;
    updateStorage();
    renderAll();
    modalOverlay.classList.add('hidden');
};

chatForm.onsubmit = (e) => {
    e.preventDefault();
    const val = userInput.value.trim();
    if (!val) return;
    
    if (!currentChatId) createNewChat();
    const activeChat = chats.find(c => c.id === currentChatId);
    
    // Auto-generate title for first message
    if (activeChat.messages.length === 0) {
        activeChat.title = val.substring(0, 18).toUpperCase() + (val.length > 18 ? "..." : "");
    }
    
    activeChat.messages.push({ role: 'user', content: val });
    userInput.value = '';
    userInput.style.height = 'auto';
    
    renderMessages();
    callN8N(val, activeChat); // Trigger n8n
};

userInput.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
});

// Initialize on load
renderAll();