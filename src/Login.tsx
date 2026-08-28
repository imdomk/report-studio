import { useState, type FormEvent, type ReactNode } from "react";

// ponytail: demo gate only — credentials live in the bundle, no server checks them.
// Replace with a real auth provider before this touches real data.
const USERS: Record<string, string> = {
  demo: "demo",
  admin: "report2026",
};

const KEY = "report-studio.session";

export function useSession() {
  const [user, setUser] = useState<string | null>(() => localStorage.getItem(KEY));
  return {
    user,
    signOut() {
      localStorage.removeItem(KEY);
      setUser(null);
    },
    signIn(name: string) {
      localStorage.setItem(KEY, name);
      setUser(name);
    },
  };
}

export function Login({ onSignIn }: { onSignIn: (user: string) => void }): ReactNode {
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const user = String(form.get("user") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    if (USERS[user] === password) onSignIn(user);
    else setError("Incorrect username or password.");
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit}>
        <a className="brand" href="#top"><span>RS</span> Report Studio</a>
        <p>Sign in to the demo workspace.</p>
        <label><span>Username</span><input name="user" required autoComplete="username" autoFocus defaultValue="demo" /></label>
        <label><span>Password</span><input name="password" type="password" required autoComplete="current-password" /></label>
        {error && <p className="csv-error" role="alert">{error}</p>}
        <button className="button button--primary" type="submit">Sign in</button>
        <small>Demo credentials: <code>demo</code> / <code>demo</code></small>
      </form>
    </main>
  );
}
