# Browser Guard

A free, local-first browser extension for protecting company users from phishing signals, risky destinations, advertising, and common trackers.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Build & Installation](#build--installation)
- [Usage Guide](#usage-guide)
- [Architecture](#architecture)
- [Development](#development)
- [Privacy & Permissions](#privacy--permissions)
- [Security Model](#security-model--limitations)
- [Contributing](#contributing)
- [License](#license)

## Overview

BrowserGuard is a WebExtension designed with a modular controller-based architecture to provide real-time protection against:

- **Phishing attacks** - Checks URLs against locally managed allow/deny lists
- **Risky destinations** - Applies heuristic phishing signals
- **Tracking** - Filters advertising and analytics domains
- **Malicious forms** - Detects insecure password forms and suspicious links

The extension operates entirely locally with no data transmission unless explicitly configured by administrators.

## ✨ Features

### Core Protection
- ✅ Checks top-level HTTP(S) navigations against locally managed allow and deny lists
- ✅ Shows warning interstitial for high-risk addresses with deliberate one-time continue action
- ✅ Inspects pages locally for insecure password forms, cross-domain account links, and excessive external frames
- ✅ Labels suspicious links on Google, Bing, DuckDuckGo, and Yahoo search pages

### Intelligence & Management
- ✅ Collects user assessments and local page-risk evidence in an extension-local database
- ✅ Routes conflicting assessments to Greylist for manual review
- ✅ Imports and exports database snapshots to merge evidence from multiple profiles
- ✅ Supports optional HTTPS company reputation endpoint (hostname-only submission)

### Browser Support
- ✅ Chromium (Chrome, Edge, Brave, etc.)
- ✅ Firefox
- Builds both platforms from unified source code

## 📁 Project Structure

```
Browser_Guard/
├── README.md                          # This file
├── docs/                              # Documentation files
├── BrowserGuard/                      # Main extension source
│   ├── src/                           # Source code
│   │   ├── worker.js                  # Service worker/background coordinator
│   │   ├── content.js                 # DOM inspection & search labeling
│   │   ├── database.js                # Local database management
│   │   ├── url-checker.js             # URL classification logic
│   │   ├── popup.*                    # Toolbar popup UI
│   │   ├── dashboard.*                # Main dashboard UI & logic
│   │   ├── options.*                  # Settings & preferences
│   │   ├── warning.*                  # Warning interstitial page
│   │   ├── rules/                     # DNR (Declarative Net Request) rules
│   │   │   └── privacy.json           # Privacy filter rules
│   │   └── ui.css                     # Shared UI styles
│   │
│   ├── manifests/                     # Browser-specific manifest files
│   │   ├── chromium.json              # Chrome/Edge manifest
│   │   └── firefox.json               # Firefox manifest
│   │
│   ├── Database/                      # Local database templates
│   │   ├── Whitelist/                 # Safe sites
│   │   ├── Blacklist/                 # Blocked sites
│   │   ├── Greylist/                  # Conflicting assessments
│   │   └── Datasets/                  # Risk evidence records
│   │
│   ├── scripts/                       # Build & utility scripts
│   │   ├── build.mjs                  # Build script for both browsers
│   │   ├── check.mjs                  # Validation checks
│   │   └── simulate.mjs               # Offline URL testing
│   │
│   ├── tests/                         # Test suite
│   │   ├── url-checker.test.mjs       # URL checker tests
│   │   ├── database.test.mjs          # Database tests
│   │   └── datasets/                  # Test data
│   │
│   ├── dist/                          # Build output (generated)
│   │   ├── chromium/                  # Chrome/Edge build
│   │   └── firefox/                   # Firefox build
│   │
│   └── package.json                   # Dependencies & scripts
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **worker.js** | Orchestrates settings, URL checks, reputation requests, DNR rules, and navigation warnings |
| **database.js** | Serializes database changes, retains assessment history, derives list placement, merges imports |
| **content.js** | Performs local DOM inspection and search result labeling on web pages |
| **url-checker.js** | Core URL classification logic using heuristics and local lists |
| **popup.js** | Current site status and protection toggle in toolbar |
| **dashboard.js** | Full-featured dashboard with tabs for Overview, Protection, Privacy, Blocked Activity, Settings |
| **options.js** | Settings management, site assessments, database import/export |

## 🚀 Getting Started

### Requirements

- **Node.js** 20.11 or later
- A modern web browser (Chrome, Edge, or Firefox)
- No external package dependencies required

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/KarolAtkinson/Browser_Guard.git
   cd Browser_Guard
   ```

2. **Validate the project:**
   ```bash
   cd BrowserGuard
   npm run check
   ```

3. **Build the extension:**
   ```bash
   npm run build        # Builds both Chromium and Firefox versions
   # OR
   npm run build:chrome # Build Chromium only
   npm run build:firefox # Build Firefox only
   ```

4. **Output:** Loadable extensions will be in:
   - `dist/chromium/` → Load in Chrome/Edge
   - `dist/firefox/` → Load in Firefox

## 🔧 Build & Installation

### Building

```bash
# Validate project structure and configuration
npm run check

# Build both browser packages
npm run build

# Build specific browser
npm run build:chrome
npm run build:firefox
```

The build process:
- Validates manifests and configuration
- Checks JavaScript syntax
- Assembles each browser package
- Includes database templates
- Copies assets and resources

### Installation for Testing

#### Chrome/Edge

1. Build the Chromium version: `npm run build:chrome`
2. Open extension management (chrome://extensions/ or edge://extensions/)
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/chromium` folder
6. Click the BrowserGuard icon in your toolbar

#### Firefox

1. Build the Firefox version: `npm run build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `dist/firefox/manifest.json`
5. Click the BrowserGuard icon in your toolbar

## 📖 Usage Guide

### Dashboard

Access the full interface from the toolbar button:

- **Overview** - Quick status and protection stats
- **Web Protection** - Configure blocking policies
- **Privacy Tools** - Manage tracker filters and analytics
- **Blocked Activity** - View blocked sites and threats
- **Settings** - Database management, import/export, reputation endpoint

### Making Assessments

1. Click **Dashboard** → **Settings**
2. Use Safe/Unsafe/Unsure controls to assess domains
3. Conflicting assessments are moved to **Greylist** for review
4. Clear assessments are promoted to **Whitelist** or **Blacklist**

### Database Management

- **Export:** Dashboard → Settings → Export Database (creates JSON snapshot)
- **Import:** Dashboard → Settings → Import Database (merges evidence from other profiles)

### Company Reputation Integration

Configure an optional HTTPS endpoint that receives:
```json
{
  "domain": "example.com"
}
```

Expected response:
```json
{
  "score": 0,
  "label": "Known domain"
}
```

Score is interpreted as risk (0 = safe, 100 = dangerous).

## 🏗️ Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser Runtime                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Popup UI   │  │  Dashboard   │  │   Options    │      │
│  │  (popup.js)  │  │(dashboard.js)│  │(options.js)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│         ┌──────────────────▼──────────────────┐             │
│         │      Worker/Background Script      │             │
│         │         (worker.js)                │             │
│         │  - Orchestrates all operations     │             │
│         │  - Manages webNavigation events    │             │
│         │  - Coordinates URL checks          │             │
│         └──────────────────┬──────────────────┘             │
│                            │                                 │
│      ┌─────────────────────┼─────────────────────┐          │
│      │                     │                     │          │
│      ▼                     ▼                     ▼          │
│  ┌────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  Database  │    │ URL Checker  │    │   Content    │   │
│  │(database.js│    │(url-checker) │    │  (content.js)│   │
│  └────────────┘    └──────────────┘    └──────────────┘   │
│        │                  │                     │          │
│        └──────────────────┼─────────────────────┘          │
│                           │                                 │
│         ┌─────────────────▼─────────────────┐              │
│         │    Local Storage & Local Files    │              │
│         │  - Lists (White/Black/Greylist)   │              │
│         │  - Assessment records & history   │              │
│         └───────────────────────────────────┘              │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │   Optional External: Company Reputation Service   │    │
│  │   (hostname-only POST to configured endpoint)     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Navigation** → Worker detects via `webNavigation` event
2. **URL Classification** → Checked against local lists and heuristics
3. **Decision Made:**
   - ✅ Safe → Allow navigation
   - ⚠️ Risky → Show warning interstitial
   - ❌ Blocked → Block navigation
4. **Assessment Recording** → User decision stored in database
5. **Content Inspection** → Run DOM checks on loaded pages
6. **Search Results** → Label suspicious links if on search engine

## 🧪 Development

### Running Tests

```bash
# Run all tests (URL checker, database, dataset expectations)
npm test

# Run specific test
npm test -- tests/url-checker.test.mjs
npm test -- tests/database.test.mjs
```

### Simulation

Test URL classification against realistic datasets without connecting to the web:

```bash
npm run simulate
```

This runs:
- **Reliable URLs** - Expected-safe reference sites
- **Untrustworthy URLs** - Reserved `.test` domains for local blocking

### Project Validation

```bash
npm run check
```

Validates:
- ✓ Both manifests (Chromium & Firefox)
- ✓ Required files and structure
- ✓ JSON rules and database templates
- ✓ JavaScript syntax
- ✓ Simulation hosts are reserved or known reference sites

### Development Workflow

1. Make changes in `src/`
2. Run `npm run check` to validate
3. Run `npm run simulate` or `npm test` to test logic
4. Run `npm run build` to build packages
5. Load in browser and test manually
6. Commit with meaningful message

## 🔐 Privacy & Permissions

### Data Handling
- **Local Processing:** All URL analysis and DOM inspection run locally
- **No Upload:** Page contents or full URLs are never transmitted
- **Database Records:** Domains, assessment outcomes, timestamps, risk scores, and reporter labels (no page contents)
- **Export Only:** Database snapshots remain local unless explicitly exported by user

### Permissions Requested

| Permission | Purpose |
|-----------|---------|
| `storage` | Store local settings and assessments |
| `tabs` | Access current tab information |
| `webNavigation` | Monitor navigation events for URL checking |
| `declarativeNetRequest` | Filter ads and trackers via DNR rules |
| `<all_urls>` | Access navigation data and inspect page content |

**Users should review these permissions before installing.**

## 🛡️ Security Model & Limitations

### What BrowserGuard Is
- ✅ Local-first protection from common phishing and tracking
- ✅ User-managed URL lists with centralized reputation option
- ✅ Assessment database for team evidence aggregation

### What BrowserGuard Is NOT
- ❌ NOT a replacement for maintained threat-intelligence feeds
- ❌ NOT an enterprise endpoint control system
- ❌ NOT guaranteed to identify every phishing page

### Known Limitations
- Local URL rules are heuristic (can produce false positives/negatives)
- Bundled ad/tracker list must be manually maintained
- Different reports from multiple profiles may create Greylist conflicts
- No automatic aggregation across users (requires explicit import/export)
- Browser-internal pages and platform-specific navigation races are outside control scope

### Enterprise Deployment Best Practices
1. Manage the optional reputation service centrally
2. Establish and test block/allow policies
3. Review required permissions with security team
4. Test policies against targeted browser versions
5. Plan for database aggregation workflows
6. Set clear user communication about protection limitations

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run validation: `npm run check && npm test`
5. Commit with clear message: `git commit -m "Add feature X"`
6. Push to your fork: `git push origin feature/my-feature`
7. Open a Pull Request

## 📄 License

No license has been selected for this project yet. See LICENSE file for details (when available).

---

## Quick Reference

### Essential Commands

```bash
npm run check       # Validate project
npm run build       # Build both browsers
npm run build:chrome  # Build Chrome/Edge
npm run build:firefox # Build Firefox
npm run test        # Run test suite
npm run simulate    # Test URL classification offline
```

### Key Files to Edit

- **UI Changes:** `src/dashboard.html`, `src/popup.html`, `src/options.html`
- **Logic Changes:** `src/worker.js`, `src/database.js`, `src/url-checker.js`
- **Styling:** `src/ui.css`, `src/dashboard.css`, `src/content.css`
- **Rules:** `src/rules/privacy.json`

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Run `npm run check` to see validation errors |
| Extension won't load | Ensure `dist/` exists and manifests are valid |
| Node version error | Upgrade to Node.js 20.11 or later |
| Tests fail | Check error messages and verify database schema |

---

**Last Updated:** November 2026  
**Repository:** [KarolAtkinson/Browser_Guard](https://github.com/KarolAtkinson/Browser_Guard)
