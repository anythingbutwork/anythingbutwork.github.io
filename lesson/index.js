const params = new URLSearchParams(window.location.search);
const lessonId = Number(params.get("id"));

const frame = document.getElementById("lessonFrame");
const name = document.getElementById("lessonName");
const warning = document.getElementById("lessonWarning");
const warningText = document.getElementById("lessonWarningText");
const fullscreen = document.getElementById("fullscreen");

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

fetch("/lessons.json")
  .then((res) => res.json())
  .then((data) => {
    const lesson = data.lessons.find((l) => l.id === lessonId);
    if (!lesson) {
      frame.src = "about:blank";
      console.error("Lesson not found");
      return;
    }

    const lessonGroup = lesson.lesson;
    if (lessonGroup === null && !lesson.path) {
      return;
    }

    const targetUrl = `https://lesson126.github.io/lesson${lessonGroup}/lesson-${lessonId}/`; 
    frame.src = (lesson.path && lesson.path + "/game.html") || `https://logs-psvq.onrender.com/lesson?url=${encodeURIComponent(targetUrl)}`;
    name.textContent = lesson.name;

    if (lesson.warning) {
      warningText.innerHTML = lesson.warning;
      warning.classList.remove("hidden");
    }

    const recentlyPlayed = getRecentlyPlayed();
    recentlyPlayed[lessonId] = Date.now();
    localStorage.setItem("recentlyPlayed", JSON.stringify(recentlyPlayed));
  });

fullscreen.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    frame.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

window.addEventListener("message", (e) => {
  if (e.data?.type !== "storage") return;
  const { id, method, args } = e.data;
  let value = null;

  if (method === "getItem") value = localStorage.getItem(args[0]);
  else if (method === "setItem") localStorage.setItem(args[0], args[1]);
  else if (method === "removeItem") localStorage.removeItem(args[0]);
  else if (method === "clear")
    Object.keys(localStorage)
      .filter((k) => k.startsWith(args[0]))
      .forEach((k) => localStorage.removeItem(k));
  else if (method === "length")
    value = Object.keys(localStorage).filter((k) =>
      k.startsWith(args[0]),
    ).length;
  else if (method === "key") {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(args[0]));
    value = keys[args[1]] ?? null;
  }

  e.source.postMessage({ id, value }, "*");
});
