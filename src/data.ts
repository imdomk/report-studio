export type ClientStage = "Lead" | "Qualified" | "Proposal" | "Won";

export interface Client {
  id: string;
  contact: string;
  company: string;
  email: string;
  stage: ClientStage;
  value: number;
  owner: string;
  lastActivity: string;
}

export type ChartType = "bar" | "line" | "area" | "pie" | "scatter" | "radar" | "funnel";
export type Aggregation = "sum" | "average" | "count" | "minimum" | "maximum";
export type SortBy = "dimension" | "metric";
export type SortDirection = "ascending" | "descending";
export type FilterOperator = "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";

export interface ReportFilter {
  field: string;
  operator: FilterOperator;
  value: string;
}

export interface ReportWidget {
  id: string;
  title: string;
  dataset: string;
  type: ChartType;
  dimension: string;
  metric: string;
  aggregation?: Aggregation;
  sortBy?: SortBy;
  sortDirection?: SortDirection;
  filter?: ReportFilter;
}

export interface DataField {
  key: string;
  label: string;
}

export interface DatasetDefinition {
  label: string;
  dimensions: DataField[];
  metrics: DataField[];
  rows: Array<Record<string, string | number>>;
}

export type DatasetKey = "pipeline" | "channels" | "activity";

export const datasets: Record<DatasetKey, DatasetDefinition> = {
  pipeline: {
    label: "Sales pipeline",
    dimensions: [{ key: "month", label: "Month" }],
    metrics: [
      { key: "value", label: "Pipeline value" },
      { key: "deals", label: "Open deals" },
    ],
    rows: [
      { month: "Mar", value: 48000, deals: 11 },
      { month: "Apr", value: 61000, deals: 14 },
      { month: "May", value: 57000, deals: 12 },
      { month: "Jun", value: 76000, deals: 16 },
      { month: "Jul", value: 83000, deals: 18 },
      { month: "Aug", value: 97000, deals: 21 },
    ],
  },
  channels: {
    label: "Acquisition channels",
    dimensions: [{ key: "channel", label: "Channel" }],
    metrics: [
      { key: "leads", label: "Leads" },
      { key: "conversion", label: "Conversion rate" },
    ],
    rows: [
      { channel: "Referral", leads: 42, conversion: 31 },
      { channel: "Organic", leads: 35, conversion: 24 },
      { channel: "Outbound", leads: 29, conversion: 18 },
      { channel: "Partners", leads: 21, conversion: 27 },
    ],
  },
  activity: {
    label: "Commercial activity",
    dimensions: [{ key: "week", label: "Week" }],
    metrics: [
      { key: "meetings", label: "Meetings" },
      { key: "proposals", label: "Proposals sent" },
    ],
    rows: [
      { week: "W1", meetings: 18, proposals: 7 },
      { week: "W2", meetings: 24, proposals: 9 },
      { week: "W3", meetings: 21, proposals: 11 },
      { week: "W4", meetings: 29, proposals: 13 },
    ],
  },
};

export const seedClients: Client[] = [
  { id: "c1", contact: "Mariana Torres", company: "Altura Foods", email: "mariana@altura.test", stage: "Proposal", value: 18500, owner: "Domingo", lastActivity: "Today" },
  { id: "c2", contact: "Luis Mendoza", company: "Northstar Freight", email: "luis@northstar.test", stage: "Qualified", value: 12400, owner: "Camila", lastActivity: "Yesterday" },
  { id: "c3", contact: "Sofía Herrera", company: "Litoral Labs", email: "sofia@litoral.test", stage: "Won", value: 29200, owner: "Domingo", lastActivity: "2 days ago" },
  { id: "c4", contact: "Mateo Ríos", company: "Nexo Retail", email: "mateo@nexo.test", stage: "Lead", value: 7800, owner: "Camila", lastActivity: "3 days ago" },
  { id: "c5", contact: "Valentina Cruz", company: "Páramo Energy", email: "valentina@paramo.test", stage: "Proposal", value: 24600, owner: "Domingo", lastActivity: "5 days ago" },
];

export const defaultWidgets: ReportWidget[] = [
  { id: "pipeline-value", title: "Pipeline value by month", dataset: "pipeline", type: "bar", dimension: "month", metric: "value" },
  { id: "lead-sources", title: "Leads by source", dataset: "channels", type: "pie", dimension: "channel", metric: "leads" },
];
