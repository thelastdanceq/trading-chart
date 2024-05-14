import { Bar } from "../api/CandleStickApi.ts";
import { InputHandler } from "./InputHandler.ts";
import { ChartUtils } from "../utils/ChartUtils.ts";
import { ViewportManager } from "./ViewportManager.ts";

export enum TimelineDirection {
  FORWARD = 1,
  BACKWARD,
}

export class CandleStickRenderer {
  private mouseX: number | null = null;
  private mouseY: number | null = null;

  private barsToRender: Bar[] | null = null;

  private readonly candlestickSpacing = 2;
  private readonly defaultCandlestickWidth = 10;
  private readonly dateScaleMarginY = 30;
  private readonly priceScaleMarginX = 70;

  private readonly viewportManager: ViewportManager;

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
    private barsAreMissingFromSide: (
      direction: TimelineDirection
    ) => Promise<void>
  ) {
    this.viewportManager = new ViewportManager(
      this.defaultCandlestickWidth,
      this.candlestickSpacing,
      this.canvas.width,
      this.canvas.height,
      this.dateScaleMarginY,
      this.priceScaleMarginX,
      this.onViewPortChange.bind(this)
    );

    this.canvas.style.cursor = "default";
    const handleDrag = this.handleDrag.bind(this);
    const handleMouseMove = this.handleMouseMove.bind(this);
    const handleMouseWheel = this.handleMouseWheel.bind(this);
    const handleCanvasResize = this.handleCanvasResize.bind(this);
    new InputHandler(this.canvas, {
      onDrag: handleDrag,
      onMouseMove: handleMouseMove,
      onMouseWheel: handleMouseWheel,
      onResize: handleCanvasResize,
    });
  }

  /**
   *  If you want to rerender chart with new bars, but do not change price low/high
   *  (to avoid flickering)
   *  you can call this method with only bars, and priceLow/priceHigh will be reused.
   * @param bars
   * @param priceLow
   * @param priceHigh
   * // todo: I do not like this solution because this is abstraction leak/hole
   * // todo: in incapsulation (whoever can pass any offset that is not good )
   * @param offsetXAdjustment it is needed when this is added to the end of the chart,
   * but we want to see same camera position
   */
  public render({
    bars,
    priceLow,
    priceHigh,
    offsetXBarsAmountAdjustment = 0,
  }: {
    bars: Bar[];
    priceLow?: number;
    priceHigh?: number;
    offsetXBarsAmountAdjustment?: number;
  }): void {
    if (priceLow !== undefined && priceHigh !== undefined) {
      this.viewportManager.setPriceBounds(priceLow, priceHigh);
    }

    if (!this.priceLow || !this.priceHigh) {
      console.warn("Price low/high not set. Cannot render.");
      return;
    }

    this.viewportManager.panByXAmount(offsetXBarsAmountAdjustment);

    this.barsToRender = bars;

    this.drawCandles(bars, this.priceLow, this.priceHigh);
    this.drawPriceScale(this.priceLow, this.priceHigh);
    this.drawTimeScale(bars);

    if (this.mouseX !== null && this.mouseY !== null) {
      this.drawCrosshair(this.mouseX, this.mouseY);
    }
  }

  private drawCandles(bars: Bar[], low: number, high: number) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    bars.forEach((bar, index) => {
      const isInViewport = this.viewportManager.isInViewportByBarIdx(index);
      if (!isInViewport) {
        return;
      }
      const x = this.viewportManager.getTransformedX(index);
      const yHigh = this.viewportManager.getTransformedY(bar.High, low, high);
      const yLow = this.viewportManager.getTransformedY(bar.Low, low, high);
      const yOpen = this.viewportManager.getTransformedY(bar.Open, low, high);
      const yClose = this.viewportManager.getTransformedY(bar.Close, low, high);

      this.ctx.beginPath();
      this.ctx.moveTo(x + this.candlestickWidth / 2, yHigh);
      this.ctx.lineTo(x + this.candlestickWidth / 2, yLow);
      this.ctx.strokeStyle = "#000";
      this.ctx.stroke();

      this.ctx.fillStyle = bar.Close > bar.Open ? "green" : "red";
      this.ctx.fillRect(
        x,
        Math.min(yOpen, yClose),
        this.candlestickWidth,
        Math.abs(yClose - yOpen)
      );
    });
  }

  private drawPriceScale(low: number, high: number) {
    const priceRange = high - low;
    const numSteps = this.canvasHeightConsideringDateScale / 50;
    const stepValue = priceRange / numSteps;
    const [visibleLow, visibleHigh] =
      this.viewportManager.getVisiblePriceBounds(low, high);

    const precision = ChartUtils.calculateDynamicPrecision(low, high);

    this.ctx.font = "12px Arial";
    this.ctx.fillStyle = "#000";
    this.ctx.textAlign = "right";

    const startValue = Math.ceil(visibleLow / stepValue) * stepValue;
    const endValue = Math.floor(visibleHigh / stepValue) * stepValue;

    for (let price = startValue; price <= endValue; price += stepValue) {
      if (!this.viewportManager.isInViewportByPriceValue(price, low, high))
        continue;

      const y = this.viewportManager.getTransformedY(price, low, high);
      this.ctx.fillText(price.toFixed(precision), this.canvas.width - 10, y);
    }

    this.drawPriceOverlay(precision);
  }

  private drawPriceOverlay(precision: number) {
    if (
      this.mouseX === null ||
      this.mouseY === null ||
      this.priceLow === null ||
      this.priceHigh === null
    ) {
      return;
    }

    const mouseYPrice = this.viewportManager.getPriceByCanvasY(
      this.mouseY,
      this.priceLow,
      this.priceHigh
    );

    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(
      this.canvasWidthConsideringPriceScale,
      this.mouseY - 10,
      90,
      20
    );
    this.ctx.fillStyle = "#000";
    this.ctx.fillText(
      mouseYPrice.toFixed(precision),
      this.canvas.width - 10,
      this.mouseY
    );
  }

  private drawTimeScale(bars: Bar[]) {
    const baseInterval = 10;
    const dynamicInterval = Math.ceil(
      (baseInterval * 10) / Math.max(this.candlestickWidth, 1)
    );

    let lastDrawn: null | string = null;

    this.ctx.fillStyle = "#fff";

    this.ctx.fillRect(
      0,
      this.canvasHeightConsideringDateScale,
      this.canvas.width,
      this.dateScaleMarginY
    );
    this.ctx.font = "10px Arial";
    this.ctx.fillStyle = "#333";
    this.ctx.textAlign = "center";

    bars.forEach((entry, index) => {
      const x = this.viewportManager.getTransformedX(index);

      if (index % dynamicInterval === 0 || index === bars.length - 1) {
        const time = new Date(entry.Time * 1000).toLocaleTimeString();
        if (
          x > 0 &&
          x < this.canvasWidthConsideringPriceScale &&
          time !== lastDrawn
        ) {
          this.ctx.fillText(time, x, this.canvas.height - 10);
          lastDrawn = time;
        }
      }
    });

    this.drawDateOverlay(bars);
  }
  private drawDateOverlay(bars: Bar[]) {
    if (
      this.mouseX === null ||
      this.mouseX > this.canvasWidthConsideringPriceScale
    ) {
      return;
    }

    const index = this.viewportManager.getIndexByCanvasX(this.mouseX);
    if (index >= 0 && index < bars.length) {
      const bar = bars[index];
      const date = new Date(bar.Time * 1000);
      const dateString = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      this.ctx.fillStyle = "#fff";
      this.ctx.fillRect(
        this.mouseX - 100,
        this.canvasHeightConsideringDateScale,
        200,
        20
      );
      this.ctx.fillStyle = "#000";
      this.ctx.fillText(dateString, this.mouseX, this.canvas.height - 15);
    }
  }

  private drawCrosshair(x: number, y: number) {
    if (
      x > this.canvasWidthConsideringPriceScale ||
      y > this.canvasHeightConsideringDateScale
    ) {
      return;
    }

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.setLineDash([5, 5]);

    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, this.canvasHeightConsideringDateScale);

    this.ctx.moveTo(0, y);
    this.ctx.lineTo(this.canvasWidthConsideringPriceScale, y);

    this.ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.stroke();
    this.ctx.restore();
  }

  private handleMouseMove(x: number, y: number) {
    this.mouseY = y;
    this.mouseX = this.snapToCandleCenter(x);

    if (x > this.canvasWidthConsideringPriceScale) {
      this.canvas.style.cursor = "ns-resize";
    } else if (y > this.canvasHeightConsideringDateScale) {
      this.canvas.style.cursor = "ew-resize";
    } else {
      this.canvas.style.cursor = "crosshair";
    }

    if (
      this.barsToRender === null ||
      this.priceLow === null ||
      this.priceHigh === null
    ) {
      console.warn("No data to render.");
      return;
    }

    this.requestRender();
  }

  private async handleDrag(deltaX: number, deltaY: number) {
    this.viewportManager.pan(-deltaX, -deltaY);
  }

  private handleCanvasResize(newWindowX: number, newWindowY: number) {
    // todo: fix abstraction leak
    this.canvas.width = newWindowX - 100;
    this.canvas.height = newWindowY - 100;

    if (!this.barsToRender) return;

    this.requestRender();
  }

  private async handleMouseWheel(
    deltaX: number,
    deltaY: number,
    canvasMouseX: number
  ) {
    if (!this.priceLow || !this.priceHigh) {
      return console.warn("Price low/high not set. Cannot render.");
    }

    if (canvasMouseX > this.canvasWidthConsideringPriceScale) {
      const scaleRate = 0.005;
      const direction = deltaY > 0 ? -1 : 1;
      this.viewportManager.zoomY(direction * scaleRate);
      this.requestRender();
      return;
    }

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      const changeVal = 0.1;
      this.viewportManager.zoomX(
        deltaY > 0 ? -changeVal : changeVal,
        canvasMouseX
      );
    } else {
      this.viewportManager.pan(deltaX, 0);
    }

    this.requestRender();
  }

  private onViewPortChange() {
    if (
      this.barsToRender === null ||
      this.priceLow === null ||
      this.priceHigh === null
    ) {
      console.warn("No data to render.");
      return;
    }

    const { renderedBars, indexRange } = this.getRenderedBars();
    const amountOfBarsToFitScreen = ChartUtils.getMaxAmountOfBarsToFitScreen(
      this.candlestickWidth,
      this.candlestickSpacing,
      this.canvasWidthConsideringPriceScale
    );

    const isDifferent =
      this.areMaxAmountAndRenderedAmountSignificantlyDifferent(
        amountOfBarsToFitScreen,
        renderedBars.length
      );

    if (isDifferent) {
      this.barsAreMissingFromSide(
        indexRange[0] === 0
          ? TimelineDirection.BACKWARD
          : TimelineDirection.FORWARD
      );
    }
  }

  private areMaxAmountAndRenderedAmountSignificantlyDifferent(
    maxAmount: number,
    renderedAmount: number
  ): boolean {
    return Math.abs(maxAmount - renderedAmount) > 10;
  }

  private getRenderedBars(): {
    renderedBars: Bar[];
    indexRange: [number, number];
  } {
    const renderedBars: Bar[] = [];
    let startIndex = -1;
    let endIndex = -1;

    if (!this.barsToRender) {
      return {
        renderedBars,
        indexRange: [startIndex, endIndex],
      };
    }

    this.barsToRender.forEach((bar, index) => {
      const x = this.viewportManager.getTransformedX(index);
      if (
        x + this.candlestickWidth > 0 &&
        x < this.canvasWidthConsideringPriceScale
      ) {
        if (startIndex === -1) {
          startIndex = index;
        }
        endIndex = index;
        renderedBars.push(bar);
      }
    });

    return {
      renderedBars,
      indexRange: [startIndex, endIndex],
    };
  }

  private requestRender() {
    if (
      this.barsToRender === null ||
      this.priceLow === null ||
      this.priceHigh === null
    ) {
      console.warn("No data to render.");
      return;
    }

    this.render({
      bars: this.barsToRender,
      priceLow: this.priceLow,
      priceHigh: this.priceHigh,
    });
  }

  private snapToCandleCenter(rawMouseX: number) {
    const snappedX =
      this.viewportManager.getTransformedX(
        this.viewportManager.getIndexByCanvasX(rawMouseX)
      ) +
      this.candlestickWidth / 2;

    return Math.min(snappedX, this.canvas.width);
  }

  get canvasHeightConsideringDateScale(): number {
    return this.canvas.height - this.dateScaleMarginY;
  }
  get canvasWidthConsideringPriceScale(): number {
    return this.canvas.width - this.priceScaleMarginX;
  }

  get candlestickWidth(): number {
    return this.viewportManager.getCurrentCandlestickWidth();
  }

  get priceLow(): number {
    return this.viewportManager.getPriceBounds().low;
  }

  get priceHigh(): number {
    return this.viewportManager.getPriceBounds().high;
  }
}
