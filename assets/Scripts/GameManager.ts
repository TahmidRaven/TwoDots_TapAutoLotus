import { _decorator, Component, Label, Node, v3, Vec3 } from 'cc';
import { GridController } from './GridController';
import { VictoryScreen } from './VictoryScreen';
import { TutorialHand } from './TutorialHand';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager = null!;

    @property(GridController) gridController: GridController = null!;
    @property(Label) movesLabel: Label = null!;
    @property(Label) greenCounter: Label = null!;
    @property(Label) darkBlueCounter: Label = null!;
    @property(Label) redCounter: Label = null!;
    @property(VictoryScreen) victoryScreen: VictoryScreen = null!;
    
    @property(TutorialHand) tutorialHand: TutorialHand = null!;

    private _moves: number = 100;
    private _collected = { green: 0, darkBlue: 0, red: 0 };
    private _goals = { green: 10, darkBlue: 10, red: 10 };
    private _isGameOver: boolean = false;
    private _gameStarted: boolean = false;

    public get isGameOver() { return this._isGameOver; }
    public get hasGameStarted() { return this._gameStarted; }

    onLoad() {
        GameManager.instance = this;
    }


start() {
    this.updateUI();

    if (this.gridController) {
        // Fill grid first
        this.gridController.initGrid(() => {
            // Board is now full and dots have landed
            if (this.tutorialHand) {
                const hintPos = this.gridController.getHintPosition();
                
                if (hintPos) {
                    // Apply the Y offset here
                    const adjustedPos = v3(hintPos.x, hintPos.y - 153, hintPos.z);
                    this.tutorialHand.showAt(adjustedPos); 
                } else {
                    // Fallback to center with offset if desired
                    this.tutorialHand.showAt(v3(0, -153, 0));
                }
            }
        });
    }
}

    public startGame() {
        if (this._gameStarted) return;
        this._gameStarted = true;

        if (this.tutorialHand) {
            this.tutorialHand.hide();
        }
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
        
        if (this.victoryScreen) {
            this.victoryScreen.show(win);
        }
    }
}