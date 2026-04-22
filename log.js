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
                page = lesson ? `${lesson.name} (#${gameId})` : `Lesson #${gameId}`;
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
        fetch("https://logs-psvq.onrender.com/api/log", {
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

    // --- Ping ---
    function sendPing() {
        const tabbed = document.visibilityState === 'visible';
        const onGame = window.location.pathname.startsWith('/lesson/');

        let status;
        if (!tabbed && !onGame) status = 'offline';
        else if (!tabbed) status = 'out';
        else if (onGame) status = 'playing';
        else status = 'home';

        fetch("https://logs-psvq.onrender.com/api/ping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identity: ipInfo, status, on: page })
        }).catch(() => {});
    }

    sendPing();
    setInterval(sendPing, 60_000); // ping every 60s (well within the 120s TTL)

    // --- Online Count ---
    async function refreshOnlineCount() {
        try {
            const res = await fetch("https://logs-psvq.onrender.com/api/online");
            const data = await res.json();

            const countEl = document.getElementById("onlineCount");
            if (countEl) countEl.textContent = data.count + " players online";

            const listEl = document.getElementById("onlineList");
            if (listEl) {
                if (data.online.length === 0) {
                    listEl.innerHTML = '<div style="padding:8px 14px; color:#666; font-size:13px;">No one online</div>';
                } else {
                    // example status: "home page" -> "/" | "Guess the Soccer Star (#2086)" -> "/lesson/lesson-2086.html"

                    listEl.innerHTML = data.online.map(p => {
                        const isMe = p.identity === ipInfo;
                        const url = p.playing === "home page" ? "/" : `/lesson/lesson-${p.playing?.match(/\(#(\d+)\)/)?.[1] || "unknown"}.html`;
                        const dotColor = {
                            playing: '#66FF66',
                            out: '#F0B232',
                            home: '#aaa',
                            offline: '#FF6666',
                        }[p.status] ?? '#aaa';
                        return `<a href=${url} style="
                            padding: 7px 14px; font-size: 13px; font-family: Inter, sans-serif;
                            display: flex; align-items: center; gap: 8px;
                            background: ${isMe ? '#66FF6620' : 'transparent'};
                            color: ${isMe ? '#66FF66' : '#ccc'};
                        ">
                            <span style="width:6px; height:6px; border-radius:50%; background:${dotColor}; flex-shrink:0;"></span>
                            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.identity}</span>
                            <span style="margin-left:auto; font-size:11px; opacity:0.5; white-space:nowrap;">${p.playing || ""}</span>
                            ${isMe ? '<span style="font-size:11px; opacity:0.7; flex-shrink:0;">(you)</span>' : ''}
                        </a>`;
                    }).join('');
                }
            }
        } catch {}
    }

    refreshOnlineCount();
    setInterval(refreshOnlineCount, 30_000);
})();

// --- Online Panel ---
function toggleOnlinePanel(e) {
    e.preventDefault();
    const panel = document.getElementById('onlinePanel');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

document.addEventListener('click', function(e) {
    const toggle = document.getElementById('onlineToggle');
    const panel = document.getElementById('onlinePanel');
    if (panel && toggle && !toggle.contains(e.target) && !panel.contains(e.target)) {
        panel.style.display = 'none';
    }
});
