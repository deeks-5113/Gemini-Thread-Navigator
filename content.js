// Wait for page to fully load
let retryCount = 0;
const maxRetries = 15;

function initExtension() {
    if (!window.location.hostname.includes('gemini.google.com')) return;

    console.log('Gemini Thread Navigator: Initializing...');

    if (document.getElementById('thread-navigator-btn')) return;

    createFloatingButton();
}

function createFloatingButton() {
    const floatingButton = document.createElement('div');
    floatingButton.id = 'thread-navigator-btn';
    // Using a simple unicode icon, but styles.css applies the gradient text effect
    floatingButton.title = 'Show Thread Navigator';

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
    
    // Structure: Header (Title + Search) -> Content (List)
    const modalHTML = `
        <div class="modal-card">
            <div class="prompts-header">
                <div class="header-top">
                    <h3>Thread Navigator</h3>
                    <button id="close-prompts-list" title="Close">✕</button>
                </div>
                <div class="search-container">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="thread-navigator-search" placeholder="Search your prompts..." autocomplete="off">
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

    // Focus search bar immediately for convenience
    setTimeout(() => document.getElementById('thread-navigator-search').focus(), 100);

    setupEventListeners(modal, userMessages);
}

function generatePromptsListHTML(userMessages) {
    if (userMessages.length === 0) {
        return '<div class="no-prompts">No prompts found in this thread.</div>';
    }

    return userMessages.map((message, index) => {
        const text = extractMessageText(message);
        // We store the full text in a data attribute for easy searching
        const safeText = text.replace(/"/g, '&quot;'); 
        
        return `
            <div class="prompt-item" data-index="${index}" data-full-text="${safeText.toLowerCase()}">
                <div class="prompt-number">${index + 1}</div>
                <div class="prompt-text">${text}</div>
                <div class="prompt-actions">
                    <button class="action-btn copy-btn" data-index="${index}">
                        <span>📋</span> Copy
                    </button>
                    <button class="action-btn goto-btn" data-index="${index}">
                        <span>🔗</span> Jump
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function setupEventListeners(modal, userMessages) {
    // 1. Close Actions
    const closeBtn = modal.querySelector('#close-prompts-list');
    closeBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // 2. Search Functionality
    const searchInput = modal.querySelector('#thread-navigator-search');
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const items = modal.querySelectorAll('.prompt-item');
        
        items.forEach(item => {
            const text = item.getAttribute('data-full-text');
            // Toggle visibility based on search term
            if (text.includes(term)) {
                item.style.display = 'grid';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // 3. Item Interaction (Delegation)
    const container = modal.querySelector('#prompts-container');
    container.addEventListener('click', (e) => {
        const item = e.target.closest('.prompt-item');
        if (!item) return;

        const index = parseInt(item.dataset.index);

        // Check if a specific button was clicked
        if (e.target.closest('.copy-btn')) {
            copyAIResponse(userMessages[index]);
        } else if (e.target.closest('.goto-btn')) {
            goToAIResponse(userMessages[index]);
            modal.remove();
        } else {
            // Default: Click anywhere on the row jumps to user message
            scrollToElement(userMessages[index]);
            modal.remove();
        }
    });
}

// --- Platform Specific Selectors (Same as before) ---

function findUserMessages() {
    // Try primary selector (web components) then fallbacks
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
    if (!element) return '';
    return element.innerText?.trim() || element.textContent?.trim() || '';
}

// --- Actions ---

async function copyAIResponse(userMessage) {
    const aiResponse = findAIResponse(userMessage);
    if (!aiResponse) {
        showNotification('Response not found (still generating?)', 'error');
        return;
    }
    const text = aiResponse.innerText || aiResponse.textContent;
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copied to clipboard', 'success');
    } catch (err) {
        showNotification('Failed to copy', 'error');
    }
}

function goToAIResponse(userMessage) {
    const aiResponse = findAIResponse(userMessage);
    if (!aiResponse) {
        scrollToElement(userMessage); // Fallback to user message
        return;
    }
    scrollToElement(aiResponse);
    highlightElement(aiResponse);
}

// --- UI Helpers ---

function scrollToElement(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Offset for sticky headers if necessary, though block:'center' usually safer
    highlightElement(element);
}

function highlightElement(element) {
    const originalTransition = element.style.transition;
    const originalBg = element.style.backgroundColor;
    
    element.style.transition = 'background-color 0.5s ease';
    element.style.backgroundColor = 'rgba(26, 115, 232, 0.15)';
    
    setTimeout(() => {
        element.style.backgroundColor = originalBg;
        setTimeout(() => {
            element.style.transition = originalTransition;
        }, 500);
    }, 1500);
}

function showNotification(message, type) {
    const div = document.createElement('div');
    div.textContent = message;
    div.style.cssText = `
        position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
        background: #323232; color: #fff; padding: 12px 24px;
        border-radius: 50px; font-family: 'Google Sans', sans-serif; font-size: 14px;
        z-index: 1000002; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: fadeInDown 0.3s ease-out;
    `;
    // Add simple animation styles dynamically or assume standard
    const style = document.createElement('style');
    style.innerHTML = `@keyframes fadeInDown { from { opacity:0; transform:translate(-50%, -20px); } to { opacity:1; transform:translate(-50%, 0); } }`;
    document.head.appendChild(style);
    
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

// --- Init Loop ---
function initialize() {
    retryCount++;
    // Check if Gemini UI is loaded
    if (document.querySelector('user-query') || document.querySelector('[data-testid="user-query"]')) {
        initExtension();
    } else if (retryCount <= maxRetries) {
        setTimeout(initialize, 1000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Watch for SPA page changes
const observer = new MutationObserver(() => {
    if (!document.getElementById('thread-navigator-btn')) initialize();
});
observer.observe(document.body, { childList: true, subtree: true });