import { candleStickApi } from "./api/CandleStickApi.ts";
import { MINUTES_IN_TIME_FRAMES } from "./utils/minutesInTimeFrames.ts";
import {
  getSelectedTicker,
  getSelectedTimeframe,
  populateUI,
} from "./setupUI.ts";
import { CandleStickRenderer } from "./view/CandleStickRenderer.ts";

const { ctx, canvas } = populateUI();
document.getElementById("submit")!.addEventListener("click", async () => {
  const symbol = getSelectedTicker();
  const timeframe = MINUTES_IN_TIME_FRAMES[getSelectedTimeframe()];

  const renderer = new CandleStickRenderer(candleStickApi, canvas, ctx);

  renderer.setParams(symbol, timeframe, 0, 1000);
  await renderer.fetchData();
  await renderer.render();
});
