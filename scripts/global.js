tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"]
            },
            colors: {
                bg: "var(--color-bg)",
                accent: "var(--color-accent)",
                light: "var(--color-light)",
                success: "rgb(var(--color-success))",
                fail: "rgb(var(--color-fail))",
                warning: "rgb(var(--color-warning))",
                theme: "var(--color-theme)" 
            }
        }
    }
};

const THEMES = {
    red: "#fb3a3a",
    orange: "#E0AA17",
    yellow: "#dbdb17",
    green: "#009a00",
    blue: "#1E90FF",
    pink: "#FF66FF",
    purple: "#C300FF",
    dark: "#444",
    light: "#B8B8B8",
    default: "#FFF"
}
const WORDS = [
    "Notebook", "Pencil", "Eraser", "Stapler", "Binder", "Marker",
    "Compass", "Ruler", "Scissors", "Highlighter", "Folder", "Clipboard"
];
const schedule = [
    { name: "Period 1", start: "07:10", end: "07:59" },
    { name: "Period 2", start: "08:04", end: "08:53" },
    { name: "Period 3", start: "08:58", end: "09:54" },
    { name: "Period 4", start: "09:59", end: "10:48" },
    { name: "Period 5", start: "10:53", end: "11:42" },
    { name: "Lunch",    start: "11:42", end: "12:15" },
    { name: "Period 6", start: "12:22", end: "13:11" },
    { name: "school", start: "13:16", end: "14:05" }
];

const WS_URL = "wss://logs-psvq.onrender.com";
const path = window.location.pathname;
const searchBar = document.getElementById("search");
const colorOptions = document.getElementById("color-options");
const usernameInput = document.getElementById("username");
const idInput = document.getElementById("id");

const checkboxes = document.querySelectorAll('.tag-checkbox');
document.documentElement.style.setProperty('--show-id', '0');
const session = getSession();
let suggestDebounce = false;
let isLeaving = false;
let cached = null;
let favorites = getFavorites();
let allLessons = [];
let version;
let page;


let ws;
let wsReady = false;
const wsQueue = [];

function wsConnect() {
    ws = new WebSocket(WS_URL);

    ws.addEventListener("open", () => {
        wsReady = true;
        wsQueue.splice(0).forEach(msg => ws.send(JSON.stringify(msg)));
    });

    ws.addEventListener("message", (event) => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }

        if (data.action === "online") {
            renderOnline(data);
        }
    });

    ws.addEventListener("close", () => {
        wsReady = false;
        setTimeout(wsConnect, 3000);
    });

    ws.addEventListener("error", () => ws.close());
}

function wsSend(msg) {
    if (wsReady && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    } else {
        wsQueue.push(msg);
    }
}

wsConnect();

function renderOnline(data) {
    const pill = document.querySelector(".status-pill");
    const countEl = document.getElementById("online-count");
    const listEl = document.getElementById("online-list");
    const headerEl = document.getElementById("online-header");

    if (countEl) countEl.textContent = ` ${data.count} players online`;
    else if (pill) pill.childNodes[2].textContent = ` ${data.count} players online`;

    if (listEl) {
        headerEl.textContent = `Online Players ${data.online ? "(" + data.online.length + ")" : ""}`;

        if (!data.online || data.online.length === 0) {
            listEl.innerHTML = `<li class="opacity-40 italic text-sm px-2 py-1">Nobody is online...</li>`;
        } else {
            const statusOrder = { playing: 0, home: 1, out: 2, offline: 3 };

            listEl.innerHTML = data.online
                .slice()
                .sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99))
                .map((u) => {
                    const dotColor = {
                        playing: '#66FF66',
                        out: '#E0AA17',
                        home: '#1E90FF',
                        offline: '#FF6666',
                    }[u.status] ?? '#AAAAAA';

                    return `
                        <a href="${u.on === "home page" || u.on === "editing settings" ? "/" : "/lesson/?id=" + (u.on.match(/#(\d+)/)?.[1] || "")}" 
                        class="group flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all duration-150 ease-in-out ${u.player.id === session.id ? `bg-[${dotColor}]/25 hover:bg-[${dotColor}]/50` : "hover:bg-white/5"}">
                        
                        <span class="w-1.5 h-1.5 rounded-full bg-[${dotColor}] shrink-0"></span>
                        
                        <div class="flex flex-col justify-center">
                            <span class="leading-none">
                                ${u.player.username || u.player.id} 
                                ${u.player.id === session.id ? '<span class="opacity-50 text-xs">(you)</span>' : ''}
                            </span>
                            
                            <div class="overflow-hidden transition-all duration-200 ease-in-out max-h-0 opacity-0 group-hover:[max-height:calc(var(--show-id)*20px)] group-hover:[opacity:calc(var(--show-id)*0.5)] group-hover:[margin-top:calc(var(--show-id)*4px)]">
                                <span class="text-[10px] block mt-0">
                                    ${u.player.id}
                                </span>
                            </div>
                        </div>

                        ${u.on ? `<span class="ml-auto text-xs opacity-40 pl-4">${u.status === "out" || u.status === "offline" ? "away, " : ""} ${u.on}</span>` : ""}
                        </a>
                    `;
                }).join("");
        }
    }
}

function leave() {
    isLeaving = true;
    wsSend({ action: "bye", player: session });
    wsSend({ action: "log", player: session, message: `left ${page}` });
}

function sendPing() {
    const tabbed = document.visibilityState !== "visible";
    const onGame = page !== "home page" && page !== "editing settings";

    let status;
    if (!tabbed && onGame) status = "playing";
    else if (!tabbed && !onGame) status = "home";
    else if (tabbed && onGame) status = "out";
    else status = "offline";

    wsSend({ action: "ping", player: session, status, on: page });
}

function sendLog(message) {
    wsSend({ action: "log", player: session, message });
}

function sendSuggestion(suggestion) {
    wsSend({ action: "suggest", player: session, suggestion });
}

function checkForUpdates() {
    fetch(`/version.txt`)
        .then(response => response.text())
        .then((response) => {
            if (version && version !== response) {
                window.location.reload();
            } else {
                version = response;
            }
        })
}

function updateRemainingTime() {
    const now = new Date();
    const currentSeconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    const displayElement = document.getElementById('period-remaining');

    let currentPeriod = schedule.find(p => {
        const [sH, sM] = p.start.split(':').map(Number);
        const [eH, eM] = p.end.split(':').map(Number);
        const startSec = (sH * 3600) + (sM * 60);
        const endSec = (eH * 3600) + (eM * 60);
        return currentSeconds >= startSec && currentSeconds < endSec;
    });

    if (currentPeriod) {
        const [eH, eM] = currentPeriod.end.split(':').map(Number);
        const endSec = (eH * 3600) + (eM * 60);
        const remainingSec = endSec - currentSeconds;

        displayElement.classList.remove("hidden");

        if (remainingSec < 60) {
            displayElement.innerHTML = `<b>${remainingSec} seconds</b> until the end of ${currentPeriod.name}`;
        } else {
            const remainingMin = Math.ceil(remainingSec / 60);
            displayElement.innerHTML = `<b>${remainingMin} minutes</b> until the end of ${currentPeriod.name}`;
        }
    } else {
        displayElement.classList.add("hidden");
    }
}

function toggleFilterMenu() {
    const button = document.getElementById("filter");
    const menu = document.getElementById("filter-menu");
    if (!menu) return;

    const isOpen = menu.style.display === "block";

    if (isOpen) {
        button.style.borderColor = "";
        button.style.boxShadow = "";
        menu.style.opacity = "0";
        menu.style.transform = "scale(0.92) translateY(-6px)";
        setTimeout(() => menu.style.display = "none", 150);
        return;
    }

    button.style.borderColor = "var(--color-theme)";
    button.style.boxShadow = "0 0 10px var(--color-theme)";
    menu.style.display = "block";
    menu.style.opacity = "0";
    menu.style.transform = "transform";

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            menu.style.opacity = "1";
            menu.style.transform = "scale(1) translateY(0)";
        });
    });
    
    const close = (e) => {
        if (button && button.contains(e.target)) return;
        if (menu.contains(e.target)) return;
        button.style.borderColor = "";
        button.style.boxShadow = "";
        menu.style.opacity = "0";
        menu.style.transform = "scale(0.92) translateY(-6px)";
        setTimeout(() => menu.style.display = "none", 150);
        document.removeEventListener("mousedown", close);
    };

    setTimeout(() => document.addEventListener("mousedown", close), 150);
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

    sendPing();

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

function submitSuggestion() {
    const input = document.getElementById("suggestion");
    const button = document.getElementById("suggest");
    if (!input) return;
    if (suggestDebounce) return;
    suggestDebounce = true;

    function result(color) {
        input.style.borderColor = color;
        input.style.boxShadow = `0 0 10px ${color}`;
        button.style.borderColor = color;
        button.style.boxShadow = `0 0 10px ${color}`;
        return setTimeout(() => {
            input.style.borderColor = "";
            input.style.boxShadow = "";
            button.style.borderColor = "";
            button.style.boxShadow = "";
            suggestDebounce = false;
        }, 2500);
    }

    const suggestion = input.value.trim();
    if (suggestion === "") return result("#FF6666");

    sendSuggestion(suggestion);
    input.value = "";
    return result("#66FF66");
}

function injectNavbar(html) {
    const el = document.getElementById("navbar");
    if (el) el.innerHTML = html;
}

function getTheme() {
    let theme = localStorage.getItem("theme");

    if (!theme || !Object.values(THEMES).includes(theme)) {
        theme = THEMES.default;
        localStorage.setItem("theme", theme);
    }

    return theme;
}

function loadTheme() {
    let currentTheme = getTheme();
    if (currentTheme === "#FFF") {
        document.documentElement.style.setProperty("--color-bg", "#111111");
        document.documentElement.style.setProperty("--color-accent", "#161616");
        document.documentElement.style.setProperty("--color-light", "#222222");
        document.documentElement.style.setProperty("--color-lighter", "#262626");
        document.documentElement.style.setProperty("--color-theme", "#1E90FF");
    } else {
        document.documentElement.style.setProperty("--color-bg", `color-mix(in srgb, ${currentTheme} 15%, #000000)`);
        document.documentElement.style.setProperty("--color-accent", `color-mix(in srgb, ${currentTheme} 25%, #000000)`);
        document.documentElement.style.setProperty("--color-light", `color-mix(in srgb, ${currentTheme} 35%, #000000)`);
        document.documentElement.style.setProperty("--color-lighter", `color-mix(in srgb, ${currentTheme} 40%, #000000)`);
        document.documentElement.style.setProperty('--color-theme', currentTheme);
    }
}

loadTheme();

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

function getRecentlyPlayed() {
    let recentlyPlayed = localStorage.getItem("recentlyPlayed");

    if (!recentlyPlayed) {
        recentlyPlayed = {};
        localStorage.setItem("recentlyPlayed", JSON.stringify(recentlyPlayed));
    } else {
        recentlyPlayed = JSON.parse(recentlyPlayed);
    }

    return recentlyPlayed;
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

    const searchTerm = searchBar.value.toLowerCase().trim();   
    const activeTags = Array.from(document.querySelectorAll('.tag-checkbox:checked')).map(cb => cb.value.toLowerCase());
    const filtered = allLessons.filter(game => {
        const matchesTags = activeTags.every(tag => game.tags.includes(tag));
        const matchesSearch = game.name.toLowerCase().includes(searchTerm);
        return matchesTags && matchesSearch;
    });

    renderLessons(filtered);
}

function renderLessons(lessons) {
    lessons = lessons || allLessons;

    const container = document.getElementById("games");
    const recentlyPlayedCard = document.getElementById("recentlyPlayedCard");
    const recentlyPlayedContainer = document.getElementById("recentlyPlayed");
    const recentlyPlayed = getRecentlyPlayed();

    if (!container) return;

    if (lessons.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10 opacity-70">
                No lessons found matching your search.
            </div>
        `;
        return;
    } else if (Object.keys(recentlyPlayed).length === 0) {
        recentlyPlayedCard.classList.add("hidden");
    }

    container.innerHTML = "";
    recentlyPlayedContainer.innerHTML = "";

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
                        src="${lesson.image || (lesson.path && lesson.path + "/icon.png") || `https://lesson126.github.io/img/lesson-${lesson.id}.png`}"
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
        if (recentlyPlayed[lesson.id]) {
            recentlyPlayedContainer.appendChild(el.cloneNode(true));
        }
    });
}

try {
    cached = localStorage.getItem("navbar");
} catch (e) {}

if (cached) injectNavbar(cached);

fetch("/components/navbar.html")
    .then(res => {
        if (!res.ok) throw new Error("Failed to load navbar");
        return res.text();
    })
    .then(html => {
        if (html && html !== cached) {
            try { localStorage.setItem("navbar", html); } catch (e) {}
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
        } else if (path === "/settings" || path === "/settings/" || path == "/settings/index.html") {
            page = "editing settings";
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
        setInterval(sendPing, 15000);

        renderLessons();
    });

if (searchBar) {
    searchBar.addEventListener("input", () => {
        const searchTerm = searchBar.value.toLowerCase().trim();
        if (searchTerm === "") { renderLessons(); return; }

        const activeTags = Array.from(document.querySelectorAll('.tag-checkbox:checked')).map(cb => cb.value.toLowerCase());
        const filtered = allLessons.filter(game => {
            const matchesTags = activeTags.every(tag => game.tags.includes(tag));
            const matchesSearch = game.name.toLowerCase().includes(searchTerm);
            return matchesTags && matchesSearch;
        });

        renderLessons(filtered);
    });
}

if (checkboxes) {
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("change", () => {   
            const searchTerm = searchBar.value.toLowerCase().trim();   
            const activeTags = Array.from(document.querySelectorAll('.tag-checkbox:checked')).map(cb => cb.value.toLowerCase());
            const filtered = allLessons.filter(game => {
                const matchesTags = activeTags.every(tag => game.tags.includes(tag));
                const matchesSearch = game.name.toLowerCase().includes(searchTerm);
                return matchesTags && matchesSearch;
            });

            renderLessons(filtered);
        });
    });
}

if (usernameInput) {
    usernameInput.value = session.username;
    usernameInput.addEventListener("input", () => {
        const filter = ["nig", "n1g", "neckh"];
        const newUsername = usernameInput.value.trim();
        if (newUsername === "") return;
        if (filter.some(word => newUsername.toLowerCase().includes(word.toLowerCase()))) {
            usernameInput.value = "FriendlyStudent" + (Math.floor(Math.random() * (99999 - 11111 + 1)) + 11111);
            return;
        }

        session.username = usernameInput.value;
        localStorage.setItem("session", JSON.stringify(session));
    });
}

if (idInput) {
    idInput.value = session.id;
}

if (colorOptions) {
    for (const [theme, hex] of Object.entries(THEMES)) {
        const btn = document.createElement("button");
        btn.className = "w-8 h-8 rounded-full";
        btn.style.backgroundColor = hex === "#FFF" ? "#FFFFFF00" : hex;
        btn.style.border = getTheme() === hex ? "2px solid #fff" : "none";
        if (hex === "#FFF") {
            btn.style.backgroundImage = "url('/assets/icons/reset.png')";
            btn.style.backgroundRepeat = "no-repeat";
            btn.style.backgroundPosition = "center";
            btn.style.backgroundSize = "1.2em";
        }

        colorOptions.appendChild(btn);

        btn.addEventListener("click", () => {
            localStorage.setItem("theme", hex);
            document.documentElement.style.setProperty('--color-theme', hex);
            loadTheme();
            Array.from(colorOptions.children).forEach(child => {
                child.style.border = child === btn ? "2px solid #fff" : "none";
            });
        });
    }
}

window.addEventListener("beforeunload", () => leave);

window.addEventListener("pagehide", () => leave);

window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'f') document.documentElement.style.setProperty('--show-id', '1');
});

window.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'f') document.documentElement.style.setProperty('--show-id', '0');
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        if (!isLeaving) sendLog(`tabbed away from ${page}`);
    } else {
        isLeaving = false;
        sendLog(`tabbed back into ${page}`);
    }
});

checkForUpdates();
setInterval(checkForUpdates, 15000);

updateRemainingTime();
setInterval(updateRemainingTime, 1000);
