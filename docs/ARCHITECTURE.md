# BrowserGuard Architecture

This document provides a detailed overview of BrowserGuard's internal architecture, component interactions, and data flow.

## Overview

BrowserGuard follows a modular WebExtension architecture with clear separation of concerns:

- **Background Worker** - Orchestrates all operations and coordinates between components
- **Content Script** - Performs DOM inspection and search result labeling on pages
- **UI Components** - Popup, Dashboard, and Options provide user interfaces
- **Data Layer** - Local storage manages site intelligence database
- **Utility Modules** - URL checker and rules engine handle classification logic

## Component Architecture

### 1. Worker (Background Service)

**File:** `src/worker.js`

The worker is the central orchestrator that:

- Listens to `webNavigation` events for user navigation
- Invokes URL checker against local lists and heuristics
- Makes optional reputation service requests
- Manages DNR (Declarative Net Request) rule updates
- Coordinates warning page display
- Communicates with UI components via message passing

**Key Functions:**
- Navigation event handling
- URL classification coordination
- Warning interstitial management
- Setting synchronization
- Database updates from user assessments

**Lifespan:**
- Chromium: Service worker (persistent while browser open)
- Firefox: Background script (persistent)

### 2. Content Script

**File:** `src/content.js`

Runs in the context of web pages to:

- Inspect DOM for security issues (insecure password forms, excessive frames)
- Label suspicious links on search engine results
- Detect cross-domain account links
- Measure external content loading
- Communicate findings back to worker

**Key Functions:**
- DOM inspection for page-level risks
- Search result link analysis (Google, Bing, DuckDuckGo, Yahoo)
- Form security validation
- Cross-domain tracking detection

**Constraints:**
- Cannot access extension pages or browser internals
- Runs in isolated context with limited data access
- Communicates via messages to worker

### 3. Database Module

**File:** `src/database.js`

Manages all persistent data:

- **Site Intelligence Database** - User assessments and risk records
- **Whitelist** - Explicitly safe domains
- **Blacklist** - Explicitly dangerous domains
- **Greylist** - Conflicting assessments requiring review
- **Datasets** - Detailed evidence records with timestamps

**Core Responsibilities:**
- Serialization and deserialization
- Assessment conflict resolution
- Greylist routing for conflicting evidence
- Database import/export (JSON snapshots)
- Cross-profile merging logic
- Assessment history tracking

**Storage Locations:**
```
Browser Profile
├── local storage
│   └── siteIntelligence
│       ├── whitelistMap
│       ├── blacklistMap
│       ├── greylistMap
│       ├── datasetsMap
│       └── settings
│
└── extension installation
    └── Database/ (templates only)
        ├── Whitelist/sites.json
        ├── Blacklist/sites.json
        ├── Greylist/sites.json
        └── Datasets/records.json
```

### 4. URL Checker Module

**File:** `src/url-checker.js`

Performs URL classification using:

- **Whitelist Check** - Known safe domains
- **Blacklist Check** - Known dangerous domains
- **Heuristic Analysis** - Phishing signal detection
  - Domain age
  - Suspicious patterns
  - Known phishing indicators
  - Internationalized domain abuse

**Classification Levels:**
1. `SAFE` - Explicitly whitelisted or passes heuristics
2. `RISKY` - Fails heuristics, shows warning
3. `BLOCKED` - Explicitly blacklisted, navigation prevented
4. `REVIEW` - On greylist, conflicting assessments

**Input:** URL (string)
**Output:** Classification object with score, reason, and recommendation

### 5. UI Components

#### Popup (`src/popup.js`, `src/popup.html`)
- Current site status display
- Quick enable/disable toggle
- Quick assessment controls (Safe/Unsafe/Unsure)
- Link to full dashboard

#### Dashboard (`src/dashboard.js`, `src/dashboard.html`)
- **Overview Tab** - Statistics and protection status
- **Web Protection Tab** - Blocking policies configuration
- **Privacy Tools Tab** - Tracker filters and analytics management
- **Blocked Activity Tab** - History of blocked attempts
- **Settings Tab** - Database management, import/export, endpoint config

#### Options (`src/options.js`, `src/options.html`)
- Detailed settings interface
- Site assessment management
- Three-list review (White/Black/Grey)
- Database import/export controls
- Company reputation endpoint configuration

#### Warning Page (`src/warning.js`, `src/warning.html`)
- Interstitial shown for risky URLs
- Prominent warning messaging
- Deliberate continue action (1-click to allow)
- Recorded in assessment database

## Data Flow Diagram

### 1. Navigation Flow

```
User navigates to URL
        │
        ▼
Worker receives webNavigation.onBeforeNavigate
        │
        ├─ Check if already processed
        │
        ▼
URL Checker classifies URL
        │
        ├─ Check Whitelist ──────► SAFE (allow)
        │
        ├─ Check Blacklist ──────► BLOCKED (prevent)
        │
        ├─ Check Heuristics ─┬─── RISKY (warn)
        │                    │
        │                    └─── SAFE (allow)
        │
        └─ Optional: Call Reputation Service
           (hostname POST)
                │
                ▼
         Score combined with
         local classification
                │
                ▼
         Decision: SAFE/RISKY/BLOCKED
                │
                ▼
         If RISKY: Show warning page
         If BLOCKED: Prevent navigation
         If SAFE: Allow navigation
                │
                ▼
         Database: Record navigation
         and decision (if user assesses)
```

### 2. Content Inspection Flow

```
Page loaded in tab
        │
        ▼
Content script initializes
        │
        ├─ Scan for password forms
        ├─ Check form security
        ├─ Detect external frames
        ├─ Find cross-domain links
        │
        ▼
Compile risk report
        │
        ▼
Send message to Worker
        │
        ▼
Worker updates assessment
(adds to dataset record)
```

### 3. Assessment & Database Flow

```
User clicks: Safe/Unsafe/Unsure
        │
        ▼
UI component sends message to Worker
        │
        ▼
Worker calls database.recordAssessment()
        │
        ├─ Check for existing assessment
        │
        ├─ If conflict: Move to Greylist
        ├─ If consistent: Update list (White/Black)
        │
        ▼
Database persists to storage
        │
        ▼
Notify other UI components
        │
        ▼
Update popup & dashboard
```

### 4. Database Import/Export Flow

```
Export Request
        │
        ▼
Database serializes all maps to JSON
├─ Whitelist entries
├─ Blacklist entries
├─ Greylist entries
├─ Dataset records
└─ Settings
        │
        ▼
Save as JSON file (user download)

─────────────────────────────

Import Request
        │
        ▼
User selects JSON file
        │
        ▼
Database loads and validates JSON
        │
        ▼
Merge algorithm:
├─ For each domain in import:
│  ├─ Existing assessment = "Safe", Import = "Unsafe"
│  │  → Move to Greylist
│  │
│  ├─ Existing = "Unsafe", Import = "Safe"
│  │  → Move to Greylist
│  │
│  └─ Otherwise: Keep existing
        │
        ▼
Persist merged database
        │
        ▼
Notify user of merge results
```

## Module Dependencies

```
worker.js (main orchestrator)
├── Imports: database.js, url-checker.js
├── Receives messages from: popup.js, dashboard.js, options.js, content.js
├── Sends messages to: popup.js, dashboard.js, options.js
└── Uses APIs: webNavigation, storage, tabs, declarativeNetRequest

database.js (data management)
├── Used by: worker.js, options.js
├── Manages: browser.storage.local
└── Implements: Whitelist, Blacklist, Greylist, Dataset logic

url-checker.js (classification)
├── Used by: worker.js
├── Pure logic module (no browser APIs)
└── Returns: classification results

content.js (page inspection)
├── Sends messages to: worker.js
├── Uses: DOM APIs only
└── Injected into: all web pages

popup.js (UI)
├── Sends messages to: worker.js, background worker
├── Receives messages from: worker.js
└── Uses: browser.storage, messaging API

dashboard.js (UI)
├── Sends messages to: worker.js
├── Receives messages from: worker.js
└── Uses: browser.storage, messaging API

options.js (UI)
├── Sends messages to: worker.js
├── Receives messages from: worker.js
├── Uses: database.js (via worker)
└── Manages: settings, database UI
```

## Message Passing Protocol

BrowserExtension components communicate via `browser.runtime.sendMessage()`:

### Message Types

#### Navigation Events
```javascript
{
  type: 'urlClassified',
  url: 'https://example.com',
  classification: 'SAFE' | 'RISKY' | 'BLOCKED',
  score: 0-100,
  reason: 'string'
}
```

#### Assessment Messages
```javascript
{
  type: 'assessmentSubmitted',
  domain: 'example.com',
  assessment: 'SAFE' | 'UNSAFE' | 'UNSURE',
  timestamp: timestamp
}
```

#### Database Updates
```javascript
{
  type: 'databaseUpdated',
  changeType: 'assessment' | 'import' | 'export',
  affectedDomains: ['domain1', 'domain2']
}
```

#### Content Inspection
```javascript
{
  type: 'pageInspected',
  url: 'https://example.com',
  findings: {
    insecureForms: boolean,
    externalFrames: number,
    crossDomainLinks: number,
    riskScore: 0-100
  }
}
```

## Declarative Net Request (DNR) Rules

**File:** `src/rules/privacy.json`

Implements blocking via WebExtension's DNR API:

```json
{
  "id": 1,
  "priority": 1,
  "action": {"type": "block"},
  "condition": {
    "initiatorDomains": ["example.com"],
    "requestDomains": ["tracker.example.com"],
    "resourceTypes": ["image", "script"]
  }
}
```

**Characteristics:**
- Declarative (no script evaluation needed)
- High performance (native browser evaluation)
- Requires manifest declaration
- Rules loaded on extension install
- Updated via API when settings change

## Storage Schema

### Local Storage Structure

```javascript
{
  siteIntelligence: {
    whitelistMap: {
      'safe-domain.com': {
        assessment: 'SAFE',
        timestamp: 1234567890,
        reporter: 'user@company.com',
        evidence: ['manual_review']
      },
      // ... more entries
    },
    blacklistMap: {
      'malicious-domain.com': {
        assessment: 'UNSAFE',
        timestamp: 1234567890,
        threat: 'phishing',
        evidence: ['heuristic_match', 'reputation_service']
      },
      // ... more entries
    },
    greylistMap: {
      'conflicted-domain.com': {
        assessments: [
          { assessment: 'SAFE', timestamp: ..., reporter: ... },
          { assessment: 'UNSAFE', timestamp: ..., reporter: ... }
        ]
      }
    },
    datasetsMap: {
      'domain.com': {
        pageRisks: [
          {
            timestamp: 1234567890,
            url: 'https://domain.com/page',
            riskFactors: ['insecure_form', 'excessive_frames']
          }
        ]
      }
    },
    settings: {
      enableProtection: true,
      reputationEndpoint: 'https://reputation.company.com/check',
      enabledRules: ['privacy_filters'],
      userLabel: 'user@company.com'
    }
  }
}
```

## Extension Manifest Integration

### Chromium (Manifest V3)

```json
{
  "permissions": [
    "storage",        // Access local storage
    "tabs",           // Get tab information
    "webNavigation",  // Monitor navigation events
    "declarativeNetRequest"  // Apply DNR rules
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "worker.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_title": "Open BrowserGuard Dashboard"
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  }
}
```

### Firefox (Manifest V3 compatibility)

Similar structure with Firefox-specific adjustments (background script vs service worker).

## Performance Considerations

### URL Classification
- **Time Complexity:** O(1) for whitelist/blacklist lookups (hash map)
- **Heuristic Check:** O(n) string comparisons (typically <1ms)
- **Reputation Call:** Async, ~100-500ms (optional)

### Content Inspection
- **Timing:** Runs at `document_idle` (after page ready)
- **Scope:** Only active tab content
- **Impact:** Minimal (DOM queries only, no layout thrashing)

### Storage Operations
- **Serialization:** Minimal JSON operations
- **Write Frequency:** Batched to reduce storage churn
- **Size Limits:** Browser storage limits apply (typically 10MB+)

## Security Boundaries

```
┌─────────────────────────────────────────────────────┐
│          Extension Boundary (Privileged)            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Worker (service worker/background script)        │
│    ├─ Full browser APIs                           │
│    ├─ Storage access                              │
│    ├─ webNavigation access                        │
│    └─ Communicates with reputation service        │
│                                                     │
│  Content Script (sandboxed context per page)      │
│    ├─ DOM access only                             │
│    ├─ Cannot access extension storage directly    │
│    ├─ Cannot access extension pages                │
│    └─ Messages must pass through worker            │
│                                                     │
│  UI Pages (popup, dashboard, options)             │
│    ├─ Full DOM/JS access                          │
│    ├─ Storage access                              │
│    └─ Messages to worker coordinated               │
│                                                     │
└─────────────────────────────────────────────────────┘
              ▲                      ▲
              │                      │
        External API            Web Pages
     (reputation service)   (content script
         (HTTP POST)         can access but
      hostname-only)      sandboxed from
                          extension data)
```

## Extension Lifecycle

### Initialization
1. Manifest loads
2. Worker starts (service worker or background script)
3. Database loads from storage
4. DNR rules register
5. Event listeners attach

### Runtime
1. Listen for `webNavigation` events
2. Listen for messages from UI/content
3. Respond to user actions
4. Periodically sync settings

### Storage Changes
- Treated as source of truth
- Changes reflected across all windows
- UI components notified of updates

### Uninstall
- All data remains in browser profile
- Can be backed up via export
- Cannot be recovered automatically

---

**Last Updated:** November 2026
