import { useEffect, useState } from "react";
import { Practice } from "./Practice";
import { Admin } from "./Admin";

export function App() {
  const isAdminRoute = () => new URLSearchParams(location.search).get("admin") === "1";
  const [route, setRoute] = useState(isAdminRoute() ? "admin" : "practice");

  useEffect(() => {
    const onRoute = () => setRoute(isAdminRoute() ? "admin" : "practice");
    addEventListener("popstate", onRoute);
    return () => removeEventListener("popstate", onRoute);
  }, []);

  return route === "admin" ? <Admin /> : <Practice />;
}
