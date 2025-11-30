# 🧭 Deeks Thread Navigator Chrome Extension

**Navigate long conversation threads instantly with a floating button and compact prompt menu.**  
Currently stable on **ChatGPT** ✅. **Gemini** and **Perplexity** integrations are in progress and shipping soon.  

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0-blue)
![Platforms](https://img.shields.io/badge/Platforms-ChatGPT%20(stable)%20|%20Gemini%20(dev)%20|%20Perplexity%20(dev)-orange)

---

## ✨ Features

- **🎯 Floating Button:** Overlays on the chat UI without interfering with typing  
- **📋 Prompt List:** Shows each user prompt with two quick actions:
  - Copy the AI’s reply to clipboard  
  - Jump directly to that reply in the thread  
- **🚀 Smooth Navigation:** Scrolls smoothly to the reply with a brief highlight so you don’t lose track  
- **🔧 Cross-Platform Design:**  
  - **ChatGPT (stable)** – full support for prompt detection, copy-response, and jump-to-response  
  - **Gemini & Perplexity (in progress)** – UI and features will match once DOM selectors and pairing logic are finalized  

---

## 🚀 Installation

### Step 1: Download Files
Clone this repo or save the following files into a folder (e.g., `deeks-thread-navigator`):
- `manifest.json`
- `content.js`
- `styles.css`

### Step 2: Load Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer Mode**
3. Click **Load unpacked**
4. Select your extension folder

---

## 🎯 Usage

1. Open a chat on ChatGPT (or Gemini/Perplexity once supported)  
2. Click the **floating clipboard button** 📋 on the right edge of the chat UI  
3. In the navigator panel:  
   - Click a prompt row → jump to that reply  
   - Click the clipboard icon → copy AI’s reply  
   - Click the link icon → jump directly to the reply  
4. Replies briefly highlight on jump for easier tracking  

---

## 🛠️ Troubleshooting

- **Button missing?** → Reload the tab and ensure Developer Mode + extension are enabled  
- **Empty list or actions failing?** → Open DevTools Console for logs, reload after chat UI fully renders  

---