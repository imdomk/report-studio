import { useEffect, useRef } from "react";
import { BarChart, FunnelChart, LineChart, PieChart, RadarChart, ScatterChart } from "echarts/charts";
import { GridComponent, LegendComponent, RadarComponent, TooltipComponent } from "echarts/components";
import type { EChartsOption } from "echarts";
import { init, use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import type { ChartPalette } from "./data";

use([BarChart, LineChart, PieChart, ScatterChart, RadarChart, FunnelChart, GridComponent, LegendComponent, RadarComponent, TooltipComponent, CanvasRenderer]);

interface ChartProps {
  label: string;
  option: EChartsOption;
  className?: string;
  palette?: ChartPalette;
}

function token(styles: CSSStyleDeclaration, name: string) {
  return styles.getPropertyValue(name).trim();
}

const paletteTokens: Record<ChartPalette, string[]> = {
  coral: ["--color-chart-1", "--color-chart-2", "--color-chart-3", "--color-chart-4"],
  ocean: ["--color-chart-ocean-1", "--color-chart-ocean-2", "--color-chart-ocean-3", "--color-chart-ocean-4"],
  forest: ["--color-chart-forest-1", "--color-chart-forest-2", "--color-chart-forest-3", "--color-chart-forest-4"],
};

export function Chart({ label, option, className = "", palette = "coral" }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const styles = getComputedStyle(document.documentElement);
    const chart = init(containerRef.current, undefined, { renderer: "canvas" });
    const ink = token(styles, "--color-ink-2");
    const muted = token(styles, "--color-muted");
    const rule = token(styles, "--color-rule");
    const surface = token(styles, "--color-surface");

    chart.setOption({
      ...option,
      color: paletteTokens[palette].map((name) => token(styles, name)),
      textStyle: { fontFamily: token(styles, "--font-body"), color: ink },
      legend: option.legend ? { ...(option.legend as object), textStyle: { color: muted } } : undefined,
      xAxis: option.xAxis ? { ...(option.xAxis as object), axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted } } : undefined,
      yAxis: option.yAxis ? { ...(option.yAxis as object), axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule } } } : undefined,
      tooltip: { ...(option.tooltip as object), backgroundColor: surface, borderColor: rule, textStyle: { color: ink } },
      series: Array.isArray(option.series)
        ? option.series.map((series) => ({ ...series, itemStyle: { ...(series as { itemStyle?: object }).itemStyle, borderColor: surface } }))
        : option.series,
    }, true);

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option, palette]);

  return <div ref={containerRef} className={`chart ${className}`} role="img" aria-label={label} />;
}
