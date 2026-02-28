import * as vscode from "vscode";
import * as crypto from "crypto";

export function getNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview", "main.js")
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview", "main.css")
  );
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             style-src ${webview.cspSource};
             script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
  <title>Spring Initializr</title>
</head>
<body>
  <div id="app">
    <div id="loading-screen" class="loading-screen">
      <div class="spinner"></div>
      <p>start.spring.io에서 최신 정보를 가져오는 중...</p>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
