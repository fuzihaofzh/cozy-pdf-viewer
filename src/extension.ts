import * as vscode from 'vscode';
import { CozyPdfProvider } from './cozyPdfProvider';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(CozyPdfProvider.register(context));
}

export function deactivate(): void {}
