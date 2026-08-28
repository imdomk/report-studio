import { useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import Papa from "papaparse";
import { Chart } from "./Chart";
import {
  datasets,
  defaultWidgets,
  seedClients,
  type Aggregation,
  type ChartType,
  type ChartPalette,
  type Client,
  type ClientStage,
  type DatasetDefinition,
  type FilterOperator,
  type ColorMode,
  type ReportWidget,
  type SortBy,
  type SortDirection,
} from "./data";
import { buildChartOption } from "./reporting";

type View = "dashboard" | "clients" | "builder";
type FieldKind = "dimension" | "metric";

const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

export default function App({ user, onSignOut }: { user: string; onSignOut: () => void }) {
  const [view, setView] = useState<View>("dashboard");
  const [clients, setClients] = useState<Client[]>(() => readStored("report-studio.clients", seedClients));
  const [widgets, setWidgets] = useState<ReportWidget[]>(() => readStored("report-studio.widgets", defaultWidgets));
  const [customDatasets, setCustomDatasets] = useState<Record<string, DatasetDefinition>>(() => readStored("report-studio.datasets", {}));
  const [csvError, setCsvError] = useState("");
  const [csvMessage, setCsvMessage] = useState("");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<ClientStage | "All">("All");
  const [undoWidget, setUndoWidget] = useState<ReportWidget | null>(null);
  const clientDialog = useRef<HTMLDialogElement>(null);
  const clientNameInput = useRef<HTMLInputElement>(null);
  const draggedField = useRef<{ kind: FieldKind; key: string } | null>(null);

  const [draft, setDraft] = useState<Omit<ReportWidget, "id">>({
    title: "Commercial activity by week",
    dataset: "activity",
    type: "line",
    dimension: "week",
    metric: "meetings",
    aggregation: "sum",
    sortBy: "dimension",
    sortDirection: "ascending",
    palette: "coral",
    colorMode: "single",
  });

  const allDatasets = useMemo<Record<string, DatasetDefinition>>(() => ({ ...datasets, ...customDatasets }), [customDatasets]);
  const activeDataset = allDatasets[draft.dataset] ?? datasets.activity;
  const previewWidget: ReportWidget = { ...draft, id: "preview" };
  const activeDimension = activeDataset.dimensions.find((field) => field.key === draft.dimension);
  const activeMetric = activeDataset.metrics.find((field) => field.key === draft.metric);
  const filterFields = [...activeDataset.dimensions, ...activeDataset.metrics];
  const filterIsNumeric = activeDataset.metrics.some((field) => field.key === draft.filter?.field);
  const usesCategoryColors = draft.type === "pie" || draft.type === "funnel";
  const filteredClients = useMemo(() => clients.filter((client) => {
    const matchesQuery = `${client.contact} ${client.company} ${client.email}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (stage === "All" || client.stage === stage);
  }), [clients, query, stage]);

  const pipelineValue = clients.filter((client) => client.stage !== "Won").reduce((total, client) => total + client.value, 0);
  const wonValue = clients.filter((client) => client.stage === "Won").reduce((total, client) => total + client.value, 0);
  const openDeals = clients.filter((client) => client.stage !== "Won").length;

  function persistClients(next: Client[]) {
    setClients(next);
    localStorage.setItem("report-studio.clients", JSON.stringify(next));
  }

  function persistWidgets(next: ReportWidget[]) {
    setWidgets(next);
    localStorage.setItem("report-studio.widgets", JSON.stringify(next));
  }

  function changeDataset(dataset: string) {
    const definition = allDatasets[dataset];
    if (!definition) return;
    setDraft((current) => ({
      ...current,
      dataset,
      dimension: definition.dimensions[0].key,
      metric: definition.metrics[0].key,
      aggregation: "sum",
      filter: undefined,
    }));
  }

  function assignField(kind: FieldKind, key: string) {
    setDraft((current) => ({ ...current, [kind]: key }));
  }

  function dropField(event: DragEvent<HTMLElement>, kind: FieldKind) {
    event.preventDefault();
    const field = draggedField.current;
    if (field?.kind === kind) assignField(kind, field.key);
  }

  function loadCsv(file?: File) {
    setCsvError("");
    setCsvMessage("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("That file is not a CSV. Choose a file ending in .csv.");
      return;
    }
    if (file.size > 1_000_000) {
      setCsvError("That CSV is larger than 1 MB. Export a smaller file and try again.");
      return;
    }

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: "greedy",
      complete: (result) => {
        const fields = (result.meta.fields ?? []).map((field) => field.trim()).filter(Boolean);
        if (result.errors.length || !fields.length || !result.data.length) {
          setCsvError("The CSV could not be read. Confirm that its first row contains column names.");
          return;
        }

        const rows = result.data.slice(0, 2000).map((row) => Object.fromEntries(fields.map((field) => {
          const value = row[field];
          return [field, typeof value === "number" ? value : String(value ?? "")];
        })) as Record<string, string | number>);
        const numericFields = fields.filter((field) => rows.some((row) => row[field] !== "") && rows.every((row) => row[field] === "" || typeof row[field] === "number"));
        const dimensionFields = fields.filter((field) => !numericFields.includes(field));
        const primaryDimension = dimensionFields[0] ?? fields[0];
        const metricFields = numericFields.filter((field) => field !== primaryDimension);

        if (!metricFields.length) {
          setCsvError("No numeric measure was found. Add at least one column containing numbers.");
          return;
        }

        const id = `csv:${crypto.randomUUID()}`;
        const label = file.name.replace(/\.csv$/i, "");
        const dataset: DatasetDefinition = {
          label,
          rows,
          dimensions: (dimensionFields.length ? dimensionFields : [primaryDimension]).map((key) => ({ key, label: key })),
          metrics: metricFields.map((key) => ({ key, label: key })),
        };
        const next = { ...customDatasets, [id]: dataset };
        setCustomDatasets(next);
        try {
          localStorage.setItem("report-studio.datasets", JSON.stringify(next));
        } catch {
          setCsvError("The CSV loaded for this session but is too large to keep after refresh.");
        }
        setDraft({ title: label, dataset: id, type: "bar", dimension: dataset.dimensions[0].key, metric: dataset.metrics[0].key, aggregation: "sum", sortBy: "dimension", sortDirection: "ascending", palette: "coral", colorMode: "single" });
        setCsvMessage(`${label} loaded · ${rows.length} rows · ${fields.length} columns`);
      },
      error: () => setCsvError("The browser could not read that CSV. Try exporting it again."),
    });
  }

  function saveReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const widget: ReportWidget = { ...draft, title: draft.title.trim(), id: crypto.randomUUID() };
    persistWidgets([...widgets, widget]);
    setView("dashboard");
  }

  function removeWidget(widget: ReportWidget) {
    persistWidgets(widgets.filter((item) => item.id !== widget.id));
    setUndoWidget(widget);
  }

  function restoreWidget() {
    if (!undoWidget) return;
    persistWidgets([...widgets, undoWidget]);
    setUndoWidget(null);
  }

  function openClientDialog() {
    clientDialog.current?.showModal();
    requestAnimationFrame(() => clientNameInput.current?.focus());
  }

  function addClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const client: Client = {
      id: crypto.randomUUID(),
      contact: String(data.get("contact")),
      company: String(data.get("company")),
      email: String(data.get("email")),
      stage: String(data.get("stage")) as ClientStage,
      value: Number(data.get("value")),
      owner: "Local",
      lastActivity: "Just now",
    };
    persistClients([client, ...clients]);
    event.currentTarget.reset();
    clientDialog.current?.close();
  }

  const navigation: Array<{ id: View; label: string }> = [
    { id: "dashboard", label: "Dashboard" },
    { id: "clients", label: "Clients" },
    { id: "builder", label: "Builder" },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" onClick={() => setView("dashboard")}><span>RS</span> Report Studio</a>
        <nav className="workspace-nav" aria-label="Workspace">
          {navigation.map((item) => (
            <button key={item.id} type="button" className={view === item.id ? "is-active" : ""} aria-current={view === item.id ? "page" : undefined} onClick={() => setView(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="topbar-user">
          <span className="avatar" aria-hidden="true">{user.slice(0, 2).toUpperCase()}</span>
          <span><strong>{user}</strong><small>Data stays in this browser</small></span>
          <button className="text-button" type="button" onClick={onSignOut}>Sign out</button>
        </div>
      </header>

      <main className="workspace" id="top">
        <header className="workspace-header">
          <div>
            <p>{view === "builder" ? "Report playground" : "Ridgeline workspace"}</p>
            <h1>{view === "dashboard" ? "Revenue dashboard" : view === "clients" ? "Client pipeline" : "Build a chart"}</h1>
          </div>
          {view === "dashboard" && <button className="button button--primary" type="button" onClick={() => setView("builder")}>New report</button>}
          {view === "clients" && <button className="button button--primary" type="button" onClick={openClientDialog}>Add client</button>}
        </header>

        {view === "dashboard" && (
          <section aria-label="Dashboard overview">
            <div className="metric-strip">
              <article><span>Open pipeline</span><strong>{formatter.format(pipelineValue)}</strong><small>{openDeals} active opportunities</small></article>
              <article><span>Won value</span><strong>{formatter.format(wonValue)}</strong><small>Seeded demo data</small></article>
              <article><span>Clients</span><strong>{clients.length}</strong><small>Across four stages</small></article>
            </div>

            <div className="widget-grid">
              {widgets.map((widget) => (
                <article className="report-widget" key={widget.id}>
                  <header><div><small>{allDatasets[widget.dataset]?.label ?? "Unavailable data"}{widget.filter ? " · Filtered" : ""}</small><h2>{widget.title}</h2></div><button className="text-button" type="button" onClick={() => removeWidget(widget)}>Remove</button></header>
                  <Chart label={widget.title} option={buildChartOption(widget, allDatasets)} palette={widget.palette} />
                </article>
              ))}
              {widgets.length === 0 && (
                <div className="empty-state"><h2>No reports yet.</h2><p>Create a chart to start this dashboard.</p><button className="button" type="button" onClick={() => setView("builder")}>Build a chart</button></div>
              )}
            </div>
          </section>
        )}

        {view === "clients" && (
          <section className="client-section" aria-label="Clients">
            <div className="table-tools">
              <label><span>Search clients</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, company or email" /></label>
              <label><span>Pipeline stage</span><select value={stage} onChange={(event) => setStage(event.target.value as ClientStage | "All")}><option>All</option><option>Lead</option><option>Qualified</option><option>Proposal</option><option>Won</option></select></label>
            </div>
            <p className="result-count" aria-live="polite">{filteredClients.length} clients shown</p>
            <div className="client-table-wrap">
              <table className="client-table">
                <thead><tr><th>Contact</th><th>Stage</th><th>Value</th><th>Owner</th><th>Activity</th></tr></thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id}>
                      <td data-label="Contact"><strong>{client.contact}</strong><small>{client.company} · {client.email}</small></td>
                      <td data-label="Stage"><span className={`stage stage--${client.stage.toLowerCase()}`}>{client.stage}</span></td>
                      <td data-label="Value" className="tnum">{formatter.format(client.value)}</td>
                      <td data-label="Owner">{client.owner}</td>
                      <td data-label="Activity">{client.lastActivity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredClients.length === 0 && <div className="empty-state"><h2>No matching clients.</h2><p>Change the search or pipeline filter.</p><button className="button" type="button" onClick={() => { setQuery(""); setStage("All"); }}>Clear filters</button></div>}
            </div>
          </section>
        )}

        {view === "builder" && (
          <form className="chart-builder" aria-label="Chart builder" onSubmit={saveReport}>
            <header className="builder-toolbar">
              <div className="builder-toolbar__title"><small>Chart builder</small><strong>{activeDataset.label}</strong></div>
              <label className="toolbar-upload"><span>Upload CSV</span><input type="file" accept=".csv,text/csv" onChange={(event) => { loadCsv(event.target.files?.[0]); event.target.value = ""; }} /></label>
              <button className="button" type="button" onClick={() => setView("dashboard")}>Cancel</button>
              <button className="button button--primary" type="submit">Add to dashboard</button>
            </header>

            {csvMessage && <p className="builder-message" role="status">{csvMessage}</p>}
            {csvError && <p className="builder-error" role="alert">{csvError}</p>}

            <div className="builder-workbench">
              <aside className="data-panel" aria-label="Data fields">
                <header><small>Data</small><h2>Fields</h2></header>
                <label><span>Dataset</span><select value={draft.dataset} onChange={(event) => changeDataset(event.target.value)}>{Object.entries(allDatasets).map(([key, dataset]) => <option key={key} value={key}>{dataset.label}</option>)}</select></label>
                <section className="field-group" aria-labelledby="category-fields"><h3 id="category-fields">Categories</h3>{activeDataset.dimensions.map((field) => <button className="field-button field-button--category" key={field.key} type="button" draggable onDragStart={(event) => { draggedField.current = { kind: "dimension", key: field.key }; event.dataTransfer.effectAllowed = "copy"; }} onDragEnd={() => { draggedField.current = null; }} onClick={() => assignField("dimension", field.key)}><span aria-hidden="true">Aa</span>{field.label}</button>)}</section>
                <section className="field-group" aria-labelledby="value-fields"><h3 id="value-fields">Values</h3>{activeDataset.metrics.map((field) => <button className="field-button field-button--value" key={field.key} type="button" draggable onDragStart={(event) => { draggedField.current = { kind: "metric", key: field.key }; event.dataTransfer.effectAllowed = "copy"; }} onDragEnd={() => { draggedField.current = null; }} onClick={() => assignField("metric", field.key)}><span aria-hidden="true">#</span>{field.label}</button>)}</section>
                <small>Drag a field to a shelf, or select it.</small>
              </aside>

              <section className="builder-stage" aria-label="Chart canvas">
                <div className="column-shelf">
                  <label className="field-shelf field-shelf--category" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropField(event, "dimension")}><span>Category</span><select aria-label="Category field" value={draft.dimension} onChange={(event) => assignField("dimension", event.target.value)}>{activeDataset.dimensions.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</select><small>{draft.sortBy === "dimension" ? (draft.sortDirection === "descending" ? "↓ " : "↑ ") : ""}{activeDimension?.label ?? "Drop a category"}</small></label>
                  <label className="field-shelf field-shelf--value" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropField(event, "metric")}><span>Value</span><select aria-label="Value field" value={draft.metric} onChange={(event) => assignField("metric", event.target.value)}>{activeDataset.metrics.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</select><small>{draft.sortBy === "metric" ? (draft.sortDirection === "descending" ? "↓ " : "↑ ") : ""}{draft.aggregation ?? "sum"} · {activeMetric?.label ?? "Drop a value"}</small></label>
                </div>
                <article className="builder-preview"><header><div><small>Live preview</small><h2>{draft.title || "Untitled report"}</h2></div></header><Chart label={`Preview of ${draft.title}`} option={buildChartOption(previewWidget, allDatasets)} className="chart--large" palette={draft.palette} /></article>
              </section>

              <aside className="config-panel" aria-label="Chart configuration">
                <header><small>Configure</small><h2>Chart</h2></header>
                <label><span>Report title</span><input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
                <label><span>Aggregation</span><select value={draft.aggregation ?? "sum"} onChange={(event) => setDraft({ ...draft, aggregation: event.target.value as Aggregation })}><option value="sum">Sum</option><option value="average">Average</option><option value="count">Count</option><option value="minimum">Minimum</option><option value="maximum">Maximum</option></select></label>
                <div className="field-pair"><label><span>Sort by</span><select value={draft.sortBy ?? "dimension"} onChange={(event) => setDraft({ ...draft, sortBy: event.target.value as SortBy })}><option value="dimension">Category</option><option value="metric">Value</option></select></label><label><span>Direction</span><select value={draft.sortDirection ?? "ascending"} onChange={(event) => setDraft({ ...draft, sortDirection: event.target.value as SortDirection })}><option value="ascending">Ascending</option><option value="descending">Descending</option></select></label></div>
                <fieldset><legend>Filter</legend><label><span>Field</span><select value={draft.filter?.field ?? ""} onChange={(event) => setDraft({ ...draft, filter: event.target.value ? { field: event.target.value, operator: "equals", value: "" } : undefined })}><option value="">No filter</option>{filterFields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</select></label>{draft.filter && <div className="field-pair"><label><span>Operator</span><select value={draft.filter.operator} onChange={(event) => setDraft({ ...draft, filter: { ...draft.filter!, operator: event.target.value as FilterOperator } })}><option value="equals">Equals</option><option value="notEquals">Does not equal</option>{filterIsNumeric ? <><option value="greaterThan">Greater than</option><option value="lessThan">Less than</option></> : <option value="contains">Contains</option>}</select></label><label><span>Value</span><input required type={filterIsNumeric ? "number" : "text"} value={draft.filter.value} onChange={(event) => setDraft({ ...draft, filter: { ...draft.filter!, value: event.target.value } })} placeholder={filterIsNumeric ? "0" : "Enter a value"} /></label></div>}</fieldset>
                <fieldset><legend>Style</legend><div className="field-pair"><label><span>Palette</span><select value={draft.palette ?? "coral"} onChange={(event) => setDraft({ ...draft, palette: event.target.value as ChartPalette })}><option value="coral">Coral</option><option value="ocean">Ocean</option><option value="forest">Forest</option></select></label><label><span>Color type</span><select disabled={usesCategoryColors} value={usesCategoryColors ? "category" : draft.colorMode ?? "single"} onChange={(event) => setDraft({ ...draft, colorMode: event.target.value as ColorMode })}><option value="single">Single color</option><option value="category">By category</option></select></label></div></fieldset>
                <fieldset><legend>Chart type</legend><div className="type-picker type-picker--stacked">{(["bar", "line", "area", "pie", "scatter", "radar", "funnel"] as ChartType[]).map((type) => <label key={type}><input type="radio" name="chart-type" value={type} checked={draft.type === type} onChange={() => setDraft({ ...draft, type })} /><span>{type[0].toUpperCase() + type.slice(1)}</span></label>)}</div></fieldset>
              </aside>
            </div>
          </form>
        )}

        <footer className="status-footer"><span>Report Studio · local CSV workspace</span><span>React · Papa Parse · ECharts</span></footer>
      </main>

      <dialog ref={clientDialog} className="client-dialog" onClick={(event) => { if (event.target === event.currentTarget) clientDialog.current?.close(); }}>
        <form onSubmit={addClient}>
          <header><div><small>CRM record</small><h2>Add a client</h2></div><button className="icon-button" type="button" onClick={() => clientDialog.current?.close()} aria-label="Close dialog">×</button></header>
          <label><span>Contact name</span><input ref={clientNameInput} name="contact" required autoComplete="name" /></label>
          <label><span>Company</span><input name="company" required autoComplete="organization" /></label>
          <label><span>Email address</span><input name="email" type="email" required autoComplete="email" placeholder="name@company.com" /></label>
          <div className="field-pair"><label><span>Pipeline stage</span><select name="stage" defaultValue="Lead"><option>Lead</option><option>Qualified</option><option>Proposal</option><option>Won</option></select></label><label><span>Deal value</span><input name="value" type="number" min="0" step="100" required /></label></div>
          <div className="form-actions"><button className="button" type="button" onClick={() => clientDialog.current?.close()}>Cancel</button><button className="button button--primary" type="submit">Add client</button></div>
        </form>
      </dialog>

      {undoWidget && <div className="undo-bar" role="status"><span>Report removed.</span><button type="button" onClick={restoreWidget}>Undo</button><button type="button" aria-label="Dismiss" onClick={() => setUndoWidget(null)}>×</button></div>}
    </div>
  );
}
