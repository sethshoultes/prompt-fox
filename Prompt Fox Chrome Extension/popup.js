// popup.js
let currentPage = 1;
let searchTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');

            if (button.dataset.tab === 'browse') {
                loadPrompts();
            }
        });
    });

    // Save functionality
    const textInput = document.getElementById('text-input');
    const categorySelect = document.getElementById('category');
    const saveButton = document.getElementById('save-button');
    const confirmation = document.getElementById('confirmation');

    // Get captured text when popup opens
    chrome.runtime.sendMessage({ type: "getCapturedText" }, (response) => {
        if (response && response.text) {
            textInput.value = response.text;
        }
    });

    // Save button handler
    saveButton.addEventListener('click', () => {
        const text = textInput.value.trim();
        const category = categorySelect.value;

        if (!text) {
            alert('Please enter some text to save.');
            return;
        }

        chrome.runtime.sendMessage(
            { type: "saveText", text, category },
            (response) => {
                if (response.status === "success") {
                    showConfirmation("Saved successfully!");
                } else {
                    alert(response.message || "Failed to save text.");
                }
            }
        );
    });

    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                currentPage = 1;
                loadPrompts();
            }, 300);
        });
    }
});

// Added displayPrompts function
function displayPrompts(data) {
    const promptsList = document.getElementById('prompts-list');
    promptsList.innerHTML = '';

    if (!data.data || data.data.length === 0) {
        promptsList.innerHTML = '<div class="no-results">No prompts found</div>';
        return;
    }

    data.data.forEach(prompt => {
        const promptDiv = document.createElement('div');
        promptDiv.className = 'prompt-item';

        const previewBtn = promptDiv.querySelector('.preview-btn');
        const copyBtn = promptDiv.querySelector('.copy-btn');
        const insertBtn = promptDiv.querySelector('.insert-btn');

        if (previewBtn) {
            previewBtn.addEventListener('click', () => previewPrompt(prompt.id));
        }
        if (copyBtn) {
            copyBtn.addEventListener('click', () => copyToClipboard(prompt.id));
        }
        if (insertBtn) {
            insertBtn.addEventListener('click', () => insertAtCursor(prompt.id));
        }

        // Create a preview of the content
        const contentPreview = prompt.content.length > 100 
            ? prompt.content.substring(0, 100) + '...' 
            : prompt.content;

        promptDiv.innerHTML = `
            <div class="prompt-header">
                <span class="prompt-title">${prompt.title}</span>
                <span class="prompt-date">${formatDate(prompt.date)}</span>
            </div>
            <div class="prompt-preview">${contentPreview}</div>
            <div class="prompt-categories">
                ${prompt.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')}
            </div>
            <div class="prompt-actions">
                <button class="action-btn preview-btn" data-prompt-id="${prompt.id}">
                    <span class="btn-icon">👁️</span> Preview
                </button>
                <button class="action-btn copy-btn" data-prompt-id="${prompt.id}">
                    <span class="btn-icon">📋</span> Copy
                </button>
                <button class="action-btn insert-btn" data-prompt-id="${prompt.id}">
                    <span class="btn-icon">➡️</span> Insert
                </button>
            </div>
        `;
        promptsList.appendChild(promptDiv);
    });

    // Add pagination
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    if (data.total_pages > 1) {
        pagination.innerHTML = `
            <div class="pagination">
                ${currentPage > 1 ? `<button onclick="changePage(${currentPage - 1})">Previous</button>` : ''}
                <span>Page ${currentPage} of ${data.total_pages}</span>
                ${currentPage < data.total_pages ? `<button onclick="changePage(${currentPage + 1})">Next</button>` : ''}
            </div>
        `;
    }
}

async function loadPrompts() {
    const searchTerm = document.getElementById('search-input')?.value || '';
    
    try {
        const credentials = await chrome.runtime.sendMessage({ type: "getCredentials" });
        
        if (!credentials?.apiBaseUrl) {
            showError("Please configure the extension settings first.");
            return;
        }

        const apiUrl = `${credentials.apiBaseUrl}/wp-json/custom/v1/strings?page=${currentPage}&search=${encodeURIComponent(searchTerm)}`;
        const authString = `${credentials.username}:${credentials.applicationPassword}`;

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Basic ${btoa(authString)}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        displayPrompts(data);
    } catch (error) {
        showError("Failed to load prompts: " + error.message);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

async function previewPrompt(promptId) {
    const content = await getPromptContent(promptId);
    if (content) {
        showModal('Prompt Preview', content);
    }
}

function showModal(title, content) {

  const copyButton = modalContent.querySelector('button:first-child');
    const closeButton = modalContent.querySelector('button:last-child');

    copyButton.addEventListener('click', () => copyToClipboard(content));
    closeButton.addEventListener('click', () => modalOverlay.remove());
    // Remove any existing modal
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal elements
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3>${title}</h3>
            <button class="close-modal">×</button>
        </div>
        <div class="modal-body">
            <pre>${content}</pre>
        </div>
        <div class="modal-footer">
            <button onclick="copyToClipboard('${content}')">Copy</button>
            <button onclick="document.querySelector('.modal-overlay').remove()">Close</button>
        </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Close modal when clicking the close button or outside the modal
    modalOverlay.querySelector('.close-modal').addEventListener('click', () => {
        modalOverlay.remove();
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    });
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showConfirmation("Copied to clipboard!");
    } catch (err) {
        showError("Failed to copy to clipboard");
    }
}

async function insertAtCursor(promptId) {
    const content = await getPromptContent(promptId);
    if (content) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: insertText,
                args: [content]
            });
        });
    }
}

function insertText(text) {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
        const start = activeElement.selectionStart;
        const end = activeElement.selectionEnd;
        const value = activeElement.value;
        activeElement.value = value.substring(0, start) + text + value.substring(end);
        activeElement.setSelectionRange(start + text.length, start + text.length);
    } else if (activeElement.contentEditable === 'true') {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const textNode = document.createTextNode(text);
        range.deleteContents();
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

async function getPromptContent(promptId) {
    try {
        const credentials = await chrome.runtime.sendMessage({ type: "getCredentials" });
        if (!credentials?.apiBaseUrl) {
            throw new Error("Extension not configured");
        }

        const apiUrl = `${credentials.apiBaseUrl}/wp-json/custom/v1/strings/${promptId}`;
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Basic ${btoa(credentials.username + ':' + credentials.applicationPassword)}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data.content;
    } catch (error) {
        showError("Failed to load prompt content: " + error.message);
        return null;
    }
}

function changePage(page) {
    currentPage = page;
    loadPrompts();
}

function showConfirmation(message) {
    const confirmation = document.getElementById('confirmation');
    if (confirmation) {
        confirmation.textContent = message;
        confirmation.style.display = 'block';
        setTimeout(() => {
            confirmation.style.display = 'none';
        }, 2000);
    }
}

function showError(message) {
    alert(message);
}