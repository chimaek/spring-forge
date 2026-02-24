import type { InitializrMetadata, GenerateOptions } from "../../api/types";
import { createProjectMeta, ProjectMetaState } from "./components/ProjectMeta";
import { DependencySearch } from "./components/DependencySearch";
import { createGenerateButton } from "./components/GenerateButton";

interface VsCodeApi {
  postMessage: (msg: object) => void;
}

export function renderApp(
  root: HTMLElement,
  metadata: InitializrMetadata,
  vscode: VsCodeApi
) {
  root.innerHTML = "";

  // Header
  const header = document.createElement("div");
  header.className = "header";
  header.innerHTML = `
    <span class="header-title">Spring Initializr</span>
    <button class="refresh-btn" id="refreshBtn">새로고침</button>
  `;
  root.appendChild(header);

  // Layout
  const layout = document.createElement("div");
  layout.className = "layout";
  root.appendChild(layout);

  // Left panel: Project metadata
  const panelLeft = document.createElement("div");
  panelLeft.className = "panel-left";
  layout.appendChild(panelLeft);

  const metaState: ProjectMetaState = {
    type: metadata.type.default,
    language: metadata.language.default,
    bootVersion: metadata.bootVersion.default,
    groupId: metadata.groupId.default,
    artifactId: metadata.artifactId.default,
    name: metadata.name.default,
    description: metadata.description.default,
    packageName: metadata.packageName.default,
    packaging: metadata.packaging.default,
    javaVersion: metadata.javaVersion.default,
  };

  createProjectMeta(panelLeft, metadata, metaState, () => {
    depSearch.updateBootVersion(metaState.bootVersion);
  });

  // Right panel
  const panelRight = document.createElement("div");
  panelRight.className = "panel-right";
  layout.appendChild(panelRight);

  // Dependency search area
  const depHeader = document.createElement("div");
  depHeader.style.padding = "12px 16px";
  depHeader.innerHTML = `
    <div class="section-title">Dependencies</div>
    <input type="text" class="dep-search-input" placeholder="의존성 검색... ( / 키로 포커스)" id="depSearchInput">
  `;
  panelRight.appendChild(depHeader);

  const depListWrapper = document.createElement("div");
  depListWrapper.className = "dep-list-wrapper";
  panelRight.appendChild(depListWrapper);

  // Badges area
  const badgesArea = document.createElement("div");
  badgesArea.className = "badges-area";
  panelRight.appendChild(badgesArea);

  // Generate button area
  const generateArea = document.createElement("div");
  generateArea.className = "generate-area";
  panelRight.appendChild(generateArea);

  const searchInput = depHeader.querySelector(
    "#depSearchInput"
  ) as HTMLInputElement;

  let selectedDeps: string[] = [];

  const depSearch = new DependencySearch(
    depListWrapper,
    badgesArea,
    searchInput
  );
  depSearch.initialize(
    metadata.dependencies.values,
    metaState.bootVersion,
    (ids) => {
      selectedDeps = ids;
    }
  );

  createGenerateButton(generateArea, () => {
    const options: GenerateOptions = {
      type: metaState.type,
      language: metaState.language,
      bootVersion: metaState.bootVersion,
      groupId: metaState.groupId,
      artifactId: metaState.artifactId,
      name: metaState.name,
      description: metaState.description,
      packageName: metaState.packageName,
      packaging: metaState.packaging,
      javaVersion: metaState.javaVersion,
      dependencies: selectedDeps,
    };
    vscode.postMessage({ command: "generate", payload: options });
  });

  // Refresh button
  document.getElementById("refreshBtn")?.addEventListener("click", () => {
    vscode.postMessage({ command: "refresh" });
  });

  // Global keyboard shortcut: "/" to focus dependency search
  document.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement;
    const isTyping =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT";
    if (e.key === "/" && !isTyping) {
      e.preventDefault();
      depSearch.focusSearch();
    }
  });
}
