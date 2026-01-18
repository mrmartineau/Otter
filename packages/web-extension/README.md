# Otter Web Extension

A universal browser extension for saving pages to [Otter](https://github.com/mrmartineau/otter), a simple bookmark manager. This extension works on both Chrome and Firefox browsers.

## Features

- 🦦 Save pages to Otter with one click
- ⌨️ Keyboard shortcuts for quick actions
- 🔧 Configurable Otter instance URL
- 📱 Choose between popup or tab for new bookmarks
- 🌐 Cross-browser compatibility (Chrome & Firefox)
- 🎯 Context menu integration
- 💾 Cross-device settings sync

## Installing this Extension

### Development Build

1. Clone this repository
2. Navigate to this directory: `packages/web-extension`
3. Install dependencies: `npm install`
4. Build the extension: `npm run build`
5. Load the extension in your browser:

#### Chrome
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load Unpacked"
4. Select the `dist/chrome` directory

#### Firefox
1. Go to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `dist/firefox/manifest.json` file

## Development

### Scripts

- `npm run build` - Build for both Chrome and Firefox
- `npm run build:chrome` - Build only for Chrome
- `npm run build:firefox` - Build only for Firefox
- `npm run dev:chrome` - Development build with watch for Chrome
- `npm run dev:firefox` - Development build with watch for Firefox
- `npm run format` - Format code with Prettier

### Project Structure

```
web-extension/
├── src/                    # Shared source code
│   ├── background.js       # Background script (service worker)
│   ├── contentScript.js    # Content script
│   ├── popup.js           # Popup interface
│   ├── options.js         # Options page logic
│   ├── getStorageItems.js # Storage utility
│   └── browser-api.js     # Cross-browser API wrapper
├── public/                # Shared static assets
│   ├── icons/             # Extension icons
│   ├── options.html       # Options page
│   ├── options.css        # Options styles
│   ├── popup.html         # Popup (if needed)
│   └── popup.css          # Popup styles
├── manifests/             # Browser-specific manifests
│   ├── base.json         # Base manifest
│   ├── chrome.json       # Chrome-specific settings
│   └── firefox.json      # Firefox-specific settings
├── config/                # Build configuration
│   ├── webpack.common.js  # Shared webpack config
│   ├── webpack.config.js  # Main webpack config
│   ├── build.js          # Multi-browser build script
│   └── paths.js          # Path configuration
└── dist/                  # Build output
    ├── chrome/           # Chrome build
    └── firefox/          # Firefox build
```

## Cross-Browser Compatibility

This extension uses the WebExtensions API with a polyfill to ensure compatibility across browsers:

- **Chrome**: Uses native `chrome.*` APIs
- **Firefox**: Uses `browser.*` APIs with webextension-polyfill
- **Manifest V3**: Both browsers support Manifest V3

### Key Compatibility Features

1. **API Wrapper**: `src/browser-api.js` provides unified API access
2. **Screen Dimensions**: Cross-browser screen size detection
3. **Manifest Abstraction**: Browser-specific manifest files
4. **Service Worker**: Both browsers support Manifest V3 service workers

## Architecture

### Browser API Abstraction

The extension uses a unified API wrapper to handle cross-browser differences:

```javascript
// src/browser-api.js
import browser from 'webextension-polyfill'
export const browserAPI = typeof browser !== 'undefined' ? browser : chrome
```

All API calls use `browserAPI.*` instead of `chrome.*` or `browser.*` directly.

### Screen Size Detection

Different browsers handle screen dimensions differently:

- **Chrome**: `chrome.system.display.getInfo()`
- **Firefox**: Content script injection with `window.screen`
- **Fallback**: Default 1920x1080 dimensions

### Manifest Strategy

Three manifest files handle browser differences:

- `manifests/base.json` - Shared configuration
- `manifests/chrome.json` - Chrome-specific settings
- `manifests/firefox.json` - Firefox-specific settings

The build script merges these into browser-specific manifests.

## API Reference

### Core Functions

#### `getStorageItems()`
Retrieves extension settings from storage.

```javascript
const { otterInstanceUrl, newBookmarkWindowBehaviour } = await getStorageItems()
```

#### `openBookmarkletPage(url)`
Opens the Otter bookmark creation interface.

- `url`: The URL to save to Otter
- Respects user's popup/tab preference
- Centers popup window using screen dimensions

#### `getScreenDimensions()`
Gets screen dimensions across browsers.

```javascript
const { width, height } = await getScreenDimensions()
```

### Browser APIs Used

#### Storage
```javascript
await browserAPI.storage.sync.get('otterInstanceUrl')
await browserAPI.storage.sync.set({ otterInstanceUrl: '...' })
```

#### Tabs
```javascript
await browserAPI.tabs.create({ url: '...' })
await browserAPI.tabs.query({ active: true, currentWindow: true })
```

#### Windows
```javascript
await browserAPI.windows.create({
  url: '...',
  type: 'panel',
  width: 500,
  height: 800
})
```

#### Context Menus
```javascript
browserAPI.contextMenus.create({
  title: 'Save to Otter',
  contexts: ['page', 'link']
})
```

## Development

### Local Development Workflow

1. **Setup**
   ```bash
   cd packages/web-extension
   npm install
   ```

2. **Development Build**
   ```bash
   # Watch mode for Chrome
   npm run dev:chrome
   
   # Watch mode for Firefox  
   npm run dev:firefox
   ```

3. **Testing**
   - Load unpacked extension in target browser
   - Test all features: popup, context menu, keyboard shortcuts
   - Verify cross-browser functionality

4. **Production Build**
   ```bash
   npm run build
   ```

### File Structure Explained

#### Source Files (`src/`)

- **`background.js`**: Service worker handling core extension logic
  - Context menu creation and handling
  - Browser action clicks
  - Tab navigation monitoring
  - Window management for bookmark creation

- **`browser-api.js`**: Cross-browser API abstraction
  - Imports webextension-polyfill
  - Provides unified `browserAPI` object
  - Handles Chrome/Firefox differences

- **`contentScript.js`**: Currently minimal placeholder
  - Designed for future page interaction features
  - Can be used for DOM manipulation or page analysis

- **`popup.js`**: Extension popup interface (demo code)
  - Counter functionality as example
  - Demonstrates storage usage
  - Shows messaging patterns

- **`options.js`**: Extension options page logic
  - Handles Otter instance URL configuration
  - Manages popup/tab preference
  - Validates and saves settings

- **`getStorageItems.js`**: Storage utility
  - Centralized storage access
  - Returns formatted settings object

#### Configuration Files (`config/`)

- **`webpack.common.js`**: Shared webpack configuration
  - CSS processing with MiniCssExtractPlugin
  - Asset copying with CopyWebpackPlugin
  - Image handling with file-loader

- **`webpack.config.js`**: Main webpack configuration
  - Browser-specific output paths
  - WebExtension polyfill aliasing
  - Environment-based configuration

- **`build.js`**: Multi-browser build script
  - Merges manifest files
  - Runs webpack for each browser
  - Copies build outputs to `dist/`

- **`paths.js`**: Path configuration
  - Centralizes source and build paths
  - Used across webpack configuration

## Testing

### Manual Testing Checklist

#### Chrome Testing
- [ ] Load unpacked extension at `chrome://extensions/`
- [ ] Popup opens correctly
- [ ] Options page saves configuration
- [ ] Context menu appears on pages
- [ ] Keyboard shortcuts work
- [ ] Bookmark creation opens correctly

#### Firefox Testing
- [ ] Load temporary add-on at `about:debugging`
- [ ] All Chrome functionality works in Firefox
- [ ] Console shows no errors
- [ ] Extension icon appears correctly

#### Cross-Browser Testing
- [ ] Settings sync between builds
- [ ] Same functionality across browsers
- [ ] No browser-specific API errors

### Automated Testing

While not currently implemented, consider adding:

```bash
# Example future test commands
npm run test          # Run all tests
npm run test:chrome   # Chrome-specific tests
npm run test:firefox  # Firefox-specific tests
npm run lint         # Code linting
```

## Troubleshooting

### Common Issues

#### Extension Not Loading
- **Chrome**: Check `chrome://extensions/` for errors
- **Firefox**: Check `about:debugging` for error details
- Ensure manifest.json is valid JSON
- Verify all required files exist

#### API Errors
- Check browser console for error messages
- Verify permissions in manifest.json
- Ensure webextension-polyfill is properly loaded

#### Build Issues
- Clear `dist/` and rebuild: `rm -rf dist && npm run build`
- Check npm dependencies: `npm install`
- Verify webpack configuration syntax

#### Permission Issues
- **system.display** permission only available on Chrome
- Context menus may require page refresh
- Storage may be disabled in private browsing

### Debugging

#### Chrome DevTools
1. Open `chrome://extensions/`
2. Click "Inspect views" for service worker/popup
3. Use Chrome DevTools for debugging

#### Firefox Developer Tools
1. Go to `about:debugging`
2. Click "Inspect" for extension
3. Use Browser Toolbox for debugging

#### Console Logging
The extension includes detailed console logging:
- Extension initialization
- API call results
- Error handling
- Configuration changes

## Configuration

### Otter Instance Setup

1. Click the extension icon
2. If not configured, you'll be redirected to the options page
3. Enter your Otter instance URL (e.g., `https://otter.example.com`)
4. Choose whether new bookmarks open in a popup or tab
5. Click "Submit"

### Keyboard Shortcuts

- **Ctrl+Shift+D** (or **Cmd+Shift+D** on Mac): Save current page to Otter
- **Ctrl+Shift+S** (or **Cmd+Shift+S** on Mac): Quick save to Otter

### Context Menu

Right-click on any page or link and select "Save to Otter" to quickly save bookmarks.

## Advanced Configuration

### Custom Build Targets

You can extend the build system for additional browsers:

```javascript
// config/build.js - Add new browser
async function buildForEdge() {
  console.log('Building for Edge...')
  // Edge build logic here
}
```

### Environment Variables

Configure builds with environment variables:

```bash
# Production build
NODE_ENV=production npm run build

# Custom output directory
OUTPUT_DIR=custom npm run build
```

### Manifest Customization

Modify browser-specific manifests in `manifests/` directory:

#### Chrome-specific Settings
```json
{
  "permissions": ["system.display"],
  "minimum_chrome_version": "88"
}
```

#### Firefox-specific Settings
```json
{
  "browser_specific_settings": {
    "gecko": {
      "id": "your-extension@example.com",
      "strict_min_version": "109.0"
    }
  }
}
```

## Publishing

### Chrome Web Store

1. **Preparation**
   ```bash
   npm run build:chrome
   cd dist/chrome
   zip -r ../otter-chrome.zip .
   ```

2. **Store Listing**
   - Visit [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Upload `otter-chrome.zip`
   - Fill in store listing details
   - Submit for review

3. **Requirements**
   - $5 developer fee
   - Privacy policy URL
   - Detailed description and screenshots

### Firefox Add-ons

1. **Preparation**
   ```bash
   npm run build:firefox
   cd dist/firefox
   zip -r ../otter-firefox.zip .
   ```

2. **Add-on Listing**
   - Visit [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
   - Upload `otter-firefox.zip`
   - Complete add-on details
   - Submit for review

3. **Requirements**
   - Free developer account
   - Mozilla Add-on agreement
   - Extension review process

### Edge Add-ons

Since Edge uses Chromium, you can submit the Chrome build:

1. Visit [Microsoft Edge Add-ons Developer Dashboard](https://partner.microsoft.com/dashboard/microsoftedge)
2. Upload the Chrome build (`dist/chrome/`)
3. Follow Microsoft's review process

## Security Considerations

### Content Security Policy

The extension uses default CSP settings. For custom CSP requirements:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  }
}
```

### Permissions Management

Only request necessary permissions:

- **`storage`**: For user settings persistence
- **`activeTab`**: For current tab access
- **`contextMenus`**: For right-click functionality
- **`tabs`**: For creating and managing tabs
- **`scripting`**: For content script injection
- **`webNavigation`**: For page load monitoring
- **`system.display`**: For window positioning (Chrome only)

### Best Practices

1. **Validate User Input**
   ```javascript
   // Always validate URLs and settings
   function validateUrl(url) {
     try {
       new URL(url)
       return true
     } catch {
       return false
     }
   }
   ```

2. **Secure Storage**
   ```javascript
   // Use sync storage with caution
   // Avoid storing sensitive information
   browserAPI.storage.sync.set({ otterInstanceUrl })
   ```

3. **Error Handling**
   ```javascript
   // Always handle API errors
   try {
     await browserAPI.tabs.create({ url })
   } catch (error) {
     console.error('Failed to create tab:', error)
   }
   ```

## Performance Optimization

### Bundle Size Reduction

The build system includes optimization:

- **Minification**: Production builds minify JavaScript
- **Tree Shaking**: Unused code is removed
- **Asset Optimization**: Images are optimized

To analyze bundle size:

```bash
npm run build:chrome
cd dist/chrome
du -sh *  # Check file sizes
```

### Memory Usage

- Service workers are event-driven and use minimal memory
- Content scripts are lightweight
- Storage operations are batched when possible

### Network Optimization

- Single network request for bookmark creation
- Local caching of user settings
- Efficient URL joining with `proper-url-join`

## Internationalization

### Adding Locales

To add multi-language support:

1. **Create Locale Files**
   ```
   public/_locales/
   ├── en/
   │   └── messages.json
   └── es/
       └── messages.json
   ```

2. **Update Manifest**
   ```json
   {
     "default_locale": "en",
     "description": "__MSG_extensionDescription__"
   }
   ```

3. **Use in Code**
   ```javascript
   browserAPI.i18n.getMessage('extensionDescription')
   ```

### Current Implementation

The extension currently uses English text directly. Internationalization can be added as needed.

## Version Management

### Semantic Versioning

Follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features
- **PATCH**: Bug fixes

### Release Process

1. Update `version` in manifest files
2. Update `package.json` version
3. Create git tag: `git tag v1.0.0`
4. Build and upload to stores
5. Create GitHub release

### Changelog

Maintain `CHANGELOG.md` with format:

```markdown
## [1.0.0] - 2024-01-01
### Added
- Initial release
- Cross-browser support
- Otter integration

### Changed
- Migrated to Manifest V3
- Updated UI styling
```

## Migration Guide

### From Chrome Extension

If migrating from the original Chrome extension:

1. **Settings Migration**
   - Settings are stored in `chrome.storage.sync`
   - Universal extension uses the same storage key names
   - Existing settings should automatically transfer

2. **API Changes**
   - Replace `chrome.*` with `browserAPI.*`
   - Add webextension-polyfill import
   - Update manifest to V3 if needed

3. **Build System**
   - Original used single webpack config
   - Universal extension uses multi-browser build
   - New manifest structure in `manifests/` directory

### From Manifest V2

If upgrading from Manifest V2:

1. **Manifest Changes**
   ```json
   // V2
   "browser_action": { ... }
   "background": {
     "scripts": ["background.js"],
     "persistent": false
   }

   // V3  
   "action": { ... }
   "background": {
     "service_worker": "background.js"
   }
   ```

2. **API Changes**
   - `chrome.browser_action` → `chrome.action`
   - Background scripts → Service worker
   - Execute script method changes

## Troubleshooting

### Common Issues

#### Extension Not Loading
- **Chrome**: Check `chrome://extensions/` for errors
- **Firefox**: Check `about:debugging` for error details
- Ensure manifest.json is valid JSON
- Verify all required files exist

#### API Errors
- Check browser console for error messages
- Verify permissions in manifest.json
- Ensure webextension-polyfill is properly loaded

#### Build Issues
- Clear `dist/` and rebuild: `rm -rf dist && npm run build`
- Check npm dependencies: `npm install`
- Verify webpack configuration syntax

#### Permission Issues
- **system.display** permission only available on Chrome
- Context menus may require page refresh
- Storage may be disabled in private browsing

### Debugging

#### Chrome DevTools
1. Open `chrome://extensions/`
2. Click "Inspect views" for service worker/popup
3. Use Chrome DevTools for debugging

#### Firefox Developer Tools
1. Go to `about:debugging`
2. Click "Inspect" for extension
3. Use Browser Toolbox for debugging

#### Console Logging
The extension includes detailed console logging:
- Extension initialization
- API call results
- Error handling
- Configuration changes

### Error Codes

#### Storage Errors
```
Error: Missing otterInstanceUrl
```
**Solution**: Configure Otter instance URL in options page.

#### Navigation Errors
```
Error: Invalid URL
```
**Solution**: Check Otter instance URL format.

#### Permission Errors
```
Error: Permission denied
```
**Solution**: Verify required permissions in manifest.

## Contributing

### Development Guidelines

1. **Code Style**
   ```bash
   npm run format  # Format with Prettier
   npm run lint    # Lint code (when configured)
   ```

2. **Testing**
   - Test in both Chrome and Firefox
   - Verify all features work correctly
   - Check console for errors

3. **Commit Messages**
   ```
   feat: add new feature
   fix: resolve issue
   docs: update documentation
   refactor: improve code structure
   ```

### Pull Request Process

1. Fork this repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test in both Chrome and Firefox
5. Update documentation if needed
6. Submit a pull request

### Contribution Areas

We welcome contributions in:

- **New Features**: Bookmark organization, search, tags
- **UI Improvements**: Better popup design, animations
- **Browser Support**: Safari, Edge, Opera
- **Performance**: Bundle optimization, caching
- **Documentation**: Examples, tutorials, API docs
- **Testing**: Unit tests, integration tests

## License

[MIT](https://choosealicense.com/licenses/mit/) © [Zander Martineau](https://zander.wtf)

## Credits

This project was inspired by the original Chrome extension and has been enhanced for cross-browser compatibility.

### Libraries and Tools

- **webextension-polyfill** - Cross-browser compatibility
- **webpack** - Build system and bundling
- **proper-url-join** - URL manipulation
- **CopyWebpackPlugin** - Static asset copying
- **MiniCssExtractPlugin** - CSS extraction

### Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Firefox Extension Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [WebExtensions API Reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-on_SDK/API)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

## Support

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/mrmartineau/otter/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mrmartineau/otter/discussions)
- **Documentation**: [Otter Wiki](https://github.com/mrmartineau/otter/wiki)

### Reporting Bugs

When reporting bugs, include:

1. **Browser and version**
2. **Operating system**
3. **Extension version**
4. **Steps to reproduce**
5. **Expected vs actual behavior**
6. **Console errors (if any)**

---

> Made by Zander • [zander.wtf](https://zander.wtf) • [GitHub](https://github.com/mrmartineau/) • [Mastodon](https://main.elk.zone/toot.cafe/@zander)