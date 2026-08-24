import { describe, expect, it } from "vitest";
import { buildChartOption } from "./reporting";

describe("buildChartOption", () => {
  it("maps a dataset into categorical chart values", () => {
    const option = buildChartOption({ id: "test", title: "Pipeline", dataset: "pipeline", type: "bar", dimension: "month", metric: "value" });
    expect(option.xAxis).toMatchObject({ data: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"] });
    expect(option.series).toEqual(expect.arrayContaining([expect.objectContaining({ type: "bar", data: [48000, 61000, 57000, 76000, 83000, 97000] })]));
  });
});
