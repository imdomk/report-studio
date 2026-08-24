import type { EChartsOption } from "echarts";
import { datasets, type ReportWidget } from "./data";

export function buildChartOption(widget: ReportWidget): EChartsOption {
  const dataset = datasets[widget.dataset];
  const labels = dataset.rows.map((row) => String(row[widget.dimension]));
  const values = dataset.rows.map((row) => Number(row[widget.metric]));

  if (widget.type === "pie") {
    return {
      tooltip: { trigger: "item" },
      legend: { bottom: 0, itemWidth: 10, itemHeight: 10 },
      series: [{
        name: widget.title,
        type: "pie",
        radius: ["46%", "72%"],
        itemStyle: { borderWidth: 2 },
        label: { show: false },
        data: labels.map((name, index) => ({ name, value: values[index] })),
      }],
    };
  }

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 12, right: 12, top: 18, bottom: 8, containLabel: true },
    xAxis: { type: "category", data: labels, axisTick: { show: false } },
    yAxis: { type: "value", splitNumber: 4 },
    series: [{
      name: widget.title,
      type: widget.type,
      data: values,
      smooth: widget.type === "line",
      symbol: "circle",
      symbolSize: 7,
      barMaxWidth: 32,
    }],
  };
}
