# prompt-fox
A Google Chrome browser extension to capture selected text (like ChatGPT prompts) and save it to a WordPress site via a custom API.

### Extension Components:
- background.js: Manages communication with the WordPress API and injects content scripts.
- content.js: Captures selected text on the page and sends it to background.js.
- popup.html and popup.js: Provide a UI for saving the captured text to WordPress.
### WordPress API: 
- Custom API is working to save text strings into WordPress.
