use std::{
    net::{TcpStream, ToSocketAddrs},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

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
            backend.start_if_needed(&server_dir).map_err(std::io::Error::other)?;

            let window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External(BACKEND_URL.parse().expect("valid backend url")),
            )
            .title("欢乐斗地主")
            .inner_size(1280.0, 800.0)
            .min_inner_size(1024.0, 680.0)
            .build()?;

            let backend = app.state::<BackendProcess>().inner().clone();
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
    BACKEND_HOST
        .to_socket_addrs()
        .ok()
        .and_then(|mut addresses| addresses.next())
        .and_then(|address| TcpStream::connect_timeout(&address, Duration::from_millis(200)).ok())
        .is_some()
}
