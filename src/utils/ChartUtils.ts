export class ChartUtils {
  static scale(
    value: number,
    min: number,
    max: number,
    a: number,
    b: number
  ): number {
    return ((b - a) * (value - min)) / (max - min) + a;
  }

  static calculateDynamicPrecision(low: number, high: number): number {
    const range = high - low;
    if (range === 0) return 2;
    const digits = Math.ceil(-Math.log10(range)) + 1;
    return Math.max(0, digits + 1);
  }

  /**
   * Returns the amount of bars that fit the screen width.
   *  + 1 Explanation: first and last bar are only partially visible.
   * @private
   */
  static getMaxAmountOfBarsToFitScreen(
    barWidth: number,
    barSpacing: number,
    screenWidth: number
  ): number {
    return Math.ceil(screenWidth / (barWidth + barSpacing)) + 1;
  }
}
