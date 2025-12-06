import * as vscode from "vscode";

export interface PlayerAttributes {
  damageLevel: number;
  critChanceLevel: number;
  critMultiplierLevel: number;
}

export interface IGameState {
  money: number;
  level: number;
  enemyCurrentHp: number;
  attributes: PlayerAttributes;
}

export class GameState {
  private _money: number = 0;
  private _level: number = 1;
  private _enemyCurrentHp: number = 100;
  private _attributes: PlayerAttributes = {
    damageLevel: 1,
    critChanceLevel: 0,
    critMultiplierLevel: 0,
  };
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
      this._attributes = state.attributes || {
        damageLevel: 1,
        critChanceLevel: 0,
        critMultiplierLevel: 0,
      };
    } else {
      this.resetEnemy();
    }
  }

  private saveState() {
    const state: IGameState = {
      money: this._money,
      level: this._level,
      enemyCurrentHp: this._enemyCurrentHp,
      attributes: this._attributes,
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

  public get attributes(): PlayerAttributes {
    return { ...this._attributes };
  }

  // Calculate base damage from damage level
  private getBaseDamage(): number {
    return this._attributes.damageLevel;
  }

  // Calculate crit chance (0-100%)
  private getCritChance(): number {
    // Each level adds 5% crit chance, max 100%
    return Math.min(100, this._attributes.critChanceLevel * 5);
  }

  // Calculate crit multiplier
  private getCritMultiplier(): number {
    // Base 1.5x, each level adds 0.25x
    return 1.5 + this._attributes.critMultiplierLevel * 0.25;
  }

  // Get computed attribute values for display
  public getComputedAttributes() {
    return {
      damage: this.getBaseDamage(),
      critChance: this.getCritChance(),
      critMultiplier: this.getCritMultiplier(),
      damageLevel: this._attributes.damageLevel,
      critChanceLevel: this._attributes.critChanceLevel,
      critMultiplierLevel: this._attributes.critMultiplierLevel,
    };
  }

  // Calculate upgrade cost for each attribute
  public getUpgradeCost(attribute: keyof PlayerAttributes): number {
    const currentLevel = this._attributes[attribute];
    const baseCosts = {
      damageLevel: 100,
      critChanceLevel: 150,
      critMultiplierLevel: 200,
    };
    // Cost increases exponentially: baseCost * (1.5 ^ currentLevel)
    return Math.floor(baseCosts[attribute] * Math.pow(1.5, currentLevel));
  }

  public dealDamage(amount: number) {
    const baseDamage = this.getBaseDamage() * amount;
    const critChance = this.getCritChance();
    const critMultiplier = this.getCritMultiplier();

    // Roll for crit
    const isCrit = Math.random() * 100 < critChance;
    const actualDamage = isCrit ? baseDamage * critMultiplier : baseDamage;

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

  public upgradeAttribute(attribute: keyof PlayerAttributes): boolean {
    const cost = this.getUpgradeCost(attribute);
    if (this._money < cost) {
      return false;
    }

    this._money -= cost;
    this._attributes[attribute]++;
    this.saveState();
    return true;
  }

  public reset() {
    this._money = 0;
    this._level = 1;
    this._attributes = {
      damageLevel: 1,
      critChanceLevel: 0,
      critMultiplierLevel: 0,
    };
    this.resetEnemy();
    this.saveState();
  }
}
