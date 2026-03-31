export type CfItem = {
  cfExpert: number;
  confidenceUser: number;
};

export class CfCalculator {
  static combine(items: CfItem[]): number {
    let result = 0;

    for (const item of items) {
      const cf = item.cfExpert * item.confidenceUser;
      result = result + cf * (1 - result);
    }

    return Number(result.toFixed(4));
  }
}