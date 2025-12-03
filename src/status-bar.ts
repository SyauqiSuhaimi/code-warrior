import * as vscode from 'vscode';
// Status Bar Manager
import { GameState } from './game-state';

export class StatusBarManager {
    private _statusBarItem: vscode.StatusBarItem;
    private _gameState: GameState;

    constructor(gameState: GameState) {
        this._gameState = gameState;
        this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this._statusBarItem.command = 'code-reward.showStats';
        this.update();
        this._statusBarItem.show();

        this._gameState.onDidChangeState(() => this.update());
    }

    public update() {
        this._statusBarItem.text = `$(star) Lvl ${this._gameState.level} | Enemy: ${this._gameState.enemyCurrentHp}/${this._gameState.enemyMaxHp} HP | $${this._gameState.money}`;
        this._statusBarItem.tooltip = 'Click to see detailed stats';
    }

    public dispose() {
        this._statusBarItem.dispose();
    }
}
