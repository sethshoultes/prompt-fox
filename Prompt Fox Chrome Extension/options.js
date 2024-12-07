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
    status.className = isError ? 'error' : 'success';
    setTimeout(() => {
      status.textContent = '';
      status.className = '';
    }, 3000);
  }

  function validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Save settings
  document.getElementById('save').addEventListener('click', () => {
    const apiBaseUrl = document.getElementById('apiBaseUrl').value.trim();
    const username = document.getElementById('username').value.trim();
    const applicationPassword = document.getElementById('applicationPassword').value.trim();

    if (!apiBaseUrl || !username || !applicationPassword) {
      showStatus('Please fill in all fields', true);
      return;
    }

    if (!validateUrl(apiBaseUrl)) {
      showStatus('Please enter a valid URL', true);
      return;
    }

    // Remove trailing slash if present
    const formattedUrl = apiBaseUrl.replace(/\/$/, '');

    chrome.storage.sync.set({
      apiBaseUrl: formattedUrl,
      username: username,
      applicationPassword: applicationPassword
    }, () => {
      showStatus('Settings saved successfully');
    });
  });
});