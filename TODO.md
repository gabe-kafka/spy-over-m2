# Layered Valuation Narrative TODO

## Goal

Illustrate the valuation question as a sequence of charts that add one layer of
complexity at a time. Each chart should preserve the prior idea, then show what
the prior view does not explain.

## Chart Sequence

- [x] Layer 1: `SPX / M2`
  - Question: how expensive is the index relative to broad money?
  - Equation: `L_1(t) = SPX_t / M2SL_t`.
  - Note: does not model earnings, rates, GDP, or flows.

- [x] Layer 2: Profit support
  - Question: does the price level have more or less profit support behind it?
  - Equation: `L_2(t)=100\times\frac{CP_t/SPX_t}{CP_\tau/SPX_\tau}`.
  - Implemented: after-tax corporate profits from FRED `CP`, shown as a
    dot-com-indexed profit-support proxy against SPX.
  - [ ] Later refinement: replace or supplement with S&P 500 trailing EPS if a
    reliable current source is added.

- [x] Layer 3: Rate hurdle
  - Question: are earnings attractive relative to the risk-free alternative?
  - Equation: `L_3(t)=L_2(t)-100\times\frac{DGS10_t}{DGS10_\tau}`.
  - Implemented: profit-support index minus 10-year Treasury yield index, both
    indexed to the dot-com SPX/M2 peak month.

- [x] Layer 4: Real economy context
  - Question: is money growth matched by real economic output?
  - Equation: `L_4(t)=100\times\frac{M2SL_t/GDP_t}{M2SL_\tau/GDP_\tau}`.
  - Implemented: M2/GDP indexed to the dot-com SPX/M2 peak month.

- [ ] Layer 5: Liquidity impulse
  - Question: are marginal flows adding liquidity or draining it?
  - Candidate metric: `Fed assets - TGA - RRP`, shown as 3M or 12M change.

- [ ] Final: Regime stack
  - Question: do the layers agree or conflict?
  - Candidate display: compact heatmap of liquidity, profits, rates, GDP, and
    flow impulse.
