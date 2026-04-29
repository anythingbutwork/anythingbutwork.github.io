tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"]
            },
            colors: {
                bg:      "rgb(var(--color-bg) / <alpha-value>)",
                accent:  "rgb(var(--color-accent) / <alpha-value>)",
                dark:    "rgb(var(--color-dark) / <alpha-value>)",
                light:   "rgb(var(--color-light) / <alpha-value>)",
                lighter: "rgb(var(--color-lighter) / <alpha-value>)",
                success: "rgb(var(--color-success) / <alpha-value>)",
                fail:    "rgb(var(--color-fail) / <alpha-value>)",
                warning: "rgb(var(--color-warning) / <alpha-value>)",
                theme:   "rgb(var(--color-theme) / <alpha-value>)",
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
const DISGUISES = {
    canvas: {
        icon: "/assets/icons/canvas.png",
        title: "Inbox"
    },
    clever: {
        icon: "/assets/icons/clever.png",
        title: "Clever | Portal"
    },
    focus: {
        icon: "/assets/icons/focus.png",
        title: "Student Info"
    },
    bigideas: {
        icon: "/assets/icons/bigideas.png",
        title: "Assignment Player"
    },
    studysync: {
        icon: "/assets/icons/studysync.png",
        title: "StudySync - Assignments"
    },
    mcgrawhill: {
        icon: "/assets/icons/mcgrawhill.png",
        title: "My Classes | McGraw Hill"
    }
};
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
const disguiseOptions = document.getElementById("disguise-options");
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
let online = [];
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
            online = data.online || [];
            renderOnline(data);
            updatePlayerCounts();
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

function updatePlayerCounts() {
    online.forEach(u => {
        const match = u.on?.match(/#(\d+)/);
        if (!match) return;
        const id = match[1];
        const el = document.getElementById(`playercount-${id}`);
        if (el) {
            const count = getOnline(id);
            el.querySelector(".playercount-num").textContent = count;
            el.classList.toggle("hidden", count === 0);
        }
    });
}

function getOnline(lessonId) {
    if (!online) return 0;

    return online.filter(u => {
        const match = u.on?.match(/#(\d+)/);
        return match && match[1] === String(lessonId);
    }).length;
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

function getDisguise() {
    let disguise = localStorage.getItem("disguise");

    if (!disguise || !DISGUISES[disguise]) {
        disguise = "canvas";
        localStorage.setItem("disguise", disguise);
    }

    return disguise;
}

function loadDisguise() {
    let currentDisguise = getDisguise();
    let disguise = DISGUISES[currentDisguise] || DISGUISES.canvas;
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    
    document.title = disguise.title;
    link.href = disguise.icon;
}

loadDisguise();

function getTheme() {
    let theme = localStorage.getItem("theme");

    if (!theme || !Object.values(THEMES).includes(theme)) {
        theme = THEMES.default;
        localStorage.setItem("theme", theme);
    }

    return theme;
}

function hexToChannels(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function darken(hex, t) {
    const n = parseInt(hex.replace("#", ""), 16);
    return `${Math.round(((n >> 16) & 255) * t)} ${Math.round(((n >> 8) & 255) * t)} ${Math.round((n & 255) * t)}`;
}

function loadTheme() {
    const theme = getTheme();
    const base = theme === "#FFF" ? "#1E90FF" : theme;
    const set = (k, v) => document.documentElement.style.setProperty(k, v);

    set("--color-theme",   hexToChannels(base));
    set("--color-bg",      theme === "#FFF" ? "17 17 17"  : darken(base, 0.15));
    set("--color-accent",  theme === "#FFF" ? "22 22 22"  : darken(base, 0.25));
    set("--color-dark",    theme === "#FFF" ? "26 26 26"  : darken(base, 0.30));
    set("--color-light",   theme === "#FFF" ? "34 34 34"  : darken(base, 0.35));
    set("--color-lighter", theme === "#FFF" ? "38 38 38"  : darken(base, 0.40));
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

        const playercount = getOnline(lesson.id);

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

                    <div class="absolute bottom-2 right-2 z-20 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium${playercount > 0 ? "" : " hidden"}" id="playercount-${lesson.id}">
                        <img src="/assets/icons/person.png" class="w-3 h-3 object-contain" />
                        <span class="playercount-num">${playercount}</span>
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

    const cols = window.innerWidth >= 1024 ? 8 : window.innerWidth >= 768 ? 6 : 4;
    Object.entries(recentlyPlayed)
        .sort((a, b) => b[1] - a[1])
        .slice(0, cols)
        .forEach(([id]) => {
            const el = container.querySelector(`[data-lesson="${id}"]`);
            if (el) recentlyPlayedContainer.appendChild(el.cloneNode(true));
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
        let isCurrent = getTheme() === hex;
        let isDefault = hex === "#FFF";

        const btn = document.createElement("button");
        btn.className = [
            "w-8 h-8 rounded-full cursor-pointer",
            "transition-all duration-200",
            "hover:opacity-100 hover:scale-110",
            isDefault ? "bg-transparent bg-center bg-no-repeat bg-[length:1.2em]" : "",
            isCurrent ? "opacity-100 scale-110 shadow-[0_0_25px_var(--color-theme)]" : "opacity-50",
        ].join(" ");

        if (!isDefault) btn.style.backgroundColor = hex;
        if (isDefault) btn.style.backgroundImage = "url('/assets/icons/reset.png')";

        colorOptions.appendChild(btn);

        btn.addEventListener("click", () => {
            localStorage.setItem("theme", hex);
            document.documentElement.style.setProperty('--color-theme', hex);
            loadTheme();

            Array.from(colorOptions.children).forEach(child => {
                const active = child === btn;
                child.classList.toggle("opacity-100", active);
                child.classList.toggle("scale-110", active);
                child.classList.toggle("shadow-[0_0_25px_var(--color-theme)]", active);
                child.classList.toggle("opacity-50", !active);
            });
        });
    }
}

if (disguiseOptions) {
    for (const [name, disguise] of Object.entries(DISGUISES)) {
        let isCurrent = getDisguise() === name;

        const btn = document.createElement("button");
        btn.className = [
            "flex items-center gap-2 rounded-full px-3 h-8 bg-accent cursor-pointer",
            "transition-all duration-200 hover:opacity-100",
            isCurrent ? "bg-theme opacity-100 shadow-[0_0_10px_var(--color-theme)]" : "opacity-50",
        ].join(" ");

        const icon = document.createElement("span");
        icon.className = `w-[1.2em] h-[1.2em] bg-[url('${disguise.icon}')] bg-center bg-no-repeat bg-contain inline-block shrink-0`;

        const label = document.createElement("span");
        label.className = "text-xs font-medium text-white whitespace-nowrap";
        label.textContent = disguise.title;

        btn.appendChild(icon);
        btn.appendChild(label);
        disguiseOptions.appendChild(btn);

        btn.addEventListener("click", () => {
            localStorage.setItem("disguise", name);
            loadDisguise();
            Array.from(disguiseOptions.children).forEach(child => {
                const active = child === btn;
                child.classList.toggle("opacity-100", active);
                child.classList.toggle("shadow-[0_0_10px_var(--color-theme)]", active);
                child.classList.toggle("opacity-50", !active);
                child.classList.toggle("bg-theme", active);
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
