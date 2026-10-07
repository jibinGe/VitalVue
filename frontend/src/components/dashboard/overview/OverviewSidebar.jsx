import { useEffect } from "react";
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Gauge,
  Pill,
  Radio,
  Stethoscope,
  UserRound,
} from "lucide-react";

const ICONS = {
  vitals: Activity,
  news2: Gauge,
  baseline: ClipboardList,
  alerts: Bell,
  info: UserRound,
  watch: Radio,
  profile: UserRound,
  medical: Stethoscope,
  reports: FileText,
  prescriptions: Pill,
};

export const OVERVIEW_NAV_EXPANDED = 248;
export const OVERVIEW_NAV_COLLAPSED = 76;

function syncHeaderHeight() {
  const header = document.querySelector("[data-dashboard-header]");
  const height = header?.offsetHeight || 88;
  document.documentElement.style.setProperty("--dashboard-header-h", `${height}px`);
}

export default function OverviewSidebar({ items, active, onChange, collapsed, onToggle }) {
  useEffect(() => {
    syncHeaderHeight();
    const header = document.querySelector("[data-dashboard-header]");
    if (!header || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(syncHeaderHeight);
    observer.observe(header);
    window.addEventListener("resize", syncHeaderHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeaderHeight);
    };
  }, []);

  const width = collapsed ? OVERVIEW_NAV_COLLAPSED : OVERVIEW_NAV_EXPANDED;

  return (
    <aside
      aria-label="Patient sections"
      className="flex h-full shrink-0 flex-col border-r border-white/8 bg-[#1A1A1C] transition-[width] duration-200 ease-out"
      style={{ width }}
    >
      <div className={`flex items-center shrink-0 h-12 border-b border-white/8 ${collapsed ? "justify-center px-2" : "px-3"}`}>
        {!collapsed && (
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
            Overview
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex size-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/8 hover:text-white ${collapsed ? "" : "ml-auto"}`}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = ICONS[item.key] || Activity;
            const on = active === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChange(item.key)}
                aria-current={on ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={`group relative flex items-center rounded-xl py-2.5 text-left text-sm transition-colors ${
                  collapsed ? "justify-center px-0" : "gap-3 px-3"
                } ${
                  on
                    ? "bg-white/[0.08] text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                {on && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-[#CCA166]" />
                )}
                <Icon className={`size-[18px] shrink-0 ${on ? "text-[#E5C48B]" : ""}`} strokeWidth={1.75} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
