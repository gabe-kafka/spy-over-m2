import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  createSeriesMarkers,
  LineSeries,
  LineStyle,
  type BusinessDay,
  type CandlestickData,
  type IChartApi,
  type LineData,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { MacroData } from "./types";

type HoverPoint = {
  label: string;
  valueLabel: string;
  subLabel: string;
};

type VariableDefinition = {
  symbol: string;
  meaning: string;
};

const DATA_URL = "/data/spx-m2.json";

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const ratioFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

const indexFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const yieldFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

function toBusinessDay(date: string): BusinessDay {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function fromBusinessDay(time: Time): string {
  if (typeof time === "string") {
    return time;
  }

  if (typeof time === "number") {
    return new Date(time * 1000).toISOString().slice(0, 10);
  }

  return `${time.year}-${String(time.month).padStart(2, "0")}-${String(
    time.day,
  ).padStart(2, "0")}`;
}

function displayMonth(month: string) {
  return dateFormatter.format(new Date(`${month}-02T00:00:00`));
}

function formatM2(m2Billions: number) {
  return `$${numberFormatter.format(m2Billions / 1000)}T`;
}

function formatTrillions(billions: number) {
  return `$${numberFormatter.format(billions / 1000)}T`;
}

function formatRatio(value: number) {
  return ratioFormatter.format(value);
}

function quarterStartFromMonth(month: string) {
  const year = month.slice(0, 4);
  const monthNumber = Number(month.slice(5, 7));
  const quarterStart = Math.floor((monthNumber - 1) / 3) * 3 + 1;
  return `${year}-${String(quarterStart).padStart(2, "0")}-01`;
}

function chartPalette(isLight: boolean) {
  return isLight
    ? {
        bg: "#ffffff",
        text: "#505050",
        border: "#d4d4d4",
        grid: "rgba(26, 26, 26, 0.12)",
        label: "#f5f5f5",
        markerText: "#1a1a1a",
        peak: "#1a1a1a",
        line: "#0057ff",
        rate: "#d97706",
        real: "#16a34a",
      }
    : {
        bg: "#0a0a0a",
        text: "#808080",
        border: "#2a2a2a",
        grid: "rgba(229, 229, 229, 0.10)",
        label: "#141414",
        markerText: "#e5e5e5",
        peak: "#e5e5e5",
        line: "#3b82f6",
        rate: "#f59e0b",
        real: "#22c55e",
      };
}

function usePrefersLight() {
  const [isLight, setIsLight] = useState(() =>
    window.matchMedia("(prefers-color-scheme: light)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setIsLight(media.matches);

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isLight;
}

function MacroChart({ data }: { data: MacroData }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null);
  const isLight = usePrefersLight();

  const currentHover: HoverPoint = {
    label: displayMonth(data.metrics.currentMonth),
    valueLabel: ratioFormatter.format(data.metrics.currentSPXOverM2),
    subLabel: `SPX ${numberFormatter.format(
      data.metrics.currentSPX,
    )} / M2 ${formatM2(data.metrics.currentM2)}`,
  };

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const palette = chartPalette(isLight);

    const chart: IChartApi = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: palette.bg },
        textColor: palette.text,
        fontFamily:
          "'Berkeley Mono', 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: palette.grid },
        horzLines: { color: palette.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: palette.text,
          labelBackgroundColor: palette.label,
        },
        horzLine: {
          color: palette.text,
          labelBackgroundColor: palette.label,
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.08,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: palette.border,
        timeVisible: false,
        secondsVisible: false,
      },
      localization: {
        priceFormatter: (price: number) => ratioFormatter.format(price),
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderVisible: false,
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
      lastValueVisible: true,
      priceLineVisible: false,
    });

    const candleData: CandlestickData[] = data.series.quarterlies.map((point) => ({
      time: toBusinessDay(point.time),
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
    }));

    candleSeries.setData(candleData);
    candleSeries.createPriceLine({
      price: data.metrics.dotComPeakSPXOverM2,
      color: palette.peak,
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: "DOTCOM PEAK",
      axisLabelColor: palette.label,
      axisLabelTextColor: palette.markerText,
    });

    createSeriesMarkers(candleSeries, [
      {
        time: toBusinessDay(quarterStartFromMonth(data.metrics.dotComPeakMonth)),
        position: "aboveBar",
        color: "#d97706",
        shape: "circle",
        text: "DOTCOM",
      },
    ]);

    chart.timeScale().fitContent();
    setHoverPoint(null);

    const candleLookup = new Map(
      data.series.quarterlies.map((point) => [point.time, point]),
    );

    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.seriesData.has(candleSeries)) {
        setHoverPoint(null);
        return;
      }

      const date = fromBusinessDay(param.time);
      const point = candleLookup.get(date);
      const bar = param.seriesData.get(candleSeries);

      if (!point || !bar || !("close" in bar)) {
        return;
      }

      setHoverPoint({
        label: point.quarter,
        valueLabel: ratioFormatter.format(bar.close),
        subLabel: `SPX ${numberFormatter.format(point.spx)} / M2 ${formatM2(
          point.m2,
        )}`,
      });
    };

    chart.subscribeCrosshairMove(onCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      chart.remove();
    };
  }, [data, isLight]);

  const visiblePoint = hoverPoint ?? currentHover;

  return (
    <section className="panel chart-panel" aria-label="Macro chart">
      <div className="panel-head">
        <h2>LAYER 1: PRICE / MONEY</h2>
        <span>3M CANDLES</span>
      </div>
      <div className="chart-readout">
        <span>{visiblePoint.label}</span>
        <strong>{visiblePoint.valueLabel}</strong>
        <small>{visiblePoint.subLabel}</small>
      </div>
      <div ref={containerRef} className="chart" />
    </section>
  );
}

function EquationPanel({
  label,
  equation,
  note,
  variables,
}: {
  label: string;
  equation: string;
  note: string;
  variables: VariableDefinition[];
}) {
  const mathMarkup = katex.renderToString(equation, {
    displayMode: true,
    throwOnError: false,
  });

  return (
    <section className="panel equation-panel" aria-label={`${label} equation`}>
      <span className="equation-label">{label}</span>
      <div
        className="equation-math"
        dangerouslySetInnerHTML={{ __html: mathMarkup }}
      />
      <small>{note}</small>
      <dl className="equation-vars">
        {variables.map((variable) => (
          <div key={variable.symbol}>
            <dt
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(variable.symbol, {
                  throwOnError: false,
                }),
              }}
            />
            <dd>{variable.meaning}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ProfitSupportChart({ data }: { data: MacroData }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null);
  const isLight = usePrefersLight();

  const currentHover: HoverPoint = {
    label: displayMonth(data.metrics.currentMonth),
    valueLabel: indexFormatter.format(data.metrics.currentProfitSupportIndex),
    subLabel: `CP ${displayMonth(
      data.metrics.currentCorporateProfitsMonth,
    )} ${formatTrillions(
      data.metrics.currentCorporateProfits,
    )} / SPX ${numberFormatter.format(data.metrics.currentSPX)}`,
  };

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const palette = chartPalette(isLight);
    const chart: IChartApi = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: palette.bg },
        textColor: palette.text,
        fontFamily:
          "'Berkeley Mono', 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: palette.grid },
        horzLines: { color: palette.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: palette.text,
          labelBackgroundColor: palette.label,
        },
        horzLine: {
          color: palette.text,
          labelBackgroundColor: palette.label,
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.12,
          bottom: 0.12,
        },
      },
      timeScale: {
        borderColor: palette.border,
        timeVisible: false,
        secondsVisible: false,
      },
      localization: {
        priceFormatter: (price: number) => indexFormatter.format(price),
      },
    });

    const supportSeries = chart.addSeries(LineSeries, {
      color: palette.line,
      lineWidth: 2,
      lastValueVisible: true,
      priceLineVisible: false,
    });

    const supportData: LineData[] = data.series.monthly.map((point) => ({
      time: toBusinessDay(point.date),
      value: point.profitSupportIndex,
    }));

    supportSeries.setData(supportData);
    supportSeries.createPriceLine({
      price: 100,
      color: palette.peak,
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: "DOTCOM",
      axisLabelColor: palette.label,
      axisLabelTextColor: palette.markerText,
    });

    createSeriesMarkers(supportSeries, [
      {
        time: toBusinessDay(data.metrics.dotComPeakDate),
        position: "aboveBar",
        color: "#d97706",
        shape: "circle",
        text: "DOTCOM",
      },
    ]);

    chart.timeScale().fitContent();
    setHoverPoint(null);

    const pointLookup = new Map(data.series.monthly.map((point) => [point.date, point]));

    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.seriesData.has(supportSeries)) {
        setHoverPoint(null);
        return;
      }

      const date = fromBusinessDay(param.time);
      const point = pointLookup.get(date);
      const linePoint = param.seriesData.get(supportSeries);

      if (!point || !linePoint || !("value" in linePoint)) {
        return;
      }

      setHoverPoint({
        label: displayMonth(point.month),
        valueLabel: indexFormatter.format(linePoint.value),
        subLabel: `CP ${displayMonth(point.corporateProfitsMonth)} ${formatTrillions(
          point.corporateProfits,
        )} / SPX ${numberFormatter.format(point.spx)}`,
      });
    };

    chart.subscribeCrosshairMove(onCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      chart.remove();
    };
  }, [data, isLight]);

  const visiblePoint = hoverPoint ?? currentHover;

  return (
    <section
      className="panel chart-panel chart-panel--compact"
      aria-label="Profit support chart"
    >
      <div className="panel-head">
        <h2>LAYER 2: PROFIT SUPPORT</h2>
        <span>DOTCOM = 100</span>
      </div>
      <div className="chart-readout">
        <span>{visiblePoint.label}</span>
        <strong>{visiblePoint.valueLabel}</strong>
        <small>{visiblePoint.subLabel}</small>
      </div>
      <div ref={containerRef} className="chart chart--compact" />
    </section>
  );
}

function RateHurdleChart({ data }: { data: MacroData }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null);
  const isLight = usePrefersLight();

  const currentHover: HoverPoint = {
    label: displayMonth(data.metrics.currentMonth),
    valueLabel: indexFormatter.format(data.metrics.currentRateHurdleIndex),
    subLabel: `10Y ${displayMonth(
      data.metrics.currentTenYearYieldMonth,
    )} ${yieldFormatter.format(data.metrics.currentTenYearYield)}%`,
  };

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const palette = chartPalette(isLight);
    const chart: IChartApi = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: palette.bg },
        textColor: palette.text,
        fontFamily:
          "'Berkeley Mono', 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: palette.grid },
        horzLines: { color: palette.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: palette.text,
          labelBackgroundColor: palette.label,
        },
        horzLine: {
          color: palette.text,
          labelBackgroundColor: palette.label,
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.12,
          bottom: 0.12,
        },
      },
      timeScale: {
        borderColor: palette.border,
        timeVisible: false,
        secondsVisible: false,
      },
      localization: {
        priceFormatter: (price: number) => indexFormatter.format(price),
      },
    });

    const hurdleSeries = chart.addSeries(LineSeries, {
      color: palette.rate,
      lineWidth: 2,
      lastValueVisible: true,
      priceLineVisible: false,
    });

    const hurdleData: LineData[] = data.series.monthly.map((point) => ({
      time: toBusinessDay(point.date),
      value: point.rateHurdleIndex,
    }));

    hurdleSeries.setData(hurdleData);
    hurdleSeries.createPriceLine({
      price: 0,
      color: palette.peak,
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: "DOTCOM",
      axisLabelColor: palette.label,
      axisLabelTextColor: palette.markerText,
    });

    chart.timeScale().fitContent();
    setHoverPoint(null);

    const pointLookup = new Map(data.series.monthly.map((point) => [point.date, point]));

    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.seriesData.has(hurdleSeries)) {
        setHoverPoint(null);
        return;
      }

      const date = fromBusinessDay(param.time);
      const point = pointLookup.get(date);
      const linePoint = param.seriesData.get(hurdleSeries);

      if (!point || !linePoint || !("value" in linePoint)) {
        return;
      }

      setHoverPoint({
        label: displayMonth(point.month),
        valueLabel: indexFormatter.format(linePoint.value),
        subLabel: `10Y ${displayMonth(point.tenYearYieldMonth)} ${yieldFormatter.format(
          point.tenYearYield,
        )}%`,
      });
    };

    chart.subscribeCrosshairMove(onCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      chart.remove();
    };
  }, [data, isLight]);

  const visiblePoint = hoverPoint ?? currentHover;

  return (
    <section
      className="panel chart-panel chart-panel--compact"
      aria-label="Rate hurdle chart"
    >
      <div className="panel-head">
        <h2>LAYER 3: RATE HURDLE</h2>
        <span>PROFIT INDEX - 10Y INDEX</span>
      </div>
      <div className="chart-readout">
        <span>{visiblePoint.label}</span>
        <strong>{visiblePoint.valueLabel}</strong>
        <small>{visiblePoint.subLabel}</small>
      </div>
      <div ref={containerRef} className="chart chart--compact" />
    </section>
  );
}

function RealEconomyChart({ data }: { data: MacroData }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null);
  const isLight = usePrefersLight();

  const currentHover: HoverPoint = {
    label: displayMonth(data.metrics.currentMonth),
    valueLabel: indexFormatter.format(data.metrics.currentM2OverGDPIndex),
    subLabel: `M2 ${formatTrillions(data.metrics.currentM2)} / GDP ${displayMonth(
      data.metrics.currentGDPMonth,
    )} ${formatTrillions(data.metrics.currentGDP)}`,
  };

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const palette = chartPalette(isLight);
    const chart: IChartApi = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: palette.bg },
        textColor: palette.text,
        fontFamily:
          "'Berkeley Mono', 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: palette.grid },
        horzLines: { color: palette.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: palette.text,
          labelBackgroundColor: palette.label,
        },
        horzLine: {
          color: palette.text,
          labelBackgroundColor: palette.label,
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.12,
          bottom: 0.12,
        },
      },
      timeScale: {
        borderColor: palette.border,
        timeVisible: false,
        secondsVisible: false,
      },
      localization: {
        priceFormatter: (price: number) => indexFormatter.format(price),
      },
    });

    const realSeries = chart.addSeries(LineSeries, {
      color: palette.real,
      lineWidth: 2,
      lastValueVisible: true,
      priceLineVisible: false,
    });

    const realData: LineData[] = data.series.monthly.map((point) => ({
      time: toBusinessDay(point.date),
      value: point.m2OverGdpIndex,
    }));

    realSeries.setData(realData);
    realSeries.createPriceLine({
      price: 100,
      color: palette.peak,
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: "DOTCOM",
      axisLabelColor: palette.label,
      axisLabelTextColor: palette.markerText,
    });

    chart.timeScale().fitContent();
    setHoverPoint(null);

    const pointLookup = new Map(data.series.monthly.map((point) => [point.date, point]));

    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.seriesData.has(realSeries)) {
        setHoverPoint(null);
        return;
      }

      const date = fromBusinessDay(param.time);
      const point = pointLookup.get(date);
      const linePoint = param.seriesData.get(realSeries);

      if (!point || !linePoint || !("value" in linePoint)) {
        return;
      }

      setHoverPoint({
        label: displayMonth(point.month),
        valueLabel: indexFormatter.format(linePoint.value),
        subLabel: `M2/GDP ${formatRatio(point.m2OverGdp)} using GDP ${displayMonth(
          point.gdpMonth,
        )}`,
      });
    };

    chart.subscribeCrosshairMove(onCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      chart.remove();
    };
  }, [data, isLight]);

  const visiblePoint = hoverPoint ?? currentHover;

  return (
    <section
      className="panel chart-panel chart-panel--compact"
      aria-label="Real economy context chart"
    >
      <div className="panel-head">
        <h2>LAYER 4: MONEY / GDP</h2>
        <span>DOTCOM = 100</span>
      </div>
      <div className="chart-readout">
        <span>{visiblePoint.label}</span>
        <strong>{visiblePoint.valueLabel}</strong>
        <small>{visiblePoint.subLabel}</small>
      </div>
      <div ref={containerRef} className="chart chart--compact" />
    </section>
  );
}

function App() {
  const [data, setData] = useState<MacroData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Data request failed: ${response.status}`);
        }

        return response.json() as Promise<MacroData>;
      })
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Data load failed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <main className="page page--centered">
        <div className="notice">
          <strong>DATA FAILED</strong>
          <span>{error}</span>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page page--centered">
        <div className="loader" aria-label="Loading macro data" />
      </main>
    );
  }

  return (
    <main className="page">
      <div className="status-bar">
        <span>SPX/M2 STUDY</span>
        <span>LAST {data.metrics.currentMonth}</span>
      </div>

      <header className="app-header">
        <div>
          <p className="eyebrow">MACRO / LIQUIDITY / VALUATION</p>
          <h1>SPX / M2 STUDY</h1>
        </div>
      </header>

      <MacroChart data={data} />

      <EquationPanel
        label="LAYER 1 MATH"
        equation={String.raw`L_1(t)=\frac{\mathrm{SPX}_t}{\mathrm{M2SL}_t}`}
        note="M2SL is FRED's seasonally adjusted M2 money stock: cash, checking deposits, savings deposits, small time deposits, and retail money-market funds, reported in USD billions."
        variables={[
          { symbol: "t", meaning: "Observation month." },
          { symbol: "\\mathrm{SPX}_t", meaning: "S&P 500 index level at month t." },
          {
            symbol: "\\mathrm{M2SL}_t",
            meaning: "FRED M2 money stock at month t, in USD billions.",
          },
          {
            symbol: "L_1(t)",
            meaning: "S&P 500 index level per billion dollars of M2.",
          },
        ]}
      />

      <section className="panel study-note" aria-label="Study limitation">
        <span>DOES NOT MODEL</span>
        <strong>EARNINGS / RATES / GDP / FLOWS</strong>
      </section>

      <ProfitSupportChart data={data} />

      <EquationPanel
        label="LAYER 2 MATH"
        equation={String.raw`L_2(t)=100\times\frac{\mathrm{CP}_t/\mathrm{SPX}_t}{\mathrm{CP}_{\tau}/\mathrm{SPX}_{\tau}}`}
        note="CP is FRED after-tax corporate profits. τ is the dot-com SPX/M2 peak month, so 100 means the same broad profit support per SPX point as that reference."
        variables={[
          { symbol: "\\mathrm{CP}_t", meaning: "After-tax corporate profits at month t, in USD billions annualized." },
          { symbol: "\\tau", meaning: "Dot-com SPX/M2 peak reference month." },
          {
            symbol: "\\mathrm{CP}_{\\tau}/\\mathrm{SPX}_{\\tau}",
            meaning: "Profit support per SPX point at the reference month.",
          },
          {
            symbol: "L_2(t)",
            meaning: "Current profit support indexed to the reference month.",
          },
        ]}
      />

      <RateHurdleChart data={data} />

      <EquationPanel
        label="LAYER 3 MATH"
        equation={String.raw`L_3(t)=L_2(t)-100\times\frac{\mathrm{DGS10}_t}{\mathrm{DGS10}_{\tau}}`}
        note="DGS10 is the 10-year Treasury yield. This subtracts the indexed rate hurdle from the indexed profit-support layer."
        variables={[
          { symbol: "\\mathrm{DGS10}_t", meaning: "Monthly average 10-year Treasury yield at month t." },
          { symbol: "\\mathrm{DGS10}_{\\tau}", meaning: "10-year Treasury yield at the reference month." },
          { symbol: "L_2(t)", meaning: "Layer 2 profit-support index." },
          {
            symbol: "L_3(t)",
            meaning: "Profit-support index after subtracting the indexed rate hurdle.",
          },
        ]}
      />

      <RealEconomyChart data={data} />

      <EquationPanel
        label="LAYER 4 MATH"
        equation={String.raw`L_4(t)=100\times\frac{\mathrm{M2SL}_t/\mathrm{GDP}_t}{\mathrm{M2SL}_{\tau}/\mathrm{GDP}_{\tau}}`}
        note="GDP is nominal gross domestic product. This asks whether broad money is elevated or depressed relative to the size of the real economy."
        variables={[
          { symbol: "\\mathrm{GDP}_t", meaning: "Nominal gross domestic product at month t, in USD billions annualized." },
          { symbol: "\\mathrm{M2SL}_t/\\mathrm{GDP}_t", meaning: "Broad money stock relative to nominal output." },
          { symbol: "\\tau", meaning: "Dot-com SPX/M2 peak reference month." },
          {
            symbol: "L_4(t)",
            meaning: "M2/GDP indexed to the reference month.",
          },
        ]}
      />
    </main>
  );
}

export default App;
