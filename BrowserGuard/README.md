# README

## BrowserGuard
BrowserGuard is a free, local-first browser extension for protecting company users from phishing signals, risky destinations, advertising, and common trackers. Its WebExtensions design follows the UML’s controller, URL checker, content analyzer, tracker blocker, settings, popup, and options-page components.

## Features
- Checks top-level HTTP(S) navigations against locally managed allow and deny lists and heuristic phishing signals.
- Shows a warning interstitial for high-risk addresses, with a deliberate one-time continue action.
- Inspects the current page locally for insecure password forms, account links to other domains, and excessive external frames.
- Labels suspicious links on Google, Bing, DuckDuckGo, and Yahoo search pages using local URL signals.
- Filters a small built-in set of advertising and analytics domains through Declarative Net Request.
- Collects user assessments and local page-risk evidence in a central, extension-local site-intelligence database.
- Routes conflicting safe and unsafe assessments to Greylist; reviewed entries can be resolved to Whitelist or Blacklist.
- Imports and exports database snapshots so evidence from separate browser profiles can be merged.
- Supports an optional HTTPS company reputation endpoint. Only the destination hostname is sent; the endpoint is not contacted unless configured.
- Builds Chromium (Chrome and Edge) and Firefox packages from the same source.

## Project Structure
- `src/worker.js` coordinates settings, URL checks, reputation requests, DNR rules, and navigation warnings.
- `src/database.js` serializes local database changes, retains assessment history, derives list placement, and merges imported snapshots.
- `src/content.js` performs local DOM inspection and search-result labeling.
- `src/popup.*` provides current-site status and the protection toggle.
- `src/dashboard.*` provides the full tab-based dashboard opened from the BrowserGuard toolbar button, with overview, Web Protection, Privacy Tools, Blocked Activity, and Settings views.
- `src/options.*` manages protection preferences, site assessments, three-list review, database import/export, and the optional reputation endpoint.
- `Database/Whitelist/sites.json`, `Database/Blacklist/sites.json`, and `Database/Greylist/sites.json` are the requested list folders; `Database/Datasets/records.json` is the dataset folder template. The build includes this tree in both browser packages.
- Runtime records are written to WebExtension local storage under `siteIntelligence`; extension packages cannot write into their installed `Database/` JSON files. Use database export to create a portable snapshot, then import it in another profile to merge reports.
- `src/rules/privacy.json` contains the initial privacy filter rules.
- `manifests/` holds the browser-specific Manifest V3 declarations.
- `scripts/` builds the browser packages and performs structural checks.

## Build
Requires Node.js 20.11 or later. No package installation is needed.

```sh
npm run check
npm run build
```

The build writes loadable extensions to `dist/chromium` and `dist/firefox`. Build only one target with `npm run build:chrome` or `npm run build:firefox`.

## Install For Testing
1. Build the desired target.
2. In Chrome or Edge, open the extension management page, enable developer mode, choose **Load unpacked**, and select `dist/chromium`.
3. In Firefox, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `dist/firefox/manifest.json`.
4. Pin BrowserGuard and click its toolbar button to open the dashboard. Use the Safe, Unsafe, or Unsure controls in the site-intelligence settings to submit an assessment, or review Greylist items and configure the optional company reputation endpoint.

## Privacy And Permissions
URL analysis and DOM inspection run locally. The extension does not upload page contents or full URLs. Dataset records retain domains, assessment outcomes, timestamps, local risk scores/reasons, and optional reporter labels, not page contents. Database snapshots remain local unless a user explicitly exports and shares them. The optional reputation integration sends a hostname to the configured HTTPS endpoint. `<all_urls>` access is used for navigation checks, content inspection, and filtering across sites; users should review the requested permissions before installing. Settings and local counters are kept in the browser profile.

## Security Model And Limitations
This is a functional MVP, not a replacement for a maintained commercial threat-intelligence feed or enterprise endpoint controls. Local URL rules are heuristic and can produce false positives or miss new threats. The bundled advertising/tracker list is intentionally small and must be maintained to remain useful. BrowserGuard does not claim to identify every phishing page. Company deployments should manage the optional reputation service and block/allow policies centrally, review the permissions, and test policies against their browser versions before broad rollout.

The extension uses the WebExtensions API surface, with a Chromium service worker and a Firefox background script. Different reports merged from separate profiles will place a domain on Greylist when one says safe and another unsafe. Live automatic aggregation across company users requires an authenticated central backend; this local MVP merges profiles through explicit JSON import/export and does not silently upload user feedback. The optional reputation endpoint accepts a JSON POST body containing `{ "domain": "example.com" }` and returns `{ "score": 0, "label": "Known domain" }`; `score` is interpreted as risk from 0 to 100. The navigation warning is coordinated through `webNavigation` and tab updates; as with other extension-level checks, browser-internal pages and platform-specific navigation races are outside its control.

## Development Checks
`npm run simulate` runs two offline URL datasets through the exact classifier module imported by the extension worker. The reliable set uses expected-safe reference URLs; the untrustworthy set uses reserved `.test` domains to exercise local block-list and heuristic blocking. The simulator does not navigate to or contact any webpage. `npm test` also verifies every dataset expectation, Whitelist/Blacklist precedence, Greylist behavior, and assessment-database merge behavior. `npm run check` validates both manifests, required files, JSON rules/database templates, JavaScript syntax, and ensures simulation hosts are reserved or known reference sites. `npm run build` assembles each browser package and includes the `Database/` template tree.

## License
No license has been selected for this project yet.