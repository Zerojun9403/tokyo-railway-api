import * as cheerio from "cheerio";
import fs from "node:fs";

const HTML_PATH = "keisei-682-7.html";

if (!fs.existsSync(HTML_PATH)) {
  console.error(`HTML file not found: ${HTML_PATH}`);
  process.exit(1);
}

const html = fs.readFileSync(HTML_PATH, "utf8");
const $ = cheerio.load(html);

console.log("================================");
console.log("Keisei Skyliner Container Audit");
console.log("================================");

const skyliners = $(".ekltip").filter((_, element) => {
  const trainType = $(element).find(".ekltraintype").text().trim();
  return trainType.includes("スカイライナー");
});

console.log(`Total Skyliner: ${skyliners.length}`);
console.log("");

skyliners.each((index, element) => {
  const row = $(element);
  const time = row.find(".ekldeptime").text().trim();
  const trainType = row
    .find(".ekltraintype")
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const destination = row.find(".ekldest").text().replace(/\s+/g, " ").trim();

  const parents: string[] = [];

  row.parents().each((_, parent) => {
    const tag = parent.tagName ?? "";
    const id = $(parent).attr("id");
    const className = $(parent).attr("class");

    if (!id && !className) {
      return;
    }

    const parts = [tag];

    if (id) {
      parts.push(`#${id}`);
    }

    if (className) {
      parts.push(`.${className.trim().split(/\s+/).filter(Boolean).join(".")}`);
    }

    parents.push(parts.join(""));
  });

  console.log("--------------------------------");
  console.log(`#${index + 1} ${time} | ${trainType} | ${destination}`);
  console.log("PARENTS:");

  if (parents.length === 0) {
    console.log("  (no parent id/class)");
  } else {
    parents.slice(0, 12).forEach((parent) => {
      console.log(`  ${parent}`);
    });
  }
});

console.log("");
console.log("================================");
console.log("Summary by parent signature");
console.log("================================");

const groups = new Map<
  string,
  {
    count: number;
    firstTime: string;
    lastTime: string;
  }
>();

skyliners.each((_, element) => {
  const row = $(element);
  const time = row.find(".ekldeptime").text().trim();

  const parentSignature = row
    .parents()
    .map((_, parent) => {
      const tag = parent.tagName ?? "";
      const id = $(parent).attr("id") ?? "";
      const className = $(parent).attr("class") ?? "";

      if (!id && !className) {
        return "";
      }

      return `${tag}${id ? `#${id}` : ""}${
        className
          ? `.${className.trim().split(/\s+/).filter(Boolean).join(".")}`
          : ""
      }`;
    })
    .get()
    .filter(Boolean)
    .slice(0, 6)
    .join(" > ");

  const current = groups.get(parentSignature);

  if (!current) {
    groups.set(parentSignature, {
      count: 1,
      firstTime: time,
      lastTime: time,
    });
    return;
  }

  current.count += 1;
  current.lastTime = time;
});

for (const [signature, info] of groups.entries()) {
  console.log("--------------------------------");
  console.log(`count: ${info.count}`);
  console.log(`first: ${info.firstTime}`);
  console.log(`last : ${info.lastTime}`);
  console.log(`parent: ${signature}`);
}
