# Changelog

All notable changes to Spring Forge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-02

### Added

- Dependency detail tooltip: click info button to see description, ID, version compatibility, and official documentation links

## [0.3.0] - 2026-03-01

### Added

- Recent generation history: last 5 projects saved in globalState for quick reload via header dropdown

## [0.2.0] - 2026-02-28

### Added

- Two-panel visual UI for Spring Boot project generation (`841bfe5`, `7916ad5`)
- Real-time metadata from official start.spring.io API — no hardcoded dependencies
- Dependency search across name, ID, and description fields
- Boot version compatibility check with automatic deselection of incompatible dependencies
- Selected dependencies displayed as removable badges
- In-memory metadata cache with 1-hour TTL and manual refresh
- Keyboard navigation: `/` to focus search, arrow keys to browse, Enter to toggle
- Post-generation automation: build tool detection, terminal run command suggestion
- Extension recommendations: Java Extension Pack, Spring Boot Extension Pack
- Favorite presets: save/load project configurations (groupId, dependencies, etc.) via globalState
- Dependency popularity tags: "Popular" badge on frequently used dependencies (web, jpa, security, etc.)
- Smart recommendations: suggests commonly paired dependencies based on current selection
- Pre-generation preview: pom.xml / build.gradle preview modal before project creation
- Custom Initializr server URL setting (`springForge.initializrUrl`) for enterprise/private servers (`46e8220`)
- 42 test cases (nock HTTP mock, JSDOM DOM tests, ZIP binary tests, Extension Host integration)

### Changed

- Keyboard shortcut changed from `Ctrl+Shift+S` / `Cmd+Shift+S` to `Ctrl+Alt+S` / `Cmd+Option+S` to avoid conflicts with VS Code built-in Save All / Save As (`0e3ed7e`)

### Fixed

- Project directory not found after generation on Windows (path verification + fallback detection)

## [0.1.0] - 2026-02-25

- Initial VS Code extension scaffold with activation entry point (`2e5a539`)
- esbuild dual build pipeline: Node.js CJS + Browser IIFE (`a992e1e`)
- Webview UI type definitions and app scaffold (`b191ad4`)
- Activity Bar icon with Welcome View for one-click access
- CSP nonce-based security for Webview
- Dark, light, and high-contrast theme support via VS Code CSS variables
- Production build: clean -> type-check -> minified bundle (~60KB VSIX)
- Project documentation: README (EN/KR), CHANGELOG (`5bafd08`)
