(async () => {
    // --- Session Identity ---
    const WORDS = [
        "Notebook", "Pencil", "Eraser", "Stapler", "Binder", "Marker",
        "Compass", "Ruler", "Scissors", "Highlighter", "Folder", "Clipboard"
    ];

    function getSessionId() {
        // Persistent storage
        let id = localStorage.getItem("session_id");
        if (!id) {
            const word = WORDS[Math.floor(Math.random() * WORDS.length)];
            // Current epoch for uniqueness
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
        const ipRes = await fetch("https://api.ipify.org/?format=json");
        const { ip } = await ipRes.json();
        ipInfo = ip === SHARED_IP ? getSessionId() : ip;
    } catch {
        ipInfo = getSessionId();
    }

    // --- Log Helper ---
    function sendLog(message, isClosing = false) {
        fetch("https://picklesmoothie.netlify.app", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identity: ipInfo, message }),
            keepalive: isClosing 
        }).catch(() => {});
    }

    let isLeaving = false;

    sendLog(`accessed ${page}`);

    // Flag navigation or tab closure
    window.addEventListener("beforeunload", () => { isLeaving = true; });
    window.addEventListener("pagehide", () => { 
        isLeaving = true; 
        sendLog(`left ${page}`, true); 
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            // Only log "tabbed away" if they aren't navigating/closing
            if (!isLeaving) sendLog(`tabbed away from ${page}`);
        } else {
            // If they come back, reset the flag
            isLeaving = false; 
            sendLog(`tabbed back to ${page}`);
        }
    });
})();
