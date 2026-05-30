use std::{
    io::{Read, Write},
    net::{Shutdown, TcpStream, ToSocketAddrs},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

use serde_json::json;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

const BACKEND_URL: &str = "http://127.0.0.1:8081/";
const BACKEND_HOST: &str = "127.0.0.1:8081";
const BACKEND_PORT: &str = "8081";
const DATABASE_URI: &str = "mysql+aiomysql://ddz:ddz@127.0.0.1:3306/ddz";

#[derive(Clone, Default)]
struct BackendProcess {
    child: Arc<Mutex<Option<Child>>>,
}

impl BackendProcess {
    fn start_if_needed(&self, server_dir: &Path) -> Result<(), String> {
        if is_backend_ready() {
            return Ok(());
        }

        let python = python_executable(server_dir);
        let child = Command::new(python)
            .arg("app.py")
            .current_dir(server_dir)
            .env("PYTHONPATH", server_dir)
            .env("DATABASE_URI", DATABASE_URI)
            .env("PORT", BACKEND_PORT)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|error| format!("failed to start backend: {error}"))?;

        *self
            .child
            .lock()
            .map_err(|_| "backend process lock poisoned".to_string())? = Some(child);

        match wait_for_backend(Duration::from_secs(12)) {
            Ok(()) => Ok(()),
            Err(error) => {
                self.stop();
                Err(error)
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
    let backend = BackendProcess::default();

    tauri::Builder::default()
        .manage(backend.clone())
        .setup(move |app| {
            let server_dir = find_server_dir(app)?;
            let window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::App("index.html".into()),
            )
            .title("欢乐斗地主")
            .inner_size(1280.0, 800.0)
            .min_inner_size(1024.0, 680.0)
            .build()?;

            let startup_window = window.clone();
            let backend = app.state::<BackendProcess>().inner().clone();
            let startup_backend = backend.clone();
            thread::spawn(move || {
                report_startup_status(&startup_window, "正在检查本地后端服务...");
                match startup_backend.start_if_needed(&server_dir) {
                    Ok(()) => {
                        report_startup_status(&startup_window, "后端已就绪，正在进入牌桌...");
                        if let Err(error) = startup_window.navigate(
                            BACKEND_URL.parse().expect("valid backend url"),
                        ) {
                            report_startup_error(
                                &startup_window,
                                &format!("无法打开游戏页面：{error}"),
                            );
                        }
                    }
                    Err(error) => report_startup_error(&startup_window, &error),
                }
            });

            window.on_window_event(move |event| {
                if matches!(event, WindowEvent::Destroyed) {
                    backend.stop();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}

fn find_server_dir(app: &tauri::App) -> Result<PathBuf, Box<dyn std::error::Error>> {
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

fn wait_for_backend(timeout: Duration) -> Result<(), String> {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if is_backend_ready() {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(250));
    }

    Err(format!("backend did not become ready at {BACKEND_URL}"))
}

fn python_executable(server_dir: &Path) -> PathBuf {
    let venv_python = server_dir.join("../.venv/bin/python");
    if venv_python.is_file() {
        return venv_python;
    }

    PathBuf::from("python3")
}

fn is_backend_ready() -> bool {
    let Some(address) = BACKEND_HOST
        .to_socket_addrs()
        .ok()
        .and_then(|mut addresses| addresses.next()) else {
        return false;
    };

    let Ok(mut stream) = TcpStream::connect_timeout(&address, Duration::from_millis(300)) else {
        return false;
    };

    let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(500)));

    if stream
        .write_all(b"GET / HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n")
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

fn report_startup_status(window: &tauri::WebviewWindow, message: &str) {
    update_startup_page(window, "ready", message);
}

fn report_startup_error(window: &tauri::WebviewWindow, message: &str) {
    update_startup_page(window, "error", message);
}

fn update_startup_page(window: &tauri::WebviewWindow, state: &str, message: &str) {
    let payload = json!({
        "state": state,
        "message": message,
    })
    .to_string();
    let _ = window.eval(format!("window.__setStartupState && window.__setStartupState({payload});"));
}
