import { Bar, CandleStickApi } from "../api/CandleStickApi.ts";
import { throttle } from "lodash";

const candlestickSpacing = 2;

const scale = (
  value: number,
  min: number,
  max: number,
  a: number,
  b: number
): number => ((b - a) * (value - min)) / (max - min) + a;

export class CandleStickRenderer {
  private scrollOffsetX: number = 0;
  private scrollOffsetY: number = 0;
  private candlestickWidth: number = 10;
  private dragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private mouseX: number | null = null;
  private mouseY: number | null = null;

  private symbol: string | null = null;
  private timeframe: number | null = null;
  private start: number | null = null;
  private end: number | null = null;

  private bars: Bar[] = [];
  private priceLow: number | null = null;
  private priceHigh: number | null = null;

  public setBars(bars: Bar[]) {
    this.bars = bars;
    this.priceLow = Math.min(...bars.map((bar) => bar.Low));
    this.priceHigh = Math.max(...bars.map((bar) => bar.High));
  }

  constructor(
    private api: CandleStickApi,
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D
  ) {
    this.addEventListeners();
    this.canvas.style.cursor = "default";
  }

  async fetchData() {
    if (
      !this.symbol ||
      this.timeframe === null ||
      this.start === null ||
      this.end === null
    ) {
      console.error("Render called without required parameters set.");
      return;
    }
    const data = await this.api.fetchCandleSticks(
      this.symbol,
      this.timeframe,
      this.start,
      this.end
    );
    if (!data || !data.length || !data[0].Bars.length) return;

    this.setBars(
      data.flatMap((d) =>
        d.Bars.map((b) => ({ ...b, Time: b.Time + d.ChunkStart }))
      )
    );
  }

  private fetchDataIfNeededOptimized = throttle(this.fetchDataIfNeeded, 1000, {
    leading: true,
    trailing: true,
  });

  private fetchDataIfNeeded() {
    if (this.symbol === null || this.timeframe === null || this.end === null) {
      console.error("Render called without required parameters set.");
      return;
    }

    const totalBars = this.bars.length;
    const lastBarX =
      totalBars * (this.candlestickWidth + candlestickSpacing) -
      this.scrollOffsetX;
    const threshold = 200;

    if (lastBarX - this.canvas.width < threshold) {
      this.api
        .fetchCandleSticks(
          this.symbol,
          this.timeframe,
          this.end,
          this.end + 100
        )
        .then((additionalData) => {
          if (additionalData && additionalData.length && this.end !== null) {
            const newBars = additionalData.flatMap((d) =>
              d.Bars.map((b) => ({ ...b, Time: b.Time + d.ChunkStart }))
            );

            const filtered = newBars.filter((newBar) => {
              return !this.bars.some((bar) => bar.Time === newBar.Time);
            });

            this.setBars([...this.bars, ...filtered]);
            this.end = this.end + 100;
            this.render();
          }

          console.groupEnd();
        });
    }
  }

  render(): void {
    if (
      !this.bars.length ||
      this.priceLow === null ||
      this.priceHigh === null
    ) {
      return;
    }
    const bars = this.bars;

    console.time("render");

    this.drawCandles(bars, this.priceLow, this.priceHigh);
    this.drawPriceScale(this.priceLow, this.priceHigh);
    this.drawTimeScale(bars);

    if (this.mouseX !== null && this.mouseY !== null) {
      this.drawCrosshair(this.mouseX, this.mouseY);
    }

    console.timeEnd("render");
  }

  drawTimeScale(bars: Bar[]) {
    const timeInterval = 10;
    let lastDrawn: null | string = null;

    this.ctx.font = "10px Arial";
    this.ctx.fillStyle = "#333";
    this.ctx.textAlign = "center";

    bars.forEach((entry, index) => {
      const x =
        index * (this.candlestickWidth + candlestickSpacing) -
        this.scrollOffsetX;

      if (index % timeInterval === 0 || index === bars.length - 1) {
        const time = new Date(entry.Time * 1000).toLocaleTimeString();
        if (x > 0 && x < this.canvas.width && time !== lastDrawn) {
          this.ctx.fillText(time, x, this.canvas.height - 10);
          lastDrawn = time;
        }
      }
    });

    this.drawDateOverlay(bars);
  }
  drawCrosshair(x: number, y: number) {
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

  drawDateOverlay(bars: Bar[]) {
    if (this.mouseX === null) {
      return;
    }

    const index = Math.floor(
      (this.mouseX + this.scrollOffsetX) /
        (this.candlestickWidth + candlestickSpacing)
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

      this.ctx.fillStyle = "rgba(255, 255, 255, 0.75)"; // Semi-transparent white
      this.ctx.fillRect(this.mouseX - 100, this.canvas.height - 30, 200, 20); // Adjust size as needed
      this.ctx.fillStyle = "#000";
      this.ctx.fillText(dateString, this.mouseX, this.canvas.height - 15);
    }
  }

  drawCandles(bars: Bar[], low: number, high: number) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    bars.forEach((bar, index) => {
      const x =
        index * (this.candlestickWidth + candlestickSpacing) -
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
  drawPriceScale(low: number, high: number) {
    const priceRange = high - low;
    const numSteps = this.canvas.height / 50;
    const stepValue = priceRange / numSteps;
    const visibleLow =
      low + -this.scrollOffsetY * (priceRange / this.canvas.height);
    const visibleHigh =
      high - this.scrollOffsetY * (priceRange / this.canvas.height);

    this.ctx.font = "12px Arial";
    this.ctx.fillStyle = "#000";
    this.ctx.textAlign = "right";

    const startValue = Math.ceil(visibleLow / stepValue) * stepValue;
    const endValue = Math.floor(visibleHigh / stepValue) * stepValue;

    for (let price = startValue; price <= endValue; price += stepValue) {
      const y = this.getScaledY(price, low, high) - this.scrollOffsetY;
      if (y > 0 && y < this.canvas.height) {
        this.ctx.fillText(price.toFixed(2), this.canvas.width - 10, y);
      }
    }
  }

  getScaledY(value: number, min: number, max: number): number {
    return scale(value, min, max, this.canvas.height, 0);
  }

  setParams(symbol: string, timeframe: number, start: number, end: number) {
    this.symbol = symbol;
    this.timeframe = timeframe;
    this.start = start;
    this.end = end;
  }

  addEventListeners() {
    this.canvas.addEventListener("mousedown", (event) => {
      this.dragging = true;
      this.dragStartX = event.clientX;
      this.dragStartY = event.clientY;
      this.canvas.style.cursor = "grabbing";
    });

    this.canvas.addEventListener("mousemove", async (event) => {
      if (this.dragging) {
        const deltaX = event.clientX - this.dragStartX;
        const deltaY = event.clientY - this.dragStartY;
        this.dragStartX = event.clientX;
        this.dragStartY = event.clientY;
        this.scrollOffsetX -= deltaX;
        this.scrollOffsetY -= deltaY;
      }
      const rawMouseX =
        event.clientX - this.canvas.getBoundingClientRect().left;
      const rawMouseY = event.clientY - this.canvas.getBoundingClientRect().top;

      this.mouseX = this.snapToCandleCenter(rawMouseX);
      this.mouseY = rawMouseY;

      await this.fetchDataIfNeededOptimized();

      this.render();
    });

    this.canvas.addEventListener("mouseup", () => {
      this.dragging = false;
      this.canvas.style.cursor = "default";
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.dragging = false;
      this.canvas.style.cursor = "default";
    });

    this.canvas.addEventListener("wheel", async (event) => {
      event.preventDefault();
      const mouseX = event.clientX - this.canvas.getBoundingClientRect().left;

      const mouseXPercent =
        (mouseX + this.scrollOffsetX) /
        (this.candlestickWidth + candlestickSpacing);

      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        const changeVal = 0.2;
        const delta = event.deltaY;
        this.candlestickWidth += delta > 0 ? -changeVal : changeVal;
        this.candlestickWidth = Math.max(
          0.5,
          Math.min(20, this.candlestickWidth)
        );

        this.scrollOffsetX =
          mouseXPercent * (this.candlestickWidth + candlestickSpacing) - mouseX;
        await this.fetchDataIfNeededOptimized();
      } else {
        this.scrollOffsetX += event.deltaX;
        await this.fetchDataIfNeededOptimized();
      }

      this.render();
    });
  }

  snapToCandleCenter(rawMouseX: number) {
    const index = Math.round(
      (rawMouseX + this.scrollOffsetX) /
        (this.candlestickWidth + candlestickSpacing)
    );

    const snappedX =
      index * (this.candlestickWidth + candlestickSpacing) +
      this.candlestickWidth / 2 -
      this.scrollOffsetX;

    return Math.min(snappedX, this.canvas.width);
  }
}
