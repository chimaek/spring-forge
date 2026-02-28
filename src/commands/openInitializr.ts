import * as vscode from "vscode";
import { InitializrPanel } from "../panel/InitializrPanel";

export function openInitializr(context: vscode.ExtensionContext) {
  InitializrPanel.createOrShow(context);
}
