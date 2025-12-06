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
          case "upgrade":
            const success = this._gameState.upgradeAttribute(message.attribute);
            if (success) {
              vscode.window.showInformationMessage(
                `Upgraded ${message.attributeName}!`
              );
            } else {
              vscode.window.showWarningMessage("Not enough money!");
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
      const computedAttrs = this._gameState.getComputedAttributes();
      this._view.webview.postMessage({
        type: "update",
        data: {
          level: this._gameState.level,
          enemyCurrentHp: this._gameState.enemyCurrentHp,
          enemyMaxHp: this._gameState.enemyMaxHp,
          money: this._gameState.money,
          attributes: computedAttrs,
          upgradeCosts: {
            damageLevel: this._gameState.getUpgradeCost("damageLevel"),
            critChanceLevel: this._gameState.getUpgradeCost("critChanceLevel"),
            critMultiplierLevel: this._gameState.getUpgradeCost(
              "critMultiplierLevel"
            ),
          },
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
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    padding: 0;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    color: #e0e0e0;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    overflow-x: hidden;
                }
                
                .header {
                    background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
                    padding: 15px;
                    border-bottom: 3px solid #e94560;
                    box-shadow: 0 4px 15px rgba(233, 69, 96, 0.3);
                }
                
                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .level-badge {
                    background: linear-gradient(135deg, #ffd93d 0%, #ff6b35 100%);
                    color: #1a1a2e;
                    padding: 8px 20px;
                    border-radius: 25px;
                    font-weight: 900;
                    font-size: 1.2em;
                    box-shadow: 0 4px 15px rgba(255, 217, 61, 0.4);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .currency-display {
                    background: rgba(255, 217, 61, 0.15);
                    padding: 8px 16px;
                    border-radius: 20px;
                    border: 2px solid #ffd93d;
                    font-weight: bold;
                    font-size: 1.1em;
                    color: #ffd93d;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    box-shadow: 0 0 20px rgba(255, 217, 61, 0.2);
                }
                
                .tabs {
                    display: flex;
                    background: rgba(15, 52, 96, 0.5);
                    padding: 0;
                    border-bottom: 2px solid #e94560;
                }
                
                .tab {
                    flex: 1;
                    padding: 15px;
                    cursor: pointer;
                    background: transparent;
                    border: none;
                    color: #a0a0a0;
                    font-size: 1em;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    transition: all 0.3s ease;
                    border-bottom: 3px solid transparent;
                }
                
                .tab:hover {
                    background: rgba(233, 69, 96, 0.1);
                    color: #e0e0e0;
                }
                
                .tab.active {
                    background: rgba(233, 69, 96, 0.2);
                    color: #e94560;
                    border-bottom-color: #e94560;
                    box-shadow: inset 0 -3px 10px rgba(233, 69, 96, 0.3);
                }
                
                .tab-content {
                    display: none;
                    padding: 15px;
                    animation: fadeIn 0.3s ease;
                }
                
                .tab-content.active {
                    display: block;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .enemy-section {
                    background: linear-gradient(135deg, rgba(233, 69, 96, 0.15) 0%, rgba(15, 52, 96, 0.15) 100%);
                    padding: 20px;
                    border-radius: 15px;
                    margin-bottom: 15px;
                    border: 2px solid rgba(233, 69, 96, 0.3);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                }
                
                .enemy-title {
                    text-align: center;
                    font-size: 1.3em;
                    font-weight: bold;
                    color: #e94560;
                    margin-bottom: 15px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    text-shadow: 0 0 10px rgba(233, 69, 96, 0.5);
                }
                
                .hp-container {
                    position: relative;
                    margin-bottom: 10px;
                }
                
                .hp-bar-outer {
                    width: 100%;
                    height: 30px;
                    background: rgba(0, 0, 0, 0.4);
                    border-radius: 15px;
                    overflow: hidden;
                    border: 2px solid #e94560;
                    box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.5);
                    position: relative;
                }
                
                .hp-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #ff6b6b 0%, #ee5a6f 50%, #e94560 100%);
                    width: 100%;
                    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 0 20px rgba(233, 69, 96, 0.6);
                    position: relative;
                }
                
                .hp-bar-fill::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 50%;
                    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3), transparent);
                }
                
                .hp-text {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-weight: bold;
                    font-size: 1.1em;
                    color: white;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                    z-index: 1;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 15px;
                }
                
                .stat-card {
                    background: linear-gradient(135deg, rgba(15, 52, 96, 0.6) 0%, rgba(22, 33, 62, 0.6) 100%);
                    padding: 15px;
                    border-radius: 12px;
                    border: 2px solid rgba(255, 217, 61, 0.3);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                    transition: all 0.3s ease;
                }
                
                .stat-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 6px 20px rgba(255, 217, 61, 0.4);
                    border-color: rgba(255, 217, 61, 0.6);
                }
                
                .stat-icon {
                    font-size: 2em;
                    margin-bottom: 8px;
                    text-align: center;
                }
                
                .stat-label {
                    font-size: 0.85em;
                    color: #a0a0a0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 5px;
                    text-align: center;
                }
                
                .stat-value {
                    font-size: 1.8em;
                    font-weight: 900;
                    color: #ffd93d;
                    text-align: center;
                    text-shadow: 0 2px 10px rgba(255, 217, 61, 0.3);
                }
                
                .button {
                    background: linear-gradient(135deg, #e94560 0%, #c72c41 100%);
                    color: white;
                    border: none;
                    padding: 14px 24px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 1em;
                    font-weight: bold;
                    width: 100%;
                    margin-top: 10px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(233, 69, 96, 0.4);
                }
                
                .button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(233, 69, 96, 0.6);
                    background: linear-gradient(135deg, #ff4d6d 0%, #d63447 100%);
                }
                
                .button:active:not(:disabled) {
                    transform: translateY(0);
                }
                
                .button.danger {
                    background: linear-gradient(135deg, #ff6b6b 0%, #c92a2a 100%);
                }
                
                .button:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                    background: #555;
                }
                
                .shop-item {
                    background: linear-gradient(135deg, rgba(15, 52, 96, 0.6) 0%, rgba(22, 33, 62, 0.6) 100%);
                    padding: 18px;
                    border-radius: 12px;
                    margin-bottom: 12px;
                    border: 2px solid rgba(255, 217, 61, 0.2);
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                }
                
                .shop-item:hover {
                    border-color: rgba(255, 217, 61, 0.5);
                    transform: translateX(5px);
                    box-shadow: 0 6px 20px rgba(255, 217, 61, 0.3);
                }
                
                .shop-item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .shop-item-name {
                    font-size: 1.2em;
                    font-weight: bold;
                    color: #ffd93d;
                    text-shadow: 0 2px 5px rgba(255, 217, 61, 0.3);
                }
                
                .shop-item-details {
                    display: flex;
                    gap: 15px;
                    margin-bottom: 12px;
                    flex-wrap: wrap;
                }
                
                .shop-item-stat {
                    background: rgba(255, 217, 61, 0.1);
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 0.9em;
                    border: 1px solid rgba(255, 217, 61, 0.3);
                    color: #ffd93d;
                    font-weight: 600;
                }
                
                .bought-badge {
                    background: linear-gradient(135deg, #4ecca3 0%, #2eb086 100%);
                    color: white;
                    padding: 5px 15px;
                    border-radius: 20px;
                    font-size: 0.8em;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    box-shadow: 0 2px 10px rgba(78, 204, 163, 0.4);
                }
                
                .empty-shop {
                    text-align: center;
                    padding: 40px 20px;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-content">
                    <div class="level-badge">⚡ LVL <span id="level-header">1</span></div>
                    <div class="currency-display">💰 <span id="money-header">0</span></div>
                </div>
            </div>

            <div class="tabs">
                <button class="tab active" onclick="switchTab('stats')">⚔️ Combat</button>
                <button class="tab" onclick="switchTab('attributes')">📊 Attributes</button>
            </div>

            <div id="stats-tab" class="tab-content active">
                <div class="enemy-section">
                    <div class="enemy-title">🐉 Enemy Boss</div>
                    <div class="hp-container">
                        <div class="hp-bar-outer">
                            <div class="hp-bar-fill" id="hpBar"></div>
                        </div>
                        <div class="hp-text"><span id="hp">100</span> / <span id="maxHp">100</span> HP</div>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">💰</div>
                        <div class="stat-label">Gold</div>
                        <div class="stat-value">$<span id="money">0</span></div>
                    </div>
                </div>

                <button class="button danger" onclick="resetStats()">🔄 Reset Progress</button>

            </div>

            <div id="attributes-tab" class="tab-content">
                <div id="attribute-upgrades"></div>
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

                function upgradeAttribute(attribute, attributeName) {
                    vscode.postMessage({ 
                        type: 'upgrade',
                        attribute: attribute,
                        attributeName: attributeName
                    });
                }

                function renderAttributes() {
                    const container = document.getElementById('attribute-upgrades');
                    if (!currentData.attributes || !currentData.upgradeCosts) {
                        container.innerHTML = '<div class="empty-shop">Loading...</div>';
                        return;
                    }

                    const attrs = currentData.attributes;
                    const attributes = [
                        {
                            key: 'damageLevel',
                            name: 'Damage',
                            icon: '⚔️',
                            description: 'Increase base damage per line',
                            current: attrs.damageLevel || 1,
                            value: attrs.damage || 1,
                            cost: currentData.upgradeCosts.damageLevel || 100
                        },
                        {
                            key: 'critChanceLevel',
                            name: 'Crit Chance',
                            icon: '🎯',
                            description: 'Increase chance to deal critical hits',
                            current: attrs.critChanceLevel || 0,
                            value: (attrs.critChance || 0) + '%',
                            cost: currentData.upgradeCosts.critChanceLevel || 150
                        },
                        {
                            key: 'critMultiplierLevel',
                            name: 'Crit Multiplier',
                            icon: '💥',
                            description: 'Increase critical hit damage multiplier',
                            current: attrs.critMultiplierLevel || 0,
                            value: (attrs.critMultiplier || 1.5) + 'x',
                            cost: currentData.upgradeCosts.critMultiplierLevel || 200
                        }
                    ];

                    container.innerHTML = attributes.map(attr => \`
                        <div class="shop-item">
                            <div class="shop-item-header">
                                <span class="shop-item-name">\${attr.icon} \${attr.name}</span>
                                <span class="bought-badge" style="background: linear-gradient(135deg, #4ecca3 0%, #2eb086 100%);">Lvl \${attr.current}</span>
                            </div>
                            <div style="color: #a0a0a0; margin-bottom: 10px; font-size: 0.9em;">\${attr.description}</div>
                            <div class="shop-item-details">
                                <span class="shop-item-stat">Current: \${attr.value}</span>
                                <span class="shop-item-stat">💰 \${attr.cost}</span>
                            </div>
                            <button 
                                class="button" 
                                onclick="upgradeAttribute('\${attr.key}', '\${attr.name}')"
                                \${currentData.money < attr.cost ? 'disabled' : ''}
                            >
                                \${currentData.money < attr.cost ? '🔒 Locked' : '⬆️ Upgrade'}
                            </button>
                        </div>
                    \`).join('');
                }
                
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'update':
                            currentData = message.data;
                            const { level, enemyCurrentHp, enemyMaxHp, money, attributes } = message.data;
                            
                            document.getElementById('level-header').innerText = level;
                            document.getElementById('hp').innerText = Math.max(0, Math.floor(enemyCurrentHp));
                            document.getElementById('maxHp').innerText = enemyMaxHp;
                            document.getElementById('money').innerText = money;
                            document.getElementById('money-header').innerText = money;
                            
                            const percentage = Math.max(0, (enemyCurrentHp / enemyMaxHp) * 100);
                            document.getElementById('hpBar').style.width = percentage + '%';
                            
                            renderAttributes();
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
  }
}
