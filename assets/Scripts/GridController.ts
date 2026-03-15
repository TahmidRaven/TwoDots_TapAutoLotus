import { _decorator, Component, Node, Prefab, instantiate, UITransform, v3, Vec3, tween, Animation, isValid, CCInteger, CCFloat, Sprite, Color } from 'cc';
import { GridPiece } from './GridPiece';
import { GameManager } from './GameManager';
import { LightningEffect } from './LightningEffect';
import { MatchFinder, MatchLink } from './MatchFinder';
import { AudioContent } from './AudioContent';

const { ccclass, property } = _decorator;

@ccclass('GridController')
export class GridController extends Component {
    @property([Prefab]) dotPrefabs: Prefab[] = [];
    @property(Prefab) lotusPrefab: Prefab = null!;
    @property(Prefab) whiteDotPrefab: Prefab = null!;
    @property(Prefab) burstAnimPrefab: Prefab = null!;
    @property(LightningEffect) lightning: LightningEffect = null!;

    @property(AudioContent) wooshSfx: AudioContent = null!;
    @property(AudioContent) destroySfx: AudioContent = null!;

    @property(Node)
    public cameraNode: Node = null!; 

    @property(CCInteger) rows: number = 9;
    @property(CCInteger) cols: number = 9;
    @property(CCFloat) cellSize: number = 55;
    @property(CCFloat) padding: number = 10;
    @property(CCFloat) gridScale: number = 1.0;

    private grid: (Node | null)[][] = [];
    private isProcessing: boolean = false;
    private _isInitialLoad: boolean = true;
    private _onInitialFillComplete: (() => void) | null = null;

    private readonly colorMap: { [key: string]: string } = {
        "green": "#79B496",
        "darkBlue": "#4E6681",
        "red": "#E35B5B",
        "yellow": "#FBC367",
        "purple": "#8F6B9B",
        "blue": "#7693C0"
    };

    private get spacing(): number { return this.cellSize + this.padding; }

    onLoad() { this.node.on(Node.EventType.TOUCH_END, this.onGridTouch, this); }

    public initGrid(onComplete?: () => void) {
        if (onComplete) this._onInitialFillComplete = onComplete;
        this.generateGrid();
        this.triggerUnifiedFall();
    }

    public getHintPosition(): Vec3 | null {
        const hint = MatchFinder.findFirstValidMatch(this.grid, this.rows, this.cols);
        return hint ? hint.pos : null;
    }

    private generateGrid() {
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) this.grid[r][c] = null;
        }
    }

    private onGridTouch(event: any) {
        if (!GameManager.instance.hasGameStarted) GameManager.instance.startGame();
        GameManager.instance.resetIdleTimer();
        if (this.isProcessing || (GameManager.instance && GameManager.instance.isGameOver)) return;
        
        const uiTransform = this.node.getComponent(UITransform)!;
        const localPos = uiTransform.convertToNodeSpaceAR(v3(event.getUILocation().x, event.getUILocation().y, 0));
        const totalW = (this.cols - 1) * this.spacing;
        const totalH = (this.rows - 1) * this.spacing;
        const c = Math.round((localPos.x + (totalW / 2)) / this.spacing);
        const r = Math.round(((totalH / 2) - localPos.y) / this.spacing);
        
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) this.handleCellTap(r, c);
    }

    private handleCellTap(r: number, c: number) {
        const targetNode = this.grid[r][c];
        if (!targetNode) return;
        const piece = targetNode.getComponent(GridPiece);
        if (!piece) return;
        
        const links = MatchFinder.getChainMatches(r, c, piece.colorId, this.grid, this.rows, this.cols);
        GameManager.instance.resetRippleIndex();

        if (links.length > 0) this.executeLotusSequence(piece.colorId, r, c, links);
    }

    private shakeCamera(intensity: number = 10) {
        if (!this.cameraNode) return;
        tween(this.cameraNode).stop();
        const originalPos = v3(0, 0, 0); 
        
        tween(this.cameraNode)
            .to(0.04, { position: v3(originalPos.x + (Math.random() - 0.5) * intensity, originalPos.y + (Math.random() - 0.5) * intensity, 0) })
            .to(0.04, { position: v3(originalPos.x + (Math.random() - 0.5) * (intensity * 0.7), originalPos.y + (Math.random() - 0.5) * (intensity * 0.7), 0) })
            .to(0.04, { position: v3(originalPos.x + (Math.random() - 0.5) * (intensity * 0.4), originalPos.y + (Math.random() - 0.5) * (intensity * 0.4), 0) })
            .to(0.05, { position: originalPos }, { easing: 'quadOut' })
            .start();
    }

    private async executeLotusSequence(colorId: string, startR: number, startC: number, links: MatchLink[]) {
        this.isProcessing = true;
        const startNode = this.grid[startR][startC]!;
        const lotusPos = v3(startNode.position);
        const dotHex = this.colorMap[colorId] || "#FFFFFF";

        if (this.wooshSfx) this.wooshSfx.play();

        startNode.destroy();
        const lotus = instantiate(this.lotusPrefab);
        lotus.parent = this.node;
        lotus.setPosition(lotusPos);
        this.grid[startR][startC] = lotus;

        const animNode = lotus.getChildByName("LotusAnim");
        if (animNode) {
            const anim = animNode.getComponent(Animation);
            if (anim) {
                const formattedColor = colorId.charAt(0).toUpperCase() + colorId.slice(1);
                anim.play(`LotusAnim_${formattedColor}`);
            }
        }

        await new Promise(resolve => this.scheduleOnce(resolve, 0.7));

        for (const link of links) {
            if (this.lightning) this.lightning.drawLightning(link.origin, link.target.position, dotHex);
            GameManager.instance.playNextRipple();

            if (this.whiteDotPrefab) {
                const bgDot = instantiate(this.whiteDotPrefab);
                bgDot.parent = this.node;
                bgDot.setPosition(link.target.position);
                bgDot.setSiblingIndex(0);
                
                const sprite = bgDot.getComponent(Sprite) || bgDot.getComponentInChildren(Sprite);
                if (sprite) {
                    const color = new Color().fromHEX(dotHex);
                    color.a = 235;
                    sprite.color = color;
                }
                
                const peakScale = this.gridScale * 2.2; 
                tween(bgDot)
                    .to(0.1, { scale: v3(peakScale, peakScale, 1) }, { easing: 'sineOut' })
                    .parallel(
                        tween().to(0.2, { scale: v3(this.gridScale, this.gridScale, 1) }, { easing: 'sineIn' }),
                        tween(sprite).to(0.2, { color: new Color(sprite!.color.r, sprite!.color.g, sprite!.color.b, 70) })
                    )
                    .call(() => { if (isValid(bgDot)) bgDot.destroy(); })
                    .start();
            }
            await new Promise(resolve => this.scheduleOnce(resolve, 0.05));
        }

        this.scheduleOnce(() => {
            if (this.lightning) this.lightning.clearWeb();
            tween(lotus)
                .to(0.4, { angle: 360 }, { easing: 'quartOut' })
                .call(() => {
                    links.forEach(link => {
                        const node = link.target;
                        const p = node.getComponent(GridPiece)!;
                        this.grid[p.row][p.col] = null;
                        this.playPopAndBurst(node, colorId, false);
                    });
                    this.grid[startR][startC] = null;
                    this.playPopAndBurst(lotus, colorId, true);
                    
                    GameManager.instance.registerDotsCollected(colorId, links.length + 1);
                    GameManager.instance.decrementMoves();
                    
                    this.scheduleOnce(() => this.triggerUnifiedFall(), 0.6);
                })
                .start();
        }, 0.4); 
    }

    private playPopAndBurst(node: Node, colorId: string, isLotus: boolean) {
        if (this.destroySfx) this.destroySfx.play();
        
        // CAMERA SHAKE INTENSITY: LOTUS = 15, NORMAL = 6 --> Raven
        this.shakeCamera(isLotus ? 15 : 6);

        const pos = v3(node.position);
        if (this.burstAnimPrefab) {
            const burst = instantiate(this.burstAnimPrefab);
            burst.parent = this.node;
            burst.setPosition(pos);
            const sprite = burst.getComponent(Sprite) || burst.getComponentInChildren(Sprite);
            if (sprite) sprite.color = new Color().fromHEX(this.colorMap[colorId] || "#FFFFFF");
            const anim = burst.getComponent(Animation) || burst.getComponentInChildren(Animation);
            if (anim) anim.play();

            this.scheduleOnce(() => { if(isValid(burst)) burst.destroy(); }, 1.11);
        }
        tween(node)
            .to(0.1, { scale: v3(this.gridScale * 1.25, this.gridScale * 1.25, 1) })
            .to(0.15, { scale: v3(0, 0, 0) })
            .call(() => { if (isValid(node)) node.destroy(); })
            .start();
    }

    private triggerUnifiedFall() {
        const totalW = (this.cols - 1) * this.spacing;
        const totalH = (this.rows - 1) * this.spacing;
        let longestAnimation = 0;
        for (let c = 0; c < this.cols; c++) {
            let emptySpaces = 0;
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.grid[r][c] === null) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    const node = this.grid[r][c]!;
                    const newRow = r + emptySpaces;
                    this.grid[newRow][c] = node;
                    this.grid[r][c] = null;
                    node.getComponent(GridPiece)!.row = newRow;
                    const duration = 0.35 + (emptySpaces * 0.05);
                    longestAnimation = Math.max(longestAnimation, duration);
                    tween(node).to(duration, { position: v3(node.position.x, (totalH / 2) - (newRow * this.spacing), 0) }, { easing: 'bounceOut' }).start();
                }
            }
            for (let i = 0; i < emptySpaces; i++) {
                const targetRow = emptySpaces - 1 - i;
                const dot = instantiate(this.dotPrefabs[Math.floor(Math.random() * this.dotPrefabs.length)]);
                dot.parent = this.node;
                dot.setScale(v3(this.gridScale, this.gridScale, 1));
                const p = dot.getComponent(GridPiece) || dot.addComponent(GridPiece);
                p.row = targetRow; p.col = c;
                const startX = (c * this.spacing) - (totalW / 2);
                dot.setPosition(startX, (totalH / 2) + 100 + (i * this.spacing));
                this.grid[targetRow][c] = dot;
                const duration = 0.4 + (targetRow * 0.05);
                longestAnimation = Math.max(longestAnimation, duration);
                tween(dot).to(duration, { position: v3(startX, (totalH / 2) - (targetRow * this.spacing), 0) }, { easing: 'bounceOut' }).start();
            }
        }
        this.scheduleOnce(() => {
            this.isProcessing = false; 
            if (this._isInitialLoad && this._onInitialFillComplete) {
                this._onInitialFillComplete();
                this._onInitialFillComplete = null;
                this._isInitialLoad = false;
            }
        }, longestAnimation);
    }
}