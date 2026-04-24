const params = new URLSearchParams(window.location.search);
const lessonId = Number(params.get("id"));

const frame = document.getElementById("lessonFrame");
const name = document.getElementById("lessonName");
const warning = document.getElementById("lessonWarning");
const warningText = document.getElementById("lessonWarningText");
const fullscreen = document.getElementById("fullscreen");

fetch("/lessons.json")
    .then(res => res.json())
    .then(data => {
        const lesson = data.lessons.find(l => l.id === lessonId);
        if (!lesson) {
            frame.src = "about:blank";
            console.error("Lesson not found");
            return;
        }

        const lessonGroup = lesson.lesson;
        if (lessonGroup === null && !lesson.path) {
            return;
        }

        frame.src = (lesson.path && lesson.path + "/game.html") || `https://lesson126.github.io/lesson${lessonGroup}/lesson-${lessonId}`;
        name.textContent = lesson.name;
        
        if (lesson.warning) {
            warningText.innerHTML = lesson.warning;
            warning.classList.remove("hidden");
        }
    });

fullscreen.addEventListener("click", () => {
    if (!document.fullscreenElement) {
        frame.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});