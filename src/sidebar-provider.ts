import * as vscode from "vscode";
import { GameState } from "./game-state";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "code-reward.sidebar";
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _gameState: GameState
  ) {
    this._gameState.onDidChangeState(() => this.update());
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case "reset":
            const confirmed = await vscode.window.showWarningMessage(
              "Are you sure you want to reset all progress?",
              { modal: true },
              "Yes",
              "No"
            );
            if (confirmed === "Yes") {
              this._gameState.reset();
              vscode.window.showInformationMessage("Stats reset!");
            }
            break;
          case "purchase":
            const success = this._gameState.purchaseItem(message.itemId);
            if (success) {
              vscode.window.showInformationMessage(
                `Purchased ${message.itemName}!`
              );
            } else {
              vscode.window.showWarningMessage(
                "Not enough money or item already purchased!"
              );
            }
            break;
        }
      },
      undefined,
      []
    );

    // Delay initial update to ensure webview is ready
    setTimeout(() => this.update(), 100);
  }

  public update() {
    if (this._view) {
      this._view.webview.postMessage({
        type: "update",
        data: {
          level: this._gameState.level,
          enemyCurrentHp: this._gameState.enemyCurrentHp,
          enemyMaxHp: this._gameState.enemyMaxHp,
          money: this._gameState.money,
          shopItems: this._gameState.shopItems,
          attackMultiplier: this._gameState.attackMultiplier,
        },
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code Reward Stats</title>
            <style>
                body {
                    padding: 10px;
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-editor-foreground);
                    background-color: var(--vscode-editor-background);
                }
                .tabs {
                    display: flex;
                    gap: 5px;
                    margin-bottom: 15px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .tab {
                    padding: 8px 16px;
                    cursor: pointer;
                    background: none;
                    border: none;
                    color: var(--vscode-editor-foreground);
                    opacity: 0.6;
                    border-bottom: 2px solid transparent;
                    font-size: 1em;
                }
                .tab:hover {
                    opacity: 0.8;
                }
                .tab.active {
                    opacity: 1;
                    border-bottom-color: var(--vscode-textLink-foreground);
                }
                .tab-content {
                    display: none;
                }
                .tab-content.active {
                    display: block;
                }
                .stat-card {
                    background-color: var(--vscode-editor-lineHighlightBackground);
                    padding: 15px;
                    border-radius: 5px;
                    margin-bottom: 10px;
                    text-align: center;
                }
                .stat-label {
                    font-size: 0.9em;
                    opacity: 0.8;
                    margin-bottom: 5px;
                }
                .stat-value {
                    font-size: 1.5em;
                    font-weight: bold;
                    color: var(--vscode-textLink-foreground);
                }
                .progress-bar {
                    width: 100%;
                    height: 10px;
                    background-color: var(--vscode-scrollbarSlider-background);
                    border-radius: 5px;
                    overflow: hidden;
                    margin-top: 5px;
                }
                .progress-fill {
                    height: 100%;
                    background-color: var(--vscode-errorForeground);
                    width: 100%;
                    transition: width 0.3s ease;
                }
                .button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 1em;
                    width: 100%;
                    margin-top: 10px;
                }
                .button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .button.danger {
                    background-color: var(--vscode-errorForeground);
                }
                .button.danger:hover {
                    opacity: 0.8;
                }
                .button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .shop-item {
                    background-color: var(--vscode-editor-lineHighlightBackground);
                    padding: 15px;
                    border-radius: 5px;
                    margin-bottom: 10px;
                }
                .shop-item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                .shop-item-name {
                    font-size: 1.1em;
                    font-weight: bold;
                }
                .shop-item-details {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    font-size: 0.9em;
                }
                .shop-item-stat {
                    color: var(--vscode-textLink-foreground);
                }
                .bought-badge {
                    background-color: var(--vscode-textLink-foreground);
                    color: var(--vscode-editor-background);
                    padding: 2px 8px;
                    border-radius: 3px;
                    font-size: 0.8em;
                }
            </style>
        </head>
        <body>
            <div class="tabs">
                <button class="tab active" onclick="switchTab('stats')">Stats</button>
                <button class="tab" onclick="switchTab('shop')">Shop</button>
            </div>

            <div id="stats-tab" class="tab-content active">
                <div class="stat-card">
                    <div class="stat-label">Level</div>
                    <div class="stat-value" id="level">1</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">Enemy Health</div>
                    <div class="stat-value"><span id="hp">100</span> / <span id="maxHp">100</span></div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="hpBar"></div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">Money</div>
                    <div class="stat-value">$<span id="money">0</span></div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">Attack Power</div>
                    <div class="stat-value"><span id="attack">1</span>x</div>
                </div>

                <button class="button danger" onclick="resetStats()">Reset Progress</button>
            </div>

            <div id="shop-tab" class="tab-content">
                <div id="shop-items"></div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                let currentData = {};
                
                function switchTab(tabName) {
                    document.querySelectorAll('.tab').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    document.querySelectorAll('.tab-content').forEach(content => {
                        content.classList.remove('active');
                    });
                    
                    event.target.classList.add('active');
                    document.getElementById(tabName + '-tab').classList.add('active');
                }

                function resetStats() {
                    vscode.postMessage({ type: 'reset' });
                }

                function purchaseItem(itemId, itemName) {
                    vscode.postMessage({ 
                        type: 'purchase',
                        itemId: itemId,
                        itemName: itemName
                    });
                }

                function renderShop() {
                    const shopContainer = document.getElementById('shop-items');
                    if (!currentData.shopItems) return;

                    shopContainer.innerHTML = currentData.shopItems.map(item => \`
                        <div class="shop-item">
                            <div class="shop-item-header">
                                <span class="shop-item-name">\${item.name}</span>
                                \${item.bought ? '<span class="bought-badge">OWNED</span>' : ''}
                            </div>
                            <div class="shop-item-details">
                                <span class="shop-item-stat">⚔️ Attack: +\${item.attack}</span>
                                <span class="shop-item-stat">💰 Price: $\${item.price}</span>
                            </div>
                            <button 
                                class="button" 
                                onclick="purchaseItem('\${item.id}', '\${item.name}')"
                                \${item.bought || (currentData.money < item.price) ? 'disabled' : ''}
                            >
                                \${item.bought ? 'Already Owned' : (currentData.money < item.price ? 'Not Enough Money' : 'Purchase')}
                            </button>
                        </div>
                    \`).join('');
                }
                
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'update':
                            currentData = message.data;
                            const { level, enemyCurrentHp, enemyMaxHp, money, attackMultiplier } = message.data;
                            document.getElementById('level').innerText = level;
                            document.getElementById('hp').innerText = enemyCurrentHp;
                            document.getElementById('maxHp').innerText = enemyMaxHp;
                            document.getElementById('money').innerText = money;
                            document.getElementById('attack').innerText = attackMultiplier || 1;
                            
                            const percentage = Math.max(0, (enemyCurrentHp / enemyMaxHp) * 100);
                            document.getElementById('hpBar').style.width = percentage + '%';
                            
                            renderShop();
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
  }
}
