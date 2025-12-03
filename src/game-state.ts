import * as vscode from "vscode";
import shopItemsData from "./shop-items.json";

export interface ShopItem {
  id: string;
  name: string;
  attack: number;
  price: number;
  bought: boolean;
}

export interface IGameState {
  money: number;
  level: number;
  enemyCurrentHp: number;
  shopItems: ShopItem[];
  attackMultiplier: number;
}

export class GameState {
  private _money: number = 0;
  private _level: number = 1;
  private _enemyCurrentHp: number = 100;
  private _shopItems: ShopItem[] = [];
  private _attackMultiplier: number = 1;
  private readonly _context: vscode.ExtensionContext;
  private readonly _storageKey = "code-reward-engine.state";
  private _onDidLevelUp = new vscode.EventEmitter<number>();
  public readonly onDidLevelUp = this._onDidLevelUp.event;
  private _onDidEnemyDefeated = new vscode.EventEmitter<void>();
  public readonly onDidEnemyDefeated = this._onDidEnemyDefeated.event;
  private _onDidChangeState = new vscode.EventEmitter<void>();
  public readonly onDidChangeState = this._onDidChangeState.event;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this.loadState();
  }

  private loadState() {
    const state = this._context.globalState.get<IGameState>(this._storageKey);
    if (state) {
      this._money = state.money;
      this._level = state.level;
      this._enemyCurrentHp = state.enemyCurrentHp;
      this._shopItems = this.mergeShopItems(state.shopItems);
      this._attackMultiplier = state.attackMultiplier || 1;
    } else {
      this._shopItems = this.initializeShopItems();
      this.resetEnemy();
    }
  }

  private initializeShopItems(): ShopItem[] {
    return JSON.parse(JSON.stringify(shopItemsData));
  }

  private mergeShopItems(savedItems: ShopItem[] | undefined): ShopItem[] {
    const freshItems = this.initializeShopItems();

    if (!savedItems) {
      return freshItems;
    }

    // Merge: keep purchase status from saved items, add new items from JSON
    return freshItems.map((freshItem) => {
      const savedItem = savedItems.find((s) => s.id === freshItem.id);
      if (savedItem) {
        // Item exists in saved state, preserve its bought status
        return { ...freshItem, bought: savedItem.bought };
      }
      // New item from JSON
      return freshItem;
    });
  }

  private saveState() {
    const state: IGameState = {
      money: this._money,
      level: this._level,
      enemyCurrentHp: this._enemyCurrentHp,
      shopItems: this._shopItems,
      attackMultiplier: this._attackMultiplier,
    };
    this._context.globalState.update(this._storageKey, state);
    this._onDidChangeState.fire();
  }

  public get money(): number {
    return this._money;
  }

  public get level(): number {
    return this._level;
  }

  public get enemyCurrentHp(): number {
    return this._enemyCurrentHp;
  }

  public get enemyMaxHp(): number {
    return 100 * this._level;
  }

  public get shopItems(): ShopItem[] {
    return this._shopItems;
  }

  public get attackMultiplier(): number {
    return this._attackMultiplier;
  }

  public dealDamage(amount: number) {
    const actualDamage = amount * this._attackMultiplier;
    this._enemyCurrentHp -= actualDamage;
    if (this._enemyCurrentHp <= 0) {
      this.handleEnemyDefeated();
    }
    this.saveState();
  }

  private handleEnemyDefeated() {
    const reward = 100 * this._level;
    this._money += reward;
    this._level++;
    this._onDidEnemyDefeated.fire();
    this._onDidLevelUp.fire(this._level);
    this.resetEnemy();
  }

  private resetEnemy() {
    this._enemyCurrentHp = this.enemyMaxHp;
  }

  public purchaseItem(itemId: string): boolean {
    const item = this._shopItems.find((i) => i.id === itemId);
    if (!item || item.bought || this._money < item.price) {
      return false;
    }

    this._money -= item.price;
    item.bought = true;
    this._attackMultiplier += item.attack;
    this.saveState();
    return true;
  }

  public reset() {
    this._money = 0;
    this._level = 1;
    this._shopItems = this.initializeShopItems();
    this._attackMultiplier = 1;
    this.resetEnemy();
    this.saveState();
  }
}
