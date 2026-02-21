let chats = JSON.parse(localStorage.getItem('nexus_mono_chats')) || [];
let currentChatId = null;

const msgContainer = document.getElementById('message-container');
const historyList = document.getElementById('history-list');
const userInput = document.getElementById('user-input');
const chatForm = document.getElementById('chat-form');
const sidebar = document.getElementById('sidebar');
const modalOverlay = document.getElementById('modal-overlay');

const N8N_URL = "http://localhost:5678/webhook/6e416eb5-8b55-495c-af25-e9d0aa2cd250";

// --- 1. THE COLORFUL SYNTAX HIGHLIGHTER ---
function highlightSyntax(code) {
    let safeCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Comments - Gray
    safeCode = safeCode.replace(/(\#.*|\/\/.*)(?![^<]*>)/g, '<span class="text-slate-500 italic">$1</span>');
    // Strings - Green
    safeCode = safeCode.replace(/(&quot;.*?&quot;|'.*?'|".*?")(?![^<]*>)/g, '<span class="text-green-400">$1</span>');
    // Functions - Blue/Cyan
    safeCode = safeCode.replace(/\b([a-zA-Z_]\w*)(?=\s*\()(?![^<]*>)/g, '<span class="text-cyan-300">$1</span>');
    // Keywords - Pink/Purple
    const keywords = ['def', 'class', 'import', 'from', 'return', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'with', 'as', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'const', 'let', 'var', 'function'];
    const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b(?![^<]*>)`, 'g');
    safeCode = safeCode.replace(kwRegex, '<span class="text-pink-400 font-bold">$1</span>');
    // Numbers - Amber
    safeCode = safeCode.replace(/\b(\d+)\b(?![^<]*>)/g, '<span class="text-amber-300">$1</span>');
    
    return safeCode;
}

// --- 2. THE MARKDOWN FORMATTER (Makes it easy to read) ---
function formatMarkdown(text) {
    if (!text) return "";
    let parsed = text.trim();

    // Handle Code Blocks with Colorful UI
    parsed = parsed.replace(/\n*```(\w*)\n([\s\S]*?)```\n*/g, function(match, lang, code) {
        const highlighted = highlightSyntax(code.trim());
        const label = lang ? lang.toUpperCase() : "CODE";
        return `
            <div class="my-4 rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-xl">
                <div class="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/5">
                    <span class="text-[10px] font-black text-slate-500 tracking-widest">${label}</span>
                    <button onclick="copyCode(this)" class="text-[10px] font-bold text-slate-500 hover:text-white transition-colors">COPY</button>
                </div>
                <div class="p-4 overflow-x-auto">
                    <pre class="font-mono text-sm leading-relaxed text-slate-300"><code>${highlighted}</code></pre>
                </div>
            </div>`;
    });

    // Inline code `like this`
    parsed = parsed.replace(/`([^`]+)`/g, '<code class="bg-white/10 text-pink-300 px-1.5 py-0.5 rounded font-mono text-[13px]">$1</code>');
    // Bold **text**
    parsed = parsed.replace(/\*\*([^\*]+)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
    // Newlines for spacing
    parsed = parsed.replace(/\n\n/g, '<div class="h-4"></div>');

    return parsed;
}

// --- 3. COPY TO CLIPBOARD HELPER ---
window.copyCode = function(btn) {
    const code = btn.closest('.rounded-xl').querySelector('code').innerText;
    navigator.clipboard.writeText(code).then(() => {
        const oldText = btn.innerText;
        btn.innerText = "COPIED!";
        setTimeout(() => btn.innerText = oldText, 2000);
    });
};

function updateStorage() {
    localStorage.setItem('nexus_mono_chats', JSON.stringify(chats));
}

function createNewChat() {
    const id = Date.now();
    chats.unshift({ id, title: "NEW SESSION", messages: [] });
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
    const msgBox = document.getElementById(`msg-text-${index}`);
    const originalText = activeChat.messages[index].content;

    msgBox.innerHTML = `
        <textarea id="editor-${index}" class="w-full bg-white/5 text-white border border-white/10 p-4 rounded-xl outline-none resize-none mb-2 font-sans text-sm">${originalText}</textarea>
        <div class="flex gap-2 justify-end">
            <button onclick="saveEdit(${index})" class="text-[10px] font-bold uppercase text-white px-3 py-1 bg-white/10 rounded-md hover:bg-white/20">Save</button>
            <button onclick="renderMessages()" class="text-[10px] font-bold uppercase text-slate-500 px-3 py-1 hover:text-white">Cancel</button>
        </div>
    `;
    document.getElementById(`editor-${index}`).focus();
}

function saveEdit(index) {
    const activeChat = chats.find(c => c.id === currentChatId);
    const newText = document.getElementById(`editor-${index}`).value;
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
        div.className = `group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all mb-1 ${chat.id === currentChatId ? 'bg-white/5 text-white' : 'hover:bg-white/5 text-slate-500'}`;
        div.innerHTML = `
            <span class="text-xs font-semibold truncate flex-1" onclick="selectChat(${chat.id})">${chat.title}</span>
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
        msgContainer.innerHTML = `
            <div class="h-[60vh] flex flex-col items-center justify-center">
                <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
                    <div class="w-5 h-5 bg-black rounded-md"></div>
                </div>
                <h2 class="text-2xl font-bold tracking-tighter text-white">How can I help you today?</h2>
            </div>`;
        document.getElementById('active-title').innerText = "Standby";
        return;
    }

    document.getElementById('active-title').innerText = activeChat.title;
    msgContainer.innerHTML = activeChat.messages.map((m, index) => `
        <div class="flex gap-6 group">
            <div class="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-black border ${m.role === 'user' ? 'bg-[#222] text-white border-white/10' : 'bg-white text-black border-white'}">
                ${m.role === 'user' ? 'S' : 'N'}
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">${m.role === 'user' ? 'You' : 'Nexus AI'}</div>
                <div id="msg-text-${index}" class="text-[15px] leading-relaxed text-slate-200">
                    ${m.role === 'assistant' ? formatMarkdown(m.content) : m.content}
                </div>
                ${m.role === 'user' ? `
                    <div class="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="startEditing(${index})" class="text-slate-600 hover:text-white flex items-center gap-1.5 transition-all">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            <span class="text-[9px] font-bold uppercase tracking-widest">Edit</span>
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    document.getElementById('chat-window').scrollTo({ top: document.getElementById('chat-window').scrollHeight, behavior: 'smooth' });
}

async function callN8N(userText, activeChat) {
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'flex gap-6 py-4';
    thinkingDiv.innerHTML = `
        <div class="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center text-[10px] font-black">N</div>
        <div class="flex items-center gap-1.5"><div class="dot w-1.5 h-1.5 rounded-full bg-white"></div><div class="dot w-1.5 h-1.5 rounded-full bg-white/50"></div><div class="dot w-1.5 h-1.5 rounded-full bg-white/20"></div></div>`;
    msgContainer.appendChild(thinkingDiv);

    try {
        const response = await fetch(N8N_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText })
        });
        const data = await response.json();
        const aiResponse = data.output || data.text || "No response data found.";
        
        thinkingDiv.remove();
        activeChat.messages.push({ role: 'assistant', content: aiResponse });
        updateStorage();
        renderMessages();
    } catch (e) {
        thinkingDiv.remove();
        activeChat.messages.push({ role: 'assistant', content: "Error connecting to Core." });
        renderMessages();
    }
}

document.getElementById('sidebar-toggle').onclick = () => sidebar.classList.toggle('collapsed');
document.getElementById('new-chat-btn').onclick = createNewChat;
document.getElementById('clear-all-trigger').onclick = () => modalOverlay.classList.remove('hidden');
document.getElementById('modal-cancel').onclick = () => modalOverlay.classList.add('hidden');
document.getElementById('modal-confirm').onclick = () => {
    chats = []; currentChatId = null; updateStorage(); renderAll(); modalOverlay.classList.add('hidden');
};

chatForm.onsubmit = (e) => {
    e.preventDefault();
    const val = userInput.value.trim();
    if (!val) return;
    if (!currentChatId) createNewChat();
    const activeChat = chats.find(c => c.id === currentChatId);
    if (activeChat.messages.length === 0) activeChat.title = val.substring(0, 20).toUpperCase();
    activeChat.messages.push({ role: 'user', content: val });
    userInput.value = '';
    userInput.style.height = 'auto';
    renderMessages();
    callN8N(val, activeChat);
};

userInput.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
});

function renderAll() { renderHistory(); renderMessages(); }
renderAll();