import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { InitializrClient } from "../api/InitializrClient";
import { InitializrMetadata, GenerateOptions, Preset, HistoryRecord } from "../api/types";
import { Downloader } from "../utils/downloader";
import { getWebviewContent } from "./webviewContent";

const PRESETS_KEY = "springForge.presets";
const HISTORY_KEY = "springForge.history";
const MAX_HISTORY = 5;

type ExtensionToWebviewMessage =
  | { command: "metadata"; payload: InitializrMetadata }
  | { command: "loading"; payload: boolean }
  | { command: "generating"; payload: boolean }
  | { command: "error"; payload: string }
  | { command: "presets"; payload: Preset[] }
  | { command: "history"; payload: HistoryRecord[] }
  | { command: "previewContent"; payload: { filename: string; content: string } };

type WebviewToExtensionMessage =
  | { command: "ready" }
  | { command: "generate"; payload: GenerateOptions }
  | { command: "refresh" }
  | { command: "savePreset"; payload: Preset }
  | { command: "requestSavePreset"; payload: Omit<GenerateOptions, "bootVersion"> }
  | { command: "deletePreset"; payload: string }
  | { command: "requestDeletePreset" }
  | { command: "loadPresets" }
  | { command: "loadHistory" }
  | { command: "requestPreview"; payload: GenerateOptions }
  | { command: "openExternalLink"; payload: string };

export class InitializrPanel {
  private static currentPanel: InitializrPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];
  private baseUrl: string;

  static createOrShow(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (InitializrPanel.currentPanel) {
      InitializrPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "springInitializr",
      "Spring Initializr",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, "dist", "webview"),
        ],
        retainContextWhenHidden: true,
      }
    );

    InitializrPanel.currentPanel = new InitializrPanel(panel, context);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext
  ) {
    this.panel = panel;
    this.context = context;
    this.baseUrl = this.readBaseUrl();
    this.panel.webview.html = getWebviewContent(
      this.panel.webview,
      context.extensionUri
    );
    this.setupMessageHandlers();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.watchConfigChanges();
  }

  private readBaseUrl(): string {
    return vscode.workspace
      .getConfiguration("springForge")
      .get<string>("initializrUrl", "https://start.spring.io");
  }

  private watchConfigChanges() {
    const watcher = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("springForge.initializrUrl")) {
        const newUrl = this.readBaseUrl();
        if (newUrl !== this.baseUrl) {
          this.baseUrl = newUrl;
          InitializrClient.invalidateCache();
          this.sendMetadata();
        }
      }
    });
    this.disposables.push(watcher);
  }

  private setupMessageHandlers() {
    this.panel.webview.onDidReceiveMessage(
      async (message: WebviewToExtensionMessage) => {
        switch (message.command) {
          case "ready":
            await this.sendMetadata();
            this.sendPresets();
            this.sendHistory();
            break;

          case "generate":
            await this.handleGenerate(message.payload);
            break;

          case "refresh":
            InitializrClient.invalidateCache();
            await this.sendMetadata();
            break;

          case "savePreset":
            this.savePreset(message.payload);
            break;

          case "requestSavePreset":
            this.requestSavePreset(message.payload);
            break;

          case "deletePreset":
            this.deletePreset(message.payload);
            break;

          case "requestDeletePreset":
            this.requestDeletePreset();
            break;

          case "loadPresets":
            this.sendPresets();
            break;

          case "loadHistory":
            this.sendHistory();
            break;

          case "requestPreview":
            this.handlePreview(message.payload);
            break;

          case "openExternalLink":
            try {
              vscode.env.openExternal(vscode.Uri.parse(message.payload));
            } catch {
              console.error("[Spring Forge] 잘못된 URL:", message.payload);
            }
            break;
        }
      },
      null,
      this.disposables
    );
  }

  private async handlePreview(options: GenerateOptions) {
    try {
      const isMaven = options.type.includes("maven");
      const isKotlinDsl = options.type.includes("kotlin");
      const filename = isMaven ? "pom.xml" : isKotlinDsl ? "build.gradle.kts" : "build.gradle";

      let content: string;

      if (isKotlinDsl) {
        // /build.gradle 엔드포인트는 type 파라미터를 무시하고 항상 Groovy 문법을 반환하므로
        // Kotlin DSL은 ZIP에서 build.gradle.kts를 추출해야 정확한 프리뷰를 제공할 수 있다
        const url = InitializrClient.buildGenerateUrl(options, this.baseUrl);
        const zipBuffer = await InitializrClient.downloadZip(url);
        const extracted = await Downloader.extractFileContent(zipBuffer, filename);
        content = extracted ?? "build.gradle.kts 파일을 찾을 수 없습니다.";
      } else {
        const endpoint = isMaven ? "/pom.xml" : "/build.gradle";
        const params = new URLSearchParams({
          type: options.type,
          language: options.language,
          bootVersion: options.bootVersion,
          groupId: options.groupId,
          artifactId: options.artifactId,
          name: options.name,
          description: options.description,
          packageName: options.packageName,
          packaging: options.packaging,
          javaVersion: options.javaVersion,
          dependencies: options.dependencies.join(","),
        });
        const url = `${this.baseUrl}${endpoint}?${params.toString()}`;
        content = await InitializrClient.fetchText(url);
      }

      this.post({
        command: "previewContent",
        payload: { filename, content },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.post({
        command: "previewContent",
        payload: { filename: "Error", content: `프리뷰 생성 실패: ${msg}` },
      });
    }
  }

  private async sendMetadata() {
    try {
      this.post({ command: "loading", payload: true });
      const metadata = await InitializrClient.fetchMetadata(this.baseUrl);
      this.post({ command: "metadata", payload: metadata });
    } catch (err) {
      console.error("[Spring Initializr] 메타데이터 조회 실패:", err);
      this.post({
        command: "error",
        payload:
          "start.spring.io에 연결할 수 없습니다. 네트워크 상태를 확인하세요.",
      });
    } finally {
      this.post({ command: "loading", payload: false });
    }
  }

  private sendPresets() {
    const presets = this.context.globalState.get<Preset[]>(PRESETS_KEY, []);
    this.post({ command: "presets", payload: presets });
  }

  private savePreset(preset: Preset) {
    const presets = this.context.globalState.get<Preset[]>(PRESETS_KEY, []);
    const idx = presets.findIndex((p) => p.name === preset.name);
    if (idx >= 0) {
      presets[idx] = preset;
    } else {
      presets.push(preset);
    }
    this.context.globalState.update(PRESETS_KEY, presets);
    this.sendPresets();
  }

  private async requestSavePreset(options: Omit<GenerateOptions, "bootVersion">) {
    const name = await vscode.window.showInputBox({
      prompt: "프리셋 이름을 입력하세요",
      placeHolder: "예: My Web Project",
    });
    if (!name || !name.trim()) return;
    this.savePreset({ name: name.trim(), options });
  }

  private async requestDeletePreset() {
    const presets = this.context.globalState.get<Preset[]>(PRESETS_KEY, []);
    if (presets.length === 0) return;
    const picked = await vscode.window.showQuickPick(
      presets.map((p) => p.name),
      { placeHolder: "삭제할 프리셋을 선택하세요" }
    );
    if (picked) this.deletePreset(picked);
  }

  private deletePreset(name: string) {
    const presets = this.context.globalState.get<Preset[]>(PRESETS_KEY, []);
    const filtered = presets.filter((p) => p.name !== name);
    this.context.globalState.update(PRESETS_KEY, filtered);
    this.sendPresets();
  }

  private async handleGenerate(options: GenerateOptions) {
    const targetUri = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      openLabel: "여기에 프로젝트 생성",
    });

    if (!targetUri || targetUri.length === 0) {
      return;
    }

    const targetDir = targetUri[0].fsPath;

    try {
      this.post({ command: "generating", payload: true });

      const url = InitializrClient.buildGenerateUrl(options, this.baseUrl);
      const zipBuffer = await InitializrClient.downloadZip(url);

      // Spring Initializr ZIP은 파일을 루트 레벨로 포함하므로
      // artifactId 하위 디렉터리를 만들어서 그 안에 압축 해제
      const projectDir = path.join(targetDir, options.artifactId);
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }
      await Downloader.extractZip(zipBuffer, projectDir);

      const choice = await vscode.window.showInformationMessage(
        `'${options.artifactId}' 프로젝트 생성 완료!`,
        "새 창으로 열기",
        "현재 워크스페이스에 추가"
      );

      if (choice === "새 창으로 열기") {
        vscode.commands.executeCommand(
          "vscode.openFolder",
          vscode.Uri.file(projectDir),
          true
        );
      } else if (choice === "현재 워크스페이스에 추가") {
        vscode.workspace.updateWorkspaceFolders(
          vscode.workspace.workspaceFolders?.length || 0,
          null,
          { uri: vscode.Uri.file(projectDir) }
        );
      }

      this.addHistory(options);

      // Post-project auto-setup
      await this.postProjectSetup(projectDir, options);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Spring Initializr] 프로젝트 생성 실패:", err);
      vscode.window.showErrorMessage(`프로젝트 생성 실패: ${message}`);
    } finally {
      this.post({ command: "generating", payload: false });
    }
  }

  private async postProjectSetup(
    projectDir: string,
    options: GenerateOptions
  ) {
    const isMaven = options.type.includes("maven");
    const isWindows = process.platform === "win32";
    const wrapper = isMaven
      ? isWindows
        ? "mvnw.cmd"
        : "./mvnw"
      : isWindows
        ? "gradlew.bat"
        : "./gradlew";
    const runCmd = isMaven
      ? `${wrapper} spring-boot:run`
      : `${wrapper} bootRun`;

    const runChoice = await vscode.window.showInformationMessage(
      `터미널에서 ${options.artifactId}을(를) 실행할까요?`,
      "실행",
      "나중에"
    );

    if (runChoice === "실행") {
      const terminal = vscode.window.createTerminal({
        name: options.artifactId,
        cwd: projectDir,
      });
      terminal.show();
      terminal.sendText(runCmd);
    }

    await this.suggestExtensions();

    const gitignorePath = path.join(projectDir, ".gitignore");
    if (!fs.existsSync(gitignorePath)) {
      vscode.window.showWarningMessage(
        `${options.artifactId} 프로젝트에 .gitignore 파일이 없습니다. 생성을 권장합니다.`
      );
    }
  }

  private async suggestExtensions() {
    const javaExtId = "vscjava.vscode-java-pack";
    const springExtId = "vmware.vscode-boot-dev-pack";

    const missing: Array<{ id: string; label: string }> = [];

    if (!vscode.extensions.getExtension(javaExtId)) {
      missing.push({ id: javaExtId, label: "Extension Pack for Java" });
    }
    if (!vscode.extensions.getExtension(springExtId)) {
      missing.push({ id: springExtId, label: "Spring Boot Extension Pack" });
    }

    if (missing.length === 0) return;

    const labels = missing.map((e) => e.label).join(", ");
    const choice = await vscode.window.showInformationMessage(
      `권장 확장: ${labels}`,
      "설치",
      "무시"
    );

    if (choice === "설치") {
      for (const ext of missing) {
        vscode.commands.executeCommand(
          "workbench.extensions.installExtension",
          ext.id
        );
      }
    }
  }

  private sendHistory() {
    const history = this.context.globalState.get<HistoryRecord[]>(HISTORY_KEY, []);
    this.post({ command: "history", payload: history });
  }

  private addHistory(options: GenerateOptions) {
    const history = this.context.globalState.get<HistoryRecord[]>(HISTORY_KEY, []);
    const record: HistoryRecord = {
      options,
      generatedAt: new Date().toISOString(),
    };
    const filtered = history.filter(
      (h) =>
        !(h.options.groupId === options.groupId &&
          h.options.artifactId === options.artifactId)
    );
    const updated = [record, ...filtered].slice(0, MAX_HISTORY);
    this.context.globalState.update(HISTORY_KEY, updated);
    this.sendHistory();
  }

  private post(message: ExtensionToWebviewMessage) {
    this.panel.webview.postMessage(message);
  }

  dispose() {
    InitializrPanel.currentPanel = undefined;
    this.panel.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
