import { describe, expect, it } from "vitest";
import { datasets } from "./data";
import { buildChartOption } from "./reporting";

describe("buildChartOption", () => {
  it("maps a dataset into categorical chart values", () => {
    const option = buildChartOption({ id: "test", title: "Pipeline", dataset: "pipeline", type: "bar", dimension: "month", metric: "value" }, datasets);
    expect(option.xAxis).toMatchObject({ data: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"] });
    expect(option.series).toEqual(expect.arrayContaining([expect.objectContaining({ type: "bar", data: [48000, 61000, 57000, 76000, 83000, 97000] })]));
  });

  it("supports all seven chart choices", () => {
    const types = ["bar", "line", "area", "pie", "scatter", "radar", "funnel"] as const;
    for (const type of types) {
      const option = buildChartOption({ id: type, title: type, dataset: "pipeline", type, dimension: "month", metric: "value" }, datasets);
      expect(option.series).toBeTruthy();
    }
  });

  it("groups repeated categories with the selected aggregation", () => {
    const source = {
      sample: {
        label: "Sample",
        dimensions: [{ key: "region", label: "Region" }],
        metrics: [{ key: "sales", label: "Sales" }],
        rows: [{ region: "North", sales: 10 }, { region: "North", sales: 20 }, { region: "South", sales: 15 }],
      },
    };
    const option = buildChartOption({ id: "average", title: "Average sales", dataset: "sample", type: "bar", dimension: "region", metric: "sales", aggregation: "average" }, source);
    expect(option.xAxis).toMatchObject({ data: ["North", "South"] });
    expect(option.series).toEqual(expect.arrayContaining([expect.objectContaining({ data: [15, 15] })]));
  });

  it("sorts by the aggregated value", () => {
    const option = buildChartOption({ id: "sorted", title: "Pipeline", dataset: "pipeline", type: "bar", dimension: "month", metric: "value", sortBy: "metric", sortDirection: "descending" }, datasets);
    expect(option.xAxis).toMatchObject({ data: ["Aug", "Jul", "Jun", "Apr", "May", "Mar"] });
    expect(option.series).toEqual(expect.arrayContaining([expect.objectContaining({ data: [97000, 83000, 76000, 61000, 57000, 48000] })]));
  });

  it("filters raw rows before grouping and sorting", () => {
    const option = buildChartOption({ id: "filtered", title: "Pipeline", dataset: "pipeline", type: "bar", dimension: "month", metric: "value", filter: { field: "value", operator: "greaterThan", value: "60000" } }, datasets);
    expect(option.xAxis).toMatchObject({ data: ["Apr", "Jun", "Jul", "Aug"] });
    expect(option.series).toEqual(expect.arrayContaining([expect.objectContaining({ data: [61000, 76000, 83000, 97000] })]));
  });
});
