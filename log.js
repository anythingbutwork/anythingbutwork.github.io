(async () => {
    const path = window.location.pathname;
    let message;

    if (path === "/" || path === "/index.html") {
        message = "accessed home page";
    } else {
        const match = path.match(/\/lesson\/lesson-(\d+)\.html/);
        if (match) {
            const gameId = match[1];
            try {
                const res = await fetch("/lessons.json");
                const data = await res.json();
                const lesson = data.lessons.find(l => l.file === `lesson-${gameId}.html`);
                const gameName = lesson ? lesson.name : "Unknown";
                message = `accessed ${gameName} (${gameId})`;
            } catch {
                message = `accessed lesson ${gameId} (lessons.json unavailable)`;
            }
        } else {
            message = `accessed unknown page: ${path}`;
        }
    }

    fetch("https://picklesmoothie.netlify.app/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
    });
})();