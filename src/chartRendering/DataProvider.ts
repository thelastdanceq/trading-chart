import { Bar, CandleStickApi, Chunk } from "../api/CandleStickApi.ts";

export class DataProvider {
  private bars: Bar[] | null = null;
  private priceLow: number | null = null;
  private priceHigh: number | null = null;
  private isFetching: boolean = false;

  constructor(
    private readonly api: CandleStickApi,
    private readonly symbol: string,
    private readonly timeframe: number,
    /**
     * Index of first bar in the data provider
     */
    private start: number,
    /**
     * Index of last bar in the data provider
     */
    private end: number
  ) {}

  /**
   * @returns true - fetch was done, false - fetch skipped
   */
  public async fetchCandleSticks(): Promise<boolean> {
    if (this.isFetching) return false;
    this.isFetching = true;
    try {
      const chunks = await this.api.fetchCandleSticks(
        this.symbol,
        this.timeframe,
        this.start,
        this.end
      );

      if (!chunks || !chunks.length) return false;

      const flattenBars = this.processChunks(chunks);

      this.end = this.start + flattenBars.length;
      this.setBars(flattenBars);
    } finally {
      this.isFetching = false;
    }
    return true;
  }

  /**
   * @param amount
   * @param fetchLess - if start - amount is out of bounds, fetch less than amount
   * @returns true - fetch was done, false - fetch skipped
   */
  public async fetchBackwardBarsAndSetToStore({
    amount = 5000,
    fetchLess = false,
  }: {
    amount?: number;
    fetchLess?: boolean;
  }): Promise<boolean> {
    if (this.isFetching) return false;
    this.isFetching = true;

    try {
      const currentBars = this.bars;
      if (!currentBars) return false;

      if (this.start - amount < 0) {
        if (!fetchLess) return false;
        amount = this.start;
      }

      const chunks = await this.api.fetchCandleSticks(
        this.symbol,
        this.timeframe,
        this.start - amount,
        this.start
      );

      if (!chunks || !chunks.length) return false;

      const flattenBars = this.processChunks(chunks);

      const filtered = this.filterBars(currentBars, flattenBars);

      this.start = this.start - filtered.length;
      this.setBars([...filtered, ...currentBars]);
    } finally {
      this.isFetching = false;
    }

    return true;
  }

  /**
   * @returns true - fetch was done, false - fetch skipped
   */
  public async fetchForwardBarsAndSetToStore(amount = 100): Promise<boolean> {
    if (this.isFetching) return false;
    this.isFetching = true;

    try {
      const currentBars = this.bars;
      if (!currentBars) return false;

      const chunks = await this.api.fetchCandleSticks(
        this.symbol,
        this.timeframe,
        this.end,
        this.end + amount
      );

      if (!chunks || !chunks.length) return false;

      const flattenBars = this.processChunks(chunks);

      const filtered = this.filterBars(currentBars, flattenBars);

      this.end += filtered.length;
      this.setBars([...currentBars, ...filtered]);
    } finally {
      this.isFetching = false;
    }
    return true;
  }

  private filterBars(currentBars: Bar[], newBars: Bar[]): Bar[] {
    const currentTimes = new Set(currentBars.map((bar) => bar.Time));
    return newBars.filter((newBar) => !currentTimes.has(newBar.Time));
  }

  private processChunks(chunks: Chunk[]): Bar[] {
    return chunks.flatMap((chunk) =>
      chunk.Bars.map((b) => ({ ...b, Time: b.Time + chunk.ChunkStart }))
    );
  }

  public getBars(): {
    bars: Bar[];
    priceLow: number;
    priceHigh: number;
  } {
    if (
      this.bars === null ||
      this.priceLow === null ||
      this.priceHigh === null
    ) {
      throw new Error("Bars are not loaded");
    }

    return {
      bars: this.bars,
      priceLow: this.priceLow!,
      priceHigh: this.priceHigh!,
    };
  }

  private setBars(bars: Bar[]) {
    this.bars = bars;

    for (let i = 0; i < bars.length; i++) {
      if (this.priceLow === null || bars[i].Low < this.priceLow) {
        this.priceLow = bars[i].Low;
      }
      if (this.priceHigh === null || bars[i].High > this.priceHigh) {
        this.priceHigh = bars[i].High;
      }
    }
  }
}
