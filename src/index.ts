import { MINUTES_IN_TIME_FRAMES } from "./utils/minutesInTimeFrames.ts";
import {
  getSelectedTicker,
  getSelectedTimeframe,
  populateUI,
} from "./setupUI.ts";
import {
  CandleStickRenderer,
  TimelineDirection,
} from "./refactoring/CandleStickRenderer.ts";
import { DataProvider } from "./refactoring/DataProvider.ts";
import { candleStickApi } from "./api/CandleStickApi.ts";
import { throttle } from "lodash";
import "./styles/basic.css";

const { ctx, canvas } = populateUI();
document.getElementById("submit")!.addEventListener("click", async () => {
  const symbol = getSelectedTicker();
  const timeframe = MINUTES_IN_TIME_FRAMES[getSelectedTimeframe()];
  const dataProvider = new DataProvider(
    candleStickApi,
    symbol,
    timeframe,
    10_000,
    11_000
  );

  await dataProvider.fetchCandleSticks();

  const handleNewBarsNeed = throttle(async (direction: TimelineDirection) => {
    const { bars: startBars } = dataProvider.getBars();

    switch (direction) {
      case TimelineDirection.FORWARD:
        await dataProvider.fetchForwardBarsAndSetToStore();
        break;
      case TimelineDirection.BACKWARD:
        await dataProvider.fetchBackwardBarsAndSetToStore({ fetchLess: true });
        break;
    }
    const { bars: barsAfterFetching } = dataProvider.getBars();

    renderer.render({
      bars: barsAfterFetching,
      offsetXBarsAmountAdjustment:
        direction === TimelineDirection.BACKWARD
          ? barsAfterFetching.length - startBars.length
          : 0,
    });
  }, 1000);

  const renderer = new CandleStickRenderer(canvas, ctx, async (dir) =>
    handleNewBarsNeed(dir)
  );

  const { bars, priceLow, priceHigh } = dataProvider.getBars();
  renderer.render({ bars, priceLow, priceHigh });
});
