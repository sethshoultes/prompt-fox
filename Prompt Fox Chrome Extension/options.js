// options.js
document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings
    chrome.storage.sync.get({
        apiBaseUrl: '',
        username: '',
        applicationPassword: ''
    }, (items) => {
        document.getElementById('apiBaseUrl').value = items.apiBaseUrl;
        document.getElementById('username').value = items.username;
        document.getElementById('applicationPassword').value = items.applicationPassword;
    });

    function showStatus(message, isError = false) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.style.display = 'block';
        status.className = isError ? 'error' : 'success';
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }

    // Save settings
    document.getElementById('save').addEventListener('click', () => {
        const apiBaseUrl = document.getElementById('apiBaseUrl').value.trim();
        const username = document.getElementById('username').value.trim();
        const applicationPassword = document.getElementById('applicationPassword').value;

        if (!apiBaseUrl || !username || !applicationPassword) {
            showStatus('Please fill in all fields', true);
            return;
        }

        // Remove trailing slash if present
        const formattedUrl = apiBaseUrl.replace(/\/$/, '');

        chrome.storage.sync.set({
            apiBaseUrl: formattedUrl,
            username: username,
            applicationPassword: applicationPassword
        }, () => {
            showStatus('Settings saved successfully!');
        });
    });
});