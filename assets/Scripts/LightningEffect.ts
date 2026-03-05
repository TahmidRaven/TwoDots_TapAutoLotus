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
        
        // We draw in layers: first all the glows, then all the bright cores
        // This ensures the glow doesn't "overlap" and hide the sharp centers
        
        // LAYER 1: OUTER GLOW
        for (const bolt of this._activeBolts) {
            this.renderGlowLine(bolt.start, bolt.end, bolt.colorHex, 24, 50); // Thick, faint
        }

        // LAYER 2: INNER GLOW
        for (const bolt of this._activeBolts) {
            this.renderGlowLine(bolt.start, bolt.end, bolt.colorHex, 16, 150); // Medium
        }

        // LAYER 3: CORE
        for (const bolt of this._activeBolts) {
            this.renderCleanLine(bolt.start, bolt.end, "#FFFFFF"); // Pure white center
        }
    }

    private renderGlowLine(start: Vec3, end: Vec3, colorHex: string, width: number, alpha: number) {
        const glowColor = new Color().fromHEX(colorHex);
        glowColor.a = alpha; // Set the transparency for the glow layer

        this.graphics.lineJoin = Graphics.LineJoin.ROUND;
        this.graphics.lineCap = Graphics.LineCap.ROUND;
        this.graphics.strokeColor = glowColor;
        this.graphics.lineWidth = width;
        
        this.graphics.moveTo(start.x, start.y);
        this.graphics.lineTo(end.x, end.y);
        this.graphics.stroke();
    }

    private renderCleanLine(start: Vec3, end: Vec3, colorHex: string) {
        const baseColor = new Color().fromHEX(colorHex);
        this.graphics.lineJoin = Graphics.LineJoin.ROUND;
        this.graphics.lineCap = Graphics.LineCap.ROUND;
        
        this.graphics.strokeColor = baseColor;
        this.graphics.lineWidth = 6; // Thinner core for a sharp look
        this.graphics.moveTo(start.x, start.y);
        this.graphics.lineTo(end.x, end.y);
        this.graphics.stroke();
    }
}