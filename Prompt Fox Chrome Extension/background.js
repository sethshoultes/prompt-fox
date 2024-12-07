chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension Installed");
  });
  
  const API_BASE_URL = "http://localhost:10023/wp-json/custom/v1/strings";
  const USERNAME = "seth"; // WordPress user with API access
  const APPLICATION_PASSWORD = "BkZM sxKN 5ez2 UvuK Q7Yl NwBD"; // Generated Application Password
  
  let capturedText = ""; // Temporary storage for the captured text
  
  /**
   * Saves text to WordPress under a specified category.
   * 
   * @param {string} text - The text to be saved.
   * @param {string} category - The category under which the text will be saved.
   * @returns {Promise<Object>} - A promise that resolves to an object containing the status and message.
   */
  async function saveTextToWordPress(text, category) {
    console.log("Sending text to WordPress API:", { text, category });
    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${USERNAME}:${APPLICATION_PASSWORD}`)}`
        },
        body: JSON.stringify({
          text_string: text,
          category: category,
          username: USERNAME,
          password: APPLICATION_PASSWORD
        })
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error from API:", errorText);
        return { status: "error", message: `HTTP ${response.status}: ${errorText}` };
      }
  
      const data = await response.json();
      console.log("Text saved successfully:", data);
      return { status: "success", message: "Text saved successfully!" };
    } catch (error) {
      console.error("Error:", error);
      return { status: "error", message: "Network or server error occurred." };
    }
  }
  
  // Listener for handling save requests
  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === "saveText") {
      const { text, category } = message;
      const result = await saveTextToWordPress(text, category);
      sendResponse(result);
    } else if (message.type === "captureText") {
      capturedText = message.text; // Store the captured text
      console.log("Captured Text:", capturedText);
      sendResponse({ status: "success", message: "Text captured." });
    } else if (message.type === "getCapturedText") {
      sendResponse({ text: capturedText }); // Provide captured text to popup
    }
    return true; // Keep the messaging channel open for async responses
  });
  chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url.includes("https://chatgpt.com/")) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"],
      });
      console.log("content.js injected into:", tab.url);
    }
  });