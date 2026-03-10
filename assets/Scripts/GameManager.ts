import { _decorator, Component, Label, Node, v3, Vec3, CCFloat } from 'cc';
import { GridController } from './GridController';
import { VictoryScreen } from './VictoryScreen';
import { TutorialHand } from './TutorialHand';
import { AudioContent } from './AudioContent';

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

    @property([AudioContent]) rippleArray: AudioContent[] = [];
    @property(AudioContent) winSfx: AudioContent = null!;
    @property(AudioContent) failSfx: AudioContent = null!;
    
    // Linked to the "BGM" node in your hierarchy
    @property(AudioContent) bgmSfx: AudioContent = null!;

    @property({ 
        type: CCFloat, 
        tooltip: "Seconds of inactivity before a hint appears" 
    })
    public hintDelay: number = 6.0; 

    private _moves: number = 100;
    private _collected = { green: 0, darkBlue: 0, red: 0 };
    private _goals = { green: 10, darkBlue: 10, red: 10 };
    private _isGameOver: boolean = false;
    private _gameStarted: boolean = false;
    private _idleTimer: number = 0;
    private _rippleIndex: number = 0; 

    public get isGameOver() { return this._isGameOver; }
    public get hasGameStarted() { return this._gameStarted; }

    onLoad() {
        GameManager.instance = this;
    }

    start() {
        this.updateUI();
        if (this.gridController) {
            this.gridController.initGrid(() => {
                this.showHint(); 
            });
        }
    }

    update(dt: number) {
        if (!this._gameStarted || this._isGameOver) return;
        this._idleTimer += dt;
        if (this._idleTimer >= this.hintDelay) {
            this.showHint();
            this._idleTimer = 0; 
        }
    }

    public playNextRipple() {
        if (this.rippleArray.length > 0) {
            const audio = this.rippleArray[this._rippleIndex];
            if (audio) {
                audio.play();
            }
            // Move to next sound, capping at the last one if the chain is very long
            this._rippleIndex = Math.min(this._rippleIndex + 1, this.rippleArray.length - 1);
        }
    }

    public resetRippleIndex() {
        this._rippleIndex = 0;
    }

    private showHint() {
        if (this.gridController && this.tutorialHand) {
            const hintPos = this.gridController.getHintPosition();
            if (hintPos) {
                const adjustedPos = v3(hintPos.x, hintPos.y - 153, hintPos.z);
                this.tutorialHand.showAt(adjustedPos); 
            }
        }
    }

    public resetIdleTimer() {
        this._idleTimer = 0;
        if (this.tutorialHand) this.tutorialHand.hide();
    }

    public startGame() {
        if (this._gameStarted) return;
        this._gameStarted = true;

        // Play BGM when the user first interacts
        if (this.bgmSfx) {
            this.bgmSfx.play();
        }

        this.resetIdleTimer();
    }

    public decrementMoves() {
        this._moves--;
        this.resetIdleTimer();
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
        if (win && this.winSfx) this.winSfx.play();
        else if (!win && this.failSfx) this.failSfx.play();
        if (this.victoryScreen) this.victoryScreen.show(win);
    }
}