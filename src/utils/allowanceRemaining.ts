export const allowanceRemaining = (budget: number, paid: number) =>
  Math.max(0, Math.round(budget * 100) - Math.round(paid * 100)) / 100;
