import * as vscode from "vscode";
import { openInitializr } from "./commands/openInitializr";

function checkWhatsNew(context: vscode.ExtensionContext) {
  const extension = vscode.extensions.getExtension("chimaek.spring-forge");
  if (!extension) {
    return;
  }

  const currentVersion: string = extension.packageJSON.version;
  const lastVersion = context.globalState.get<string>("lastVersion");

  if (lastVersion === currentVersion) {
    return;
  }

  context.globalState.update("lastVersion", currentVersion);

  if (!lastVersion) {
    return;
  }

  vscode.window
    .showInformationMessage(
      `Spring Forge v${currentVersion} — What's New?`,
      "View Changelog",
      "Dismiss"
    )
    .then((selection) => {
      if (selection === "View Changelog") {
        const changelogPath = vscode.Uri.joinPath(
          extension.extensionUri,
          "CHANGELOG.md"
        );
        vscode.commands.executeCommand("markdown.showPreview", changelogPath);
      }
    });
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "spring-forge.open",
    () => openInitializr(context)
  );
  context.subscriptions.push(disposable);

  checkWhatsNew(context);
}

export function deactivate() {}
