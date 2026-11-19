# Quick Reference

Fast lookup for common tasks and information.

## Project Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `npm run check` | Validate project | Errors/warnings |
| `npm run build` | Build both browsers | `dist/chromium/`, `dist/firefox/` |
| `npm run build:chrome` | Build Chrome/Edge | `dist/chromium/` |
| `npm run build:firefox` | Build Firefox | `dist/firefox/` |
| `npm test` | Run test suite | Test results |
| `npm run simulate` | Test offline | Classification results |

## File Structure

```
BrowserGuard/
├── src/                          # Source files
│   ├── worker.js                 # Background worker
│   ├── content.js                # Page inspection
│   ├── database.js               # Data management
│   ├── url-checker.js            # Classification logic
│   ├── popup.{js,html}           # Toolbar popup
│   ├── dashboard.{js,html}       # Main dashboard
│   ├── options.{js,html}         # Settings page
│   ├── warning.{js,html}         # Interstitial warning
│   ├── rules/privacy.json        # DNR rules
│   └── *.css                     # Styles
├── manifests/                    # Browser manifests
├── Database/                     # Database templates
├── tests/                        # Test files
├── scripts/                      # Build scripts
└── package.json                  # Configuration
```

## Key Concepts

### Classification Levels
- **SAFE** - Explicitly whitelisted or passes heuristics
- **RISKY** - Fails heuristics, show warning
- **BLOCKED** - Explicitly blacklisted, prevent navigation
- **REVIEW** - On greylist, conflicting assessments

### Database Lists
- **Whitelist** - Trusted domains (explicitly safe)
- **Blacklist** - Dangerous domains (explicitly blocked)
- **Greylist** - Conflicting assessments (needs review)
- **Dataset** - Evidence records with timestamps

### Message Types
- `urlClassified` - URL classification result
- `assessmentSubmitted` - User assessment
- `databaseUpdated` - Database changed
- `pageInspected` - Content inspection results

## Development Quick Start

```bash
# 1. Setup
git clone https://github.com/KarolAtkinson/Browser_Guard.git
cd Browser_Guard/BrowserGuard

# 2. Validate
npm run check

# 3. Make changes in src/

# 4. Test
npm test

# 5. Build
npm run build

# 6. Load in browser
# Chrome: chrome://extensions > Load unpacked > dist/chromium
# Firefox: about:debugging > Load Temporary > dist/firefox/manifest.json

# 7. Commit
git commit -m "Description of changes"
```

## Common Edit Locations

| Task | Files |
|------|-------|
| Fix UI | `src/popup.html`, `src/dashboard.html`, `src/*.css` |
| Change logic | `src/worker.js`, `src/database.js`, `src/url-checker.js` |
| Update styling | `src/ui.css`, `src/dashboard.css` |
| Add rules | `src/rules/privacy.json` |
| Browser-specific | `manifests/chromium.json`, `manifests/firefox.json` |

## Testing Quick Reference

```bash
# All tests
npm test

# Specific test file
npm test -- tests/url-checker.test.mjs

# Test format
import test from 'node:test';
import assert from 'node:assert';

test('description', () => {
  assert.strictEqual(actual, expected);
});
```

## Debugging Tips

| Issue | Solution |
|-------|----------|
| Build fails | Run `npm run check` |
| Tests fail | Check error message, verify logic |
| Extension won't load | Verify manifest syntax, all files present |
| Changes not applying | Rebuild with `npm run build`, reload in browser |
| Performance issues | Profile with DevTools, optimize loops |

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# ... edit files ...

# Validate before commit
npm run check
npm test

# Commit
git commit -m "Add feature description"

# Push and create PR
git push origin feature/my-feature
```

## Browser Loading

### Chrome/Edge (MV3)
1. `chrome://extensions/`
2. Developer mode: ON (top right)
3. Load unpacked: Select `dist/chromium`

### Firefox
1. `about:debugging#/runtime/this-firefox`
2. Load Temporary Add-on: Select `dist/firefox/manifest.json`

## Extension APIs Used

| API | Purpose |
|-----|---------|
| `browser.storage.local` | Persistent data storage |
| `browser.webNavigation` | Monitor navigation events |
| `browser.tabs` | Access tab information |
| `browser.runtime.sendMessage` | Inter-component communication |
| `browser.declarativeNetRequest` | Block/filter network requests |

## Configuration Files

| File | Purpose |
|------|---------|
| `manifests/chromium.json` | Chrome/Edge manifest (MV3) |
| `manifests/firefox.json` | Firefox manifest (MV3) |
| `package.json` | Node scripts and metadata |
| `src/rules/privacy.json` | DNR rules (tracker/ad blocking) |
| `Database/*/sites.json` | Database templates |

## Important Limits

- **Storage**: ~10MB per extension (browser dependent)
- **URL Classification**: <100ms target
- **Domains per list**: Practical limit ~10,000 per list
- **Historical records**: Keep manageable with cleanup

## Documentation Files

| File | Topic |
|------|-------|
| `/README.md` | Project overview |
| `/docs/ARCHITECTURE.md` | System architecture details |
| `/docs/DEVELOPMENT.md` | Developer setup and workflow |
| `/docs/USER_GUIDE.md` | End user documentation |
| `/docs/QUICK_REFERENCE.md` | This file |

## Default Whitelist/Blacklist

BrowserGuard includes templates:
- `Database/Whitelist/sites.json` - Trusted sites
- `Database/Blacklist/sites.json` - Known dangerous sites

Access via extension's WebExtension local storage at runtime.

## Assessment Recording

When user assesses a domain:

1. Assessment is recorded with timestamp
2. If conflicting, moved to Greylist
3. If consistent, stays on Whitelist/Blacklist
4. Can be exported as JSON snapshot
5. Can be imported in another profile

## Privacy Notes

- ✅ All processing local (no server transmission except optional reputation)
- ✅ No page contents collected
- ✅ No full URLs sent (reputation service gets hostname only)
- ✅ All data can be exported/imported as JSON
- ✅ Users control all permissions

## Support Resources

- **GitHub Issues**: [KarolAtkinson/Browser_Guard/issues](https://github.com/KarolAtkinson/Browser_Guard/issues)
- **MDN WebExtensions**: [WebExtensions docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- **Manifest V3**: [Chrome Extension docs](https://developer.chrome.com/docs/extensions/mv3/)
- **Node.js Test**: [Node.js test module](https://nodejs.org/api/test.html)

## Common Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| `Manifest invalid` | Syntax error in JSON | Run `npm run check` |
| `Module not found` | Import path wrong | Check file path exists |
| `browser is undefined` | Using browser API outside extension | Only use in worker/UI |
| `Storage full` | Too much data | Export backup, clear old data |
| `Test failed` | Test assertion failed | Check test expectations |

## Performance Checklist

- ✓ Whitelist/blacklist lookups in O(1)
- ✓ URL classification < 100ms
- ✓ Heuristics fast string matching
- ✓ Async reputation calls (non-blocking)
- ✓ Batched storage updates
- ✓ Content inspection at `document_idle`

## Security Boundaries

| Boundary | Protection |
|----------|-----------|
| Content script | Sandboxed from page JavaScript |
| Worker | Privileged access to browser APIs |
| Popup/Options | Full DOM access within extension |
| Reputation call | Only hostname sent (HTTPS POST) |

## Deployment

### Single User
1. Build: `npm run build`
2. Load unpacked in browser
3. Use locally

### Team Sharing
1. Each user builds locally
2. Users assess domains
3. Export database
4. Import to share assessments
5. Merged automatically on conflict

### Enterprise
1. Provision browser profile with extension
2. Configure reputation endpoint (central service)
3. Users contribute assessments
4. Central aggregation via service backend
5. Shared threat intelligence

---

**Last Updated:** November 2026

**Quick Help:**
- Stuck? Check the README.md
- Need details? See docs/ folder
- Found a bug? Create GitHub issue
- Want to contribute? See DEVELOPMENT.md
