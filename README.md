# Chrome Extension: Quote Card Generator

Generate beautiful quote cards from any page.

## Installation

1. Clone this repository or download the source code as a ZIP file.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer Mode** using the toggle at the top-right corner.
4. Click **Load unpacked** and select the folder containing the extension's source code.
5. The extension will appear in your browser's toolbar.

## Unsplash Setup

1. Sign Up: If you don't already have an account, sign up on the Unsplash website.
2. Create a Developer Account: Go to the [Unsplash Developers page](https://unsplash.com/developers) and create a developer account.
3. Create an Application: Once your developer account is set up, create a new application. This will provide you with an Access Key and a Secret Key, which are necessary for making API requests.
4. Copy the Access Key to the `popup.js` file

## Technical Details

- **Technologies Used**:
  - JavaScript (Vanilla JS for content extraction and card generation)
  - Canvas API (for card rendering and exporting)
  - Unsplash API (for images)
- **Extension Components**:
  - `manifest.json`: Defines the extension's metadata and permissions.
  - `popup.html`: Provides the user interface for the extension.

## Permissions

The extension requires the following permissions:

- `activeTab`: To access the content of the current tab.
- `storage`: To save user settings (if implemented).
- `https://api.adviceslip.com/`: To fetch random quotes.
