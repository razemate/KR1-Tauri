ou are tasked to build **KR1**, a production-ready Windows desktop application written in **Tauri (Rust)** + **React + TailwindCSS** that meets **every requirement below**. Do not omit or change any detail.

GLOBAL CONSTRAINTS
1. Target OS: Windows 10/11 x64 only.  
2. Single installer (MSI) ≤ 150 MB.  
3. All user data (secrets, files, vectors) **must stay local** – zero cloud storage.  
4. Performance: UI ≥ 60 fps; heavy I/O off-loaded to Tokio blocking threads.  
5. Auto-updater via Tauri Updater (GitHub Releases).  
6. EV-signed MSI.

APP MODES & VISUAL STATES
- **Universal Mode** (green 12 px circle top-right sidebar) – active when **zero** connected apps toggled ON.  
- **Query Receiver/Processor Mode** (yellow 12 px circle) – active when **≥1** connected app toggled ON.  
- Circle color flips instantly on toggle change.

LEFT SIDEBAR (persistent)
1. Logo only (no text).  
2. “New Chat” button.  
3. Collapsible “Chat History”.  
4. “Settings” gear icon.  
5. **Data Sources list** (always visible):  
   • ✅ **WooCommerce – Connected** (non-grey, always ON)  
   • ✅ **MerchantGuyGateway – Connected** (non-grey, always ON)  
   • ⚪ **Zendesk** – grey + OFF until validated  
   • ⚪ **Ontraport** – grey + OFF until validated  
   • ⚪ **Google Analytics** – grey + OFF until validated  
6. Toggle switches update **per chat session** only.

SETTINGS PANEL
A. LLM Provider  
   • OpenRouter key input field + Validate button + Save button.  

   ou are tasked to build **KR1**, a production-ready Windows desktop application written in **Tauri (Rust)** + **React + TailwindCSS** that meets **every requirement below**. Do not omit or change any detail.

GLOBAL CONSTRAINTS
1. Target OS: Windows 10/11 x64 only.  
2. Single installer (MSI) ≤ 150 MB.  
3. All user data (secrets, files, vectors) **must stay local** – zero cloud storage.  
4. Performance: UI ≥ 60 fps; heavy I/O off-loaded to Tokio blocking threads.  
5. Auto-updater via Tauri Updater (GitHub Releases).  
6. EV-signed MSI.

APP MODES & VISUAL STATES
- **Universal Mode** (green 12 px circle top-right sidebar) – active when **zero** connected apps toggled ON.  
- **Query Receiver/Processor Mode** (yellow 12 px circle) – active when **≥1** connected app toggled ON.  
- Circle color flips instantly on toggle change.

LEFT SIDEBAR (persistent)
1. Logo only (no text).  
2. “New Chat” button.  
3. Collapsible “Chat History”.  
4. “Settings” gear icon.  
5. **Data Sources list** (always visible):  
   • ✅ **WooCommerce – Connected** (non-grey, always ON)  
   • ✅ **MerchantGuyGateway – Connected** (non-grey, always ON)  
   • ⚪ **Zendesk** – grey + OFF until validated  
   • ⚪ **Ontraport** – grey + OFF until validated  
   • ⚪ **Google Analytics** – grey + OFF until validated  
6. Toggle switches update **per chat session** only.

SETTINGS PANEL
A. LLM Provider  
   • OpenRouter key input field + Validate button + Save button.  
   B. Connected Apps  
   - WooCommerce & MerchantGuyGateway: **API keys and URLS are pre-installed via .env.prod**
     - Zendesk, Ontraport, GA:  
     • App URL / GA ID input  
     • API Key input  
     • Validate button (HTTP ping to confirm)  
   - On successful validation → sidebar entry becomes non-grey and toggle auto-ON.
   PRE-INSTALLED SECRETS
Create file `src-tauri/.env.prod` (git-ignored):
PRE-INSTALLED SECRETS
Create file `src-tauri/.env.prod` (git-ignored):
WOO_BASE_URL=https://yourstore.com/wp-json/wc/v3
WOO_KEY=ck_xxxxxxx
WOO_SECRET=cs_xxxxxxx
MGW_BASE_URL=https://api.merchantguy.com/v1
MGW_KEY=mg_xxxxxxx
Copy
Read once at first run, stored encrypted in Windows Credential Manager.

LLM LIST
File `src/data/llms.json`:
```json
[
  {"id":"moonshotai/kimi-vl-a3b-thinking:free","name":"Kimi Free (Vision)"},
  {"id":"meta-llama/llama-4-maverick:free","name":"Llama 4 Maverick Free"},
  {"id":"google/gemma-2-9b-it:free","name":"Gemma 2 9B Free"}
]
Dropdown in ChatBox uses this list.
CHAT INTERFACE
Input box
• Auto-grow textarea, max-height 10 rem then scroll.
• Accepts vertical lists, bulleted/numbered lists, and keeps formatting.
• Paste Excel/HTML table → renders as <table> in chat.
• Drag-drop or paste images/videos → encrypted to %APPDATA%\KR1\media\ with SHA-256 filename, thumbnail preview.
Send/Stop button
• “Send” → changes to “Stop” during request; click to cancel.
Typing indicator
• Three animated dots while backend is working.
LLM dropdown
• Shows models from llms.json; selected model used for every new request.
UNIVERSAL MODE (green circle)
• Full LLM super-hub:
Unlimited memory via SQLite + Qdrant-Embedded (single binary).
Real-time web search via Brave Search API (opt-in).
Generates Excel, PDF, PPTX.
Accepts any file type for diagnosis.
QUERY RECEIVER/PROCESSOR MODE (yellow circle)
• Natural-language queries against toggled sources.
• Returns single merged report (Excel / PDF / PPTX) on demand.
MEMORY & RAG
Vector store: Qdrant-Embedded (in-process).
Auto-compression: old turns trimmed at 95 % similarity.
Folder scan: recursive, capped at 50 k files / 1 GB, prompts user if larger.
SECURITY
All secrets encrypted in Windows Credential Manager.
MSI signed with EV certificate.
BUILD COMMANDS
bash
Copy
npm install
cargo install tauri-cli --locked
cargo tauri dev          # hot reload
cargo tauri build        # signed MSI
LLM LIST
File `src/data/llms.json`:
```json
[
  {"id":"","name":""},

]
Dropdown in ChatBox uses this list.
CHAT INTERFACE
Input box
• Auto-grow textarea, max-height 10 rem then scroll.
• Accepts vertical lists, bulleted/numbered lists, and keeps formatting.
• Paste Excel/HTML table → renders as <table> in chat.
• Drag-drop or paste images/videos → encrypted to %APPDATA%\KR1\media\ with SHA-256 filename, thumbnail preview.
Send/Stop button
• “Send” → changes to “Stop” during request; click to cancel.
Typing indicator
• Three animated dots while backend is working.
LLM dropdown
• Shows models from llms.json; selected model used for every new request.
UNIVERSAL MODE (green circle)
• Full LLM super-hub:
Unlimited memory via SQLite + Qdrant-Embedded (single binary).
Real-time web search via Brave Search API (opt-in).
Generates Excel, PDF, PPTX.
Accepts any file type for diagnosis.
QUERY RECEIVER/PROCESSOR MODE (yellow circle)
• Natural-language queries against toggled sources.
• Returns single merged report (Excel / PDF / PPTX) on demand.
MEMORY & RAG
Vector store: Qdrant-Embedded (in-process).
Auto-compression: old turns trimmed at 95 % similarity.
Folder scan: recursive, capped at 50 k files / 1 GB, prompts user if larger.
SECURITY
All secrets encrypted in Windows Credential Manager.
MSI signed with EV certificate.
BUILD COMMANDS
bash
Copy
npm install
cargo install tauri-cli --locked
cargo tauri dev          # hot reload
cargo tauri build        # signed MSI
ASSETS
logo.png 512×512 → src/assets/logo.png
favicon.ico 32×32 → src/assets/favicon.ico
