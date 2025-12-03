import * as vscode from 'vscode';
import { GameState } from './game-state';
import { StatusBarManager } from './status-bar';
import { SidebarProvider } from './sidebar-provider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Code Reward Engine is now active!');

    const gameState = new GameState(context);
    const statusBar = new StatusBarManager(gameState);
    
    const sidebarProvider = new SidebarProvider(context.extensionUri, gameState);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider)
    );

    context.subscriptions.push(statusBar);

    // Event Listener for text changes
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        if (event.contentChanges.length > 0) {
            // Simple logic: 1 char = 1 XP & 1 Money
            // To prevent spam, we could add a throttle or check for meaningful content
            // For now, let's just count the length of added text
            let addedLength = 0;
            for (const change of event.contentChanges) {
                addedLength += change.text.length;
            }

            if (addedLength > 0) {
                gameState.dealDamage(addedLength);
            }
        }
    }));

    // Commands
    context.subscriptions.push(vscode.commands.registerCommand('code-reward.showStats', () => {
        vscode.window.showInformationMessage(`Level: ${gameState.level}\nEnemy HP: ${gameState.enemyCurrentHp}/${gameState.enemyMaxHp}\nMoney: $${gameState.money}`);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('code-reward.resetStats', () => {
        gameState.reset();
        vscode.window.showInformationMessage('Stats reset!');
    }));

    // Level Up Notification
    gameState.onDidLevelUp((newLevel) => {
        vscode.window.showInformationMessage(`Congratulations! You reached Level ${newLevel}!`);
    });

    gameState.onDidEnemyDefeated(() => {
        vscode.window.showInformationMessage(`Enemy Defeated! You earned gold!`);
    });
}

export function deactivate() {}
