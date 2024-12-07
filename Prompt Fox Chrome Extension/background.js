// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension Installed");
  // Check for settings on installation
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
* Gets stored credentials from Chrome storage
* @returns {Promise<{apiBaseUrl: string, username: string, applicationPassword: string}>}
*/
async function getStoredCredentials() {
  return new Promise((resolve) => {
      chrome.storage.sync.get({
          apiBaseUrl: '',
          username: '',
          applicationPassword: ''
      }, (items) => resolve(items));
  });
}

/**
* Saves text to WordPress under a specified category.
* @param {string} text - The text to be saved.
* @param {string} category - The category under which the text will be saved.
* @returns {Promise<Object>} - A promise that resolves to an object containing the status and message.
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

      const apiEndpoint = `${credentials.apiBaseUrl}/wp-json/custom/v1/strings`;
      const authString = `${credentials.username}:${credentials.applicationPassword}`;
      
      console.log("Sending request:", {
          url: apiEndpoint,
          text: text.substring(0, 50) + "...",
          username: credentials.username
      });

      const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "Authorization": `Basic ${btoa(authString)}`
          },
          body: JSON.stringify({
              text_string: text,
              category: category || ''
          })
      });

      console.log("Response status:", response.status);

      const responseText = await response.text();
      console.log("Response text:", responseText);

      if (!response.ok) {
          return {
              status: "error",
              message: `Failed to save text: ${responseText}`
          };
      }

      return {
          status: "success",
          message: "Text saved successfully!"
      };
  } catch (error) {
      console.error("Error:", error);
      return {
          status: "error",
          message: `Network error: ${error.message}`
      };
  }
}

// Inject content script when tab is activated
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
      await chrome.scripting.executeScript({
          target: { tabId: activeInfo.tabId },
          files: ['content.js']
      });
  } catch (error) {
      console.log('Script injection failed:', error);
  }
});

// Inject content script when tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
      chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["content.js"]
      }).catch(error => console.log('Script injection failed:', error));
  }
});

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "saveText") {
      saveTextToWordPress(message.text, message.category)
          .then(sendResponse);
      return true;
  } else if (message.type === "captureText") {
      capturedText = message.text;
      console.log("Captured text:", capturedText.substring(0, 50) + "...");
      sendResponse({ status: "success", message: "Text captured." });
      
      // Notify popup if it's open
      chrome.runtime.sendMessage({
          type: "textCaptured",
          text: capturedText
      }).catch(() => {
          // Ignore errors if popup is not open
      });
  } else if (message.type === "getCapturedText") {
      sendResponse({ text: capturedText });
  }
  return true;
});