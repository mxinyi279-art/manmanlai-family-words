import { useEffect, useState } from "react";
import { Practice } from "./Practice";
import { Admin } from "./Admin";
import { LoginDialog, useAuth } from "./Auth";

export function App() {
  const auth = useAuth();
  const isAdminRoute = () => new URLSearchParams(location.search).get("admin") === "1";
  const [route, setRoute] = useState(isAdminRoute() ? "admin" : "practice");

  useEffect(() => {
    const onRoute = () => setRoute(isAdminRoute() ? "admin" : "practice");
    addEventListener("popstate", onRoute);
    return () => removeEventListener("popstate", onRoute);
  }, []);

  return <>{route === "admin" ? <Admin auth={auth} /> : <Practice auth={auth} />}<LoginDialog auth={auth} /></>;
}
