import type { InitializrMetadata, GenerateOptions, Preset, HistoryRecord } from "../../api/types";
import { createProjectMeta, ProjectMetaState } from "./components/ProjectMeta";
import { DependencySearch } from "./components/DependencySearch";
import { createGenerateButton } from "./components/GenerateButton";

interface VsCodeApi {
  postMessage: (msg: object) => void;
}

let currentPresets: Preset[] = [];
let currentHistory: HistoryRecord[] = [];
let metaState: ProjectMetaState;
let depSearch: DependencySearch;
let selectedDeps: string[] = [];
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
    <div class="header-actions">
      <select class="preset-select" id="historySelect">
        <option value="">-- Recent --</option>
      </select>
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
  }, (url) => {
    vscode.postMessage({ command: "openExternalLink", payload: url });
  });

  // Button row: Preview + Generate
  const btnRow = document.createElement("div");
  btnRow.className = "btn-row";
  generateArea.appendChild(btnRow);

  const previewBtn = document.createElement("button");
  previewBtn.className = "preview-btn";
  previewBtn.textContent = "Preview";
  previewBtn.addEventListener("click", () => {
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
    previewBtn.disabled = true;
    previewBtn.textContent = "Loading...";
    vscode.postMessage({ command: "requestPreview", payload: options });
  });
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
    const options = {
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
    };
    vscode.postMessage({ command: "requestSavePreset", payload: options });
  });

  // Preset select
  const presetSelect = document.getElementById("presetSelect") as HTMLSelectElement;
  presetSelect.addEventListener("change", () => {
    const val = presetSelect.value;
    if (val === "__delete__") {
      presetSelect.value = "";
      vscode.postMessage({ command: "requestDeletePreset" });
      return;
    }
    if (!val) return;
    const preset = currentPresets.find((p) => p.name === val);
    if (preset) applyPreset(preset);
    presetSelect.value = "";
  });

  // History select
  const historySelect = document.getElementById("historySelect") as HTMLSelectElement;
  historySelect.addEventListener("change", () => {
    const idx = parseInt(historySelect.value, 10);
    if (isNaN(idx)) return;
    const record = currentHistory[idx];
    if (record) applyHistoryRecord(record);
    historySelect.value = "";
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

  // Request presets & history
  vscode.postMessage({ command: "loadPresets" });
  vscode.postMessage({ command: "loadHistory" });
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

export function updateHistory(history: HistoryRecord[]) {
  currentHistory = history;
  const select = document.getElementById("historySelect") as HTMLSelectElement | null;
  if (!select) return;

  select.innerHTML = '<option value="">-- Recent --</option>';
  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    const date = new Date(h.generatedAt);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    const label = `${h.options.artifactId} (${mm}/${dd} ${hh}:${mi})`;
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = label;
    select.appendChild(opt);
  }
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

function applyHistoryRecord(record: HistoryRecord) {
  const opts = record.options;
  setRadio("buildType", opts.type);
  setRadio("language", opts.language);
  setRadio("packaging", opts.packaging);
  setSelectValue("javaVersion", opts.javaVersion);
  setTextInput("Group", opts.groupId);
  setTextInput("Artifact", opts.artifactId);
  setTextInput("Name", opts.name);
  setTextInput("Description", opts.description);
  setTextInput("Package Name", opts.packageName);

  // Boot 버전은 change 이벤트 없이 직접 설정 (이전 의존성 기준 false warning 방지)
  const bootSelect = document.querySelector('select[name="bootVersion"]') as HTMLSelectElement | null;
  if (bootSelect) bootSelect.value = opts.bootVersion;

  metaState.type = opts.type;
  metaState.language = opts.language;
  metaState.bootVersion = opts.bootVersion;
  metaState.groupId = opts.groupId;
  metaState.artifactId = opts.artifactId;
  metaState.name = opts.name;
  metaState.description = opts.description;
  metaState.packageName = opts.packageName;
  metaState.packaging = opts.packaging;
  metaState.javaVersion = opts.javaVersion;

  depSearch.setSelectedIds(opts.dependencies);
  depSearch.updateBootVersion(opts.bootVersion);
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

export function showPreviewContent(filename: string, content: string) {
  // Preview 버튼 복원
  const previewBtn = document.querySelector(".preview-btn") as HTMLButtonElement | null;
  if (previewBtn) {
    previewBtn.disabled = false;
    previewBtn.textContent = "Preview";
  }

  document.getElementById("previewModal")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "previewModal";
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal-content";

  const modalHeader = document.createElement("div");
  modalHeader.className = "modal-header";
  modalHeader.innerHTML = `
    <span class="modal-title">${filename} Preview</span>
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
