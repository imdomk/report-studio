import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import App, { LoginScreen } from "./App";
import "./styles.css";

const domain = import.meta.env.VITE_AUTH0_DOMAIN?.trim();
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID?.trim();
const audience = import.meta.env.VITE_AUTH0_AUDIENCE?.trim();

function AuthenticatedApp() {
  const { isLoading, isAuthenticated, loginWithRedirect, logout, user, error } = useAuth0();

  if (isLoading) return <LoginScreen loading onLogin={() => undefined} />;
  if (!isAuthenticated) return <LoginScreen error={error?.message} onLogin={() => void loginWithRedirect()} />;

  return <App mode="auth0" user={user} onLogout={() => logout({ logoutParams: { returnTo: window.location.origin } })} />;
}

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    {domain && clientId ? (
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{ redirect_uri: window.location.origin, ...(audience ? { audience } : {}) }}
        useRefreshTokens
      >
        <AuthenticatedApp />
      </Auth0Provider>
    ) : <App mode="demo" />}
  </StrictMode>,
);
