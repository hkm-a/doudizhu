use std::{
    env,
    fs::{self, OpenOptions},
    io::{Read, Write},
    net::{Shutdown, TcpStream, ToSocketAddrs},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

use serde::Deserialize;
use serde_json::json;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

const DEFAULT_BACKEND_PORT: &str = "8081";
const DEFAULT_DATABASE_URI: &str = "mysql+aiomysql://ddz:ddz@127.0.0.1:3306/ddz";

#[derive(Clone)]
struct BackendConfig {
    url: String,
    host: String,
    http_host: String,
    port: String,
    health_path: String,
    database_uri: String,
}

impl BackendConfig {
    fn from_env() -> Self {
        let url_from_env = env::var("DOUDIZHU_BACKEND_URL").ok();
        let port = env::var("DOUDIZHU_BACKEND_PORT")
            .or_else(|_| env::var("PORT"))
            .ok()
            .or_else(|| url_from_env.as_deref().and_then(port_from_http_url))
            .unwrap_or_else(|| DEFAULT_BACKEND_PORT.to_string());
        let url = url_from_env.unwrap_or_else(|| format!("http://127.0.0.1:{port}/"));
        let host = env::var("DOUDIZHU_BACKEND_HOST")
            .ok()
            .or_else(|| host_from_http_url(&url))
            .unwrap_or_else(|| format!("127.0.0.1:{port}"));
        let http_host = host_from_http_url(&url).unwrap_or_else(|| host.clone());
        let health_path =
            env::var("DOUDIZHU_BACKEND_HEALTH_PATH").unwrap_or_else(|_| "/healthz".to_string());
        let database_uri = env::var("DOUDIZHU_DATABASE_URI")
            .or_else(|_| env::var("DATABASE_URI"))
            .unwrap_or_else(|_| DEFAULT_DATABASE_URI.to_string());

        Self {
            url,
            host,
            http_host,
            port,
            health_path,
            database_uri,
        }
    }
}

fn host_from_http_url(url: &str) -> Option<String> {
    let authority = url.split_once("://")?.1.split('/').next()?;
    if authority.is_empty() {
        return None;
    }

    Some(authority.to_string())
}

fn port_from_http_url(url: &str) -> Option<String> {
    let authority = host_from_http_url(url)?;
    let port = authority.rsplit_once(':')?.1;
    if port.chars().all(|character| character.is_ascii_digit()) {
        Some(port.to_string())
    } else {
        None
    }
}

#[derive(Clone)]
struct DesktopState {
    backend: BackendProcess,
    config: BackendConfig,
}

impl Default for DesktopState {
    fn default() -> Self {
        Self {
            backend: BackendProcess::default(),
            config: BackendConfig::from_env(),
        }
    }
}

#[derive(Clone, Default)]
struct BackendProcess {
    child: Arc<Mutex<Option<Child>>>,
}

#[derive(Clone, Debug, Deserialize)]
struct PreflightCheck {
    status: String,
    label: String,
    detail: String,
    #[serde(default)]
    hint: String,
}

impl BackendProcess {
    fn ensure_venv(&self, server_dir: &Path) -> Result<PathBuf, String> {
        let venv_python = server_dir.join("../.venv/bin/python");
        if venv_python.is_file() {
            return Ok(venv_python);
        }

        let python3 = PathBuf::from("python3");
        let result = Command::new(&python3)
            .arg("-m")
            .arg("venv")
            .arg(server_dir.join("../.venv"))
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .output()
            .map_err(|error| format!("failed to run python3: {error}"))?;

        if !result.status.success() {
            let stderr = String::from_utf8_lossy(&result.stderr);
            return Err(format!("failed to create venv: {stderr}"));
        }

        Ok(venv_python)
    }

    fn install_deps_if_needed(&self, venv_python: &Path, server_dir: &Path) -> Result<(), String> {
        let requirements = server_dir.join("../requirements.txt");
        if !requirements.is_file() {
            return Ok(());
        }

        let result = Command::new(venv_python)
            .arg("-m")
            .arg("pip")
            .arg("install")
            .arg("-r")
            .arg(&requirements)
            .arg("--quiet")
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .output()
            .map_err(|error| format!("failed to run pip install: {error}"))?;

        if !result.status.success() {
            let stderr = String::from_utf8_lossy(&result.stderr);
            return Err(format!("pip install failed: {stderr}"));
        }

        Ok(())
    }

    fn start_if_needed(
        &self,
        config: &BackendConfig,
        server_dir: &Path,
        log_path: &Path,
    ) -> Result<(), String> {
        if is_backend_ready(config) {
            return Ok(());
        }

        let python = self
            .ensure_venv(server_dir)
            .unwrap_or_else(|_| python_executable(server_dir));

        if python.to_string_lossy().contains(".venv") {
            let _ = self.install_deps_if_needed(&python, server_dir);
        }

        fs::create_dir_all(log_path.parent().unwrap_or_else(|| Path::new(".")))
            .map_err(|error| format!("failed to create log directory: {error}"))?;
        let stdout = OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_path)
            .map_err(|error| format!("failed to open backend log: {error}"))?;
        let stderr = stdout
            .try_clone()
            .map_err(|error| format!("failed to prepare backend log: {error}"))?;

        let child = Command::new(&python)
            .arg("app.py")
            .current_dir(server_dir)
            .env("PYTHONPATH", server_dir)
            .env("DATABASE_URI", &config.database_uri)
            .env("PORT", &config.port)
            .stdin(Stdio::null())
            .stdout(Stdio::from(stdout))
            .stderr(Stdio::from(stderr))
            .spawn()
            .map_err(|error| {
                format!(
                    "failed to start backend: {error}; log: {}",
                    log_path.display()
                )
            })?;

        *self
            .child
            .lock()
            .map_err(|_| "backend process lock poisoned".to_string())? = Some(child);

        match wait_for_backend(config, Duration::from_secs(15)) {
            Ok(()) => Ok(()),
            Err(error) => {
                self.stop();
                Err(format!("{error}; log: {}", log_path.display()))
            }
        }
    }

    fn stop(&self) {
        let Ok(mut child) = self.child.lock() else {
            return;
        };

        if let Some(mut child) = child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

pub fn run() {
    let state = DesktopState::default();

    tauri::Builder::default()
        .manage(state.clone())
        .invoke_handler(tauri::generate_handler![retry_backend])
        .setup(move |app| {
            let window =
                WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                    .title("欢乐斗地主")
                    .inner_size(1280.0, 800.0)
                    .min_inner_size(1024.0, 680.0)
                    .build()?;

            let app_handle = app.handle().clone();
            let startup_state = app.state::<DesktopState>().inner().clone();
            start_backend_async(app_handle, window.clone(), startup_state.clone());

            window.on_window_event(move |event| {
                if matches!(event, WindowEvent::Destroyed) {
                    startup_state.backend.stop();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}

#[tauri::command]
fn retry_backend(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    state: tauri::State<'_, DesktopState>,
) {
    start_backend_async(app, window, state.inner().clone());
}

fn start_backend_async(app: tauri::AppHandle, window: tauri::WebviewWindow, state: DesktopState) {
    thread::spawn(move || {
        report_startup_status(&window, "正在检查本地后端服务...");

        let server_dir = match find_server_dir(&app) {
            Ok(server_dir) => server_dir,
            Err(error) => {
                report_startup_error(&window, &error.to_string());
                return;
            }
        };
        let backend_log_path = match app.path().app_log_dir() {
            Ok(path) => path.join("backend.log"),
            Err(error) => {
                report_startup_error(&window, &format!("无法定位日志目录：{error}"));
                return;
            }
        };

        match run_backend_preflight(&app, &state.config, &server_dir) {
            Ok(checks) => {
                report_startup_preflight(&window, &checks);
                if preflight_has_failures(&checks) {
                    report_startup_error(&window, "后端预检未通过，请按上方提示修复后重试。");
                    return;
                }
            }
            Err(error) => {
                report_startup_error(&window, &format!("后端预检无法运行：{error}"));
                return;
            }
        }

        match state
            .backend
            .start_if_needed(&state.config, &server_dir, &backend_log_path)
        {
            Ok(()) => {
                report_startup_status(&window, "后端已就绪，正在进入牌桌...");
                let Ok(url) = state.config.url.parse() else {
                    report_startup_error(&window, &format!("后端地址无效：{}", state.config.url));
                    return;
                };
                if let Err(error) = window.navigate(url) {
                    report_startup_error(&window, &format!("无法打开游戏页面：{error}"));
                }
            }
            Err(error) => report_startup_error(&window, &error),
        }
    });
}

fn find_server_dir(app: &tauri::AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let resource_server = app.path().resource_dir()?.join("server");
    if resource_server.join("app.py").is_file() {
        return Ok(resource_server);
    }

    let manifest_server = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../server");
    if manifest_server.join("app.py").is_file() {
        return Ok(manifest_server.canonicalize()?);
    }

    Err("server/app.py was not found in resources or project root".into())
}

fn find_preflight_script(app: &tauri::AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let resource_script = app.path().resource_dir()?.join("backend-preflight.py");
    if resource_script.is_file() {
        return Ok(resource_script);
    }

    let manifest_script =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../scripts/backend-preflight.py");
    if manifest_script.is_file() {
        return Ok(manifest_script.canonicalize()?);
    }

    Err("scripts/backend-preflight.py was not found in resources or project root".into())
}

fn run_backend_preflight(
    app: &tauri::AppHandle,
    config: &BackendConfig,
    server_dir: &Path,
) -> Result<Vec<PreflightCheck>, String> {
    let script = find_preflight_script(app).map_err(|error| error.to_string())?;
    let output = Command::new(python_executable(server_dir))
        .arg(script)
        .arg("--json")
        .arg("--database-uri")
        .arg(&config.database_uri)
        .env("PYTHONPATH", server_dir)
        .output()
        .map_err(|error| format!("failed to run backend preflight: {error}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if !stdout.trim().is_empty() {
        return parse_preflight_checks(&stdout);
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    if output.status.success() {
        Err("backend preflight returned no checks".to_string())
    } else {
        Err(stderr.trim().to_string())
    }
}

fn parse_preflight_checks(raw_json: &str) -> Result<Vec<PreflightCheck>, String> {
    serde_json::from_str(raw_json.trim())
        .map_err(|error| format!("failed to parse backend preflight output: {error}"))
}

fn preflight_has_failures(checks: &[PreflightCheck]) -> bool {
    checks.iter().any(|check| check.status == "fail")
}

fn wait_for_backend(config: &BackendConfig, timeout: Duration) -> Result<(), String> {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if is_backend_ready(config) {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(250));
    }

    Err(format!("backend did not become ready at {}", config.url))
}

fn python_executable(server_dir: &Path) -> PathBuf {
    let venv_python = server_dir.join("../.venv/bin/python");
    if venv_python.is_file() {
        return venv_python;
    }

    PathBuf::from("python3")
}

fn is_backend_ready(config: &BackendConfig) -> bool {
    let Some(address) = config
        .host
        .to_socket_addrs()
        .ok()
        .and_then(|mut addresses| addresses.next())
    else {
        return false;
    };

    let Ok(mut stream) = TcpStream::connect_timeout(&address, Duration::from_millis(300)) else {
        return false;
    };

    let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(500)));

    if stream
        .write_all(
            format!(
                "GET {} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n",
                config.health_path, config.http_host
            )
            .as_bytes(),
        )
        .is_err()
    {
        return false;
    }

    let _ = stream.shutdown(Shutdown::Write);

    let mut response = [0_u8; 64];
    let Ok(size) = stream.read(&mut response) else {
        return false;
    };

    response[..size].starts_with(b"HTTP/1.1 200") || response[..size].starts_with(b"HTTP/1.0 200")
}

#[cfg(test)]
mod tests {
    use super::{
        host_from_http_url, parse_preflight_checks, port_from_http_url, preflight_has_failures,
    };

    #[test]
    fn extracts_host_from_http_url() {
        assert_eq!(
            host_from_http_url("http://127.0.0.1:8081/table"),
            Some("127.0.0.1:8081".to_string())
        );
    }

    #[test]
    fn extracts_port_from_http_url() {
        assert_eq!(
            port_from_http_url("http://localhost:8082/"),
            Some("8082".to_string())
        );
    }

    #[test]
    fn ignores_urls_without_explicit_port() {
        assert_eq!(port_from_http_url("http://localhost/"), None);
    }

    #[test]
    fn parses_preflight_json() {
        let checks = parse_preflight_checks(
            r#"[{"status":"pass","label":"python import tornado","detail":"available","hint":""}]"#,
        )
        .unwrap();

        assert_eq!(checks.len(), 1);
        assert_eq!(checks[0].status, "pass");
        assert_eq!(checks[0].label, "python import tornado");
        assert!(!preflight_has_failures(&checks));
    }

    #[test]
    fn treats_failed_preflight_checks_as_blocking() {
        let checks = parse_preflight_checks(
            r#"[{"status":"warn","label":"database TCP 127.0.0.1:3306","detail":"refused","hint":"start MySQL"},{"status":"fail","label":"python import aiomysql","detail":"missing","hint":"pip install -r requirements.txt"}]"#,
        )
        .unwrap();

        assert!(preflight_has_failures(&checks));
    }
}

fn report_startup_status(window: &tauri::WebviewWindow, message: &str) {
    update_startup_page(window, "ready", message);
}

fn report_startup_error(window: &tauri::WebviewWindow, message: &str) {
    update_startup_page(window, "error", message);
}

fn report_startup_preflight(window: &tauri::WebviewWindow, checks: &[PreflightCheck]) {
    let checks = checks
        .iter()
        .map(|check| {
            json!({
                "status": check.status,
                "label": check.label,
                "detail": check.detail,
                "hint": check.hint,
            })
        })
        .collect::<Vec<_>>();
    let payload = json!({
        "state": "ready",
        "message": "后端预检完成，正在准备启动服务...",
        "checks": checks,
    })
    .to_string();
    let _ = window.eval(format!(
        "window.__setStartupState && window.__setStartupState({payload});"
    ));
}

fn update_startup_page(window: &tauri::WebviewWindow, state: &str, message: &str) {
    let payload = json!({
        "state": state,
        "message": message,
    })
    .to_string();
    let _ = window.eval(format!(
        "window.__setStartupState && window.__setStartupState({payload});"
    ));
}
