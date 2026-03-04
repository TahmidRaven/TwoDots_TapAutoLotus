import { _decorator, Component, Node, Prefab, instantiate, UITransform, v3, Vec3, tween, Animation, isValid, CCInteger, CCFloat, Sprite, Color } from 'cc';
import { GridPiece } from './GridPiece';
import { GameManager } from './GameManager';
import { LightningEffect } from './LightningEffect';
import { MatchFinder } from './MatchFinder';

const { ccclass, property } = _decorator;

@ccclass('GridController')
export class GridController extends Component {
    @property([Prefab]) dotPrefabs: Prefab[] = [];
    @property(Prefab) lotusPrefab: Prefab = null!;
    @property(Prefab) burstAnimPrefab: Prefab = null!; 
    @property(LightningEffect) lightning: LightningEffect = null!;

    @property(CCInteger) rows: number = 9;
    @property(CCInteger) cols: number = 9;
    @property(CCFloat) cellSize: number = 55; 
    @property(CCFloat) padding: number = 10; // Adjust this to add space between dots
    @property(CCFloat) gridScale: number = 1.0;

    private grid: (Node | null)[][] = [];
    private isProcessing: boolean = false;

    // Returns the total distance between the centers of two adjacent dots
    private get spacing(): number {
        return this.cellSize + this.padding;
    }

    private readonly colorMap: { [key: string]: string } = {
        "green": "#79B496",
        "darkBlue": "#4E6681",
        "red": "#E35B5B",
        "yellow": "#FBC367",
        "purple": "#8F6B9B",
        "blue": "#7693C0"
    };

    onLoad() {
        this.node.on(Node.EventType.TOUCH_END, this.onGridTouch, this);
    }

    public initGrid() {
        this.generateGrid();
        this.triggerUnifiedFall();
    }

    private generateGrid() {
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) this.grid[r][c] = null;
        }
    }

    private onGridTouch(event: any) {
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

        const matches = MatchFinder.getAdjacentMatches(r, c, piece.colorId, this.grid, this.rows, this.cols);
        if (matches.length > 0) {
            this.executeLotusSequence(piece.colorId, r, c, matches);
        }
    }

    private executeLotusSequence(colorId: string, startR: number, startC: number, matches: Node[]) {
        this.isProcessing = true;
        const startNode = this.grid[startR][startC]!;
        const lotusPos = v3(startNode.position);
        const dotHex = this.colorMap[colorId] || "#FFFFFF";

        // PHASE 1: LOTUS SPAWN
        startNode.destroy();
        const lotus = instantiate(this.lotusPrefab);
        lotus.parent = this.node;
        lotus.setPosition(lotusPos);
        this.grid[startR][startC] = lotus;
        lotus.getComponent(Animation)?.play();

        this.scheduleOnce(() => {
            // PHASE 2: DRAW LINES with Dot Color
            matches.forEach(m => {
                if (this.lightning) this.lightning.drawLightning(lotus.position, m.position, dotHex);
            });

            // PHASE 3: DESTROY
            this.scheduleOnce(() => {
                if (this.lightning) this.lightning.clearWeb();
                
                matches.forEach(m => {
                    const p = m.getComponent(GridPiece)!;
                    this.grid[p.row][p.col] = null;
                    this.playPopAndBurst(m, colorId);
                });

                this.grid[startR][startC] = null;
                this.playPopAndBurst(lotus, colorId);

                GameManager.instance.registerDotsCollected(colorId, matches.length + 1);
                GameManager.instance.decrementMoves();

                this.scheduleOnce(() => this.triggerUnifiedFall(), 1.03); 

            }, 0.5); 
        }, 1.0); 
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
            this.scheduleOnce(() => { if(isValid(burst)) burst.destroy(); }, 1.03);
        }

        tween(node)
            .to(0.1, { scale: v3(this.gridScale * 1.2, this.gridScale * 1.2, 1) })
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
        this.scheduleOnce(() => { this.isProcessing = false; }, longestAnimation);
    }
}