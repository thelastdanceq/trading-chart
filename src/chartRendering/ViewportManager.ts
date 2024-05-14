import { ChartUtils } from "../utils/ChartUtils.ts";

export class ViewportManager {
  private _offsetX: number;
  private _offsetY: number;
  private _candlestickWidth: number;
  private canvasWidth: number;
  private canvasHeight: number;
  private readonly candlestickSpacing: number;
  private readonly dateScaleMarginY: number;
  private readonly priceScaleMarginX: number;
  private priceLow: number;
  private priceHigh: number;

  constructor(
    candlestickWidth: number,
    candlestickSpacing: number,
    canvasWidth: number,
    canvasHeight: number,
    dateScaleMarginY: number,
    priceScaleMarginX: number,
    private readonly onViewPortChange: () => void
  ) {
    this.candlestickSpacing = candlestickSpacing;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.dateScaleMarginY = dateScaleMarginY;
    this.priceScaleMarginX = priceScaleMarginX;
    this._candlestickWidth = candlestickWidth;
    this._offsetX = 0;
    this._offsetY = 0;

    // not sure
    this.priceLow = 0;
    this.priceHigh = 0;
  }

  // Setters to trigger onViewPortChange
  set offsetX(value: number) {
    this._offsetX = value;
    this.onViewPortChange();
  }

  get offsetX(): number {
    return this._offsetX;
  }

  set offsetY(value: number) {
    this._offsetY = value;
    this.onViewPortChange();
  }

  get offsetY(): number {
    return this._offsetY;
  }

  set candlestickWidth(value: number) {
    this._candlestickWidth = Math.max(0.5, Math.min(20, value));
    this.onViewPortChange();
  }

  get candlestickWidth(): number {
    return this._candlestickWidth;
  }

  public isInViewportByBarIdx(index: number): boolean {
    const x = this.getTransformedX(index);
    return x >= 0 && x <= this.canvasEffectiveWidth;
  }
  public isInViewportByPriceValue(
    value: number,
    min: number,
    max: number
  ): boolean {
    const y = this.getTransformedY(value, min, max);
    return y >= 0 && y <= this.canvasEffectiveHeight;
  }

  public isInViewportAndOnPriceScale(mouseX: number) {
    return mouseX >= this.canvasEffectiveWidth && mouseX <= this.canvasWidth;
  }

  public updateCanvasSize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public updateCandlestickWidth(newWidth: number) {
    this.candlestickWidth = newWidth;
  }

  public pan(deltaX: number, deltaY: number) {
    this.offsetX += deltaX;
    this.offsetY += deltaY;
  }

  public panByXAmount(deltaBarsX: number) {
    this.offsetX +=
      deltaBarsX * (this.candlestickWidth + this.candlestickSpacing);
  }

  public zoomX(scaleDelta: number, anchorX: number) {
    const mouseXPercent =
      (anchorX + this.offsetX) /
      (this.candlestickWidth + this.candlestickSpacing);

    this.candlestickWidth += scaleDelta;
    this.candlestickWidth = Math.max(0.5, Math.min(20, this.candlestickWidth));

    this.offsetX =
      mouseXPercent * (this.candlestickWidth + this.candlestickSpacing) -
      anchorX;
  }
  public zoomY(scaleDelta: number) {
    const priceRange = this.priceHigh - this.priceLow;

    this.priceLow += scaleDelta * priceRange;
    this.priceHigh -= scaleDelta * priceRange;
  }

  public getIndexByCanvasX(x: number): number {
    return Math.floor(
      (x + this.offsetX) / (this.candlestickWidth + this.candlestickSpacing)
    );
  }

  public getTransformedX(index: number): number {
    return (
      index * (this.candlestickWidth + this.candlestickSpacing) - this.offsetX
    );
  }

  public getTransformedY(value: number, min: number, max: number): number {
    return (
      ChartUtils.scale(value, min, max, this.canvasEffectiveHeight, 0) -
      this.offsetY
    );
  }

  public getPriceByCanvasY(y: number, min: number, max: number): number {
    return ChartUtils.scale(
      y + this.offsetY,
      this.canvasEffectiveHeight,
      0,
      min,
      max
    );
  }

  public getVisiblePriceBounds(min: number, max: number): [number, number] {
    const priceRange = max - min;
    const pricePerPixel = priceRange / this.canvasEffectiveHeight;
    const priceOffset = -this.offsetY * pricePerPixel;
    return [min + priceOffset, max + priceOffset];
  }

  public setPriceBounds(min: number, max: number) {
    this.priceLow = min;
    this.priceHigh = max;
  }

  public get canvasEffectiveHeight(): number {
    return this.canvasHeight - this.dateScaleMarginY;
  }

  public get canvasEffectiveWidth(): number {
    return this.canvasWidth - this.priceScaleMarginX;
  }

  public getCurrentCandlestickWidth(): number {
    return this.candlestickWidth;
  }

  public getPriceBounds(): {
    low: number;
    high: number;
  } {
    return {
      low: this.priceLow,
      high: this.priceHigh,
    };
  }
}
