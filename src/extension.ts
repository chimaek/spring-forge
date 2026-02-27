import * as vscode from "vscode";
import { openInitializr } from "./commands/openInitializr";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "spring-forge.open",
    () => openInitializr(context)
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}
