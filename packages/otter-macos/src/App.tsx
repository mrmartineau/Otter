import { useEffect, useRef, useState } from "react";
import { Button, Input } from "@mrmartineau/zui/react";
import { invoke } from "@tauri-apps/api/core";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  House,
  Plus,
  X,
} from "@phosphor-icons/react";
import "./App.css";

const HOME_URL = "https://otter.zander.wtf";
const HOME_HOST = "otter.zander.wtf";

type TabInfo = { url: string; title: string };
type TabMeta = { label: string; url: string; title: string };
type BrowserState = { tabs: TabMeta[]; active: string | null };

/** Turn raw address-bar text into a navigable URL (or a web search). */
function normalizeUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return HOME_URL;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[^\s]+\.[^\s]+$/.test(value)) return `https://${value}`;
  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}

/** Short label for a tab — its title, else the hostname. */
function tabLabel(info: TabInfo | undefined): string {
  if (info?.title) return info.title;
  try {
    const host = new URL(info?.url ?? HOME_URL).hostname.replace(/^www\./, "");
    return host === HOME_HOST ? "Otter" : host;
  } catch {
    return "New tab";
  }
}

function App() {
  const [order, setOrder] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [info, setInfo] = useState<Record<string, TabInfo>>({});
  const [address, setAddress] = useState(HOME_URL);
  const addrFocused = useRef(false);

  // Wire up Rust → chrome events and pull the initial tab list.
  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];
    let cancelled = false;

    // Scoped to this webview: each window's chrome only hears its own events.
    const webview = getCurrentWebview();

    const applyState = (state: BrowserState) => {
      setOrder(state.tabs.map((t) => t.label));
      setActive(state.active);
      setInfo(
        Object.fromEntries(
          state.tabs.map((t) => [t.label, { url: t.url, title: t.title }]),
        ),
      );
    };

    (async () => {
      unlisteners.push(
        await webview.listen<BrowserState>("browser-state", (e) => {
          applyState(e.payload);
        }),
      );
      unlisteners.push(
        await webview.listen<{ label: string; url: string }>("tab-url", (e) => {
          setInfo((prev) => ({
            ...prev,
            [e.payload.label]: {
              url: e.payload.url,
              title: prev[e.payload.label]?.title ?? "",
            },
          }));
        }),
      );
      unlisteners.push(
        await webview.listen<{ label: string; title: string }>("tab-title", (e) => {
          setInfo((prev) => ({
            ...prev,
            [e.payload.label]: {
              url: prev[e.payload.label]?.url ?? HOME_URL,
              title: e.payload.title,
            },
          }));
        }),
      );
      unlisteners.push(
        await webview.listen<{ url: string }>("open-tab", (e) => {
          invoke("create_tab", { url: e.payload.url });
        }),
      );

      const state = await invoke<BrowserState>("list_tabs");
      if (cancelled) return;
      applyState(state);
    })();

    return () => {
      cancelled = true;
      for (const un of unlisteners) un();
    };
  }, []);

  // Keep the address bar synced to the active tab (unless the user is typing).
  const activeUrl = active ? (info[active]?.url ?? "") : "";
  useEffect(() => {
    if (!addrFocused.current) setAddress(activeUrl);
  }, [activeUrl]);

  const navigate = () => {
    if (active) invoke("navigate_tab", { label: active, url: normalizeUrl(address) });
    addrFocused.current = false;
  };
  const back = () => active && invoke("tab_back", { label: active });
  const forward = () => active && invoke("tab_forward", { label: active });
  const reload = () => active && invoke("tab_reload", { label: active });
  const goHome = () =>
    active && invoke("navigate_tab", { label: active, url: HOME_URL });
  const newTab = () => invoke("create_tab", {});
  const showChromeMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    invoke("show_chrome_menu");
  };
  const closeTab = (label: string) => invoke("close_tab", { label });
  const activateTab = (label: string) => invoke("activate_tab", { label });

  return (
    <div className="chrome" onContextMenu={showChromeMenu}>
      <div className="tabstrip">
        {order.map((label) => (
          <div
            key={label}
            className={`tab${label === active ? " tab-active" : ""}`}
            onClick={() => activateTab(label)}
          >
            <span className="tab-label">{tabLabel(info[label])}</span>
            <button
              type="button"
              className="tab-close"
              aria-label="Close tab"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(label);
              }}
            >
              <X weight="bold" size={12} />
            </button>
          </div>
        ))}
        <Button icon variant="ghost" size="sm" aria-label="New tab" onClick={newTab}>
          <Plus />
        </Button>
      </div>

      <div className="toolbar">
        <Button icon variant="ghost" size="sm" aria-label="Back" onClick={back}>
          <CaretLeft />
        </Button>
        <Button icon variant="ghost" size="sm" aria-label="Forward" onClick={forward}>
          <CaretRight />
        </Button>
        <Button icon variant="ghost" size="sm" aria-label="Reload" onClick={reload}>
          <ArrowClockwise />
        </Button>
        <Button icon variant="ghost" size="sm" aria-label="Otter home" onClick={goHome}>
          <House />
        </Button>
        <form
          className="addr-form"
          onSubmit={(e) => {
            e.preventDefault();
            navigate();
          }}
        >
          <Input
            className="addr-input"
            value={address}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Address"
            onFocus={() => {
              addrFocused.current = true;
            }}
            onBlur={() => {
              addrFocused.current = false;
              setAddress(activeUrl);
            }}
            onChange={(e) => setAddress(e.currentTarget.value)}
          />
        </form>
      </div>
    </div>
  );
}

export default App;
