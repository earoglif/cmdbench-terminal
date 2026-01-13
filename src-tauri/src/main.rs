// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use portable_pty::{native_pty_system, CommandBuilder, PtyPair, PtySize};
use std::{
    collections::HashMap,
    io::{Read, Write},
    sync::Arc,
    thread,
};

use tauri::{async_runtime::Mutex as AsyncMutex, AppHandle, Emitter, Manager, State, WebviewWindowBuilder, WebviewUrl};
use tokio::sync::mpsc;

struct PtyInstance {
    pty_pair: PtyPair,
    writer: Box<dyn Write + Send>,
    data_receiver: Arc<AsyncMutex<mpsc::Receiver<String>>>,
}

struct AppState {
    pty_instances: Arc<AsyncMutex<HashMap<String, PtyInstance>>>,
    app_handle: AppHandle,
}

#[tauri::command]
async fn async_create_shell(shell_path: Option<String>, rows: Option<u16>, cols: Option<u16>, state: State<'_, AppState>) -> Result<String, String> {
    let pty_system = native_pty_system();
    
    let pty_pair = pty_system
        .openpty(PtySize {
            rows: rows.unwrap_or(24),
            cols: cols.unwrap_or(80),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|err| err.to_string())?;

    let reader = pty_pair.master.try_clone_reader().map_err(|err| err.to_string())?;
    let writer = pty_pair.master.take_writer().map_err(|err| err.to_string())?;

    let mut cmd = match shell_path {
        Some(path) => CommandBuilder::new(path),
        None => {
            #[cfg(target_os = "windows")]
            { CommandBuilder::new("powershell.exe") }
            #[cfg(not(target_os = "windows"))]
            { CommandBuilder::new("bash") }
        }
    };

    #[cfg(target_os = "windows")]
    cmd.env("TERM", "cygwin");

    #[cfg(not(target_os = "windows"))]
    {
        cmd.env("TERM", "xterm-256color");
        // Set UTF-8 locale for proper Cyrillic and other non-ASCII character support
        cmd.env("LANG", "en_US.UTF-8");
        cmd.env("LC_ALL", "en_US.UTF-8");
    }

    let mut child = pty_pair
        .slave
        .spawn_command(cmd)
        .map_err(|err| err.to_string())?;

    let pty_id = format!("{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis());

    // Создаём канал для передачи данных из потока чтения
    let (tx, rx) = mpsc::channel::<String>(1000);
    
    // Запускаем поток чтения для этого PTY
    let mut reader = reader;
    thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF
                Ok(n) => {
                    let s = String::from_utf8_lossy(&buf[..n]).into_owned();
                    if tx.blocking_send(s).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });

    let pty_instance = PtyInstance {
        pty_pair,
        writer,
        data_receiver: Arc::new(AsyncMutex::new(rx)),
    };

    state.pty_instances.lock().await.insert(pty_id.clone(), pty_instance);

    // Отслеживаем завершение процесса и отправляем событие
    let app_handle = state.app_handle.clone();
    let pty_id_for_event = pty_id.clone();
    thread::spawn(move || {
        let _status = child.wait();
        // Отправляем событие о завершении процесса
        app_handle.emit("pty-exited", pty_id_for_event).ok();
    });
    
    Ok(pty_id)
}

#[tauri::command]
async fn async_write_to_pty(pty_id: String, data: &str, state: State<'_, AppState>) -> Result<(), String> {
    let mut instances = state.pty_instances.lock().await;

    if let Some(instance) = instances.get_mut(&pty_id) {
        // Use write_all for atomic byte writing - fixes Cyrillic input duplication on Linux
        instance.writer.write_all(data.as_bytes()).map_err(|err| err.to_string())?;
        instance.writer.flush().map_err(|err| err.to_string())?;
        Ok(())
    } else {
        Err(format!("PTY instance not found: {}", pty_id))
    }
}

#[tauri::command]
async fn async_read_from_pty(pty_id: String, state: State<'_, AppState>) -> Result<Option<String>, String> {
    // Получаем Arc на receiver, быстро освобождая глобальный mutex
    let receiver = {
        let instances = state.pty_instances.lock().await;
        if let Some(instance) = instances.get(&pty_id) {
            instance.data_receiver.clone()
        } else {
            return Ok(None);
        }
    };

    // Блокируем только receiver этого терминала
    let mut receiver = receiver.lock().await;
    
    // Ждём данные без таймаута - блокируемся до получения данных
    match receiver.recv().await {
        Some(mut data) => {
            // Получили данные - собираем всё что есть в буфере
            while let Ok(more) = receiver.try_recv() {
                data.push_str(&more);
            }
            Ok(Some(data))
        }
        None => Ok(None), // Канал закрыт
    }
}

#[tauri::command]
async fn async_resize_pty(pty_id: String, rows: u16, cols: u16, state: State<'_, AppState>) -> Result<(), String> {
    let mut instances = state.pty_instances.lock().await;
    if let Some(instance) = instances.get_mut(&pty_id) {
        instance.pty_pair.master
            .resize(PtySize {
                rows,
                cols,
                ..Default::default()
            })
            .map_err(|err| err.to_string())?;
        Ok(())
    } else {
        Err(format!("PTY instance not found: {}", pty_id))
    }
}

#[tauri::command]
async fn async_remove_pty(pty_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut instances = state.pty_instances.lock().await;
    instances.remove(&pty_id);
    Ok(())
}

#[tauri::command]
async fn async_get_pty_cwd(_pty_id: String, _state: State<'_, AppState>) -> Result<String, String> {
    // Получаем домашнюю директорию пользователя - это начальная директория shell
    #[cfg(target_os = "windows")]
    {
        // На Windows PowerShell открывается в USERPROFILE
        std::env::var("USERPROFILE")
            .map(|p| p.replace('/', "\\"))
            .or_else(|_| Ok("C:\\".to_string()))
    }
    #[cfg(not(target_os = "windows"))]
    {
        // На Unix shell открывается в HOME
        std::env::var("HOME")
            .or_else(|_| Ok("~".to_string()))
    }
}

#[derive(serde::Serialize)]
struct ShellProfile {
    name: String,
    path: String,
}

#[tauri::command]
async fn get_shell_profiles() -> Result<Vec<ShellProfile>, String> {
    let mut profiles = Vec::new();

    #[cfg(target_os = "windows")]
    {
        use std::path::Path;

        // PowerShell (Windows PowerShell)
        let powershell_path = r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe";
        if Path::new(powershell_path).exists() {
            profiles.push(ShellProfile {
                name: "Windows PowerShell".to_string(),
                path: powershell_path.to_string(),
            });
        }

        // PowerShell Core (pwsh)
        let pwsh_paths = [
            r"C:\Program Files\PowerShell\7\pwsh.exe",
            r"C:\Program Files\PowerShell\6\pwsh.exe",
        ];
        for path in pwsh_paths {
            if Path::new(path).exists() {
                profiles.push(ShellProfile {
                    name: "PowerShell Core".to_string(),
                    path: path.to_string(),
                });
                break;
            }
        }

        // Command Prompt (cmd)
        let cmd_path = r"C:\Windows\System32\cmd.exe";
        if Path::new(cmd_path).exists() {
            profiles.push(ShellProfile {
                name: "Command Prompt".to_string(),
                path: cmd_path.to_string(),
            });
        }

        // Git Bash
        let git_bash_paths = [
            r"C:\Program Files\Git\bin\bash.exe",
            r"C:\Program Files (x86)\Git\bin\bash.exe",
        ];
        for path in git_bash_paths {
            if Path::new(path).exists() {
                profiles.push(ShellProfile {
                    name: "Git Bash".to_string(),
                    path: path.to_string(),
                });
                break;
            }
        }

        // WSL (Windows Subsystem for Linux)
        let wsl_path = r"C:\Windows\System32\wsl.exe";
        if Path::new(wsl_path).exists() {
            profiles.push(ShellProfile {
                name: "WSL".to_string(),
                path: wsl_path.to_string(),
            });
        }

        // Cygwin
        let cygwin_path = r"C:\cygwin64\bin\bash.exe";
        if Path::new(cygwin_path).exists() {
            profiles.push(ShellProfile {
                name: "Cygwin".to_string(),
                path: cygwin_path.to_string(),
            });
        }

        // MSYS2
        let msys2_paths = [
            r"C:\msys64\usr\bin\bash.exe",
            r"C:\msys32\usr\bin\bash.exe",
        ];
        for path in msys2_paths {
            if Path::new(path).exists() {
                profiles.push(ShellProfile {
                    name: "MSYS2".to_string(),
                    path: path.to_string(),
                });
                break;
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        use std::path::Path;

        // Zsh (default on macOS)
        if Path::new("/bin/zsh").exists() {
            profiles.push(ShellProfile {
                name: "Zsh".to_string(),
                path: "/bin/zsh".to_string(),
            });
        }

        // Bash
        if Path::new("/bin/bash").exists() {
            profiles.push(ShellProfile {
                name: "Bash".to_string(),
                path: "/bin/bash".to_string(),
            });
        }

        // Fish
        let fish_paths = ["/usr/local/bin/fish", "/opt/homebrew/bin/fish"];
        for path in fish_paths {
            if Path::new(path).exists() {
                profiles.push(ShellProfile {
                    name: "Fish".to_string(),
                    path: path.to_string(),
                });
                break;
            }
        }

        // Sh
        if Path::new("/bin/sh").exists() {
            profiles.push(ShellProfile {
                name: "Sh".to_string(),
                path: "/bin/sh".to_string(),
            });
        }
    }

    #[cfg(target_os = "linux")]
    {
        use std::path::Path;

        // Bash
        if Path::new("/bin/bash").exists() {
            profiles.push(ShellProfile {
                name: "Bash".to_string(),
                path: "/bin/bash".to_string(),
            });
        }

        // Zsh
        let zsh_paths = ["/bin/zsh", "/usr/bin/zsh"];
        for path in zsh_paths {
            if Path::new(path).exists() {
                profiles.push(ShellProfile {
                    name: "Zsh".to_string(),
                    path: path.to_string(),
                });
                break;
            }
        }

        // Fish
        let fish_paths = ["/usr/bin/fish", "/usr/local/bin/fish"];
        for path in fish_paths {
            if Path::new(path).exists() {
                profiles.push(ShellProfile {
                    name: "Fish".to_string(),
                    path: path.to_string(),
                });
                break;
            }
        }

        // Sh
        if Path::new("/bin/sh").exists() {
            profiles.push(ShellProfile {
                name: "Sh".to_string(),
                path: "/bin/sh".to_string(),
            });
        }

        // Dash
        if Path::new("/bin/dash").exists() {
            profiles.push(ShellProfile {
                name: "Dash".to_string(),
                path: "/bin/dash".to_string(),
            });
        }
    }

    Ok(profiles)
}

fn main() {
    // Fix for IBus IME bug on Linux (Ubuntu) that causes cumulative input for non-ASCII characters.
    // By switching to XIM or disabling IME, we avoid the duplicate/cumulative character input issue.
    // This must be set BEFORE the GTK/WebKitGTK is initialized.
    #[cfg(target_os = "linux")]
    {
        // Use "xim" for basic X input method, or "gtk-im-context-simple" for simple GTK input
        // Setting to empty string also works and disables IME completely
        std::env::set_var("GTK_IM_MODULE", "gtk-im-context-simple");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Создаём окно программно с платформо-специфичными настройками
            let mut builder = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::default()
            )
            .title("cmdbench-terminal")
            .inner_size(1100.0, 686.0)
            .min_inner_size(400.0, 410.0)
            .resizable(true)
            .fullscreen(false);

            // На macOS используем нативный titlebar с overlay для "светофора"
            #[cfg(target_os = "macos")]
            {
                builder = builder
                    .decorations(true)
                    .title_bar_style(tauri::TitleBarStyle::Overlay)
                    .hidden_title(true);
            }

            // На Windows/Linux используем кастомный titlebar без декораций
            #[cfg(not(target_os = "macos"))]
            {
                builder = builder.decorations(false);
            }

            builder.build()?;

            app.manage(AppState {
                pty_instances: Arc::new(AsyncMutex::new(HashMap::new())),
                app_handle: app.handle().clone(),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            async_create_shell,
            async_write_to_pty,
            async_read_from_pty,
            async_resize_pty,
            async_remove_pty,
            async_get_pty_cwd,
            get_shell_profiles
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
