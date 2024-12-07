// popup.js
document.addEventListener('DOMContentLoaded', () => {
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

  // Listen for text capture events while popup is open
  chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "textCaptured" && message.text) {
          textInput.value = message.text;
      }
  });

  // Handle save button click
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
                  confirmation.style.display = "block";
                  confirmation.textContent = "Saved successfully!";
                  setTimeout(() => {
                      confirmation.style.display = "none";
                  }, 2000);
              } else {
                  alert(response.message || "Failed to save text.");
              }
          }
      );
  });
});