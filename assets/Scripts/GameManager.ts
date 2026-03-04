import { _decorator, Component, Label, Node } from 'cc';
import { GridController } from './GridController';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager = null!;

    @property(GridController) gridController: GridController = null!;
    @property(Label) movesLabel: Label = null!;
    @property(Label) greenCounter: Label = null!;
    @property(Label) darkBlueCounter: Label = null!;
    @property(Label) redCounter: Label = null!;

    @property(Node) victoryScreen: Node = null!;

    private _moves: number = 100;
    private _collected = { green: 0, darkBlue: 0, red: 0 };
    private _goals = { green: 10, darkBlue: 10, red: 10 };
    private _isGameOver: boolean = false;

    public get isGameOver() { return this._isGameOver; }

    onLoad() {
        GameManager.instance = this;
        if (this.victoryScreen) this.victoryScreen.active = false;
    }

    start() {
        this.updateUI();
        if (this.gridController) this.gridController.initGrid();
    }

    public decrementMoves() {
        this._moves--;
        this.updateUI();
        if (this._moves <= 0) this.endGame(false);
    }

    public registerDotsCollected(colorId: string, count: number) {
        let key = colorId.toLowerCase();
        if (key.includes("darkblue")) key = "darkBlue";
        if (this._collected.hasOwnProperty(key)) {
            this._collected[key as keyof typeof this._collected] += count;
        }
        this.updateUI();
        this.checkWin();
    }

    private updateUI() {
        if (this.movesLabel) this.movesLabel.string = this._moves.toString();
        if (this.greenCounter) this.greenCounter.string = `${this._collected.green} / ${this._goals.green}`;
        if (this.darkBlueCounter) this.darkBlueCounter.string = `${this._collected.darkBlue} / ${this._goals.darkBlue}`;
        if (this.redCounter) this.redCounter.string = `${this._collected.red} / ${this._goals.red}`;
    }

    private checkWin() {
        if (this._collected.green >= this._goals.green && 
            this._collected.darkBlue >= this._goals.darkBlue && 
            this._collected.red >= this._goals.red) {
            this.endGame(true);
        }
    }

    private endGame(win: boolean) {
        if (this._isGameOver) return;
        this._isGameOver = true;
        
        if (win) {
            console.log("WIN!");
            if (this.victoryScreen) this.victoryScreen.active = true;
        } else {
            console.log("LOSE!");
        }
    }
}