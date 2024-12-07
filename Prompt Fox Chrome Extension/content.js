// content.js
console.log("Prompt Fox content script loaded");

// Listen for text selection
document.addEventListener("mouseup", () => {
    const selectedText = window.getSelection().toString().trim();
    
    if (selectedText) {
        console.log("Text selected:", selectedText.substring(0, 50) + "...");
        
        // Send selected text to background script
        chrome.runtime.sendMessage({ 
            type: "captureText", 
            text: selectedText 
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending text:", chrome.runtime.lastError);
                return;
            }
            console.log("Text capture response:", response);
        });
    }
});