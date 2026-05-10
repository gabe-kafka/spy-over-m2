# SPX / M2 Macro Chart

Personal macro dashboard for the S&P 500 priced against US M2 money supply.

## Scripts

- `npm run data:update` fetches public source data and writes `public/data/spx-m2.json`.
- `npm run dev` starts the local Vite app.
- `npm run build` refreshes the data and builds the site.

## Data

The primary series is `SPX / M2SL`, where M2SL is FRED's seasonally adjusted M2
money stock in billions of dollars. Three-month candles are built from monthly
ratio observations.
