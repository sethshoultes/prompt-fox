# Prompt Fox 🦊

A powerful prompt management system combining a WordPress plugin and Chrome extension for AI prompt capture, organization, and automation.

## Overview

Prompt Fox is a two-part system designed to streamline AI prompt management and automation. It comprises a WordPress plugin for secure storage and a Chrome extension for easy capture and reuse.

### Key Features

- 📝 One-click prompt capture from any webpage
- 🔍 Advanced search and organization
- 🔄 Direct prompt insertion into any text field
- 🔒 Secure WordPress integration
- 🤖 Zapier automation support
- 📊 Categories and tagging system

## Installation

### WordPress Plugin

1. Download the plugin from WordPress.org
2. Install and activate in your WordPress admin
3. Configure plugin settings
4. Generate an application password for the Chrome extension

```bash
# Optional: Install via WP-CLI
wp plugin install prompt-fox --activate
```

### Chrome Extension

1. Install from the Chrome Web Store
2. Click the extension icon and select "Options"
3. Enter your WordPress site details:
   - Site URL
   - Username
   - Application password

## Usage

### Capturing Prompts

1. Select text on any webpage
2. Click the Prompt Fox icon
3. Choose a category (optional)
4. Click "Save"

### Managing Prompts

Access your prompts through:
- WordPress admin interface
- Chrome extension popup
- REST API endpoints

### API Endpoints

```javascript
// Save a prompt
POST /wp-json/custom/v1/strings
{
  "text_string": "Your prompt text",
  "category": "Category name"
}

// Get prompts
GET /wp-json/custom/v1/strings?page=1&search=keyword

// Get single prompt
GET /wp-json/custom/v1/strings/{id}
```

## Automation

### Zapier Integration

Connect your prompt library to various automation workflows:

```mermaid
graph LR
    A[Save Prompt] --> B[Generate Content]
    B --> C[Create Tasks]
    C --> D[Schedule Posts]
    D --> E[Track Results]
```

### Example Workflows

- Blog post-production pipeline
- Marketing campaign automation
- Research paper compilation
- Social media content scheduling

## Development

### Prerequisites

- WordPress 5.8+
- PHP 7.4+
- Node.js 14+

### Local Setup

```bash
# Clone repository
git clone https://github.com/promptfox/prompt-fox.git

# Install dependencies
cd prompt-fox
npm install

# Build extension
npm run build

# Install WordPress plugin
cp -r plugin/* path/to/wordpress/wp-content/plugins/prompt-fox
```

### Building

```bash
# Build extension
npm run build

# Watch for changes
npm run watch

# Build for production
npm run production
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the GPL v2 or later - see the [LICENSE](LICENSE) file for details.

## Credits

- WordPress Plugin Boilerplate
- Chrome Extension Manifest V3
- React for popup UI
- Tailwind CSS for styling

## Support

- [Documentation](https://docs.promptfox.dev)
- [Issues](https://github.com/promptfox/prompt-fox/issues)
- [Discussions](https://github.com/promptfox/prompt-fox/discussions)

## Roadmap

- [ ] Multiple WordPress site support
- [ ] Team collaboration features
- [ ] Advanced automation templates
- [ ] AI integration improvements
- [ ] Analytics dashboard

## Screenshots

![Prompt Fox Selection Feature](https://github.com/user-attachments/assets/e580155a-0b2f-4d5f-a4d8-05aee6fe7672)

![Prompt Fox ! 0](https://github.com/user-attachments/assets/c072ebc2-5a80-4a5d-81c0-101629fd4778)

---

<p align="center">
Made with ❤️ by the Prompt Fox team
</p>
