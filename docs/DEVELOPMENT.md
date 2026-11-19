# Development Guide

This guide covers setup, development workflow, testing, and debugging for BrowserGuard contributors.

## Development Setup

### Prerequisites

- **Node.js:** 20.11 or later
- **Git:** For version control
- **Browser:** Chrome/Edge or Firefox for testing
- **Code Editor:** VS Code or similar (`.vscode/settings.json` provided)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/KarolAtkinson/Browser_Guard.git
cd Browser_Guard/BrowserGuard

# Validate installation
npm run check

# Run tests to verify setup
npm test
```

## Project Scripts

### Validation

```bash
npm run check
```

Validates:
- ✓ Manifest V3 compliance (Chromium and Firefox)
- ✓ Required file structure
- ✓ JSON syntax and rules validity
- ✓ JavaScript syntax
- ✓ Simulation test hosts (reserved or known domains)

**When to run:** Before commits, before builds, when adding new files

### Build

```bash
npm run build              # Build both Chromium and Firefox
npm run build:chrome       # Build Chromium (Chrome, Edge, Brave)
npm run build:firefox      # Build Firefox only
```

Builds:
- Copies source files to `dist/`
- Includes database templates
- Validates all assets are present
- Creates installable packages

**Output:**
- `dist/chromium/` → Load in Chrome/Edge via extension management
- `dist/firefox/` → Load in Firefox via about:debugging

### Testing

```bash
npm test                                    # Run all tests
npm test -- tests/url-checker.test.mjs     # Run specific test
npm test -- tests/database.test.mjs        # Test database logic
```

Tests verify:
- URL classification logic (phishing detection)
- Database operations (merge, conflict resolution)
- Dataset expectations
- List precedence (Whitelist > Blacklist > Heuristics)
- Greylist behavior

**When to run:** After logic changes, before commits

### Simulation

```bash
npm run simulate
```

Tests URL classification offline:
- Runs against reliable (safe) domain set
- Runs against untrustworthy (blocked) domain set
- Exercises exact classifier logic without connecting to web
- **Does not access the internet**

**When to run:** To validate URL checker without web access

## Development Workflow

### 1. Feature Branch

```bash
git checkout -b feature/my-feature
```

### 2. Make Changes

Edit files in `src/`:

**UI Changes:**
- `src/popup.html`, `src/popup.js`
- `src/dashboard.html`, `src/dashboard.js`
- `src/options.html`, `src/options.js`
- `src/*.css` for styling

**Logic Changes:**
- `src/worker.js` - Main orchestration
- `src/database.js` - Database operations
- `src/url-checker.js` - URL classification
- `src/content.js` - Page inspection

**Configuration:**
- `src/rules/privacy.json` - Tracker/ad rules
- `manifests/chromium.json` - Chrome/Edge manifest
- `manifests/firefox.json` - Firefox manifest

### 3. Validate

```bash
npm run check        # Lint and validate
npm run simulate     # Test classification logic
npm test             # Run all tests
```

### 4. Build Locally

```bash
npm run build        # Build both browsers
# OR
npm run build:chrome # Build specific browser
```

### 5. Manual Testing

#### Load in Chrome/Edge

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `/dist/chromium`
5. Pin BrowserGuard to toolbar

#### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `/dist/firefox/manifest.json`
4. Pin BrowserGuard to toolbar

### 6. Test Features

**Dashboard:**
- Click toolbar icon → Dashboard button
- Verify all tabs load
- Test navigation

**Popup:**
- Click toolbar icon
- Verify quick assessment controls
- Test toggle on/off

**Settings:**
- Dashboard → Settings tab
- Test database export
- Test preferences

**URL Blocking:**
- Visit a known test site
- Verify warning page appears
- Verify continue action works

### 7. Commit

```bash
git add src/ manifests/ tests/
git commit -m "Add feature description"
```

### 8. Push & Create PR

```bash
git push origin feature/my-feature
```

Then create PR on GitHub with:
- Clear description of changes
- Testing done
- Screenshots if UI changes

## Code Structure

### Module Pattern

Each component follows this structure:

```javascript
// Module initialization
const ComponentName = (() => {
  const privateState = {};

  const initialize = async () => {
    // Setup logic
  };

  const handleMessage = (message) => {
    // Message handling
  };

  return {
    initialize,
    handleMessage
  };
})();
```

### Message Passing

Communicate between components via messages:

```javascript
// Send message
browser.runtime.sendMessage({
  type: 'assessmentSubmitted',
  domain: 'example.com',
  assessment: 'SAFE'
});

// Receive message
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'assessmentSubmitted') {
    handleAssessment(message.domain, message.assessment);
  }
  sendResponse({ status: 'ok' });
});
```

### Storage Operations

Access extension storage:

```javascript
// Read
const data = await browser.storage.local.get('siteIntelligence');

// Write
await browser.storage.local.set({
  siteIntelligence: { /* data */ }
});

// Listen to changes
browser.storage.onChanged.addListener((changes) => {
  if (changes.siteIntelligence) {
    updateUI(changes.siteIntelligence.newValue);
  }
});
```

## Common Tasks

### Add a New Permission

1. Add to `manifests/chromium.json` and `manifests/firefox.json`
2. Run `npm run check` to validate
3. Update README.md to document new permission
4. Test on both browsers

### Add a New URL Classification Rule

1. Edit `src/url-checker.js`
2. Update classification logic
3. Add test cases to `tests/url-checker.test.mjs`
4. Run `npm test` to verify
5. Run `npm run simulate` to test with datasets

### Add Tracker Rules

1. Edit `src/rules/privacy.json`
2. Follow DNR format:
   ```json
   {
     "id": 100,
     "priority": 1,
     "action": {"type": "block"},
     "condition": {
       "requestDomains": ["tracker.example.com"],
       "resourceTypes": ["image", "script"]
     }
   }
   ```
3. Test with `npm run check`
4. Verify blocking in browser developer tools (Network tab)

### Update Database Schema

1. Edit `Database/` JSON template files
2. Update `src/database.js` to handle new fields
3. Add migration logic for existing data
4. Write tests for schema changes
5. Run `npm test`

### Add a Dashboard Tab

1. Add tab to `src/dashboard.html`:
   ```html
   <div class="tab-content" id="new-tab">
     <!-- Tab content -->
   </div>
   ```

2. Add tab button:
   ```html
   <button data-tab="new-tab">New Tab</button>
   ```

3. Add styles to `src/dashboard.css`

4. Add handler in `src/dashboard.js`:
   ```javascript
   document.querySelector('[data-tab="new-tab"]').addEventListener('click', () => {
     showTab('new-tab');
   });
   ```

## Debugging

### Browser DevTools

#### Chrome/Edge
1. Open `chrome://extensions/`
2. Find BrowserGuard
3. Click "Service worker" to debug worker
4. Click extension icon → DevTools (popup context)

#### Firefox
1. Open `about:debugging`
2. Find BrowserGuard
3. Click "Inspect" to debug background script
4. Browser console shows extension logs

### Console Logging

Add logging during development:

```javascript
// In any component
console.log('Debug message:', value);

// In content script (page context)
console.log('Page context log:', value);

// In worker (extension context)
console.log('Worker log:', value);
```

**View logs in:**
- Chromium: `chrome://extensions/` → Service worker DevTools
- Firefox: `about:debugging` → Inspector console

### Message Debugging

Track message flow:

```javascript
// In any message handler
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message, 'from:', sender.url);
  // ... handle message
  sendResponse({ status: 'ok' });
});
```

### Storage Inspection

View local storage in DevTools:

```javascript
// In console of DevTools
// Get current state
await browser.storage.local.get(null).then(data => {
  console.log(JSON.stringify(data, null, 2));
});
```

### Network Debugging

Monitor reputation service calls:

1. Open DevTools in background page
2. Go to Network tab
3. Trigger URL classification
4. See POST requests to reputation endpoint

## Testing Guidelines

### Unit Tests

Located in `tests/`:

```javascript
// tests/my-module.test.mjs
import test from 'node:test';
import assert from 'node:assert';
import { myFunction } from '../src/my-module.js';

test('myFunction returns expected value', () => {
  const result = myFunction('input');
  assert.strictEqual(result, 'expected');
});
```

**Guidelines:**
- One concept per test
- Use descriptive test names
- Avoid test interdependencies
- Mock external dependencies

### Running Specific Tests

```bash
npm test -- tests/my-module.test.mjs
```

### Test Coverage

Current test suite covers:
- ✓ URL classification logic
- ✓ Database operations (merge, conflict resolution)
- ✓ List precedence
- ✓ Dataset expectations
- ✓ Assessment scenarios

## Performance Considerations

### Critical Path Optimization

**URL Classification:**
- Must complete in <100ms for smooth UX
- Whitelist/blacklist use hash maps (O(1))
- Heuristics use string matching (O(n) on domain length)

**Content Inspection:**
- Runs after page ready (`document_idle`)
- Use efficient DOM queries
- Avoid layout thrashing

**Storage Operations:**
- Batch writes when possible
- Use `onChanged` listeners instead of polling
- Keep records within storage quotas

### Memory Management

- Keep service worker lightweight
- Clear listeners on unload
- Avoid memory leaks with proper cleanup

## Linting & Style

### JavaScript Style

BrowserGuard uses:
- ES2020+ syntax (const/let, arrow functions, async/await)
- Minimal comments (code should be self-documenting)
- Consistent indentation (2 spaces)
- Semicolons required

### File Organization

- One module per file
- Related components in same directory
- Clear naming conventions
- README.md for complex directories

## Git Workflow

### Commit Messages

```
Add feature description

- What was changed
- Why it was changed
- Any breaking changes
```

### Before Pushing

```bash
npm run check    # Validate
npm test         # Test
npm run build    # Build
```

### Pull Request Checklist

- [ ] Code passes `npm run check`
- [ ] All tests pass with `npm test`
- [ ] Builds successfully with `npm run build`
- [ ] Manual testing completed
- [ ] PR description includes what/why/how
- [ ] No new dependencies added
- [ ] Database schema changes documented
- [ ] Manifest changes reviewed

## Troubleshooting

### "Module not found" error

**Problem:** `import` statement fails
**Solution:** Check file path, verify file exists, run `npm run check`

### "Cannot find browser object"

**Problem:** Code assumes browser API outside extension context
**Solution:** Only use browser APIs in worker/popup/options, not in content.js from page context

### Storage quota exceeded

**Problem:** Too much data in browser storage
**Solution:** Review database size, implement cleanup, consider compression

### Extension won't load

**Problem:** "Failed to load" in extension management
**Solution:** Run `npm run check`, check manifest syntax, verify required files

### Tests fail randomly

**Problem:** Flaky tests
**Solution:** Add explicit waits, verify async operations complete, check timing

### Performance issues

**Problem:** Extension slows down browsing
**Solution:** Profile with DevTools, check message frequency, optimize classification logic

---

## Resources

- [WebExtensions API Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [DNR Rule Format](https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/)
- [Node.js Test Module](https://nodejs.org/api/test.html)

---

**Last Updated:** November 2026
