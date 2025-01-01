# Chrome Extension: News Card Generator

## Overview

The **News Card Generator** Chrome Extension allows users to effortlessly create visually appealing news cards from any news web page. By extracting the headline, main content, and featured image, the extension utilizes AI to summarize and generate a shareable news card. The card can be downloaded in high-quality PNG format, making it perfect for social media or personal archives.

## Demo
[DEMO](./extension_working_demo.mp4)

## Features

- **Headline and Content Extraction**: Automatically extracts the title, main content, and featured image of any news page.
- **AI-Powered Summarization**: Leverages OpenAI to generate concise and impactful summaries.
- **Customizable News Cards**: Generates 1080x1080 pixel cards with modern design and clean formatting.
- **One-Click Download**: Allows users to save the generated card as a PNG file.

## Installation

1. Clone this repository or download the source code as a ZIP file.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer Mode** using the toggle at the top-right corner.
4. Click **Load unpacked** and select the folder containing the extension's source code.
5. The extension will appear in your browser's toolbar.

## Usage

1. Navigate to any news article in your browser.
2. Click on the **News Card Generator** icon in the extensions toolbar.
3. Click the **Generate News Card** button.
4. Preview the generated card.
5. Click the **Download Card** button to save the card as a PNG.

## How It Works

1. **Content Extraction**:
   - The extension identifies key elements on the news page (e.g., title, content, and image).
   - It dynamically removes non-essential elements like ads and sidebars.

2. **Summarization**:
   - The extracted content is sent to the OpenAI API for summarization.

3. **Card Generation**:
   - A visually appealing card is created using HTML, styled for modern aesthetics.
   - The card is converted to a PNG using the Canvas API.

## Technical Details

- **Technologies Used**:
  - JavaScript (Vanilla JS for content extraction and card generation)
  - Canvas API (for card rendering and exporting)
  - OpenAI API (for content summarization)
- **Extension Components**:
  - `manifest.json`: Defines the extension's metadata and permissions.
  - `content-script.js`: Handles content extraction from the news page.
  - `background.js`: Manages API calls and core logic.
  - `popup.html`: Provides the user interface for the extension.

## Permissions

The extension requires the following permissions:

- `activeTab`: To access the content of the current tab.
- `storage`: To save user settings (if implemented).
- `https://api.openai.com/`: To interact with the OpenAI API for summarization.

## Future Enhancements

- Add customization options for card styles (e.g., colors, fonts).
- Using library like readability.js to extract the web content in a better way.
- Using React + Webpack for more advanced UI.
- Using HTML to CANVAS conversion library to convert more advanced card component.
