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
});
