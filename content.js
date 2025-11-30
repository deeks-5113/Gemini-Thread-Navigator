// Wait for page to fully load and check multiple times
let retryCount = 0;
const maxRetries = 15;

function initExtension() {
    // Basic check to ensure we are on Gemini
    if (!window.location.hostname.includes('gemini.google.com')) {
        return;
    }

    console.log('Gemini Thread Navigator: Initializing...');

    // Check if button already exists
    if (document.getElementById('thread-navigator-btn')) {
        return;
    }

    // Create the floating button
    createFloatingButton();
}

function createFloatingButton() {
    const floatingButton = document.createElement('div');
    floatingButton.id = 'thread-navigator-btn';
    floatingButton.innerHTML = '📋';
    floatingButton.title = 'Show Gemini thread prompts';

    // Gemini Brand Colors (Blue Gradient)
    const geminiColor = 'linear-gradient(135deg, #4285f4, #1565c0)';

    floatingButton.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        right: 20px !important;
        width: 50px !important;
        height: 50px !important;
        background: ${geminiColor} !important;
        color: white !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 20px !important;
        cursor: pointer !important;
        z-index: 999999 !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        transition: all 0.3s ease !important;
        user-select: none !important;
        border: none !important;
        font-family: system-ui !important;
    `;

    floatingButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        showPromptsList();
    });

    floatingButton.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
    });

    floatingButton.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });

    document.body.appendChild(floatingButton);
    console.log('Gemini Thread Navigator: Button added');
}

function showPromptsList() {
    const existingModal = document.getElementById('thread-prompts-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Find messages using Gemini-specific selectors
    const userMessages = findUserMessages();
    console.log(`Gemini Thread Navigator: Found ${userMessages.length} user messages`);

    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'thread-prompts-modal';
    
    // Create modal content container
    const modalContent = document.createElement('div');
    // Styles are handled in CSS file, but we set inline for structure
    modalContent.className = 'modal-card';

    let promptsHTML = `
        <div class="prompts-header">
            <h3>Gemini Thread Navigator</h3>
            <button id="close-prompts-list">×</button>
        </div>
        <div class="prompts-content">
            <div id="prompts-container">
    `;

    if (userMessages.length === 0) {
        promptsHTML += '<div class="no-prompts">No prompts found. Scroll up to load history?</div>';
    } else {
        userMessages.forEach((message, index) => {
            const text = extractMessageText(message);
            const truncatedText = text.length > 100 ? text.substring(0, 100) + '...' : text;
            
            promptsHTML += `
                <div class="prompt-item" data-index="${index}">
                    <div class="prompt-number">${index + 1}</div>
                    <div class="prompt-text" title="${text}">${truncatedText}</div>
                    <div class="prompt-actions">
                        <button class="copy-response-btn" data-index="${index}" title="Copy AI Response">
                            📋
                        </button>
                        <button class="goto-response-btn" data-index="${index}" title="Go to AI Response">
                            🔗
                        </button>
                    </div>
                </div>
            `;
        });
    }

    promptsHTML += `
            </div>
        </div>
    `;

    modalContent.innerHTML = promptsHTML;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    setupModalEventListeners(modal, userMessages);
}

function setupModalEventListeners(modal, userMessages) {
    const closeBtn = modal.querySelector('#close-prompts-list');
    closeBtn?.addEventListener('click', () => modal.remove());

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    const promptItems = modal.querySelectorAll('.prompt-item');
    promptItems.forEach((item, index) => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.prompt-actions')) return;
            // Scroll to the USER message
            scrollToElement(userMessages[index]);
            modal.remove();
        });
    });

    const copyBtns = modal.querySelectorAll('.copy-response-btn');
    copyBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            copyAIResponse(userMessages[index]);
        });
    });

    const gotoBtns = modal.querySelectorAll('.goto-response-btn');
    gotoBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            goToAIResponse(userMessages[index]);
            modal.remove();
        });
    });
}

/**
 * GEMINI SPECIFIC SELECTORS
 * Gemini uses Angular, so selectors can be tricky. We look for:
 * 1. <user-query> tags (common in their web components)
 * 2. Elements with data-testid="user-query"
 * 3. Specific class structures
 */
function findUserMessages() {
    // Strategy 1: Look for the specific 'user-query' tag often used in Gemini
    let messages = Array.from(document.querySelectorAll('user-query'));
    
    // Strategy 2: Look for class-based or attribute-based indicators if tags aren't found
    if (messages.length === 0) {
        messages = Array.from(document.querySelectorAll('[data-testid="user-query"], .user-query, .query-container'));
    }

    // Filter out empty or invisible ones
    return messages.filter(el => el.innerText && el.innerText.trim().length > 0);
}

function findAIResponse(userMessage) {
    // The AI response is usually the next sibling or inside a container following the user query
    // In Gemini, it's often a <model-response> tag or class .model-response
    
    let candidate = userMessage.nextElementSibling;
    
    // Search siblings forward
    let attempts = 0;
    while (candidate && attempts < 5) {
        if (candidate.tagName === 'MODEL-RESPONSE' || 
            candidate.classList.contains('model-response') || 
            candidate.querySelector('model-response') ||
            candidate.getAttribute('data-testid') === 'model-response') {
            return candidate;
        }
        candidate = candidate.nextElementSibling;
        attempts++;
    }
    
    // Fallback: Try to find by index if structured in a list
    // (This is harder without exact DOM knowledge, but the sibling search is usually robust for chat interfaces)
    return null;
}

function extractMessageText(element) {
    if (!element) return '';
    // Gemini often wraps text in a .text-content or similar, or just raw text in the custom element
    return element.innerText?.trim() || element.textContent?.trim() || '';
}

async function copyAIResponse(userMessage) {
    const aiResponse = findAIResponse(userMessage);
    if (!aiResponse) {
        showNotification('❌ AI response not found (it might be generating)', 'error');
        return;
    }

    // Extract text from the AI response container
    // We might need to dig deeper to avoid copying "Show drafts" buttons etc.
    const text = aiResponse.innerText || aiResponse.textContent;
    
    try {
        await navigator.clipboard.writeText(text);
        showNotification('✅ Gemini response copied!', 'success');
    } catch (err) {
        showNotification('❌ Failed to copy', 'error');
    }
}

function goToAIResponse(userMessage) {
    const aiResponse = findAIResponse(userMessage);
    if (!aiResponse) {
        showNotification('❌ AI response not found', 'error');
        return;
    }
    scrollToElement(aiResponse);
    highlightElement(aiResponse);
}

// UI Utilities
function scrollToElement(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightElement(element);
}

function highlightElement(element) {
    const originalTransition = element.style.transition;
    const originalBg = element.style.backgroundColor;
    
    element.style.transition = 'background-color 0.5s ease';
    element.style.backgroundColor = 'rgba(66, 133, 244, 0.2)'; // Light blue highlight
    
    setTimeout(() => {
        element.style.backgroundColor = originalBg;
        setTimeout(() => {
            element.style.transition = originalTransition;
        }, 500);
    }, 1500);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `thread-navigator-notification ${type}`;
    notification.textContent = message;
    
    // Notification styles are in CSS, but ensuring critical positioning here
    notification.style.cssText = `
        position: fixed; 
        top: 20px; 
        right: 20px; 
        z-index: 1000002;
        background: ${type === 'success' ? '#10a37f' : '#333'};
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        font-family: sans-serif;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Initialization Loop
function initialize() {
    retryCount++;
    if (document.querySelector('user-query') || document.querySelector('[data-testid="user-query"]')) {
        initExtension();
    } else if (retryCount <= maxRetries) {
        setTimeout(initialize, 1000);
    }
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Observe for page changes (SPA navigation)
const observer = new MutationObserver(() => {
    if (!document.getElementById('thread-navigator-btn')) {
        initialize();
    }
});
observer.observe(document.body, { childList: true, subtree: true });