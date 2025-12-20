# WordSmith Extension

A Chrome extension that helps you rephrase sentences using AI-powered APIs. Transform your text into different styles with just one click.

## Features

- **Smart Text Selection**: Select text in any input field or textarea to trigger a balloon popup with tone options.
- **Multiple Rephrase Modes**: Choose from 8 different writing styles:

  - Formal: Professional, business tone
  - Casual: Relaxed, conversational style
  - Friendly: Warm and welcoming
  - Concise: Short and to the point
  - Funny: Playful and humorous
  - Persuasive: Convincing and motivational
  - Simplified: Easy to understand
  - Academic: Objective and analytical

- **Platform Compatibility**: Tailored support for platforms like Discord, WhatsApp Web, LinkedIn, and Slack.
- **Multiple API Providers**: Supports various AI services:

  - Z.AI (default)
  - OpenAI
  - Claude (Anthropic)
  - Gemini (Google)
  - DeepSeek
  - OpenRouter
  - RouteWay

- **Easy to Use**: Seamless integration into your browsing experience with direct text replacement or clipboard fallback.

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The WordSmith icon will appear in your Chrome toolbar

## Usage

### Method 1: Popup Balloon (Recommended)

1. Go to any website and type or find text in an input field, textarea, or chat box.
2. Select the text you want to rephrase.
3. A balloon popup will appear near your selection.
4. Select your desired tone.
5. Click "Smithen" to get the result.
6. Click "Accept" to replace the text directly (or copy to clipboard on platforms like Discord).

### Method 2: Extension Toolbar

1. Click the WordSmith icon in your Chrome toolbar
2. Enter the text you want to rephrase
3. Select your desired rephrase mode
4. Click "Smithen" to get the result
5. Copy the result with the "Copy Result" button

## Settings

### Default API

The extension comes with a built-in Z.AI API key for immediate use.

### Custom API Configuration

To use your own API:

1. Click the settings icon (⚙️) in the extension
2. Uncheck "Use Default API"
3. Select your preferred API provider
4. Enter your model name and API key
5. Click "Save Settings"

### API Provider Details

| Provider   | Model Examples                  | API Key Format |
| ---------- | ------------------------------- | -------------- |
| OpenAI     | gpt-3.5-turbo, gpt-4            | sk-...         |
| Claude     | claude-3-sonnet, claude-3-haiku | sk-ant-...     |
| Gemini     | gemini-pro, gemini-1.5-flash    | AIza...        |
| DeepSeek   | deepseek-chat, deepseek-coder   | sk-...         |
| OpenRouter | Various models                  | sk-or-v1-...   |
| RouteWay   | Various models                  | sk-...         |
| Z.AI       | glm-4.5-flash                   | Custom format  |

## File Structure

```
wordsmith/
├── manifest.json          # Extension configuration
├── background.js           # Service worker for API calls
├── content.js             # Script for text selection and balloon popup
├── content.css            # Styling for the balloon popup
├── popup.html             # Extension popup interface
├── popup.css              # Styling for the popup
├── popup.js               # Popup logic and user interactions
├── icons/                 # Extension icons
└── README.md              # This file
```

## Permissions

The extension requires:

- `activeTab`: To interact with the current tab
- `storage`: To save user settings and API keys
- API host permissions for various AI services

## Development

To modify or extend the extension:

1. **Background Script** (`background.js`): Handles API calls and provider logic
2. **Popup Interface** (`popup.html`, `popup.css`, `popup.js`): User interface and interactions
3. **Manifest** (`manifest.json`): Extension configuration and permissions

### Adding New API Providers

1. Add the provider to the switch statement in `background.js`
2. Update the `manifest.json` with the new API domain
3. Add the provider option to the settings dropdown in `popup.html`

## Security Notes

- API keys are stored locally in Chrome storage
- Default API key is provided for convenience
- Custom API keys are never transmitted to third parties
- Always keep your API keys secure and never share them

## Troubleshooting

1. **Extension not loading**: Check that all files are present and manifest.json is valid
2. **API errors**: Verify your API key and model name are correct
3. **No response**: Check your internet connection and API service status

## License

This project is open source. Feel free to contribute or modify for your own use.

## Support

For issues or feature requests, please check the project repository or create an issue.
