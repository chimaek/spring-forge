# Changelog

All notable changes to Spring Forge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Favorite presets: save/load project configurations (groupId, dependencies, etc.) via globalState
- Dependency popularity tags: "Popular" badge on frequently used dependencies (web, jpa, security, etc.)
- Smart recommendations: suggests commonly paired dependencies based on current selection
- Pre-generation preview: pom.xml / build.gradle preview modal before project creation

### Fixed

- Project directory not found after generation on Windows (path verification + fallback detection)

## [0.1.0] - 2026-02-25

### Added

- Two-panel visual UI for Spring Boot project generation
- Real-time metadata from official start.spring.io API (no hardcoded dependencies)
- Dependency search across name, ID, and description fields
- Boot version compatibility check with automatic deselection of incompatible dependencies
- Selected dependencies displayed as removable badges
- In-memory metadata cache with 1-hour TTL and manual refresh
- Keyboard navigation: `/` to focus search, arrow keys to browse, Enter to toggle
- Post-generation automation: build tool detection, terminal run command suggestion
- Extension recommendations: Java Extension Pack, Spring Boot Extension Pack
- Activity Bar icon with Welcome View for one-click access
- CSP nonce-based security for Webview
- Dark, light, and high-contrast theme support via VS Code CSS variables
- 42 test cases (nock HTTP mock, JSDOM DOM tests, ZIP binary tests, Extension Host integration)
- esbuild dual build pipeline (Node.js CJS + Browser IIFE)
- Production build: clean -> type-check -> minified bundle (~60KB VSIX)
