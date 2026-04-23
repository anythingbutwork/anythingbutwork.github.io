const fs = require("fs");

const raw = fs.readFileSync("./lessons.json", "utf-8");
const data = JSON.parse(raw.replace(/^\uFEFF/, ""));

function getLessonGroup(id) {
    if (id >= 1 && id <= 149) return 302;
    if (id >= 152 && id <= 320) return 306;
    if (id >= 321 && id <= 421) return 305;
    if (id >= 2001 && id <= 2093) return 89;
    if (id >= 2094 && id <= 2194) return 83;
    if (id >= 2195 && id <= 2306) return 85;
    if (id === 2307) return null;
    return null;
}

let lessons = data.lessons.map(lesson => {
    return {
        id : lesson.id,
        name: lesson.name,
        lesson: lesson.id !== null ? getLessonGroup(lesson.id) : null
    };
});

// sort by id
lessons.sort((a, b) => a.id - b.id);

fs.writeFileSync(
    "./lessons.json",
    JSON.stringify({ lessons }, null, 4),
    "utf-8"
);

console.log("Done: IDs extracted + lesson groups assigned");