'use client'

import { useEffect, useRef } from 'react'
import {
  Chart,
  BarController,
  BarElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import 'chartjs-adapter-date-fns'

Chart.register(BarController, BarElement, LinearScale, TimeScale, Tooltip, Legend, annotationPlugin)

interface RatioPoint {
  date: string
  ratio: number
  spx: number
  m2: number
}

const C = {
  grid:   '#21262d',
  text:   '#e6edf3',
  sub:    '#8b949e',
  green:  '#3fb950',
  red:    '#f85149',
  yellow: '#ffd700',
  orange: '#f0883e',
}

function ts(d: string) { return new Date(d).getTime() }

export default function RatioChart({ data }: { data: RatioPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    // Dot-com peak: highest ratio in 1998-01 → 2001-12
    const dcWindow = data.filter(d => d.date >= '1998-01-01' && d.date <= '2001-12-01')
    const peak     = dcWindow.reduce((m, d) => (d.ratio > m.ratio ? d : m), dcWindow[0])
    const peakRatio = peak?.ratio ?? 0
    const peakDate  = peak?.date  ?? '2000-03-01'

    // Green if ratio rose vs previous month, else red
    const colors = data.map((d, i) =>
      i === 0 || d.ratio >= data[i - 1].ratio ? C.green : C.red
    )

    const latest = data[data.length - 1]
    const pct    = peakRatio > 0 ? ((latest.ratio / peakRatio) * 100).toFixed(0) : '—'

    if (chartRef.current) chartRef.current.destroy()

    // Build annotations object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const annotations: Record<string, any> = {
      // Yellow ellipse around dot-com peak
      dotcomCircle: {
        type: 'ellipse',
        xMin: ts('1999-06-01'),
        xMax: ts('2001-03-01'),
        yMin: peakRatio * 0.82,
        yMax: peakRatio * 1.08,
        borderColor: C.yellow,
        borderWidth: 2.5,
        backgroundColor: 'rgba(255,215,0,0.04)',
      },
      // Text label above ellipse
      dotcomLabel: {
        type: 'label',
        xValue: ts('2000-01-01'),
        yValue: peakRatio * 1.30,
        content: ['DOT-COM', 'BUBBLE'],
        color: C.yellow,
        font: { size: 11, weight: 'bold', family: 'monospace' },
        textAlign: 'center',
      },
      // Arrow from label down to ellipse edge
      dotcomArrow: {
        type: 'line',
        xMin: ts('2000-01-01'),
        xMax: ts('2000-01-01'),
        yMin: peakRatio * 1.10,
        yMax: peakRatio * 1.24,
        borderColor: C.yellow,
        borderWidth: 1.5,
        arrowHeads: {
          start: { display: true, fill: true, borderColor: C.yellow, backgroundColor: C.yellow },
        },
      },
      // Dashed horizontal line from peak forward
      peakLine: {
        type: 'line',
        xMin: ts(peakDate),
        xMax: ts('2028-01-01'),
        yMin: peakRatio,
        yMax: peakRatio,
        borderColor: C.yellow,
        borderDash: [6, 4],
        borderWidth: 1.3,
        label: {
          display: true,
          content: `peak ${peakRatio.toFixed(3)}`,
          position: 'end',
          color: C.yellow,
          backgroundColor: 'transparent',
          font: { size: 9, family: 'monospace' },
          yAdjust: -11,
          xAdjust: -6,
        },
      },
      // Current ratio callout
      nowLabel: {
        type: 'label',
        xValue: ts(latest.date),
        yValue: latest.ratio * 1.22,
        content: [
          `NOW ${latest.ratio.toFixed(3)}`,
          `${pct}% of 2000 peak`,
        ],
        color: C.orange,
        font: { size: 9, weight: 'bold', family: 'monospace' },
        textAlign: 'center',
      },
      nowLine: {
        type: 'line',
        xMin: ts(latest.date),
        xMax: ts(latest.date),
        yMin: latest.ratio,
        yMax: latest.ratio * 1.15,
        borderColor: C.orange,
        borderWidth: 1.2,
        borderDash: [3, 3],
      },
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        datasets: [{
          data: data.map(d => ({ x: ts(d.date), y: d.ratio })),
          backgroundColor: colors,
          borderColor:     colors,
          borderWidth: 0,
          borderRadius: 1,
          barThickness: 'flex',
          maxBarThickness: 10,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            type: 'time',
            min: ts('1989-01-01'),
            max: ts('2028-01-01'),
            time: {
              unit: 'year',
              displayFormats: { year: 'yyyy' },
              tooltipFormat: 'MMM yyyy',
            },
            grid:  { color: C.grid },
            ticks: { color: C.sub, maxTicksLimit: 22, maxRotation: 0 },
            border: { color: C.grid },
            title: {
              display: true,
              text: 'Year  (1989 – 2028)',
              color: C.text,
              font: { size: 12 },
              padding: { top: 8 },
            },
          },
          y: {
            title: {
              display: true,
              text: 'Ratio  (SPX / M2)',
              color: C.text,
              font: { size: 12 },
            },
            grid:  { color: C.grid },
            ticks: {
              color: C.sub,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              callback: (v: any) => Number(v).toFixed(3),
            },
            border: { color: C.grid },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1c2128',
            titleColor: C.text,
            bodyColor:  C.sub,
            borderColor: C.grid,
            borderWidth: 1,
            callbacks: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              title: (items: any[]) => {
                const d = data[items[0].dataIndex]
                return d
                  ? new Date(d.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  : ''
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label: (item: any) => {
                const d = data[item.dataIndex]
                if (!d) return ''
                return [
                  `Ratio : ${d.ratio.toFixed(5)}`,
                  `SPX   : ${d.spx.toLocaleString()}`,
                  `M2    : $${d.m2.toLocaleString()}B`,
                ]
              },
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          annotation: { annotations } as any,
        },
      },
    })

    return () => { chartRef.current?.destroy() }
  }, [data])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
