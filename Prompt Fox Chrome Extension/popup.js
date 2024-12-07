document.addEventListener("DOMContentLoaded", () => {
    const saveButton = document.getElementById("save-button");
    const textInput = document.getElementById("text-input");
    const categorySelect = document.getElementById("category");
    const confirmation = document.getElementById("confirmation");
  
    // Prefill the text area with the captured text when the popup is opened
    chrome.runtime.sendMessage({ type: "getCapturedText" }, (response) => {
      if (response && response.text) {
        textInput.value = response.text; // Populate the textarea with captured text
      } else {
        console.log("No captured text available.");
      }
    });
  
    // Listener for the save button
    saveButton.addEventListener("click", () => {
      const text = textInput.value.trim();
      const category = categorySelect.value;
  
      if (!text) {
        alert("Please enter some text to save.");
        return;
      }
  
      // Send the text and category to background.js for saving to WordPress
      chrome.runtime.sendMessage(
        { type: "saveText", text: text, category: category },
        (response) => {
          if (response && response.status === "success") {
            confirmation.style.display = "block"; // Show confirmation message
            setTimeout(() => {
              confirmation.style.display = "none";
            }, 2000);
          } else {
            alert("Failed to save text: " + (response?.message || "Unknown error."));
          }
        }
      );
    });
  
    // Listener for receiving captured text (if background.js sends it directly)
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "captureText") {
        textInput.value = message.text; // Update the text area with the captured text
      }
    });
  });
  