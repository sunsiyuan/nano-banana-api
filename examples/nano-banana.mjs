#!/usr/bin/env node
// Nano Banana 2.1 through HaryAI, OpenAI SDK: generate an image, then edit
// it. Saves both as PNGs in the current folder. Node 18+, one dependency
// (openai).
//
//   export HARYAI_KEY=...   # from your HaryAI account page
//   npm install openai
//   node examples/nano-banana.mjs
//
// API reference: https://haryai.com/docs/image.md

import { createReadStream, writeFileSync } from "node:fs";
import OpenAI from "openai";

const key = process.env.HARYAI_KEY;
if (!key) {
  console.error("Set HARYAI_KEY to your HaryAI API key.");
  process.exit(1);
}

const client = new OpenAI({ baseURL: "https://api.haryai.com/v1", apiKey: key });
const model = "gemini-nano-banana-2.1";

// 1. Generate. Replies are always b64_json; n is always 1.
const image = await client.images.generate({
  model,
  prompt: "A cup of green tea on a wooden table by a window, morning light",
  size: "1536x1024",
});
writeFileSync("tea.png", Buffer.from(image.data[0].b64_json, "base64"));
console.log("saved tea.png");

// 2. Edit. Multipart, like OpenAI's own edit endpoint. No masks: say what to
//    change in the prompt.
const edit = await client.images.edit({
  model,
  image: createReadStream("tea.png"),
  prompt: "Make the cup bright red, keep everything else the same.",
});
writeFileSync("tea-red.png", Buffer.from(edit.data[0].b64_json, "base64"));
console.log("saved tea-red.png");
