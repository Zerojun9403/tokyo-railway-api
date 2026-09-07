import fs from "node:fs";
import * as cheerio from "cheerio";

const html = fs.readFileSync(
  "keisei-682-7.html",
  "utf-8",
);

const $ = cheerio.load(html);

const skyliners: Array<{
  departureTime: string;
  trainType: string;
  destination: string;
}> = [];

$(".ekltip").each((_, element) => {
  const departureTime = $(element)
    .find(".ekldeptime")
    .text()
    .trim();

  const trainType = $(element)
    .find(".ekltraintype")
    .text()
    .trim();

  const destination = $(element)
    .find(".ekldest")
    .text()
    .trim();

  if (trainType.includes("スカイライナー")) {
    skyliners.push({
      departureTime,
      trainType,
      destination,
    });
  }
});

console.log("================================");
console.log("Keisei Skyliner Parser Test");
console.log("================================");
console.log(`Total Skyliner: ${skyliners.length}`);
console.log("");

for (const train of skyliners) {
  console.log(
    `${train.departureTime} | ${train.trainType} | ${train.destination}`,
  );
}
