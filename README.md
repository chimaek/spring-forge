# Spring Forge

> Visual Spring Boot project generator inside VS Code — powered by the official [start.spring.io](https://start.spring.io) API.

No more switching to the browser. Create Spring Boot projects with a full visual UI, right from your editor.

**[한국어](#한국어)** | English

## Why Spring Forge?

The existing `vscode-spring-initializr` extension uses a QuickPick (CLI-style) flow where you select options one at a time. That works, but it makes it hard to browse 140+ dependencies or compare options at a glance.

**Spring Forge** gives you the same two-panel layout you know from start.spring.io — project settings on the left, dependency search on the right — all inside VS Code.

## Features

- **Always up-to-date** — Fetches metadata directly from the official Spring Initializr API. No hardcoded dependency lists.
- **Visual two-panel UI** — Left panel for project settings (build type, language, Boot version, metadata). Right panel for dependency search and selection.
- **Dependency search** — Search across name, ID, and description simultaneously.
- **Version compatibility** — Automatically disables incompatible dependencies when you change the Boot version, with a warning message.
- **Keyboard-first UX** — `/` to focus search, arrow keys to navigate, Enter to toggle, Escape to return.
- **Favorite presets** — Save and load your frequently used project configurations (groupId, dependencies, etc.) with one click.
- **Dependency popularity** — "Popular" tags on commonly used dependencies. Smart recommendations based on your current selection.
- **Pre-generation preview** — Preview the generated `pom.xml` or `build.gradle` before creating the project.
- **Post-generation setup** — Detects Maven/Gradle and offers to run the project. Suggests Java Extension Pack and Spring Boot Extension Pack if not installed.
- **Activity Bar icon** — One-click access from the sidebar.
- **Theme support** — Adapts to dark, light, and high-contrast themes using VS Code CSS variables.
- **Lightweight** — ~60KB VSIX. No React, no external CDN. Vanilla TypeScript + CSP-compliant.

## Getting Started

### Install

- **VS Code Marketplace**: Search for `spring-forge`
- **Manual**: Download the `.vsix` from [Releases](https://github.com/chimaek/spring-forge/releases) and run `Extensions: Install from VSIX...`

### Usage

1. Click the Spring Forge icon in the Activity Bar (left sidebar), or
2. Open Command Palette (`Ctrl+Shift+P`) and run `Spring: New Project (Initializr UI)`, or
3. Use the keyboard shortcut `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`)

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Shift+S` | Open Spring Forge |
| `/` | Focus dependency search |
| `Arrow Up/Down` | Navigate dependency list |
| `Enter` / `Space` | Toggle selected dependency |
| `Escape` | Return to search input |

## Architecture

```
Extension Host (Node.js)          Webview (Browser)
┌─────────────────────┐           ┌──────────────────────┐
│ InitializrClient     │           │ ProjectMeta          │
│  - fetchMetadata()  │◄─────────►│ DependencySearch     │
│  - downloadZip()    │ postMessage│ GenerateButton       │
│ Downloader          │           │                      │
│ InitializrPanel     │           │ Vanilla TypeScript    │
└─────────────────────┘           └──────────────────────┘
```

- **Extension Host** handles API calls, ZIP download/extraction, and VS Code integration
- **Webview** renders the UI with Vanilla TypeScript (no framework)
- Communication via `postMessage` / `onDidReceiveMessage` bridge
- In-memory cache with 1-hour TTL for metadata

## Development

```bash
# Install dependencies
npm install

# Development build
npm run build

# Watch mode
npm run watch

# Type check
npm run check-types

# Run tests
npm test

# Package VSIX
npx @vscode/vsce package --no-dependencies
```

### Debug (F5)

1. Open this project in VS Code
2. Press `F5` to launch Extension Development Host
3. Run `Spring: New Project (Initializr UI)` from Command Palette

## Tech Stack

| Role | Technology |
|------|-----------|
| Language | TypeScript 5.x |
| Bundler | esbuild (dual build: Node.js + Browser) |
| Webview UI | Vanilla TypeScript + CSS Custom Properties |
| HTTP Client | Node.js built-in `https` module |
| ZIP Extraction | `unzipper` (bundled via esbuild) |
| Testing | Mocha + nock (HTTP mock) + JSDOM (DOM) + @vscode/test-electron |

## License

[MIT](LICENSE)

---

## 한국어

> VS Code 안에서 Spring Boot 프로젝트를 시각적 UI로 생성하는 확장 프로그램. [start.spring.io](https://start.spring.io) 공식 API 기반.

브라우저로 전환할 필요 없이, 에디터에서 바로 Spring Boot 프로젝트를 만들 수 있습니다.

## Spring Forge를 만든 이유

기존 `vscode-spring-initializr` 확장은 QuickPick 방식으로 옵션을 하나씩 선택합니다. 140개가 넘는 의존성을 한눈에 비교하거나 검색하기 어렵습니다.

**Spring Forge**는 start.spring.io에서 쓰던 것과 동일한 2패널 레이아웃을 VS Code 안에서 제공합니다. 왼쪽은 프로젝트 설정, 오른쪽은 의존성 검색/선택.

## 주요 기능

- **항상 최신 상태** — start.spring.io 공식 API에서 메타데이터를 실시간 조회. 의존성 목록 하드코딩 없음.
- **시각적 2패널 UI** — 왼쪽: 빌드 타입, 언어, Boot 버전, 메타데이터. 오른쪽: 의존성 검색 및 선택.
- **의존성 검색** — 이름, ID, 설명 세 필드를 동시에 검색.
- **버전 호환성 검증** — Boot 버전 변경 시 비호환 의존성 자동 해제 + 경고 메시지.
- **키보드 중심 UX** — `/`로 검색 포커스, 화살표 키로 탐색, Enter로 선택 토글, Escape로 복귀.
- **즐겨찾기 프리셋** — 자주 쓰는 프로젝트 설정(groupId, 의존성 조합 등)을 저장하고 원클릭 로드.
- **의존성 인기도 표시** — 자주 사용되는 의존성에 "Popular" 태그. 현재 선택에 기반한 스마트 추천.
- **생성 전 미리보기** — 프로젝트 생성 전 `pom.xml` / `build.gradle` 미리보기 모달.
- **프로젝트 생성 후 자동 설정** — Maven/Gradle 자동 감지 후 실행 명령어 제안. Java Extension Pack, Spring Boot Extension Pack 미설치 시 추천.
- **Activity Bar 아이콘** — 사이드바에서 클릭 한 번으로 실행.
- **테마 지원** — 다크/라이트/하이콘트라스트 테마 자동 대응.
- **경량** — VSIX ~60KB. React 없이 Vanilla TypeScript + CSP 준수.

## 시작하기

### 설치

- **VS Code Marketplace**: `spring-forge` 검색
- **수동 설치**: [Releases](https://github.com/chimaek/spring-forge/releases)에서 `.vsix` 다운로드 후 `Extensions: Install from VSIX...` 실행

### 사용법

1. Activity Bar(왼쪽 사이드바)의 Spring Forge 아이콘 클릭, 또는
2. 명령 팔레트(`Ctrl+Shift+P`)에서 `Spring: New Project (Initializr UI)` 실행, 또는
3. 단축키 `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`)

### 키보드 단축키

| 키 | 동작 |
|----|------|
| `Ctrl+Shift+S` | Spring Forge 열기 |
| `/` | 의존성 검색창 포커스 |
| `위/아래 화살표` | 의존성 목록 탐색 |
| `Enter` / `Space` | 의존성 선택/해제 |
| `Escape` | 검색창으로 복귀 |

## 라이선스

[MIT](LICENSE)
