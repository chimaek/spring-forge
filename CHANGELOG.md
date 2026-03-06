# Changelog

All notable changes to Spring Forge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-03-06

### Added

- **VS Code Walkthrough onboarding:**
  step-by-step guide for first-time users — covers opening the panel, searching dependencies,
  saving presets, and previewing/generating projects. Accessible via the Get Started tab.

## [1.1.0] - 2026-03-05

### Added

- **Update notification (What's New):**
  shows an information message after extension update with "View Changelog" button
  that opens CHANGELOG.md in Markdown preview

## [1.0.4] - 2026-03-04

### Changed

- **Marketplace metadata:**
  added `galleryBanner` (Spring green `#6DB33F`), changed category from `Other` to `Programming Languages`,
  added `gradle` and `maven` keywords
- **CI workflow:**
  changed `npm ci` to `npm install`, added `--allow-same-version` flag to version sync

## [1.0.3] - 2026-03-03

### Added

- **Demo GIF/PNG in README:**
  added `demo.gif` and `demo.png` to both English and Korean sections
- **GitHub Actions auto-publish:**
  tag push (`v*`) triggers automatic build and Marketplace deployment

## [1.0.2] - 2026-03-02

### Fixed

- **Save Preset / Delete Preset not working:**
  `window.prompt()` blocked by Webview CSP,
  replaced with `vscode.window.showInputBox()` and `showQuickPick()` via Extension Host

- **History restore false compatibility warning:**
  boot version change event triggered `updateBootVersion` against old dependencies

- **"Open in New Window" opened wrong directory:**
  `src/` instead of project root — ZIP now extracted into `artifactId` subdirectory

- **Build file preview showed inaccurate hardcoded template:**
  now fetches actual `pom.xml` / `build.gradle` from Spring Initializr API

- **Gradle Kotlin DSL preview showed Groovy syntax:**
  `/build.gradle` endpoint ignores `type` param,
  now extracts `build.gradle.kts` from ZIP for accurate Kotlin DSL preview

### Changed

- Removed non-project build types (Gradle Config, Maven POM) from UI
  — only full project types are shown
- Added `npm run vsix` script for VSIX packaging with auto-cleanup of existing files

## [1.0.1] - 2026-03-02

### Fixed

- **Tooltip event listener memory leak:**
  `mousedown` / `keydown` handlers now properly cleaned up on dismiss

- **Type safety:**
  metadata payload typed as `InitializrMetadata` instead of `unknown`

- **External link error handling:**
  added try/catch for invalid URLs in `openExternalLink`

- **History date format:**
  month, day, hour now consistently zero-padded

## [1.0.0] - 2026-03-02

### Added

- **Dependency detail tooltip:**
  click ⓘ button to see description, ID, version compatibility, and official documentation links

## [0.3.0] - 2026-03-01

### Added

- **Recent generation history:**
  last 5 projects saved in `globalState` for quick reload via header dropdown

## [0.2.0] - 2026-02-28

### Added

- **Two-panel visual UI** for Spring Boot project generation
- **Real-time metadata** from official start.spring.io API — no hardcoded dependencies
- **Dependency search** across name, ID, and description fields
- **Boot version compatibility check**
  with automatic deselection of incompatible dependencies
- **Selected dependencies** displayed as removable badges
- **In-memory metadata cache** with 1-hour TTL and manual refresh
- **Keyboard navigation:**
  `/` to focus search, arrow keys to browse, Enter to toggle
- **Post-generation automation:**
  build tool detection, terminal run command suggestion
- **Extension recommendations:**
  Java Extension Pack, Spring Boot Extension Pack
- **Favorite presets:**
  save/load project configurations (groupId, dependencies, etc.) via `globalState`
- **Dependency popularity tags:**
  "Popular" badge on frequently used dependencies (web, jpa, security, etc.)
- **Smart recommendations:**
  suggests commonly paired dependencies based on current selection
- **Pre-generation preview:**
  `pom.xml` / `build.gradle` preview modal before project creation
- **Custom Initializr server URL:**
  `springForge.initializrUrl` setting for enterprise/private servers
- **42 test cases:**
  nock HTTP mock, JSDOM DOM tests, ZIP binary tests, Extension Host integration

### Changed

- **Keyboard shortcut** changed from `Ctrl+Shift+S` to `Ctrl+Alt+S`
  to avoid conflicts with VS Code built-in Save All / Save As

### Fixed

- **Project directory not found** after generation on Windows
  (path verification + fallback detection)

## [0.1.0] - 2026-02-25

- **VS Code Extension scaffold** with activation entry point
- **esbuild dual build pipeline:** Node.js CJS + Browser IIFE
- **Webview UI** type definitions and app scaffold
- **Activity Bar icon** with Welcome View for one-click access
- **CSP nonce-based security** for Webview
- **Theme support:** dark, light, and high-contrast via VS Code CSS variables
- **Production build:** clean → type-check → minified bundle (~60KB VSIX)
- **Project documentation:** README (EN/KR), CHANGELOG
