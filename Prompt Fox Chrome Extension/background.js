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

/**
 * Gets the stored credentials and API URL
 * @returns {Promise<{apiBaseUrl: string, username: string, applicationPassword: string}>}
 */
async function getStoredCredentials() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      apiBaseUrl: '',
      username: '',
      applicationPassword: ''
    }, (items) => {
      resolve(items);
    });
  });
}

/**
 * Validates URL format
 * @param {string} url
 * @returns {boolean}
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves text to WordPress under a specified category
 * @param {string} text - The text to be saved
 * @param {string} category - The category under which the text will be saved
 * @returns {Promise<Object>} - Status and message
 */
async function saveTextToWordPress(text, category) {
  try {
    const credentials = await getStoredCredentials();
    
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
    
    // Create the authentication header
    const auth = btoa(credentials.username + ':' + credentials.applicationPassword.trim());
    console.log('Making request to:', apiEndpoint);

    // First, make a test OPTIONS request
    const optionsResponse = await fetch(apiEndpoint, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });
    
    console.log('OPTIONS response:', optionsResponse.status);

    // Now make the actual POST request
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text_string: text,
        category: category
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