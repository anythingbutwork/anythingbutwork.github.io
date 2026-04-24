const params = new URLSearchParams(window.location.search);
const lessonId = Number(params.get("id"));

const frame = document.getElementById("lessonFrame");
const name = document.getElementById("lessonName");
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
        if (lessonGroup === null && !lesson.file) {
            return;
        }

        frame.src = lesson.file || `https://lesson126.github.io/lesson${lessonGroup}/lesson-${lessonId}`;
        name.textContent = lesson.name;
    });

fullscreen.addEventListener("click", () => {
    if (!document.fullscreenElement) {
        frame.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});