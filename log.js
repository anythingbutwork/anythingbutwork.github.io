(async () => {
    // --- Session Identity ---
    const WORDS = [
        "Notebook", "Pencil", "Eraser", "Stapler", "Binder", "Marker",
        "Compass", "Ruler", "Scissors", "Highlighter", "Folder", "Clipboard"
    ];

    function getSessionId() {
        // Switched to localStorage for persistence across browser restarts
        let id = localStorage.getItem("session_id");
        if (!id) {
            const word = WORDS[Math.floor(Math.random() * WORDS.length)];
            // Uses current epoch timestamp to ensure uniqueness
            const epoch = Date.now(); 
            id = `${word}-${epoch}`;
            localStorage.setItem("session_id", id);
        }
        return id;
    }

    // --- Page Resolution ---
    const path = window.location.pathname;
    let page;

    if (path === "/" || path === "/index.html") {
        page = "home page";
    } else {
        const match = path.match(/\/lesson\/lesson-(\d+)\.html/);
        if (match) {
            const gameId = match[1];
            try {
                const res = await fetch("/lessons.json");
                const data = await res.json();
                const lesson = data.lessons.find(l => l.file === `lesson-${gameId}.html`);
                page = lesson ? `${lesson.name} (lesson ${gameId})` : `lesson ${gameId}`;
            } catch {
                page = `lesson ${gameId} (lessons.json unavailable)`;
            }
        } else {
            page = `unknown page: ${path}`;
        }
    }

    // --- IP + Identity ---
    const SHARED_IP = "208.66.197.226";
    let ipInfo = "";
    try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const { ip } = await ipRes.json();
        ipInfo = ip === SHARED_IP ? getSessionId() : ip;
    } catch {
        ipInfo = getSessionId();
    }

    // --- Log Helper ---
    function sendLog(message) {
        fetch("https://picklesmoothie.netlify.app/api/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        }).catch(() => {}); // Silent fail to prevent console noise
    }

    // --- Initial Page Load Log ---
    sendLog(`[${ipInfo}] accessed ${page}`);

    // --- Tab Visibility Logs ---
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            sendLog(`[${ipInfo}] tabbed away from ${page}`);
        } else {
            sendLog(`[${ipInfo}] tabbed back to ${page}`);
        }
    });
})();
