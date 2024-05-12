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
   *
   * TODO: now it doesn't work because data that is fetched is not corresponding to the start index
   * Maybe better to talk about it on the interview
   * @returns true - fetch was done, false - fetch skipped
   */
  public async fetchBackwardBarsAndSetToStore(amount = 100): Promise<boolean> {
    if (this.isFetching) return false;
    this.isFetching = true;

    try {
      const currentBars = this.bars;
      if (!currentBars || this.start - amount < 0) return false;
      const chunks = await this.api.fetchCandleSticks(
        this.symbol,
        this.timeframe,
        this.start - amount,
        this.start
      );

      if (!chunks || !chunks.length) return false;

      const flattenBars = this.processChunks(chunks);

      const filtered = flattenBars.filter((newBar) => {
        return !currentBars.some((bar) => bar.Time === newBar.Time);
      });

      this.start = this.start - filtered.length;
      this.setBars([...currentBars, ...filtered]);
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

      const filtered = flattenBars.filter((newBar) => {
        return !currentBars.some((bar) => bar.Time === newBar.Time);
      });

      this.end += filtered.length;
      this.setBars([...currentBars, ...filtered]);
    } finally {
      this.isFetching = false;
    }
    return true;
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
