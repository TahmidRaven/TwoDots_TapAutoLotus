import { _decorator, Component, Graphics, Vec3, Color, isValid } from 'cc';
const { ccclass } = _decorator;

@ccclass('LightningEffect')
export class LightningEffect extends Component {
    private graphics: Graphics = null!;
    private _activeBolts: { start: Vec3, end: Vec3, colorHex: string }[] = [];
    private _isDrawing: boolean = false;

    onLoad() {
        this.graphics = this.getComponent(Graphics) || this.addComponent(Graphics);
    }

    public clearWeb() {
        this._activeBolts = [];
        this._isDrawing = false;
        if (this.graphics && isValid(this.graphics)) this.graphics.clear();
    }

    public drawLightning(start: Vec3, end: Vec3, colorHex: string = "#FFFFFF") {
        if (!this.graphics) return;
        this._activeBolts.push({ start, end, colorHex });
        this._isDrawing = true;
    }

    protected update(dt: number) {
        if (!this._isDrawing || this._activeBolts.length === 0) return;
        this.graphics.clear();
        
        // LAYER 1: OUTER COLORED GLOW
        for (const bolt of this._activeBolts) {
            this.renderLine(bolt.start, bolt.end, bolt.colorHex, 25, 150); 
        }

        // LAYER 2: SUBTLE WHITE GLOW (Edges/Highlights)
        for (const bolt of this._activeBolts) {
            this.renderLine(bolt.start, bolt.end, bolt.colorHex, 25, 80); 
        }

        // LAYER 3: COLORED CORE
        for (const bolt of this._activeBolts) {
            this.renderLine(bolt.start, bolt.end, bolt.colorHex, 20, 255); 
        }
    }

    private renderLine(start: Vec3, end: Vec3, colorHex: string, width: number, alpha: number) {
        const color = new Color().fromHEX(colorHex);
        color.a = alpha;

        this.graphics.lineJoin = Graphics.LineJoin.ROUND;
        this.graphics.lineCap = Graphics.LineCap.ROUND;
        this.graphics.strokeColor = color;
        this.graphics.lineWidth = width;
        
        this.graphics.moveTo(start.x, start.y);
        this.graphics.lineTo(end.x, end.y);
        this.graphics.stroke();
    }
}   