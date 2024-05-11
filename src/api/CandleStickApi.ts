interface Chunk {
  ChunkStart: number;
  Bars: Bar[];
}
export interface Bar {
  Close: number;
  High: number;
  Low: number;
  Open: number;
  TickVolume: number;
  Time: number;
}

export class CandleStickApi {
  constructor(private url: string) {}

  public async fetchCandleSticks(
    symbol: string,
    timeframe: number,
    start: number,
    end: number
  ): Promise<Chunk[]> {
    const queryParameters = {
      Broker: "Advanced",
      Symbol: symbol,
      Timeframe: timeframe.toString(),
      Start: start.toString(),
      End: end.toString(),
      UseMessagePack: "false",
    };

    const url = new URL(this.url);
    url.search = new URLSearchParams(queryParameters).toString();
    const data = (await (await fetch(url.toString())).json()) as Chunk[];
    console.log("fetchCandleSticks", {
      start,
      end,
      barsAmount: data.reduce((acc, chunk) => acc + chunk.Bars.length, 0),
    });
    return data;
  }

  public async fetchAvailableDataRange(
    symbol: string,
    timeframe: number
  ): Promise<{ start: number; end: number }> {
    // Fetch the first bar to determine the start of the data
    let firstBarResponse = await this.fetchCandleSticks(
      symbol,
      timeframe,
      0,
      1
    );
    if (!firstBarResponse.length || !firstBarResponse[0].Bars.length) {
      throw new Error("No data available for this symbol or timeframe.");
    }
    const firstBar = firstBarResponse[0].Bars[0];
    const startTime = firstBar.Time + firstBarResponse[0].ChunkStart;

    // Assuming data is continuous until now or the delisting date
    const now = Date.now() / 1000;
    const endTime = Math.min(now, this.getDelistingTime(symbol) || now);

    return { start: startTime, end: endTime };
  }

  private getDelistingTime(symbol: string): number | null {
    // Implement logic to determine if and when a symbol was delisted
    // For now, let's assume all symbols are still listed unless specified
    return null; // Replace with actual logic
  }
}

export const candleStickApi = new CandleStickApi(
  "https://beta.forextester.com/data/api/Metadata/bars/chunked"
);
