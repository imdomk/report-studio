import type { EChartsOption } from "echarts";
import type { Aggregation, DatasetDefinition, ReportWidget } from "./data";

function aggregate(values: number[], method: Aggregation) {
  if (method === "count") return values.length;
  if (method === "average") return values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
  if (method === "minimum") return Math.min(...values);
  if (method === "maximum") return Math.max(...values);
  return values.reduce((total, value) => total + value, 0);
}

export function buildChartOption(widget: ReportWidget, availableDatasets: Record<string, DatasetDefinition>): EChartsOption {
  const dataset = availableDatasets[widget.dataset];
  if (!dataset) return {};
  const groups = new Map<string, number[]>();
  dataset.rows.forEach((row) => {
    const label = String(row[widget.dimension]);
    const value = Number(row[widget.metric]);
    if (!Number.isFinite(value)) return;
    groups.set(label, [...(groups.get(label) ?? []), value]);
  });
  const labels = [...groups.keys()];
  const values = [...groups.values()].map((group) => aggregate(group, widget.aggregation ?? "sum"));
  const compactLabels = labels.slice(0, 12);
  const compactValues = values.slice(0, 12);

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
        data: compactLabels.map((name, index) => ({ name, value: compactValues[index] })),
      }],
    };
  }

  if (widget.type === "funnel") {
    return {
      tooltip: { trigger: "item" },
      series: [{
        name: widget.title,
        type: "funnel",
        left: "10%",
        width: "80%",
        maxSize: "90%",
        sort: "descending",
        itemStyle: { borderWidth: 2 },
        data: compactLabels.map((name, index) => ({ name, value: compactValues[index] })),
      }],
    };
  }

  if (widget.type === "radar") {
    const ceiling = Math.max(...compactValues, 1);
    return {
      tooltip: { trigger: "item" },
      radar: { indicator: compactLabels.map((name) => ({ name, max: Math.ceil(ceiling * 1.15) })) },
      series: [{ type: "radar", data: [{ name: widget.title, value: compactValues }], areaStyle: { opacity: 0.12 } }],
    };
  }

  return {
    tooltip: { trigger: "axis" },
    grid: { left: 12, right: 12, top: 18, bottom: 8, containLabel: true },
    xAxis: { type: "category", data: labels, axisTick: { show: false } },
    yAxis: { type: "value", splitNumber: 4 },
    series: [{
      name: widget.title,
      type: widget.type === "area" ? "line" : widget.type,
      data: values,
      smooth: widget.type === "line" || widget.type === "area",
      areaStyle: widget.type === "area" ? { opacity: 0.14 } : undefined,
      symbol: "circle",
      symbolSize: 7,
      barMaxWidth: 32,
    }],
  };
}
