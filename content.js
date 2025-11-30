// Wait for page to fully load
let retryCount = 0;
const maxRetries = 15;

function initExtension() {
    // Platform check for Gemini
    if (!window.location.hostname.includes('gemini.google.com')) return;
    
    // Check for existing button
    if (document.getElementById('thread-navigator-btn')) return;

    createFloatingButton();
}

function createFloatingButton() {
    const floatingButton = document.createElement('div');
    floatingButton.id = 'thread-navigator-btn';
    floatingButton.title = 'Show Gemini Thread';

    floatingButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showPromptsList();
    });

    document.body.appendChild(floatingButton);
}

function showPromptsList() {
    const existingModal = document.getElementById('thread-prompts-modal');
    if (existingModal) existingModal.remove();

    const userMessages = findUserMessages();
    
    const modal = document.createElement('div');
    modal.id = 'thread-prompts-modal';
    
    // Note: CSS classes match the new "Card Style"
    const modalHTML = `
        <div class="modal-card">
            <div class="prompts-header">
                <div class="header-top">
                    <h3>Gemini Thread Navigator</h3>
                    <button id="close-prompts-list" title="Close">✕</button>
                </div>
                <div class="search-container">
                    <input type="text" id="thread-navigator-search" placeholder="Search prompts..." autocomplete="off">
                </div>
            </div>
            
            <div class="prompts-content">
                <div id="prompts-container">
                    ${generatePromptsListHTML(userMessages)}
                </div>
            </div>
        </div>
    `;

    modal.innerHTML = modalHTML;
    document.body.appendChild(modal);

    setTimeout(() => document.getElementById('thread-navigator-search').focus(), 100);
    setupEventListeners(modal, userMessages);
}

function generatePromptsListHTML(userMessages) {
    if (userMessages.length === 0) {
        return '<div style="text-align:center; padding:40px; color:#a0aec0; font-style:italic;">No prompts found in this thread.</div>';
    }

    return userMessages.map((message, index) => {
        const text = extractMessageText(message);
        const safeText = text.replace(/"/g, '&quot;');
        
        return `
            <div class="prompt-item" data-index="${index}" data-full-text="${safeText.toLowerCase()}">
                <div class="prompt-number">${index + 1}</div>
                <div class="prompt-text">${text}</div>
                <div class="prompt-actions">
                    <button class="action-btn copy-btn" title="Copy Response">
                        📋
                    </button>
                    <button class="action-btn goto-btn" title="Jump to Message">
                        🔗
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function setupEventListeners(modal, userMessages) {
    // Close Logic
    modal.querySelector('#close-prompts-list').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Search Logic
    modal.querySelector('#thread-navigator-search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        modal.querySelectorAll('.prompt-item').forEach(item => {
            const text = item.getAttribute('data-full-text');
            item.style.display = text.includes(term) ? 'grid' : 'none';
        });
    });

    // Click Logic
    modal.querySelector('#prompts-container').addEventListener('click', (e) => {
        const item = e.target.closest('.prompt-item');
        if (!item) return;
        const index = parseInt(item.dataset.index);

        if (e.target.closest('.copy-btn')) {
            copyAIResponse(userMessages[index]);
        } else if (e.target.closest('.goto-btn')) {
            goToAIResponse(userMessages[index]);
            modal.remove();
        } else {
            // Default click on card jumps to message
            scrollToElement(userMessages[index]);
            modal.remove();
        }
    });
}

// --- Platform Specific Selectors (Gemini) ---

function findUserMessages() {
    let messages = Array.from(document.querySelectorAll('user-query'));
    if (messages.length === 0) {
        messages = Array.from(document.querySelectorAll('[data-testid="user-query"], .user-query'));
    }
    return messages.filter(el => el.innerText && el.innerText.trim().length > 0);
}

function findAIResponse(userMessage) {
    let candidate = userMessage.nextElementSibling;
    let attempts = 0;
    while (candidate && attempts < 5) {
        if (candidate.tagName === 'MODEL-RESPONSE' || 
            candidate.classList.contains('model-response') || 
            candidate.getAttribute('data-testid') === 'model-response') {
            return candidate;
        }
        candidate = candidate.nextElementSibling;
        attempts++;
    }
    return null;
}

function extractMessageText(element) {
    return element.innerText?.trim() || element.textContent?.trim() || '';
}

// --- Actions ---

async function copyAIResponse(userMessage) {
    const aiResponse = findAIResponse(userMessage);
    if (!aiResponse) {
        showNotification('AI response not found', 'error');
        return;
    }
    try {
        await navigator.clipboard.writeText(aiResponse.innerText);
        showNotification('Response copied!', 'success');
    } catch (err) {
        showNotification('Failed to copy', 'error');
    }
}

function goToAIResponse(userMessage) {
    const aiResponse = findAIResponse(userMessage);
    const target = aiResponse || userMessage;
    scrollToElement(target);
    highlightElement(target);
}

function scrollToElement(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightElement(element);
}

function highlightElement(element) {
    const originalBg = element.style.backgroundColor;
    element.style.transition = 'background-color 0.5s ease';
    element.style.backgroundColor = 'rgba(16, 163, 127, 0.1)'; /* Greenish tint for highlight */
    setTimeout(() => { element.style.backgroundColor = originalBg; }, 1500);
}

function showNotification(message, type) {
    const div = document.createElement('div');
    div.textContent = message;
    div.style.cssText = `
        position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
        background: #2d3748; color: #fff; padding: 10px 20px;
        border-radius: 6px; font-family: sans-serif; font-size: 14px;
        z-index: 1000002; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2500);
}

// --- Init Loop ---
function initialize() {
    retryCount++;
    if (document.querySelector('user-query') || document.querySelector('[data-testid="user-query"]')) {
        initExtension();
    } else if (retryCount <= maxRetries) {
        setTimeout(initialize, 1000);
    }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
else initialize();

const observer = new MutationObserver(() => {
    if (!document.getElementById('thread-navigator-btn')) initialize();
});
observer.observe(document.body, { childList: true, subtree: true });