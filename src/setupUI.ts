import {
  MINUTES_IN_TIME_FRAMES,
  timeframes,
} from "./utils/minutesInTimeFrames.ts";

export function getSelectedTicker(id = "tickers") {
  const dropdown = document.getElementById(id) as HTMLSelectElement;
  return dropdown.value;
}
export function getSelectedTimeframe(
  id = "timeframes"
): keyof typeof MINUTES_IN_TIME_FRAMES {
  const dropdown = document.getElementById(id) as HTMLSelectElement;
  return dropdown.value as keyof typeof MINUTES_IN_TIME_FRAMES;
}
export function populateUI() {
  populateTickersDropdown();
  populateTimeframesDropdown();
  return createCanvas();
}

function populateTickersDropdown(id = "tickers") {
  const dropdown = document.getElementById(id);
  if (!dropdown) {
    console.error("Dropdown element not found");
    return;
  }
  const tickers = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD"];
  tickers.forEach((ticker) => {
    const option = document.createElement("option");
    option.value = ticker;
    option.text = ticker;
    dropdown.appendChild(option);
  });
}

function populateTimeframesDropdown(id = "timeframes") {
  const dropdown = document.getElementById(id);
  if (!dropdown) {
    console.error("Dropdown element not found");
    return;
  }
  timeframes.forEach((timeframe) => {
    const option = document.createElement("option");
    option.value = timeframe;
    option.text = timeframe;
    dropdown.appendChild(option);
  });
}

function createCanvas() {
  const canvas = document.getElementById("chart") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth - 100;
  canvas.height = window.innerHeight - 100;

  if (!ctx) {
    throw new Error("Unable to get 2d context from canvas");
  }

  return {
    canvas,
    ctx,
  };
}
