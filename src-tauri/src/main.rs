#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let mut log_path = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    log_path.push(".aether");
    let _ = std::fs::create_dir_all(&log_path);
    let panic_file = log_path.join("crash.log");

    std::panic::set_hook(Box::new(move |info| {
        let msg = format!("PANIC: {:?}\nBacktrace: {:?}", info, std::backtrace::Backtrace::capture());
        let _ = std::fs::write(&panic_file, msg);
    }));

    aether_lib::run();
}
