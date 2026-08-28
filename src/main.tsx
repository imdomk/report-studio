import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Login, useSession } from "./Login";
import "./styles.css";

function Root() {
  const session = useSession();
  return session.user
    ? <App user={session.user} onSignOut={session.signOut} />
    : <Login onSignIn={session.signIn} />;
}

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
