import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT_PATH = path.join(ROOT, "public", "data", "spx-m2.json");
const START_MONTH = "1989-01";

const SOURCES = {
  spxMonthly:
    "https://raw.githubusercontent.com/datasets/s-and-p-500/master/data/data.csv",
  m2: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=M2SL",
  corporateProfits: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=CP",
  tenYearYield: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10",
  gdp: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=GDP",
};

function toMonth(date) {
  return date.slice(0, 7);
}

function toQuarter(month) {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return `${year}-Q${Math.floor((monthNumber - 1) / 3) + 1}`;
}

function quarterStartDate(quarterKey) {
  const [year, quarter] = quarterKey.split("-Q");
  const month = (Number(quarter) - 1) * 3 + 1;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",");

  return lines
    .filter(Boolean)
    .map((line) => {
      const cells = line.split(",");
      return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
    });
}

async function fetchCsv(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "spy-over-m2-data-builder/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return parseCsv(await response.text());
}

function parseNumber(value) {
  if (!value || value === ".") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function latestOnOrBefore(rows, month) {
  let latest = null;

  for (const row of rows) {
    if (row.month > month) {
      break;
    }

    latest = row;
  }

  return latest;
}

function averageMonthly(rows, dateField, valueField, outputField) {
  const groups = new Map();

  for (const row of rows) {
    const value = parseNumber(row[valueField]);

    if (value === null) {
      continue;
    }

    const month = toMonth(row[dateField]);
    const group = groups.get(month) ?? [];
    group.push(value);
    groups.set(month, group);
  }

  return Array.from(groups.entries()).map(([month, values]) => ({
    month,
    [outputField]: values.reduce((sum, value) => sum + value, 0) / values.length,
  }));
}

function pctChange(current, previous) {
  return current / previous - 1;
}

function formatMonthDate(month) {
  return `${month}-01`;
}

function buildQuarterlyCandles(monthly) {
  const groups = new Map();

  for (const point of monthly) {
    const quarter = toQuarter(point.month);
    const group = groups.get(quarter) ?? [];
    group.push(point);
    groups.set(quarter, group);
  }

  return Array.from(groups.entries()).map(([quarter, points]) => {
    const first = points[0];
    const last = points.at(-1);
    const ratios = points.map((point) => point.spxOverM2);

    return {
      time: quarterStartDate(quarter),
      quarter,
      open: first.spxOverM2,
      high: Math.max(...ratios),
      low: Math.min(...ratios),
      close: last.spxOverM2,
      spx: last.spx,
      m2: last.m2,
    };
  });
}

const [spxRows, m2Rows, corporateProfitRows, tenYearYieldRows, gdpRows] =
  await Promise.all([
    fetchCsv(SOURCES.spxMonthly),
    fetchCsv(SOURCES.m2),
    fetchCsv(SOURCES.corporateProfits),
    fetchCsv(SOURCES.tenYearYield),
    fetchCsv(SOURCES.gdp),
  ]);

const spxMonthly = spxRows
  .map((row) => ({
    month: toMonth(row.Date),
    spx: parseNumber(row.SP500),
  }))
  .filter((row) => row.month >= START_MONTH && row.spx !== null);

const m2Monthly = m2Rows
  .map((row) => ({
    month: toMonth(row.observation_date),
    m2: parseNumber(row.M2SL),
  }))
  .filter((row) => row.m2 !== null);

const corporateProfitsQuarterly = corporateProfitRows
  .map((row) => ({
    month: toMonth(row.observation_date),
    corporateProfits: parseNumber(row.CP),
  }))
  .filter((row) => row.corporateProfits !== null);

const tenYearYieldMonthly = averageMonthly(
  tenYearYieldRows,
  "observation_date",
  "DGS10",
  "tenYearYield",
);

const gdpQuarterly = gdpRows
  .map((row) => ({
    month: toMonth(row.observation_date),
    gdp: parseNumber(row.GDP),
  }))
  .filter((row) => row.gdp !== null);

const monthlyBase = spxMonthly
  .map((row) => {
    const m2 = latestOnOrBefore(m2Monthly, row.month);
    const corporateProfits = latestOnOrBefore(corporateProfitsQuarterly, row.month);
    const tenYearYield = latestOnOrBefore(tenYearYieldMonthly, row.month);
    const gdp = latestOnOrBefore(gdpQuarterly, row.month);

    if (
      !m2 ||
      !corporateProfits ||
      !tenYearYield ||
      !gdp ||
      row.spx === null ||
      m2.m2 === null ||
      corporateProfits.corporateProfits === null ||
      tenYearYield.tenYearYield === null ||
      gdp.gdp === null
    ) {
      return null;
    }

    return {
      date: formatMonthDate(row.month),
      month: row.month,
      spx: row.spx,
      m2: m2.m2,
      m2Month: m2.month,
      corporateProfits: corporateProfits.corporateProfits,
      corporateProfitsMonth: corporateProfits.month,
      tenYearYield: tenYearYield.tenYearYield,
      tenYearYieldMonth: tenYearYield.month,
      gdp: gdp.gdp,
      gdpMonth: gdp.month,
      spxOverM2: row.spx / m2.m2,
      profitSupport: corporateProfits.corporateProfits / row.spx,
      m2OverGdp: m2.m2 / gdp.gdp,
    };
  })
  .filter(Boolean);

const dotComWindow = monthlyBase.filter(
  (point) => point.month >= "1995-01" && point.month <= "2002-12",
);
const dotComPeak = dotComWindow.reduce((max, point) =>
  point.spxOverM2 > max.spxOverM2 ? point : max,
);

const monthly = monthlyBase.map((point) => ({
  ...point,
  profitSupportIndex: (point.profitSupport / dotComPeak.profitSupport) * 100,
  tenYearYieldIndex: (point.tenYearYield / dotComPeak.tenYearYield) * 100,
  rateHurdleIndex:
    (point.profitSupport / dotComPeak.profitSupport) * 100 -
    (point.tenYearYield / dotComPeak.tenYearYield) * 100,
  m2OverGdpIndex: (point.m2OverGdp / dotComPeak.m2OverGdp) * 100,
}));

const current = monthly.at(-1);
const quarterlies = buildQuarterlyCandles(monthly);

if (!current) {
  throw new Error("No combined monthly observations were produced.");
}

const metrics = {
  currentDate: current.date,
  currentMonth: current.month,
  currentSPX: current.spx,
  currentM2: current.m2,
  currentSPXOverM2: current.spxOverM2,
  dotComPeakDate: dotComPeak.date,
  dotComPeakMonth: dotComPeak.month,
  dotComPeakSPX: dotComPeak.spx,
  dotComPeakM2: dotComPeak.m2,
  dotComPeakCorporateProfits: dotComPeak.corporateProfits,
  dotComPeakProfitSupport: dotComPeak.profitSupport,
  dotComPeakTenYearYield: dotComPeak.tenYearYield,
  dotComPeakGDP: dotComPeak.gdp,
  dotComPeakM2OverGDP: dotComPeak.m2OverGdp,
  dotComPeakSPXOverM2: dotComPeak.spxOverM2,
  ratioVsDotComPeak: pctChange(current.spxOverM2, dotComPeak.spxOverM2),
  spxNominalSinceDotComPeak: pctChange(current.spx, dotComPeak.spx),
  m2SinceDotComPeak: pctChange(current.m2, dotComPeak.m2),
  currentCorporateProfits: current.corporateProfits,
  currentCorporateProfitsMonth: current.corporateProfitsMonth,
  currentProfitSupport: current.profitSupport,
  currentProfitSupportIndex: current.profitSupportIndex,
  currentTenYearYield: current.tenYearYield,
  currentTenYearYieldMonth: current.tenYearYieldMonth,
  currentTenYearYieldIndex: current.tenYearYieldIndex,
  currentRateHurdleIndex: current.rateHurdleIndex,
  currentGDP: current.gdp,
  currentGDPMonth: current.gdpMonth,
  currentM2OverGDP: current.m2OverGdp,
  currentM2OverGDPIndex: current.m2OverGdpIndex,
};

const output = {
  meta: {
    generatedAt: new Date().toISOString(),
    startMonth: START_MONTH,
    sources: [
      {
        name: "S&P 500 monthly price",
        url: SOURCES.spxMonthly,
      },
      {
        name: "FRED M2SL money stock, seasonally adjusted monthly",
        url: SOURCES.m2,
      },
      {
        name: "FRED CP corporate profits after tax, seasonally adjusted annual rate quarterly",
        url: SOURCES.corporateProfits,
      },
      {
        name: "FRED DGS10 10-year Treasury constant maturity rate, daily",
        url: SOURCES.tenYearYield,
      },
      {
        name: "FRED GDP gross domestic product, seasonally adjusted annual rate quarterly",
        url: SOURCES.gdp,
      },
    ],
    notes: [
      "The primary chart is SPX divided by M2SL in billions of dollars.",
      "Three-month candles are built from monthly ratio observations.",
      "The dot-com reference is the maximum SPX/M2 observation from 1995 through 2002.",
      "Profit support is after-tax corporate profits divided by SPX and indexed to the dot-com SPX/M2 peak month.",
      "Rate hurdle is profit support index minus the 10-year Treasury yield index, both indexed to the dot-com SPX/M2 peak month.",
      "Real economy context is M2SL divided by nominal GDP and indexed to the dot-com SPX/M2 peak month.",
    ],
  },
  metrics,
  series: {
    monthly,
    quarterlies,
  },
};

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);

console.log(
  `Wrote ${path.relative(ROOT, OUTPUT_PATH)} with ${monthly.length} monthly points and ${quarterlies.length} quarterly candles.`,
);
