import { Bar } from "../api/CandleStickApi.ts";
import { InputHandler } from "./InputHandler.ts";
import { ChartUtils } from "../utils/ChartUtils.ts";

export enum TimelineDirection {
  FORWARD = 1,
  BACKWARD,
}

export class CandleStickRenderer {
  private readonly candlestickSpacing = 2;
  private candlestickWidth: number = 10;
  private scrollOffsetX: number = 0;
  private scrollOffsetY: number = 0;
  private mouseX: number | null = null;
  private mouseY: number | null = null;

  private barsToRender: Bar[] | null = null;
  private priceLow: number | null = null;
  private priceHigh: number | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
    private loadMoreBarsCallback: (
      direction: TimelineDirection
    ) => Promise<void>
  ) {
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
   * // todo: in incapsulation(whoever can pass any offset that is not good )
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
      this.priceLow = priceLow;
      this.priceHigh = priceHigh;
    }

    if (!this.priceLow || !this.priceHigh) {
      console.warn("Price low/high not set. Cannot render.");
      return;
    }

    this.scrollOffsetX +=
      offsetXBarsAmountAdjustment *
      (this.candlestickWidth + this.candlestickSpacing);

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
      const x =
        index * (this.candlestickWidth + this.candlestickSpacing) -
        this.scrollOffsetX;
      const yHigh = this.getScaledY(bar.High, low, high) - this.scrollOffsetY;
      const yLow = this.getScaledY(bar.Low, low, high) - this.scrollOffsetY;
      const yOpen = this.getScaledY(bar.Open, low, high) - this.scrollOffsetY;
      const yClose = this.getScaledY(bar.Close, low, high) - this.scrollOffsetY;

      if (x + this.candlestickWidth > 0 && x < this.canvas.width) {
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
      }
    });
  }

  private drawPriceScale(low: number, high: number) {
    const priceRange = high - low;
    const numSteps = this.canvas.height / 50;
    const stepValue = priceRange / numSteps;
    const visibleLow =
      low + -this.scrollOffsetY * (priceRange / this.canvas.height);
    const visibleHigh =
      high - this.scrollOffsetY * (priceRange / this.canvas.height);

    const precision = ChartUtils.calculateDynamicPrecision(low, high);

    this.ctx.font = "12px Arial";
    this.ctx.fillStyle = "#000";
    this.ctx.textAlign = "right";

    const startValue = Math.ceil(visibleLow / stepValue) * stepValue;
    const endValue = Math.floor(visibleHigh / stepValue) * stepValue;

    for (let price = startValue; price <= endValue; price += stepValue) {
      const y = this.getScaledY(price, low, high) - this.scrollOffsetY;
      if (y > 0 && y < this.canvas.height) {
        this.ctx.fillText(price.toFixed(precision), this.canvas.width - 10, y);
      }
    }

    this.drawPriceOverlay(precision);
  }

  private drawPriceOverlay(precision: number) {
    if (this.mouseX === null || this.mouseY === null) {
      return;
    }
    const mouseYPrice = this.getScaledPrice(this.mouseY + this.scrollOffsetY);

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    this.ctx.fillRect(this.canvas.width - 100, this.mouseY - 10, 90, 20);
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

    this.ctx.font = "10px Arial";
    this.ctx.fillStyle = "#333";
    this.ctx.textAlign = "center";

    bars.forEach((entry, index) => {
      const x =
        index * (this.candlestickWidth + this.candlestickSpacing) -
        this.scrollOffsetX;

      if (index % dynamicInterval === 0 || index === bars.length - 1) {
        const time = new Date(entry.Time * 1000).toLocaleTimeString();
        if (x > 0 && x < this.canvas.width && time !== lastDrawn) {
          this.ctx.fillText(time, x, this.canvas.height - 10);
          lastDrawn = time;
        }
      }
    });

    this.drawDateOverlay(bars);
  }
  private drawDateOverlay(bars: Bar[]) {
    if (this.mouseX === null) {
      return;
    }

    const index = Math.floor(
      (this.mouseX + this.scrollOffsetX) /
        (this.candlestickWidth + this.candlestickSpacing)
    );
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

      this.ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      this.ctx.fillRect(this.mouseX - 100, this.canvas.height - 30, 200, 20);
      this.ctx.fillStyle = "#000";
      this.ctx.fillText(dateString, this.mouseX, this.canvas.height - 15);
    }
  }

  private drawCrosshair(x: number, y: number) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.setLineDash([5, 5]);

    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, this.canvas.height);

    this.ctx.moveTo(0, y);
    this.ctx.lineTo(this.canvas.width, y);

    this.ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.stroke();
    this.ctx.restore();
  }

  private getScaledPrice(mouseY: number): number {
    const scaleMin = this.priceLow ?? 0;
    const scaleMax = this.priceHigh ?? 0;
    return ChartUtils.scale(mouseY, this.canvas.height, 0, scaleMin, scaleMax);
  }

  private handleMouseMove(x: number, y: number) {
    this.mouseY = y;
    this.mouseX = this.snapToCandleCenter(x);

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

  private async handleDrag(deltaX: number, deltaY: number) {
    this.changeOffset(this.scrollOffsetX - deltaX, this.scrollOffsetY - deltaY);
  }

  private handleCanvasResize(newWindowX: number, newWindowY: number) {
    // todo: fix abstraction leak
    this.canvas.width = newWindowX - 100;
    this.canvas.height = newWindowY - 100;

    if (!this.barsToRender) return;

    this.render({
      bars: this.barsToRender,
    });
  }

  private async handleMouseWheel(
    deltaX: number,
    deltaY: number,
    canvasMouseX: number
  ) {
    const mouseXPercent =
      (canvasMouseX + this.scrollOffsetX) /
      (this.candlestickWidth + this.candlestickSpacing);

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      const changeVal = 0.2;
      this.candlestickWidth += deltaY > 0 ? -changeVal : changeVal;
      this.candlestickWidth = Math.max(
        0.5,
        Math.min(20, this.candlestickWidth)
      );

      this.changeOffset(
        mouseXPercent * (this.candlestickWidth + this.candlestickSpacing) -
          canvasMouseX,
        this.scrollOffsetY
      );
    } else {
      this.changeOffset(this.scrollOffsetX + deltaX, this.scrollOffsetY);
    }
  }

  private changeOffset(scrollOffsetX: number, scrollOffsetY: number) {
    this.scrollOffsetX = scrollOffsetX;
    this.scrollOffsetY = scrollOffsetY;

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
      this.canvas.width
    );

    const isDifferent =
      this.areMaxAmountAndRenderedAmountSignificantlyDifferent(
        amountOfBarsToFitScreen,
        renderedBars.length
      );

    if (isDifferent) {
      this.loadMoreBarsCallback(
        indexRange[0] === 0
          ? TimelineDirection.BACKWARD
          : TimelineDirection.FORWARD
      );
    }

    this.render({
      bars: this.barsToRender,
      priceLow: this.priceLow,
      priceHigh: this.priceHigh,
    });
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
      const x =
        index * (this.candlestickWidth + this.candlestickSpacing) -
        this.scrollOffsetX;
      if (x + this.candlestickWidth > 0 && x < this.canvas.width) {
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

  private snapToCandleCenter(rawMouseX: number) {
    const index = Math.round(
      (rawMouseX + this.scrollOffsetX) /
        (this.candlestickWidth + this.candlestickSpacing)
    );

    const snappedX =
      index * (this.candlestickWidth + this.candlestickSpacing) +
      this.candlestickWidth / 2 -
      this.scrollOffsetX;

    return Math.min(snappedX, this.canvas.width);
  }

  private getScaledY(value: number, min: number, max: number): number {
    return ChartUtils.scale(value, min, max, this.canvas.height, 0);
  }
}
