import { useEffect, useRef } from "react";
import { BarChart, FunnelChart, LineChart, PieChart, RadarChart, ScatterChart } from "echarts/charts";
import { GridComponent, LegendComponent, RadarComponent, TooltipComponent } from "echarts/components";
import type { EChartsOption } from "echarts";
import { init, use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

use([BarChart, LineChart, PieChart, ScatterChart, RadarChart, FunnelChart, GridComponent, LegendComponent, RadarComponent, TooltipComponent, CanvasRenderer]);

interface ChartProps {
  label: string;
  option: EChartsOption;
  className?: string;
}

function token(styles: CSSStyleDeclaration, name: string) {
  return styles.getPropertyValue(name).trim();
}

export function Chart({ label, option, className = "" }: ChartProps) {
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
      color: [
        token(styles, "--color-chart-1"),
        token(styles, "--color-chart-2"),
        token(styles, "--color-chart-3"),
        token(styles, "--color-chart-4"),
      ],
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
  }, [option]);

  return <div ref={containerRef} className={`chart ${className}`} role="img" aria-label={label} />;
}
