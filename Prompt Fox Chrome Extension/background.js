// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension Installed");
  chrome.storage.sync.get({
    apiBaseUrl: '',
    username: '',
    applicationPassword: ''
  }, (items) => {
    if (!items.apiBaseUrl) {
      chrome.runtime.openOptionsPage();
    }
  });
});

let capturedText = "";

async function getStoredCredentials() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      apiBaseUrl: '',
      username: '',
      applicationPassword: ''
    }, (items) => {
      resolve({
        apiBaseUrl: items.apiBaseUrl?.trim().replace(/\/$/, ''), // Remove trailing slash
        username: items.username?.trim(),
        applicationPassword: items.applicationPassword // Keep application password as is
      });
    });
  });
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function saveTextToWordPress(text, category) {
  try {
    const credentials = await getStoredCredentials();
    console.log('Credentials check:', {
      hasUrl: Boolean(credentials.apiBaseUrl),
      hasUsername: Boolean(credentials.username),
      hasPassword: Boolean(credentials.applicationPassword),
      urlLength: credentials.apiBaseUrl?.length
    });
    
    if (!credentials.apiBaseUrl || !credentials.username || !credentials.applicationPassword) {
      return { 
        status: "error", 
        message: "Please configure the extension settings first (click extension icon and select Options)" 
      };
    }

    if (!isValidUrl(credentials.apiBaseUrl)) {
      return { 
        status: "error", 
        message: "Invalid API URL in settings. Please check the Options page." 
      };
    }

    const apiEndpoint = `${credentials.apiBaseUrl}/wp-json/custom/v1/strings`;
    
    // Create authorization header with exact password
    const authString = `${credentials.username}:${credentials.applicationPassword}`;
    const base64Auth = btoa(authString);
    
    console.log('Auth details:', {
      endpoint: apiEndpoint,
      username: credentials.username,
      passwordLength: credentials.applicationPassword?.length,
      authStringLength: authString.length
    });

    // Make the actual POST request
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64Auth}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text_string: text,
        category: category || ''
      })
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        console.error('Error data:', errorData);
        errorMessage = errorData.message || JSON.stringify(errorData);
      } catch (e) {
        errorMessage = await response.text();
      }
      
      return { 
        status: "error", 
        message: `Failed to save text: ${errorMessage}`
      };
    }

    const data = await response.json();
    console.log('Success response:', data);
    return { status: "success", message: "Text saved successfully!" };
    
  } catch (error) {
    console.error('Error in saveTextToWordPress:', error);
    return { 
      status: "error", 
      message: `Network or server error occurred: ${error.message}` 
    };
  }
}

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "saveText") {
    saveTextToWordPress(message.text, message.category)
      .then(sendResponse);
    return true;
  } else if (message.type === "captureText") {
    capturedText = message.text;
    sendResponse({ status: "success", message: "Text captured." });
  } else if (message.type === "getCapturedText") {
    sendResponse({ text: capturedText });
  }
  return true;
});

// Inject content script when needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"]
    }).catch(console.error);
  }
});