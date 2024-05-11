export const MINUTES_IN_TIME_FRAMES = {
  "1m": 1,
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "4h": 240,
  "1d": 1440,
  "1w": 10080,
  "1mo": 43200,
  "1y": 525600,
};

export const timeframes = Object.keys(MINUTES_IN_TIME_FRAMES) as Array<
  keyof typeof MINUTES_IN_TIME_FRAMES
>;
