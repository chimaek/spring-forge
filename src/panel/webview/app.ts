import type { InitializrMetadata, GenerateOptions, Preset } from "../../api/types";
import { createProjectMeta, ProjectMetaState } from "./components/ProjectMeta";
import { DependencySearch } from "./components/DependencySearch";
import { createGenerateButton } from "./components/GenerateButton";

interface VsCodeApi {
  postMessage: (msg: object) => void;
}

let currentPresets: Preset[] = [];
let metaState: ProjectMetaState;
let depSearch: DependencySearch;
let selectedDeps: string[] = [];
let currentVscode: VsCodeApi;
let currentMetadata: InitializrMetadata;

export function renderApp(
  root: HTMLElement,
  metadata: InitializrMetadata,
  vscode: VsCodeApi
) {
  root.innerHTML = "";
  currentVscode = vscode;
  currentMetadata = metadata;

  // Header
  const header = document.createElement("div");
  header.className = "header";
  header.innerHTML = `
    <span class="header-title">Spring Initializr</span>
    <div class="header-actions">
      <select class="preset-select" id="presetSelect">
        <option value="">-- Preset --</option>
      </select>
      <button class="header-btn" id="savePresetBtn" title="현재 설정을 프리셋으로 저장">Save Preset</button>
      <button class="refresh-btn" id="refreshBtn">새로고침</button>
    </div>
  `;
  root.appendChild(header);

  // Layout
  const layout = document.createElement("div");
  layout.className = "layout";
  root.appendChild(layout);

  // Left panel
  const panelLeft = document.createElement("div");
  panelLeft.className = "panel-left";
  layout.appendChild(panelLeft);

  metaState = {
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

  const badgesArea = document.createElement("div");
  badgesArea.className = "badges-area";
  panelRight.appendChild(badgesArea);

  const generateArea = document.createElement("div");
  generateArea.className = "generate-area";
  panelRight.appendChild(generateArea);

  const searchInput = depHeader.querySelector("#depSearchInput") as HTMLInputElement;

  depSearch = new DependencySearch(depListWrapper, badgesArea, searchInput);
  depSearch.initialize(metadata.dependencies.values, metaState.bootVersion, (ids) => {
    selectedDeps = ids;
  });

  // Button row: Preview + Generate
  const btnRow = document.createElement("div");
  btnRow.className = "btn-row";
  generateArea.appendChild(btnRow);

  const previewBtn = document.createElement("button");
  previewBtn.className = "preview-btn";
  previewBtn.textContent = "Preview";
  previewBtn.addEventListener("click", () => showPreviewModal());
  btnRow.appendChild(previewBtn);

  createGenerateButton(btnRow, () => {
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

  // Refresh
  document.getElementById("refreshBtn")?.addEventListener("click", () => {
    vscode.postMessage({ command: "refresh" });
  });

  // Save Preset
  document.getElementById("savePresetBtn")?.addEventListener("click", () => {
    const name = prompt("프리셋 이름을 입력하세요:");
    if (!name || !name.trim()) return;
    const preset: Preset = {
      name: name.trim(),
      options: {
        type: metaState.type,
        language: metaState.language,
        groupId: metaState.groupId,
        artifactId: metaState.artifactId,
        name: metaState.name,
        description: metaState.description,
        packageName: metaState.packageName,
        packaging: metaState.packaging,
        javaVersion: metaState.javaVersion,
        dependencies: selectedDeps,
      },
    };
    vscode.postMessage({ command: "savePreset", payload: preset });
  });

  // Preset select
  const presetSelect = document.getElementById("presetSelect") as HTMLSelectElement;
  presetSelect.addEventListener("change", () => {
    const val = presetSelect.value;
    if (val === "__delete__") {
      presetSelect.value = "";
      showDeletePresetModal();
      return;
    }
    if (!val) return;
    const preset = currentPresets.find((p) => p.name === val);
    if (preset) applyPreset(preset);
    presetSelect.value = "";
  });

  // Global "/" shortcut
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

  // Request presets
  vscode.postMessage({ command: "loadPresets" });
}

export function updatePresets(presets: Preset[]) {
  currentPresets = presets;
  const select = document.getElementById("presetSelect") as HTMLSelectElement | null;
  if (!select) return;

  select.innerHTML = '<option value="">-- Preset --</option>';
  for (const p of presets) {
    const opt = document.createElement("option");
    opt.value = p.name;
    opt.textContent = p.name;
    select.appendChild(opt);
  }
  if (presets.length > 0) {
    const delOpt = document.createElement("option");
    delOpt.value = "__delete__";
    delOpt.textContent = "프리셋 삭제...";
    select.appendChild(delOpt);
  }
}

function showDeletePresetModal() {
  const name = prompt(
    `삭제할 프리셋 이름:\n${currentPresets.map((p) => `  - ${p.name}`).join("\n")}`
  );
  if (!name || !name.trim()) return;
  currentVscode.postMessage({ command: "deletePreset", payload: name.trim() });
}

function applyPreset(preset: Preset) {
  const opts = preset.options;
  setRadio("buildType", opts.type);
  setRadio("language", opts.language);
  setRadio("packaging", opts.packaging);
  setSelectValue("javaVersion", opts.javaVersion);
  setTextInput("Group", opts.groupId);
  setTextInput("Artifact", opts.artifactId);
  setTextInput("Name", opts.name);
  setTextInput("Description", opts.description);
  setTextInput("Package Name", opts.packageName);

  metaState.type = opts.type;
  metaState.language = opts.language;
  metaState.groupId = opts.groupId;
  metaState.artifactId = opts.artifactId;
  metaState.name = opts.name;
  metaState.description = opts.description;
  metaState.packageName = opts.packageName;
  metaState.packaging = opts.packaging;
  metaState.javaVersion = opts.javaVersion;

  depSearch.setSelectedIds(opts.dependencies);
  selectedDeps = opts.dependencies;
}

function setRadio(name: string, value: string) {
  const radio = document.querySelector(
    `input[type="radio"][name="${name}"][value="${value}"]`
  ) as HTMLInputElement | null;
  if (radio) {
    radio.checked = true;
    radio.dispatchEvent(new Event("change"));
  }
}

function setSelectValue(name: string, value: string) {
  const select = document.querySelector(
    `select[name="${name}"]`
  ) as HTMLSelectElement | null;
  if (select) {
    select.value = value;
    select.dispatchEvent(new Event("change"));
  }
}

function setTextInput(label: string, value: string) {
  const labels = document.querySelectorAll(".meta-label");
  for (const lbl of labels) {
    if (lbl.textContent === label) {
      const input = lbl.parentElement?.querySelector("input[type=\"text\"]") as HTMLInputElement | null;
      if (input) {
        input.value = value;
        input.dispatchEvent(new Event("input"));
      }
      return;
    }
  }
}

function showPreviewModal() {
  document.getElementById("previewModal")?.remove();

  const isMaven = metaState.type.includes("maven");
  const content = isMaven ? buildPomPreview() : buildGradlePreview();

  const overlay = document.createElement("div");
  overlay.id = "previewModal";
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal-content";

  const modalHeader = document.createElement("div");
  modalHeader.className = "modal-header";
  modalHeader.innerHTML = `
    <span class="modal-title">${isMaven ? "pom.xml" : "build.gradle"} Preview</span>
    <button class="modal-close" id="modalCloseBtn">&times;</button>
  `;
  modal.appendChild(modalHeader);

  const pre = document.createElement("pre");
  pre.className = "preview-code";
  pre.textContent = content;
  modal.appendChild(pre);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.getElementById("modalCloseBtn")?.addEventListener("click", () => overlay.remove());
  document.addEventListener("keydown", function handler(e) {
    if (e.key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", handler);
    }
  });
}

function buildPomPreview(): string {
  const deps = selectedDeps.map((id) => {
    const dep = currentMetadata.dependencies.values
      .flatMap((g) => g.values).find((d) => d.id === id);
    return `        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-${id}</artifactId>
        </dependency><!-- ${dep?.name ?? id} -->`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<project>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>${metaState.bootVersion}</version>
    </parent>

    <groupId>${metaState.groupId}</groupId>
    <artifactId>${metaState.artifactId}</artifactId>
    <name>${metaState.name}</name>
    <description>${metaState.description}</description>

    <properties>
        <java.version>${metaState.javaVersion}</java.version>
    </properties>

    <dependencies>
${deps.join("\n")}
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>`;
}

function buildGradlePreview(): string {
  const deps = selectedDeps.map((id) => {
    const dep = currentMetadata.dependencies.values
      .flatMap((g) => g.values).find((d) => d.id === id);
    return `    implementation 'org.springframework.boot:spring-boot-starter-${id}' // ${dep?.name ?? id}`;
  });

  return `plugins {
    id 'java'
    id 'org.springframework.boot'
    id 'io.spring.dependency-management'
}

group = '${metaState.groupId}'
version = '0.0.1-SNAPSHOT'

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(${metaState.javaVersion})
    }
}

dependencies {
${deps.join("\n")}
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}`;
}
