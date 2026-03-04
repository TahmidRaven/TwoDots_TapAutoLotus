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
        for (const bolt of this._activeBolts) {
            this.renderCleanLine(bolt.start, bolt.end, bolt.colorHex);
        }
    }

    private renderCleanLine(start: Vec3, end: Vec3, colorHex: string) {
        const baseColor = new Color().fromHEX(colorHex);
        this.graphics.lineJoin = Graphics.LineJoin.ROUND;
        this.graphics.lineCap = Graphics.LineCap.ROUND;
        
        this.graphics.strokeColor = baseColor;
        this.graphics.lineWidth = 12; 
        this.graphics.moveTo(start.x, start.y);
        this.graphics.lineTo(end.x, end.y);
        this.graphics.stroke();
    }
}