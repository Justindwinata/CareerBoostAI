import { useEffect, useMemo, useRef } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { SystemStatus } from "../components/SystemStatus";

const navigationItems = [
  { label: "Home", path: "/" },
  { label: "Upload CV", path: "/upload" },
  { label: "History", path: "/history" },
];

function getRouteTitle(pathname: string): string {
  if (pathname === "/") {
    return "Home";
  }

  if (pathname === "/upload") {
    return "Upload CV";
  }

  if (pathname === "/history") {
    return "Analysis History";
  }

  if (pathname.startsWith("/results/")) {
    return "Analysis Result";
  }

  return "Page Not Found";
}

export function AppLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const pageTitle = useMemo(() => getRouteTitle(location.pathname), [location.pathname]);

  useEffect(() => {
    document.title = `${pageTitle} | CareerBoost AI`;
    mainRef.current?.focus();
  }, [pageTitle]);

  return (
    <div className="application-shell">
      <header className="application-header">
        <div className="brand-block">
          <Link className="brand-link" to="/" aria-label="CareerBoost AI home">
            <span className="brand-mark" aria-hidden="true">
              CB
            </span>
            <span>
              <strong>CareerBoost AI</strong>
              <small>Deterministic resume metadata</small>
            </span>
          </Link>
        </div>

        <nav className="primary-navigation" aria-label="Primary navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                isActive ? "primary-navigation__link is-active" : "primary-navigation__link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="application-status">
          <SystemStatus />
        </div>
      </header>

      <main ref={mainRef} className="application-main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
