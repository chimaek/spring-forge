import * as assert from "assert";
import * as vscode from "vscode";

suite("InitializrPanel (Extension Host)", () => {
  test("spring-forge.open 커맨드가 등록되어 있어야 한다", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("spring-forge.open"),
      "spring-forge.open 커맨드가 존재해야 한다"
    );
  });

  test("커맨드 실행 시 에러 없이 WebviewPanel이 열려야 한다", async () => {
    // 커맨드 실행 (Webview가 열리고 API 호출 시도)
    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand("spring-forge.open");
    });

    // 열린 패널 닫기 (cleanup)
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  });

  test("두 번 실행해도 패널이 하나만 존재해야 한다", async () => {
    await vscode.commands.executeCommand("spring-forge.open");
    await vscode.commands.executeCommand("spring-forge.open");

    // 탭 그룹에 Spring Initializr 관련 탭이 하나만 있는지 확인
    const tabGroups = vscode.window.tabGroups;
    let springTabs = 0;
    for (const group of tabGroups.all) {
      for (const tab of group.tabs) {
        if (tab.label === "Spring Initializr") {
          springTabs++;
        }
      }
    }
    assert.strictEqual(springTabs, 1, "Spring Initializr 탭이 1개여야 한다");

    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  });
});
