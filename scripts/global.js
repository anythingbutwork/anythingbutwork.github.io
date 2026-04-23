tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"]
            },
            colors: {
                bg: "#111111",
                accent: "#161616",
                success: "#66FF66",
                fail: "#FF6666",
                blue: "#1E90FF"
            }
        }
    }
};

const WORDS = [
    "Notebook", "Pencil", "Eraser", "Stapler", "Binder", "Marker",
    "Compass", "Ruler", "Scissors", "Highlighter", "Folder", "Clipboard"
];
const API = "https://logs-psvq.onrender.com/api";
const path = window.location.pathname;
const searchBar = document.getElementById("search");
const session = getSession();
let isLeaving = false;
let cached = null;
let favorites = getFavorites();
let allLessons = [];
let page;

async function refreshOnline() {
    try {
        const res = await fetch(`${API}/online`);
        const data = await res.json();

        const pill = document.querySelector(".status-pill");
        const countEl = document.getElementById("online-count");
        const listEl = document.getElementById("online-list");

        if (countEl) countEl.textContent = ` ${data.count} online`;
        else if (pill) pill.childNodes[2].textContent = ` ${data.count} online`;

        if (listEl) {
            if (!data.online || data.online.length === 0) {
                listEl.innerHTML = `<li class="opacity-40 italic text-sm px-2 py-1">Nobody is online...</li>`;
            } else {
                listEl.innerHTML = data.online.map((u) => {
                    const dotColor = {
                        playing: '#66FF66',
                        out: '#F0B232',
                        home: '#1E90FF',
                        offline: '#FF6666',
                    }[u.status] ?? '#AAAAAA';

                    return `
                        <a href="${u.on === "home page" ? "/" : "/lesson/?id=" + u.on.match(/#(\d+)/)[1]}" class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${u.player.id === session.id ? "bg-success/25 hover:bg-success/50" : "hover:bg-white/5"}">
                            <span class="w-1.5 h-1.5 rounded-full bg-[${dotColor}] shrink-0"></span>
                            <span>${u.username || u.identity}</span>
                            ${u.on ? `<span class="ml-auto text-xs opacity-40 pl-4">${u.on}</span>` : ""}
                        </a>
                    `
                }).join("");
            }
        }
    } catch {}
}

async function sendPing() {
    const tabbed = document.visibilityState !== "visible";
    const onGame = page !== "home page";

    if (!tabbed && onGame) status = "playing";
    else if (!tabbed && !onGame) status = "home";
    else if (tabbed && onGame) status = "out";
    else status = "offline";

    fetch(`${API}/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            player: session,
            status,
            on: page
        })
    }).catch(() => {});
}

function toggleOnlinePanel() {
    const panel = document.getElementById("online-panel");
    if (!panel) return;

    const isOpen = panel.style.display === "block";

    if (isOpen) {
        panel.style.opacity = "0";
        panel.style.transform = "scale(0.92) translateY(-6px)";
        setTimeout(() => panel.style.display = "none", 150);
        return;
    }

    panel.style.display = "block";
    panel.style.opacity = "0";
    panel.style.transform = "scale(0.92) translateY(-6px)";

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            panel.style.opacity = "1";
            panel.style.transform = "scale(1) translateY(0)";
        });
    });

    refreshOnline();

    const close = (e) => {
        const pill = document.getElementById("online-pill");
        if (pill && pill.contains(e.target)) return;
        if (panel.contains(e.target)) return;
        panel.style.opacity = "0";
        panel.style.transform = "scale(0.92) translateY(-6px)";
        setTimeout(() => panel.style.display = "none", 150);
        document.removeEventListener("mousedown", close);
    };

    setTimeout(() => document.addEventListener("mousedown", close), 150);
}

function sendLog(message, keepalive = false) {
    fetch(`${API}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            player: session,
            message
        }),
        keepalive
    }).catch(() => {});
}

function injectNavbar(html) {
    const el = document.getElementById("navbar");
    if (el) el.innerHTML = html;
}

function getSession() {
    let session = localStorage.getItem("session");

    if (!session) {
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        const epoch = Date.now();

        session = {
            username: `${word}-${epoch}`,
            id: `${word}-${epoch}`
        };

        localStorage.setItem("session", JSON.stringify(session));
    } else {
        session = JSON.parse(session);
    }

    return session;
}

function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem("favorites")) || [];
    } catch {
        return [];
    }
}

function toggleFavorite(e, id) {
    e.preventDefault();
    e.stopPropagation();

    let favs = getFavorites();

    const index = favs.indexOf(id);

    if (index > -1) {
        favs.splice(index, 1);
    } else {
        favs.push(id);
    }

    localStorage.setItem("favorites", JSON.stringify(favs));
    favorites = favs;

    const isFav = favs.includes(id);

    const searchTerm = searchBar.value.toLowerCase().trim();
    const filtered = allLessons.filter(game => {
        return game.id.toString().includes(searchTerm) || game.name.toLowerCase().includes(searchTerm);
    });

    renderLessons(filtered);
}

function renderLessons(lessons) {
    lessons = lessons || allLessons;

    const container = document.getElementById("games");
    if (!container) return;

    if (lessons.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10 opacity-70">
                No lessons found matching your search.
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    const sortedLessons = [...lessons].sort((a, b) => {
        const aIsFav = favorites.includes(a.id);
        const bIsFav = favorites.includes(b.id);

        if (aIsFav && !bIsFav) return -1;
        if (!aIsFav && bIsFav) return 1;
        return a.name.localeCompare(b.name);
    });

    sortedLessons.forEach(lesson => {
        const isFav = favorites.includes(lesson.id);

        const el = document.createElement("div");
        el.className = "lesson-card relative flex flex-col gap-2";
        el.dataset.lesson = lesson.id;
        el.dataset.name = lesson.name;

        el.innerHTML = `
            <a href="/lesson/?id=${lesson.id}" class="group relative flex flex-col gap-2">
                <div class="relative overflow-hidden rounded-xl">
                    <img
                        src="${lesson.image || `https://lesson126.github.io/img/lesson-${lesson.id}.png`}"
                        class="game-icon w-full aspect-square object-cover"
                    />

                    <div class="pointer-events-none absolute inset-0 z-10
                        bg-gradient-to-bl from-black/70 via-black/30 to-transparent
                        opacity-0 group-hover:opacity-100 transition">
                    </div>

                    <button 
                        class="absolute top-2 right-2 z-20 p-1 transition
                        ${isFav ? "opacity-100" : "opacity-0 group-hover:opacity-100"}"
                        onclick="toggleFavorite(event, ${lesson.id})"
                    >
                        <svg viewBox="0 0 24 24" 
                            class="w-5 h-5 ${isFav ? "fill-yellow-400" : "fill-none stroke-yellow-400"}">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                    </button>
                </div>

                <div class="text-sm font-medium text-center">
                    ${lesson.name}
                </div>

            </a>
        `;

        container.appendChild(el);
    });
}

try {
    cached = localStorage.getItem("navbar");
} catch (e) {}

if (cached) {
    injectNavbar(cached);
}

fetch("/components/navbar.html")
    .then(res => {
        if (!res.ok) throw new Error("Failed to load navbar");
        return res.text();
    })
    .then(html => {
        if (html && html !== cached) {
            try {
                localStorage.setItem("navbar", html);
            } catch (e) {}

            injectNavbar(html);
        }
    })
    .catch(() => {});

fetch("/lessons.json")
    .then(res => res.json())
    .then(data => {
        allLessons = data.lessons
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name));

        if (path === "/" || path === "/index.html") {
            page = "home page";
        } else {
            const params = new URLSearchParams(window.location.search);
            const id = params.get("id");

            if (id) {
                const lesson = allLessons.find(l => l.id.toString() === id.toString());
                page = lesson ? `${lesson.name} (#${id})` : `Lesson (#${id})`;
            } else {
                page = `unknown page: ${path}`;
            }
        }

        sendLog(`accessed ${page}`);

        sendPing();
        setInterval(sendPing, 60000);

        refreshOnline();
        setInterval(refreshOnline, 30000);

        renderLessons();
    });

if (searchBar) {
    searchBar.addEventListener("input", (e) => {
        const searchTerm = searchBar.value.toLowerCase().trim();
        if (searchTerm === "") {
            renderLessons();
            return;
        }

        const filtered = allLessons.filter(game => {
            return game.id.toString().includes(searchTerm) || game.name.toLowerCase().includes(searchTerm);
        });

        renderLessons(filtered);
    });
}

window.addEventListener("beforeunload", () => {
    isLeaving = true;
});

window.addEventListener("pagehide", () => {
    isLeaving = true;
    sendLog(`left ${page}`, true);
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        if (!isLeaving) sendLog(`tabbed away from ${page}`);
    } else {
        isLeaving = false;
        sendLog(`tabbed back into ${page}`);
    }
});
