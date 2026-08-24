import { useMemo, useRef, useState, type FormEvent } from "react";
import { Chart } from "./Chart";
import {
  datasets,
  defaultWidgets,
  seedClients,
  type ChartType,
  type Client,
  type ClientStage,
  type DatasetKey,
  type ReportWidget,
} from "./data";
import { buildChartOption } from "./reporting";

type View = "dashboard" | "clients" | "builder";

interface AppUser {
  name?: string;
  email?: string;
  picture?: string;
}

interface AppProps {
  mode: "auth0" | "demo";
  user?: AppUser;
  onLogout?: () => void;
}

interface LoginScreenProps {
  onLogin: () => void;
  loading?: boolean;
  error?: string;
}

const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function initials(name = "Demo Analyst") {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function LoginScreen({ onLogin, loading = false, error }: LoginScreenProps) {
  return (
    <main className="login-shell">
      <section className="login-copy">
        <a className="brand brand--login" href="/" aria-label="Report Studio home"><span>RS</span> Report Studio</a>
        <div>
          <h1>Turn account data into charts.</h1>
          <p>Build dashboards, track commercial activity and give every analyst a shared view of the pipeline.</p>
        </div>
        <button className="button button--primary" type="button" onClick={onLogin} disabled={loading} aria-busy={loading}>
          {loading ? "Connecting…" : "Sign in with Auth0"}
        </button>
        {error && <p className="form-error" role="alert">Sign-in failed. {error} Try again.</p>}
      </section>

      <section className="login-proof" aria-label="Dashboard preview">
        <div className="mini-stat"><span>Pipeline</span><strong>$97k</strong><small>Demo workspace</small></div>
        <div className="mini-bars" aria-hidden="true">
          {[38, 52, 46, 68, 74, 88].map((height, index) => <i key={index} style={{ "--bar": `${height}%` } as React.CSSProperties} />)}
        </div>
        <div className="mini-list">
          <span>Referral <strong>42 leads</strong></span>
          <span>Organic <strong>35 leads</strong></span>
          <span>Outbound <strong>29 leads</strong></span>
        </div>
      </section>
    </main>
  );
}

export default function App({ mode, user, onLogout }: AppProps) {
  const [view, setView] = useState<View>("dashboard");
  const [clients, setClients] = useState<Client[]>(() => readStored("report-studio.clients", seedClients));
  const [widgets, setWidgets] = useState<ReportWidget[]>(() => readStored("report-studio.widgets", defaultWidgets));
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<ClientStage | "All">("All");
  const [undoWidget, setUndoWidget] = useState<ReportWidget | null>(null);
  const clientDialog = useRef<HTMLDialogElement>(null);
  const clientNameInput = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Omit<ReportWidget, "id">>({
    title: "Commercial activity by week",
    dataset: "activity",
    type: "line",
    dimension: "week",
    metric: "meetings",
  });

  const activeDataset = datasets[draft.dataset];
  const previewWidget: ReportWidget = { ...draft, id: "preview" };
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

  function changeDataset(dataset: DatasetKey) {
    const definition = datasets[dataset];
    setDraft((current) => ({
      ...current,
      dataset,
      dimension: definition.dimensions[0].key,
      metric: definition.metrics[0].key,
    }));
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
      owner: user?.name?.split(" ")[0] || "Demo",
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
      <aside className="sidebar">
        <a className="brand" href="#top" onClick={() => setView("dashboard")}><span>RS</span> Report Studio</a>
        <nav className="workspace-nav" aria-label="Workspace">
          {navigation.map((item) => (
            <button key={item.id} type="button" className={view === item.id ? "is-active" : ""} aria-current={view === item.id ? "page" : undefined} onClick={() => setView(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="avatar" aria-hidden="true">{initials(user?.name)}</span>
          <span><strong>{user?.name || "Demo Analyst"}</strong><small>{mode === "auth0" ? user?.email : "Local demo mode"}</small></span>
          {mode === "auth0" && <button className="text-button" type="button" onClick={onLogout}>Sign out</button>}
        </div>
      </aside>

      <main className="workspace" id="top">
        {mode === "demo" && (
          <div className="demo-banner" role="status">
            <span><strong>Demo workspace.</strong> Add Auth0 variables to enable secure sign-in.</span>
            <a href="https://github.com/imdomk/report-studio#auth0-setup" target="_blank" rel="noopener noreferrer">Setup guide ↗</a>
          </div>
        )}

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
                  <header><div><small>{datasets[widget.dataset].label}</small><h2>{widget.title}</h2></div><button className="text-button" type="button" onClick={() => removeWidget(widget)}>Remove</button></header>
                  <Chart label={widget.title} option={buildChartOption(widget)} />
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
          <section className="builder-layout" aria-label="Chart builder">
            <form className="builder-form" onSubmit={saveReport}>
              <p>Choose a dataset, dimension and measure. The preview updates before you save.</p>
              <label><span>Report title</span><input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
              <label><span>Dataset</span><select value={draft.dataset} onChange={(event) => changeDataset(event.target.value as DatasetKey)}>{Object.entries(datasets).map(([key, dataset]) => <option key={key} value={key}>{dataset.label}</option>)}</select></label>
              <div className="field-pair">
                <label><span>Dimension</span><select value={draft.dimension} onChange={(event) => setDraft({ ...draft, dimension: event.target.value })}>{activeDataset.dimensions.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</select></label>
                <label><span>Measure</span><select value={draft.metric} onChange={(event) => setDraft({ ...draft, metric: event.target.value })}>{activeDataset.metrics.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</select></label>
              </div>
              <fieldset><legend>Chart type</legend><div className="type-picker">{(["bar", "line", "pie"] as ChartType[]).map((type) => <label key={type}><input type="radio" name="chart-type" value={type} checked={draft.type === type} onChange={() => setDraft({ ...draft, type })} /><span>{type[0].toUpperCase() + type.slice(1)}</span></label>)}</div></fieldset>
              <div className="form-actions"><button className="button" type="button" onClick={() => setView("dashboard")}>Cancel</button><button className="button button--primary" type="submit">Add to dashboard</button></div>
            </form>
            <article className="builder-preview"><header><small>Live preview</small><h2>{draft.title || "Untitled report"}</h2></header><Chart label={`Preview of ${draft.title}`} option={buildChartOption(previewWidget)} className="chart--large" /></article>
          </section>
        )}

        <footer className="status-footer"><span>Report Studio · local-first demo</span><span>React · Auth0 · ECharts</span></footer>
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
