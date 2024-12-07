// Log to confirm that content.js is running
console.log("content.js is active");

// Listen for text selection on the page
document.addEventListener("mouseup", () => {
    console.log("Mouse up event triggered"); // Debug log
  const selectedText = window.getSelection().toString().trim();
  
  if (selectedText) {
    console.log("Selected text:", selectedText); // Debug log for selected text
    
    // Send the captured text to the background script
    chrome.runtime.sendMessage({ type: "captureText", text: selectedText }, (response) => {
      if (response && response.status === "success") {
        console.log("Text successfully sent to background script");
      } else {
        console.error("Failed to send text to background script");
      }
    });
  }
});
