// 이 파일은 Webview(브라우저) 컨텍스트에서 실행된다.
// Node.js API, vscode 모듈 사용 불가.
// Extension Host와의 통신은 acquireVsCodeApi().postMessage만 가능.

import { renderApp } from "./app";
import type { InitializrMetadata } from "../../api/types";

declare function acquireVsCodeApi(): {
  postMessage: (msg: object) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

window.addEventListener("message", (event) => {
  const message = event.data as {
    command: string;
    payload: unknown;
  };

  switch (message.command) {
    case "metadata": {
      const appEl = document.getElementById("app")!;
      const loadingEl = document.getElementById("loading-screen");
      if (loadingEl) {
        loadingEl.remove();
      }
      renderApp(appEl, message.payload as InitializrMetadata, vscode);
      break;
    }
    case "loading": {
      const screen = document.getElementById("loading-screen");
      if (screen) {
        screen.style.display = message.payload ? "flex" : "none";
      }
      break;
    }
    case "error": {
      const appEl = document.getElementById("app")!;
      appEl.innerHTML = "";

      const errorScreen = document.createElement("div");
      errorScreen.className = "error-screen";

      const icon = document.createElement("p");
      icon.className = "error-icon";
      icon.textContent = "!";
      errorScreen.appendChild(icon);

      const msg = document.createElement("p");
      msg.textContent = String(message.payload);
      errorScreen.appendChild(msg);

      const retryBtn = document.createElement("button");
      retryBtn.className = "generate-btn";
      retryBtn.textContent = "다시 시도";
      retryBtn.addEventListener("click", () => {
        vscode.postMessage({ command: "refresh" });
      });
      errorScreen.appendChild(retryBtn);

      appEl.appendChild(errorScreen);
      break;
    }
    case "generating": {
      const btn = document.getElementById(
        "generateBtn"
      ) as HTMLButtonElement | null;
      if (btn) {
        btn.disabled = !!message.payload;
        btn.textContent = message.payload
          ? "생성 중..."
          : "Generate Project";
      }
      break;
    }
  }
});

// Webview DOM 준비 완료 신호
vscode.postMessage({ command: "ready" });
