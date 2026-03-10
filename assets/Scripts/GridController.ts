import { _decorator, Component, Node, Prefab, instantiate, UITransform, v3, Vec3, tween, Animation, isValid, CCInteger, CCFloat, Sprite, Color } from 'cc';
import { GridPiece } from './GridPiece';
import { GameManager } from './GameManager';
import { LightningEffect } from './LightningEffect';
import { MatchFinder, MatchLink } from './MatchFinder';

const { ccclass, property } = _decorator;

@ccclass('GridController')
export class GridController extends Component {
    @property([Prefab]) dotPrefabs: Prefab[] = [];
    @property(Prefab) lotusPrefab: Prefab = null!;
    @property(Prefab) whiteDotPrefab: Prefab = null!;
    @property(Prefab) burstAnimPrefab: Prefab = null!;
    @property(LightningEffect) lightning: LightningEffect = null!;

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

    private get spacing(): number {
        return this.cellSize + this.padding;
    }

    onLoad() {
        this.node.on(Node.EventType.TOUCH_END, this.onGridTouch, this);
    }

    public initGrid(onComplete?: () => void) {
        if (onComplete) {
            this._onInitialFillComplete = onComplete;
        }
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
        if (!GameManager.instance.hasGameStarted) {
            GameManager.instance.startGame();
        }

        GameManager.instance.resetIdleTimer();

        if (this.isProcessing || (GameManager.instance && GameManager.instance.isGameOver)) return;
        
        const uiTransform = this.node.getComponent(UITransform)!;
        const localPos = uiTransform.convertToNodeSpaceAR(v3(event.getUILocation().x, event.getUILocation().y, 0));
        
        const totalW = (this.cols - 1) * this.spacing;
        const totalH = (this.rows - 1) * this.spacing;
        
        const c = Math.round((localPos.x + (totalW / 2)) / this.spacing);
        const r = Math.round(((totalH / 2) - localPos.y) / this.spacing);

        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            this.handleCellTap(r, c);
        }
    }

    private handleCellTap(r: number, c: number) {
        const targetNode = this.grid[r][c];
        if (!targetNode) return;
        const piece = targetNode.getComponent(GridPiece);
        if (!piece) return;

        const links = MatchFinder.getChainMatches(r, c, piece.colorId, this.grid, this.rows, this.cols);
        
        if (links.length > 0) {
            this.executeLotusSequence(piece.colorId, r, c, links);
        }
    }

    private async executeLotusSequence(colorId: string, startR: number, startC: number, links: MatchLink[]) {
        this.isProcessing = true;
        const startNode = this.grid[startR][startC]!;
        const lotusPos = v3(startNode.position);
        const dotHex = this.colorMap[colorId] || "#FFFFFF";

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
                const clipName = `LotusAnim_${formattedColor}`;
                anim.play(clipName);
            }
        }

        await new Promise(resolve => this.scheduleOnce(resolve, 0.5));
        await new Promise(resolve => this.scheduleOnce(resolve, 0.5));

        for (const link of links) {
            if (this.lightning) {
                this.lightning.drawLightning(link.origin, link.target.position, dotHex);
            }

            if (this.whiteDotPrefab) {
                const bgDot = instantiate(this.whiteDotPrefab);
                bgDot.parent = this.node;
                bgDot.setPosition(link.target.position);
                bgDot.setSiblingIndex(0);

                const sprite = bgDot.getComponent(Sprite) || bgDot.getComponentInChildren(Sprite);
                if (sprite) {
                    const color = new Color().fromHEX(dotHex);
                    color.a = 235; // Start at 235 opacity
                    sprite.color = color;
                }

                const peakScale = this.gridScale * 2.2; 
                const originalScale = v3(this.gridScale, this.gridScale, 1);

                // Sequential Ripple: Expand then Shrink back to 70 opacity
                tween(bgDot)
                    .to(0.15, { scale: v3(peakScale, peakScale, 1) }, { easing: 'sineOut' })
                    .parallel(
                        tween().to(0.25, { scale: originalScale }, { easing: 'sineIn' }),
                        tween(sprite).to(0.25, { color: new Color(sprite!.color.r, sprite!.color.g, sprite!.color.b, 70) }) // End at 70 opacity
                    )
                    .call(() => { if (isValid(bgDot)) bgDot.destroy(); })
                    .start();
            }

            await new Promise(resolve => this.scheduleOnce(resolve, 0.08));
        }

        this.scheduleOnce(() => {
            if (this.lightning) this.lightning.clearWeb();
            
            links.forEach(link => {
                const node = link.target;
                const p = node.getComponent(GridPiece)!;
                this.grid[p.row][p.col] = null;
                this.playPopAndBurst(node, colorId);
            });

            this.grid[startR][startC] = null;
            this.playPopAndBurst(lotus, colorId);

            GameManager.instance.registerDotsCollected(colorId, links.length + 1);
            GameManager.instance.decrementMoves();

            this.scheduleOnce(() => this.triggerUnifiedFall(), 0.5);
        }, 0.6); 
    }

    private playPopAndBurst(node: Node, colorId: string) {
        const pos = v3(node.position);
        if (this.burstAnimPrefab) {
            const burst = instantiate(this.burstAnimPrefab);
            burst.parent = this.node;
            burst.setPosition(pos);
            burst.setSiblingIndex(this.node.children.length);

            const sprite = burst.getComponent(Sprite) || burst.getComponentInChildren(Sprite);
            if (sprite) {
                const hex = this.colorMap[colorId] || "#FFFFFF";
                sprite.color = new Color().fromHEX(hex);
            }

            const anim = burst.getComponent(Animation) || burst.getComponentInChildren(Animation);
            if (anim) anim.play();
            this.scheduleOnce(() => { if(isValid(burst)) burst.destroy(); }, 1.0);
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

                    const piece = node.getComponent(GridPiece)!;
                    piece.row = newRow;

                    const targetY = (totalH / 2) - (newRow * this.spacing);
                    const duration = 0.3 + (emptySpaces * 0.05);
                    longestAnimation = Math.max(longestAnimation, duration);

                    tween(node).to(duration, { position: v3(node.position.x, targetY, 0) }, { easing: 'bounceOut' }).start();
                }
            }

            for (let i = 0; i < emptySpaces; i++) {
                const targetRow = emptySpaces - 1 - i;
                const prefab = this.dotPrefabs[Math.floor(Math.random() * this.dotPrefabs.length)];
                const dot = instantiate(prefab);
                dot.parent = this.node;
                dot.setScale(v3(this.gridScale, this.gridScale, 1));
                
                const p = dot.getComponent(GridPiece) || dot.addComponent(GridPiece);
                p.row = targetRow; p.col = c;
                
                const startX = (c * this.spacing) - (totalW / 2);
                const targetY = (totalH / 2) - (targetRow * this.spacing);
                
                dot.setPosition(startX, (totalH / 2) + 100 + (i * this.spacing));
                this.grid[targetRow][c] = dot;

                const duration = 0.4 + (targetRow * 0.05);
                longestAnimation = Math.max(longestAnimation, duration);

                tween(dot).to(duration, { position: v3(startX, targetY, 0) }, { easing: 'bounceOut' }).start();
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