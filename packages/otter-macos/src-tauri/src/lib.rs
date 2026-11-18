use std::collections::HashMap;
use std::sync::Mutex;

use serde::Serialize;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_opener::OpenerExt;
use tauri::webview::{NewWindowResponse, WebviewBuilder};
use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, State, Url, WebviewUrl, Window,
    WindowEvent,
};

const HOME_URL: &str = "https://otter.zander.wtf";
/// Height of the chrome (tabs + toolbar) strip pinned to the top of the window.
const CHROME_HEIGHT: f64 = 100.0;
/// Custom scheme used by the injected script to ask the host to show a link context menu.
const MENU_SCHEME: &str = "otter-menu";

/// Injected into every tab. Implements the common browser affordances on links:
/// Cmd/Shift/Ctrl+click and middle-click open a new tab (routed through
/// `window.open`, which the host intercepts), and right-click asks the host to
/// show a native "Open Link in New Tab / New Window" context menu via a
/// cancelled navigation to the `otter-menu:` scheme.
const TAB_INIT_JS: &str = r#"
(function () {
  if (window.__OTTER_INIT__) return;
  window.__OTTER_INIT__ = true;

  function linkFrom(event) {
    var node = event.composedPath ? event.composedPath()[0] : event.target;
    while (node && node !== document) {
      if (node.tagName === 'A' && node.href && /^https?:/i.test(node.href)) return node.href;
      node = node.parentNode || node.host;
    }
    return null;
  }

  function openInTab(href) {
    window.open(href, '_blank');
  }

  document.addEventListener('click', function (e) {
    if (!e.metaKey && !e.shiftKey && !e.ctrlKey) return;
    var href = linkFrom(e);
    if (!href) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openInTab(href);
  }, true);

  document.addEventListener('auxclick', function (e) {
    if (e.button !== 1) return;
    var href = linkFrom(e);
    if (!href) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openInTab(href);
  }, true);

  document.addEventListener('contextmenu', function (e) {
    var href = linkFrom(e);
    if (!href) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    window.location.href = 'otter-menu://link?url=' + encodeURIComponent(href);
  }, true);
})();
"#;

#[derive(Clone, Serialize)]
struct TabMeta {
    label: String,
    url: String,
    title: String,
}

#[derive(Default, Clone)]
struct WinTabs {
    tabs: Vec<TabMeta>,
    active: Option<String>,
}

/// What the currently shown native context menu should act on.
struct MenuTarget {
    window: String,
    link: Option<String>,
}

/// Source-of-truth for open windows and their tabs. Each tab is a top-level
/// content webview (first-party to otter.zander.wtf, so auth cookies work and
/// persist); each window also carries a chrome webview (`chrome-<window>`).
#[derive(Default)]
struct Browser {
    tab_counter: Mutex<u32>,
    win_counter: Mutex<u32>,
    windows: Mutex<HashMap<String, WinTabs>>,
    pending_menu: Mutex<Option<MenuTarget>>,
}

#[derive(Clone, Serialize)]
struct BrowserState {
    tabs: Vec<TabMeta>,
    active: Option<String>,
}

#[derive(Clone, Serialize)]
struct TabUrl {
    label: String,
    url: String,
}

#[derive(Clone, Serialize)]
struct TabTitle {
    label: String,
    title: String,
}

#[derive(Clone, Serialize)]
struct OpenTab {
    url: String,
}

fn chrome_label(win_label: &str) -> String {
    format!("chrome-{win_label}")
}

fn is_chrome(webview_label: &str) -> bool {
    webview_label.starts_with("chrome-")
}

/// Logical position + size for a content webview, filling the window below the chrome strip.
fn content_bounds(window: &Window) -> (LogicalPosition<f64>, LogicalSize<f64>) {
    let scale = window.scale_factor().unwrap_or(1.0);
    let (w, h) = match window.inner_size() {
        Ok(size) => {
            let logical = size.to_logical::<f64>(scale);
            (logical.width, logical.height)
        }
        Err(_) => (1000.0, 720.0),
    };
    (
        LogicalPosition::new(0.0, CHROME_HEIGHT),
        LogicalSize::new(w, (h - CHROME_HEIGHT).max(0.0)),
    )
}

/// Reposition the chrome strip and every content webview after a window resize.
fn relayout(window: &Window) {
    let scale = window.scale_factor().unwrap_or(1.0);
    let Ok(size) = window.inner_size() else {
        return;
    };
    let logical = size.to_logical::<f64>(scale);
    let content_h = (logical.height - CHROME_HEIGHT).max(0.0);

    for webview in window.webviews() {
        if is_chrome(webview.label()) {
            let _ = webview.set_position(LogicalPosition::new(0.0, 0.0));
            let _ = webview.set_size(LogicalSize::new(logical.width, CHROME_HEIGHT));
        } else {
            let _ = webview.set_position(LogicalPosition::new(0.0, CHROME_HEIGHT));
            let _ = webview.set_size(LogicalSize::new(logical.width, content_h));
        }
    }
}

/// Show one content webview in the window, hide the rest, and record it as active.
fn set_active(app: &AppHandle, win_label: &str, tab_label: &str) {
    if let Some(window) = app.get_window(win_label) {
        for webview in window.webviews() {
            if is_chrome(webview.label()) {
                continue;
            }
            if webview.label() == tab_label {
                let _ = webview.show();
                let _ = webview.set_focus();
            } else {
                let _ = webview.hide();
            }
        }
    }
    if let Some(win) = app
        .state::<Browser>()
        .windows
        .lock()
        .unwrap()
        .get_mut(win_label)
    {
        win.active = Some(tab_label.to_string());
    }
}

fn emit_state(app: &AppHandle, win_label: &str) {
    let win = app
        .state::<Browser>()
        .windows
        .lock()
        .unwrap()
        .get(win_label)
        .cloned()
        .unwrap_or_default();
    let _ = app.emit_to(
        chrome_label(win_label),
        "browser-state",
        BrowserState {
            tabs: win.tabs,
            active: win.active,
        },
    );
}

/// Pop a native context menu at the cursor. `link` is Some for a right-clicked
/// link (Open Link in New Tab / New Window), None for the chrome strip
/// (New Tab / New Window). The chosen action fires in `on_menu_event`.
fn show_context_menu(app: &AppHandle, win_label: &str, link: Option<String>) {
    let app = app.clone();
    let win_label = win_label.to_string();
    // Defer to the main loop: this may be called from inside a webview
    // navigation callback, and popping a (blocking) native menu there would
    // stall the pending policy decision.
    let handle = app.clone();
    let _ = handle.run_on_main_thread(move || {
        let Some(window) = app.get_window(&win_label) else {
            return;
        };
        *app.state::<Browser>().pending_menu.lock().unwrap() = Some(MenuTarget {
            window: win_label.clone(),
            link: link.clone(),
        });
        let shown = (|| -> tauri::Result<()> {
            let menu = if link.is_some() {
                let tab_item =
                    MenuItemBuilder::with_id("ctx-open-tab", "Open Link in New Tab").build(&app)?;
                let win_item = MenuItemBuilder::with_id("ctx-open-window", "Open Link in New Window")
                    .build(&app)?;
                let ext_item =
                    MenuItemBuilder::with_id("ctx-open-external", "Open Link in Default Browser")
                        .build(&app)?;
                let copy_item = MenuItemBuilder::with_id("ctx-copy-link", "Copy Link").build(&app)?;
                MenuBuilder::new(&app)
                    .items(&[&tab_item, &win_item])
                    .separator()
                    .items(&[&ext_item, &copy_item])
                    .build()?
            } else {
                let tab_item = MenuItemBuilder::with_id("ctx-new-tab", "New Tab").build(&app)?;
                let win_item = MenuItemBuilder::with_id("ctx-new-window", "New Window").build(&app)?;
                MenuBuilder::new(&app).items(&[&tab_item, &win_item]).build()?
            };
            window.popup_menu(&menu)
        })();
        if shown.is_err() {
            *app.state::<Browser>().pending_menu.lock().unwrap() = None;
        }
    });
}

/// Spawn a new content webview in `win_label` loading `raw_url` as a top-level document.
fn open_tab(app: &AppHandle, win_label: &str, raw_url: &str, activate: bool) -> Result<String, String> {
    let window = app.get_window(win_label).ok_or("no window")?;
    let url = Url::parse(raw_url).map_err(|e| e.to_string())?;
    let state = app.state::<Browser>();
    let chrome = chrome_label(win_label);

    let label = {
        let mut counter = state.tab_counter.lock().unwrap();
        let label = format!("tab-{}", *counter);
        *counter += 1;
        label
    };

    let app_nav = app.clone();
    let win_nav = win_label.to_string();
    let chrome_nav = chrome.clone();
    let label_nav = label.clone();
    let app_title = app.clone();
    let win_title = win_label.to_string();
    let chrome_title = chrome.clone();
    let label_title = label.clone();
    let app_new = app.clone();
    let win_new = win_label.to_string();
    let chrome_new = chrome.clone();

    let builder = WebviewBuilder::new(&label, WebviewUrl::External(url))
        .initialization_script(TAB_INIT_JS)
        .on_navigation(move |url| {
            if url.scheme() == MENU_SCHEME {
                let link = url
                    .query_pairs()
                    .find(|(k, _)| k == "url")
                    .map(|(_, v)| v.to_string());
                show_context_menu(&app_nav, &win_nav, link);
                return false;
            }
            if let Some(win) = app_nav
                .state::<Browser>()
                .windows
                .lock()
                .unwrap()
                .get_mut(&win_nav)
            {
                if let Some(tab) = win.tabs.iter_mut().find(|t| t.label == label_nav) {
                    tab.url = url.to_string();
                }
            }
            let _ = app_nav.emit_to(
                &chrome_nav,
                "tab-url",
                TabUrl {
                    label: label_nav.clone(),
                    url: url.to_string(),
                },
            );
            true
        })
        .on_document_title_changed(move |_webview, title| {
            if let Some(win) = app_title
                .state::<Browser>()
                .windows
                .lock()
                .unwrap()
                .get_mut(&win_title)
            {
                if let Some(tab) = win.tabs.iter_mut().find(|t| t.label == label_title) {
                    tab.title = title.clone();
                }
            }
            let _ = app_title.emit_to(
                &chrome_title,
                "tab-title",
                TabTitle {
                    label: label_title.clone(),
                    title,
                },
            );
        })
        .on_new_window(move |url, _features| {
            if url.scheme() == MENU_SCHEME {
                // Fallback path for the injected context-menu script.
                let link = url
                    .query_pairs()
                    .find(|(k, _)| k == "url")
                    .map(|(_, v)| v.to_string());
                show_context_menu(&app_new, &win_new, link);
                return NewWindowResponse::Deny;
            }
            // Popups / target=_blank / modifier-clicks become tabs in our chrome
            // instead of OS windows.
            let _ = app_new.emit_to(&chrome_new, "open-tab", OpenTab { url: url.to_string() });
            NewWindowResponse::Deny
        });

    let (pos, size) = content_bounds(&window);
    let webview = window
        .add_child(builder, pos, size)
        .map_err(|e| e.to_string())?;

    state
        .windows
        .lock()
        .unwrap()
        .entry(win_label.to_string())
        .or_default()
        .tabs
        .push(TabMeta {
            label: label.clone(),
            url: raw_url.to_string(),
            title: String::new(),
        });

    if activate {
        set_active(app, win_label, &label);
    } else {
        let _ = webview.hide();
    }
    emit_state(app, win_label);
    Ok(label)
}

/// Build a full browser window: window + chrome strip + a first tab at `first_url`.
fn create_browser_window(app: &AppHandle, first_url: &str) -> Result<String, String> {
    let state = app.state::<Browser>();
    let label = {
        let mut counter = state.win_counter.lock().unwrap();
        let label = format!("win-{}", *counter);
        *counter += 1;
        label
    };

    let window = tauri::window::WindowBuilder::new(app, &label)
        .title("Otter")
        .inner_size(1000.0, 720.0)
        .build()
        .map_err(|e| e.to_string())?;

    state
        .windows
        .lock()
        .unwrap()
        .insert(label.clone(), WinTabs::default());

    let scale = window.scale_factor().unwrap_or(1.0);
    let logical = window
        .inner_size()
        .map_err(|e| e.to_string())?
        .to_logical::<f64>(scale);
    let chrome = WebviewBuilder::new(chrome_label(&label), WebviewUrl::App("index.html".into()));
    window
        .add_child(
            chrome,
            LogicalPosition::new(0.0, 0.0),
            LogicalSize::new(logical.width, CHROME_HEIGHT),
        )
        .map_err(|e| e.to_string())?;

    open_tab(app, &label, first_url, true)?;

    let app_ev = app.clone();
    let label_ev = label.clone();
    window.on_window_event(move |event| match event {
        WindowEvent::Resized(_) => {
            if let Some(window) = app_ev.get_window(&label_ev) {
                relayout(&window);
            }
        }
        WindowEvent::Destroyed => {
            app_ev
                .state::<Browser>()
                .windows
                .lock()
                .unwrap()
                .remove(&label_ev);
        }
        _ => {}
    });

    Ok(label)
}

fn eval_in(app: &AppHandle, label: &str, js: &str) -> Result<(), String> {
    app.get_webview(label)
        .ok_or("no webview")?
        .eval(js)
        .map_err(|e| e.to_string())
}

/// Window label that owns the tab webview `label`.
fn window_of(app: &AppHandle, label: &str) -> Result<String, String> {
    Ok(app
        .get_webview(label)
        .ok_or("no webview")?
        .window()
        .label()
        .to_string())
}

#[tauri::command]
fn list_tabs(webview: tauri::Webview, state: State<Browser>) -> BrowserState {
    let win = state
        .windows
        .lock()
        .unwrap()
        .get(webview.window().label())
        .cloned()
        .unwrap_or_default();
    BrowserState {
        tabs: win.tabs,
        active: win.active,
    }
}

#[tauri::command]
fn create_tab(app: AppHandle, webview: tauri::Webview, url: Option<String>) -> Result<String, String> {
    open_tab(
        &app,
        webview.window().label(),
        url.as_deref().unwrap_or(HOME_URL),
        true,
    )
}

#[tauri::command]
fn create_window(app: AppHandle, url: Option<String>) -> Result<String, String> {
    create_browser_window(&app, url.as_deref().unwrap_or(HOME_URL))
}

#[tauri::command]
fn show_chrome_menu(app: AppHandle, webview: tauri::Webview) {
    show_context_menu(&app, webview.window().label(), None);
}

#[tauri::command]
fn activate_tab(app: AppHandle, label: String) -> Result<(), String> {
    let win_label = window_of(&app, &label)?;
    set_active(&app, &win_label, &label);
    emit_state(&app, &win_label);
    Ok(())
}

#[tauri::command]
fn navigate_tab(app: AppHandle, label: String, url: String) -> Result<(), String> {
    let url = Url::parse(&url).map_err(|e| e.to_string())?;
    app.get_webview(&label)
        .ok_or("no webview")?
        .navigate(url)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn tab_back(app: AppHandle, label: String) -> Result<(), String> {
    eval_in(&app, &label, "history.back()")
}

#[tauri::command]
fn tab_forward(app: AppHandle, label: String) -> Result<(), String> {
    eval_in(&app, &label, "history.forward()")
}

#[tauri::command]
fn tab_reload(app: AppHandle, label: String) -> Result<(), String> {
    eval_in(&app, &label, "location.reload()")
}

#[tauri::command]
fn close_tab(app: AppHandle, label: String) -> Result<(), String> {
    let win_label = window_of(&app, &label)?;
    if let Some(webview) = app.get_webview(&label) {
        let _ = webview.close();
    }
    let state = app.state::<Browser>();

    let mut neighbour: Option<String> = None;
    let mut now_empty = false;
    let was_active;
    {
        let mut windows = state.windows.lock().unwrap();
        let Some(win) = windows.get_mut(&win_label) else {
            return Ok(());
        };
        if let Some(idx) = win.tabs.iter().position(|t| t.label == label) {
            win.tabs.remove(idx);
            if win.tabs.is_empty() {
                now_empty = true;
            } else {
                neighbour = Some(win.tabs[idx.min(win.tabs.len() - 1)].label.clone());
            }
        }
        was_active = win.active.as_deref() == Some(label.as_str());
    }

    if now_empty {
        let window_count = state.windows.lock().unwrap().len();
        if window_count > 1 {
            // Last tab of a secondary window closes the window.
            if let Some(window) = app.get_window(&win_label) {
                let _ = window.close();
            }
        } else {
            open_tab(&app, &win_label, HOME_URL, true)?;
        }
    } else {
        if was_active {
            if let Some(neighbour) = neighbour {
                set_active(&app, &win_label, &neighbour);
            }
        }
        emit_state(&app, &win_label);
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(Browser::default())
        .invoke_handler(tauri::generate_handler![
            list_tabs,
            create_tab,
            create_window,
            show_chrome_menu,
            activate_tab,
            navigate_tab,
            close_tab,
            tab_back,
            tab_forward,
            tab_reload,
        ])
        .setup(|app| {
            app.on_menu_event(|app, event| {
                let target = app
                    .state::<Browser>()
                    .pending_menu
                    .lock()
                    .unwrap()
                    .take();
                let Some(target) = target else {
                    return;
                };
                match event.id().as_ref() {
                    "ctx-open-tab" => {
                        if let Some(link) = target.link {
                            let _ = open_tab(app, &target.window, &link, true);
                        }
                    }
                    "ctx-open-window" => {
                        if let Some(link) = target.link {
                            let _ = create_browser_window(app, &link);
                        }
                    }
                    "ctx-open-external" => {
                        if let Some(link) = target.link {
                            let _ = app.opener().open_url(link, None::<String>);
                        }
                    }
                    "ctx-copy-link" => {
                        if let Some(link) = target.link {
                            let _ = app.clipboard().write_text(link);
                        }
                    }
                    "ctx-new-tab" => {
                        let _ = open_tab(app, &target.window, HOME_URL, true);
                    }
                    "ctx-new-window" => {
                        let _ = create_browser_window(app, HOME_URL);
                    }
                    _ => {}
                }
            });

            create_browser_window(app.handle(), HOME_URL)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
