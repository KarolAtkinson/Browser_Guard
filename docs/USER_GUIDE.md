# User Guide

A comprehensive guide for end users of BrowserGuard extension.

## Table of Contents

1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Web Protection](#web-protection)
5. [Privacy Tools](#privacy-tools)
6. [Blocked Activity](#blocked-activity)
7. [Settings & Configuration](#settings--configuration)
8. [Database Management](#database-management)
9. [FAQ](#faq)
10. [Troubleshooting](#troubleshooting)

## Installation

### Chrome/Edge

1. Download the extension or build from source
2. Open extension management:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" (Chrome) or "Load unpacked" (Edge)
5. Select the BrowserGuard extension folder
6. Click the BrowserGuard icon and pin to your toolbar

### Firefox

1. Download the extension or build from source
2. Open Firefox's about page: `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `manifest.json` from the BrowserGuard folder
5. Click the BrowserGuard icon and pin to your toolbar

## Getting Started

### First Launch

When you first launch BrowserGuard:

1. **Toolbar Icon** - Shows in your browser toolbar
2. **Popup** - Click icon to see quick status
3. **Dashboard** - Click "Dashboard" button to open full interface
4. **Permissions** - Accept requested permissions (reviewed before install)

### Quick Assessment

Assess a website directly from the popup:

1. Click BrowserGuard icon in toolbar
2. You'll see the current site
3. Choose assessment:
   - **✅ Safe** - Website is legitimate and trustworthy
   - **❌ Unsafe** - Website appears dangerous or suspicious
   - **❓ Unsure** - Not sure about the site's safety
4. Assessment is recorded and helps protect you on future visits

## Dashboard Overview

Access the full dashboard by clicking the BrowserGuard icon and selecting "Dashboard". The dashboard has 5 main tabs:

### Overview Tab

**Status Summary**
- Current protection status (Enabled/Disabled)
- Number of sites you've assessed
- Number of blocked attempts
- Database health indicators

**Quick Stats**
- Safe sites whitelisted
- Dangerous sites blacklisted
- Sites under review (Greylist)
- Assessment history

**Recent Activity**
- Latest sites you've visited
- Recent blocks or warnings
- Assessment changes

### Web Protection

Configure how BrowserGuard blocks dangerous sites:

**Protection Level**
- **Standard** - Block sites on blacklist and high-risk phishing signals
- **Strict** - Block any site not on whitelist (enterprise mode)
- **Custom** - Choose specific protections

**Warning Interstitial**
- Shows before accessing risky sites
- Requires deliberate action to continue
- One-click continue if you understand the risk

**Phishing Detection**
- Detects common phishing patterns
- Checks domain age and registration
- Monitors for spoofed domains
- Identifies known phishing indicators

## Privacy Tools

Manage tracking and advertising filters:

### Tracking Filters

**Enabled Filters**
- **Analytics Trackers** - Block Google Analytics, Mixpanel, etc.
- **Advertising Cookies** - Remove ad-based cookie tracking
- **Cross-Site Trackers** - Block cookies from other domains
- **Social Media Tracking** - Block Facebook/Twitter trackers

**Toggle Filters**
- Enable/disable any filter
- Changes apply immediately
- Rules managed by Declarative Net Request API

### Advertising Control

**Ad Blocking**
- Block common ad networks
- Reduce data usage
- Improve page load speed

**Smart Blocking**
- Allow site-essential ads
- Block only aggressive tracking
- Configurable per site

## Blocked Activity

View history of blocked attempts and threats:

**Blocked Sites**
- Lists of sites BrowserGuard blocked
- Reason for blocking (blacklist, phishing, etc.)
- Number of blocks per site
- Timestamp of most recent block

**Warning Pages Shown**
- Sites where you were warned
- Whether you continued or went back
- Your assessment after visiting

**Tracking Blocked**
- Scripts blocked from trackers
- Cookies prevented from sending
- Frames removed from pages

**Export History**
- Download blocked activity as CSV
- Share with IT security team
- Analyze threat patterns

## Settings & Configuration

Detailed configuration options:

### General Settings

**Protection Status**
- **Enable/Disable** - Toggle BrowserGuard on/off
- Applies to all sites
- Settings persist across sessions

**Notifications**
- **Show warnings** - Display interstitial warnings
- **Show blocked alerts** - Notify when blocking tracking
- **Sound alerts** - Audible notification for threats

### Database Settings

**Current Database**
- Number of sites assessed
- Database size
- Last backup date

**Database Actions**
- **Export Database** - Save current assessments
- **Import Database** - Load assessments from file
- **Clear Database** - Remove all assessments
- **Merge Database** - Combine assessments from multiple profiles

**See "Database Management" section below for details**

### Company Reputation Integration

**Endpoint Configuration**
- **Enable Integration** - Toggle reputation service
- **Endpoint URL** - Company reputation service address
- **API Key** (if required) - Authentication token

**What Gets Sent**
- Only the domain name (e.g., "example.com")
- No page URL, no page contents
- No user information

**Expected Response**
```json
{
  "score": 50,
  "label": "Moderate Risk",
  "recommendation": "warn"
}
```

### Advanced Settings

**Heuristic Sensitivity**
- **Low** - Only block confirmed threats
- **Medium** - Default, balanced approach
- **High** - Block suspected threats

**Content Inspection**
- **Enable form inspection** - Check for insecure forms
- **Enable frame analysis** - Detect excessive external frames
- **Enable link labeling** - Label suspicious links on search results

**Data Retention**
- **Keep all records** - Retain full history
- **Archive old records** - Keep only recent (< 90 days)
- **Clear records periodically** - Automatic cleanup

## Database Management

### Viewing Your Assessment Database

1. Go to Dashboard → Settings
2. Click "View Assessment Database"
3. See three lists:

**Whitelist (Safe Sites)**
- Domains you marked safe
- Sites with consistent positive reputation
- Pre-loaded trusted domains

**Blacklist (Dangerous Sites)**
- Domains you marked unsafe
- Phishing sites confirmed by multiple users
- Known malware distribution sites

**Greylist (Under Review)**
- Conflicting assessments (some marked safe, others unsafe)
- Sites with mixed reputation signals
- Requires manual review for resolution

### Modifying Assessments

**Move between lists:**

1. Find domain in list
2. Click "Review" or "Change Assessment"
3. Choose new status:
   - Move to Whitelist (safe)
   - Move to Blacklist (dangerous)
   - Remove from lists (unsure)

**Edit entry details:**
- Update reporter label (name or email)
- Change assessment reason
- Add notes about the domain

### Export Database

**Create Backup**

1. Go to Settings → Database Actions
2. Click "Export Database"
3. Choose save location
4. File saved as `browser-guard-export-[date].json`

**Share with Team**

1. Export your database
2. Send JSON file to colleague
3. They import into their browser
4. Assessments merged automatically

**Merge Conflicts**
- If you marked site as "Safe" and import "Unsafe"
- Site moves to Greylist for review
- Prevents silent changes to your protection

### Import Database

**Merge from File**

1. Go to Settings → Database Actions
2. Click "Import Database"
3. Select JSON file to import
4. Confirm merge
5. BrowserGuard shows:
   - New assessments added
   - Conflicts moved to Greylist
   - Merge summary

**Merge from Team**

If your company shares assessment database:

1. Download latest database from internal source
2. Import into BrowserGuard
3. All team assessments now available locally
4. Your assessments exported and shared back

### Clear Database

**Reset All Assessments**

1. Settings → Database Actions
2. Click "Clear Database"
3. Confirm (cannot be undone)
4. All assessments removed
5. Fresh start with factory defaults

**Before Clearing:**
1. Export current database (backup)
2. Verify you have copies elsewhere

## FAQ

### How does BrowserGuard protect me?

BrowserGuard uses three layers:

1. **Whitelist/Blacklist** - Sites you or your company have assessed
2. **Heuristic Analysis** - Checks domain registration, age, patterns
3. **Reputation Service** - Optional company-provided threat intelligence

If a site matches any threat indicator, you see a warning before proceeding.

### Can I turn off warnings?

Yes, but we recommend keeping them enabled:

1. Go to Settings → General Settings
2. Toggle "Show warnings" off
3. You'll still be protected, but won't see interstitial warnings

**Note:** Some blocking will still occur (blacklisted sites)

### What data does BrowserGuard collect?

**Locally stored:**
- Domains you assess
- Assessment timestamps
- Block/warning history
- Your custom preferences

**Never collected:**
- Page contents or full URLs
- Your browsing history
- Personal information
- Passwords or form data

**Optional (if configured):**
- Domain names sent to company reputation service
- Only the hostname, not the full URL

### Can I export my data?

Yes, your data is yours:

1. Settings → Database Actions
2. Click "Export Database"
3. Saves as JSON file you can:
   - Back up locally
   - Share with others
   - Import in another browser
   - Edit manually if needed

### How do I report a website?

Report a suspicious site:

1. Visit the site
2. Click BrowserGuard icon
3. Select "❌ Unsafe"
4. Assessment recorded locally
5. If using company reputation service, your assessment contributes to company-wide threat intelligence

### Can I whitelist/blacklist sites?

Yes, three ways:

**Manual Assessment:**
1. Visit site
2. Click BrowserGuard → Safe/Unsafe/Unsure

**Edit Lists:**
1. Settings → Database Actions
2. Find domain in list
3. Change status or delete

**Import Whitelist:**
1. Create JSON file with domains
2. Settings → Import Database
3. Domains added to whitelist

### What's on the Greylist?

Conflicting assessments:
- You marked site "Safe"
- Reputation service marked it "Unsafe"
- Site moved to Greylist for your review

**To resolve:**
1. Visit site yourself
2. Decide if safe or unsafe
3. Update assessment
4. Site moves to Whitelist or Blacklist

### Can I use this at work?

Yes, BrowserGuard is designed for business:

1. **Company Deployment** - Admins can configure centrally
2. **Policy Management** - Set allowed/blocked domains
3. **Team Sharing** - Merge assessments from multiple users
4. **Logging** - Export activity for compliance

Contact your IT team about company deployment.

### How often should I update the blacklist?

**Local Database:**
- Automatically updated from your assessments
- Grows as you use BrowserGuard

**Shared Database:**
- If importing from company source, follow your IT team's schedule
- Typically updated daily or weekly

**Built-in Blocklist:**
- Includes known phishing sites
- Updated with new extension versions

### Does BrowserGuard block ads?

Yes, with customizable control:

1. Go to Privacy Tools
2. Enable/disable specific filters:
   - Advertising networks
   - Tracking scripts
   - Analytics services

You can block ads globally or per-site.

### Is BrowserGuard free?

Yes, completely free and open source. See the LICENSE file for terms.

## Troubleshooting

### "BrowserGuard not protecting me"

**Check:**
1. Click icon to see status
2. Verify protection is "Enabled"
3. If showing "Disabled," click to toggle on
4. Settings → General → Confirm "Protection Status" is on

**If still not working:**
1. Uninstall and reinstall extension
2. Clear browser cache
3. Try in private/incognito window

### "Warning page won't appear"

**Check:**
1. Settings → General Settings
2. Verify "Show warnings" is enabled
3. Try visiting a known dangerous site
4. Check browser console for errors

**Try:**
1. Clear browser cache
2. Disable other extensions temporarily
3. Test in private window

### "Can't import database"

**Verify file format:**
1. File must be `.json` format
2. File must be valid JSON (check syntax)
3. Must be from BrowserGuard export

**If error occurs:**
1. Try exporting from your computer first
2. Import that file to test
3. If works, original file may be corrupted

### "Database keeps resetting"

**Causes:**
1. Clearing browser data (clears extension storage)
2. Uninstalling extension
3. Browser sync issues

**Solutions:**
1. Export database before clearing browser data
2. Import after to restore
3. Configure automatic backups

### "Slow performance after using BrowserGuard"

**Check:**
1. How many domains in database?
   - Setting → Database → Current Database
2. Are tracking filters enabled?
   - Disable in Privacy Tools to test

**If too many assessments:**
1. Settings → Database Actions
2. Clear Database (back up first)
3. Fresh start

### "Company reputation endpoint not working"

**Verify settings:**
1. Settings → Reputation Integration
2. Check endpoint URL is correct
3. Verify endpoint is reachable from your network

**Test connection:**
1. Browser DevTools → Network tab
2. Click on a domain
3. Look for POST request to endpoint
4. Check response status

**If not working:**
1. Contact IT team
2. Verify endpoint is configured
3. Check if behind corporate proxy

### "Some websites not being checked"

**Possible reasons:**
1. Browser-internal pages (not checked by design)
2. HTTPS errors (some blocked before extension sees them)
3. Very fast navigation (may miss event)

**What BrowserGuard checks:**
- ✓ HTTP/HTTPS navigation
- ✓ Tab navigation
- ✓ Iframe navigation
- ✓ Search results

**What BrowserGuard doesn't check:**
- ✗ Browser-internal pages (settings, history, etc.)
- ✗ Browser extensions
- ✗ System error pages
- ✗ Instant redirects (too fast to intercept)

---

## Getting Help

**Having issues?** Try:

1. Check [FAQ](#faq) above
2. Review [Troubleshooting](#troubleshooting) section
3. Check browser console for error messages (DevTools → Console)
4. File issue on GitHub: [KarolAtkinson/Browser_Guard/issues](https://github.com/KarolAtkinson/Browser_Guard/issues)

**Provide when reporting:**
1. Browser and version
2. BrowserGuard version
3. Steps to reproduce
4. Screenshots or error messages
5. Browser console logs (if applicable)

---

**Last Updated:** November 2026
