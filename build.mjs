#!/usr/bin/env node
// Builds README.md and README.zh-CN.md. Every price, the discount, the
// signup gift, the model table, the curl examples, the size rule, the
// billing note and the error table are read from the public pages below at
// build time, so nothing is typed twice. Run: node build.mjs
// (Node 18 or later, free GETs only)
//
// SITE overrides the base URL (default https://haryai.com) so this can be
// built against a local site before the content ships, e.g.:
//   SITE=http://localhost:3411 node build.mjs
// Links in the generated README always point at https://haryai.com, with
// UTM on site pages (not on .md/.txt docs).

import { readFile, writeFile } from "node:fs/promises";

const SITE = process.env.SITE || "https://haryai.com";
const LIVE = "https://haryai.com";
const LLMS = `${SITE}/llms.txt`;
const IMAGE_MD = `${SITE}/docs/image.md`;
const CAMPAIGN = "nano-banana-api";
// Site pages carry UTM; the docs (.md / .txt) don't. Always the live host.
const page = (path) => `${LIVE}${path}?utm_source=github&utm_medium=readme&utm_campaign=${CAMPAIGN}`;
const doc = (path) => `${LIVE}${path}`;

const get = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.text();
};
const must = (m, what) => {
  if (!m) throw new Error(`not found: ${what}`);
  return m;
};
const flat = (s) => s.replace(/\s+/g, " ").trim();
const unescape = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

// ---- llms.txt: the Images section between the price markers
const llms = await get(LLMS);
const prices = must(llms.match(/PRICES-BEGIN[^\n]*\n([\s\S]*?)<!-- PRICES-END/), "price markers")[1];
const gift = Number(must(llms.match(/gets[\s>]+\$([\d.]+)[\s>]+of balance/), "signup gift")[1]);
const imagesSection = must(prices.match(/\*\*Images\*\*[\s\S]*?(?=\nImage API:)/), "Images section")[0];

// name, id, discount share, tiers — Nano Banana only (Seedream is out of scope)
const models = []; // [{ name, id, share, tiers: { "1K": { ours, official, oursStr, officialStr } } }]
for (const [, name, id, share, tiersStr] of imagesSection.matchAll(
  /^- (Nano Banana[^(]*?) \(([\w.-]+)\), (\d+)% of the official price: (.+)$/gm,
)) {
  const tiers = {};
  for (const [, size, ours, official] of tiersStr.matchAll(/(\d+K) \$([\d.]+) \(official \$([\d.]+)\)/g))
    tiers[size] = { ours: Number(ours), official: Number(official), oursStr: ours, officialStr: official };
  models.push({ name: name.trim(), id, share: Number(share), tiers });
}
if (models.length !== 2) throw new Error(`expected 2 Nano Banana models in llms.txt, got ${models.length}`);
const banana21 = must(models.find((m) => m.name.includes("2.1")), "Nano Banana 2.1 price row");
const banana2 = must(
  models.find((m) => m !== banana21),
  "Nano Banana 2 price row",
);
if (banana21.share !== banana2.share) throw new Error(`Nano Banana 2.1 and 2 discounts differ (${banana21.share}% vs ${banana2.share}%), update the copy that assumes one shared discount`);
const off = 100 - banana21.share; // en: "50% off"
const zhZhe = banana21.share % 10 === 0 ? `${banana21.share / 10} 折` : `${banana21.share} 折`; // zh: "5 折"

// 2.1 vs 2, per tier, computed from the data (do not assume "half" everywhere)
const commonTiers = Object.keys(banana21.tiers).filter((t) => banana2.tiers[t]);
if (!commonTiers.length) throw new Error("Nano Banana 2.1 and 2 share no size tier to compare");
const ratioGroups = new Map(); // rounded ratio -> [tiers]
for (const t of commonTiers) {
  const ratio = Math.round((banana21.tiers[t].ours / banana2.tiers[t].ours) * 10000) / 10000;
  if (!ratioGroups.has(ratio)) ratioGroups.set(ratio, []);
  ratioGroups.get(ratio).push(t);
}
const ratioClauseEn = (r) => (r === 0.5 ? "costs half as much as Nano Banana 2" : `costs ${Math.round(r * 100)}% as much as Nano Banana 2`);
const ratioClauseZh = (r) => (r === 0.5 ? "是 Nano Banana 2 的一半" : `是 Nano Banana 2 的 ${Math.round(r * 100)}%`);
const ratioSentenceEn = [...ratioGroups.entries()]
  .map(([r, tiers]) => `at ${tiers.join(" and ")} it ${ratioClauseEn(r)}`)
  .join("; ");
const ratioSentenceZh = [...ratioGroups.entries()]
  .map(([r, tiers]) => `${tiers.join("、")} 的价格${ratioClauseZh(r)}`)
  .join("，");

// ---- docs/image.md: the models table, the Nano Banana OpenAI Images
// section (curl blocks, size rule, n, edits), billing, errors
const md = await get(IMAGE_MD);
const tableRows = [...md.matchAll(/^\| `([\w.-]+)` \| ([^|]+) \| ([^|]+) \| ([^|]+) \|$/gm)]
  .map(([, id, desc, sizes, formats]) => ({ id, desc: desc.trim(), sizes: sizes.trim(), formats: formats.trim() }))
  .filter((r) => r.desc.startsWith("Nano Banana"));
if (tableRows.length !== 2) throw new Error(`expected 2 Nano Banana rows in docs/image.md models table, got ${tableRows.length}`);
const rowOf = (id) => must(tableRows.find((r) => r.id === id), `models table row for ${id}`);

const blocks = [...md.matchAll(/```sh\n([\s\S]*?)```/g)].map((m) => m[1].trimEnd());
if (blocks.length !== 5) throw new Error(`expected 5 sh blocks in docs/image.md, got ${blocks.length}`);
const [, nanoGenerate, nanoEdit, geminiGenerate] = blocks;
if (!geminiGenerate.includes("/v1beta/models/")) throw new Error("4th sh block in docs/image.md is not the Gemini generateContent example");
const geminiNote = flat(must(md.match(/Base URL: `https:\/\/api\.haryai\.com\/v1beta`\. The key goes in `x-goog-api-key`\s+\(or `Authorization: Bearer`\)\./), "Gemini base URL note")[0]);

const nanoSection = must(
  md.match(/## Nano Banana 2\.1 and 2: OpenAI Images format\n([\s\S]*?)\n## Nano Banana 2\.1 and 2: Gemini format/),
  "Nano Banana OpenAI Images section",
)[1];
const replyNote = flat(must(nanoSection.match(/Reply:[\s\S]*?never as a URL\./), "reply note")[0]);
const sizeRule = flat(must(nanoSection.match(/- `size`:([\s\S]*?)\n- `n`:/), "size rule")[1]);
const nRule = flat(must(nanoSection.match(/- `n`:([\s\S]*?)\n- Edits:/), "n rule")[1]);
const editsRule = flat(must(nanoSection.match(/- Edits:([\s\S]*?)\n\n```sh/), "edits rule")[1]);

const billingNote = flat(must(md.match(/- (Nano Banana 2\.1 and 2:[\s\S]*?)\n- Prices:/), "billing note")[1]);
const errorsSection = must(md.match(/## Errors\n([\s\S]*)$/), "errors section")[1];
const errTables = [...errorsSection.matchAll(/((?:^\|.*\|\n?)+)/gm)].map((m) => m[1].trimEnd());
if (errTables.length !== 1) throw new Error(`expected 1 error table in docs/image.md, got ${errTables.length}`);
const refusalNote = flat(must(errorsSection.match(/Upstream refusals[\s\S]*$/), "upstream refusal note")[0]);

// The zh copy below is hand-written (natively, not a translation of the en
// prose) to keep the "zh is written natively" rule. Each piece it restates
// is guarded here against the exact en text it was written from, so a wording
// change in docs/image.md fails the build instead of silently going stale.
const expect = (actual, expected, what) => {
  if (actual !== expected) throw new Error(`${what} changed in docs/image.md, update the zh copy in build.mjs: ${actual}`);
};
expect(
  replyNote,
  'Reply: `{"data": [{"b64_json": "…"}]}`. The image always comes back as `b64_json`, never as a URL.',
  "reply note",
);
expect(
  sizeRule,
  "`WIDTHxHEIGHT` picks the nearest aspect ratio and tier (`1024x1024` is 1K square, `1536x1024` is 2K 3:2). Or send `aspect_ratio` (`1:1`, `3:2`, `16:9`, `9:16`, …) and `image_size` (`1K`, `2K`, `4K`) directly. Without any of them: 1K, square for a new image, the shape of the input image for an edit.",
  "size rule",
);
expect(nRule, "1 only.", "n rule");
expect(geminiNote, "Base URL: `https://api.haryai.com/v1beta`. The key goes in `x-goog-api-key` (or `Authorization: Bearer`).", "Gemini base URL note");
expect(
  editsRule,
  "`POST /v1/images/edits`, multipart with `image` (one or more files) and `prompt`, as with OpenAI. Masks are not supported; describe the change in the prompt.",
  "edits rule",
);
expect(
  billingNote,
  "Nano Banana 2.1 and 2: per token. An output image is a fixed number of tokens per size (2.1: 1K 1,120, 2K 1,680, 4K 3,780; 2: 1K 1,120, 2K 1,680, 4K 2,520); input text and images are billed as input tokens. Nano Banana 2.1 thinks before it draws; those tokens are billed as text output (about a tenth on top of a 2K image).",
  "billing note",
);
expect(
  refusalNote,
  "Upstream refusals (a bad field, a prompt or image the model's content moderation blocks) come back with the upstream message and are not charged.",
  "upstream refusal note",
);

const replyNoteZh = '返回：`{"data": [{"b64_json": "…"}]}`。图片总是 `b64_json`，不会给链接。';
const sizeRuleZh =
  "写成宽x高，会自动匹配最接近的画面比例和档位（`1024x1024` 是 1K 正方形，`1536x1024` 是 2K 3:2）。也可以直接传 `aspect_ratio`（`1:1`、`3:2`、`16:9`、`9:16` 等）和 `image_size`（`1K`、`2K`、`4K`）。什么都不传时，出图都是 1K：新生成的是正方形，编辑的跟原图比例一样。";
const nRuleZh = "只能是 1，一次出一张。";
const editsRuleZh =
  "调用 `POST /v1/images/edits`，multipart 表单，带一个或多个 `image` 文件和一个 `prompt`，跟 OpenAI 自己的编辑接口一样。不支持蒙版，想改哪里用文字说清楚。";
const billingNoteZh =
  "Nano Banana 2.1 和 2 按 token 计费：每张输出图片按尺寸收固定的 token 数（2.1：1K 1,120、2K 1,680、4K 3,780；2：1K 1,120、2K 1,680、4K 2,520），输入的文字和图片按输入 token 计费。Nano Banana 2.1 还会先思考再出图，这部分思考 token 按文字输出计费，按 2K 图片算，大约在图片价格上再多十分之一。";
const refusalNoteZh = "上游拒绝（字段有问题，或者提示词、图片被模型的内容审核挡下）会带着上游的报错信息返回，不收费。";

// ---- the Nano Banana 2.1 model page: the agent prompt (first <pre><code>)
// and how many images the signup gift buys (the site counts thinking and
// input tokens, so this is not gift / table price)
const pageEn = await get(`${SITE}/en/nano-banana-2-1`);
const pageZh = await get(`${SITE}/zh/nano-banana-2-1`);
const agentPrompt = (html, path) =>
  unescape(must(html.match(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/), `prompt on ${path}`)[1]).trim();
const promptEn = agentPrompt(pageEn, "/en/nano-banana-2-1");
const promptZh = agentPrompt(pageZh, "/zh/nano-banana-2-1");
const giftImages = must(pageEn.match(/Enough for about (\d+) images/), "gift image count on /en/nano-banana-2-1")[1];
const giftImagesZh = must(pageZh.match(/够出大约 ?(\d+) ?张图/), "gift image count on /zh/nano-banana-2-1")[1];
if (giftImages !== giftImagesZh) throw new Error(`gift image count differs: en ${giftImages}, zh ${giftImagesZh}`);

// ---- guard: the example scripts' default model must still exist
for (const file of ["examples/nano_banana.py", "examples/nano-banana.mjs"]) {
  const script = await readFile(file, "utf8");
  const scriptModel = must(script.match(/\bmodel\s*=\s*"([\w.-]+)"/), `${file} default model`)[1];
  if (!models.some((m) => m.id === scriptModel)) throw new Error(`${file} default model ${scriptModel} is not in llms.txt`);
}

const usd = (s) => `$${s}`;
const today = new Date().toLocaleDateString("sv"); // YYYY-MM-DD, local

const modelTable = (h) =>
  [
    `| ${h.join(" | ")} |`,
    `|${h.map(() => "---").join("|")}|`,
    ...models.map((m) => `| ${m.name} | \`${m.id}\` | ${rowOf(m.id).sizes} | ${rowOf(m.id).formats} |`),
  ].join("\n");
const priceTable = (h) =>
  [
    `| ${h.join(" | ")} |`,
    `|${h.map(() => "---").join("|")}|`,
    ...models.flatMap((m) => Object.entries(m.tiers).map(([size, p]) => `| ${m.name} | ${size} | ${usd(p.officialStr)} | ${usd(p.oursStr)} |`)),
  ].join("\n");
const sh = (s) => "```sh\n" + s + "\n```";


// ================================================================ English
const en = `# Nano Banana API through HaryAI

[中文](README.zh-CN.md)

Use Nano Banana 2.1 and Nano Banana 2 through [HaryAI](${page("/en/nano-banana-openai-api")}) at ${off}% off Google's official price. No Google Cloud account needed: one HaryAI key is enough. Both work with OpenAI's images API (\`/v1/images/generations\`, \`/v1/images/edits\`) and the OpenAI SDKs: point the base URL at \`https://api.haryai.com/v1\`, pass a Nano Banana model name, and nothing else in your code changes. Both also work with Gemini's own \`generateContent\`.

This repo shows how to call it: curl, short Python and Node scripts, and answers to common questions. The full reference is [docs/image.md](${doc("/docs/image.md")}).

## Models

${modelTable(["Model", "Model id", "Sizes", "Works with"])}

Replies are always \`b64_json\`. \`n\` is always 1, one image per request. There is no mask for edits: describe the change in the prompt instead.

## Price per image

US dollars. ${off}% off Google's official price, paid from your HaryAI balance. A request that fails is not charged.

${priceTable(["Model", "Size", "Official", "HaryAI"])}

Nano Banana 2.1 is Google's replacement for Nano Banana 2. On HaryAI, ${ratioSentenceEn}. Current prices: [Pricing](${page("/en/pricing")}).

## Quick start

1. Sign up at [haryai.com](${page("/en/signup")}). A verified new account gets $${gift.toFixed(2)} of balance, enough for about ${giftImages} images.
2. Copy your API key from the account page and set it: \`export HARYAI_KEY=...\`

Image generation is synchronous: one request returns the image.

### Generate

${sh(nanoGenerate)}

${replyNote}

- \`size\`: ${sizeRule}
- \`n\`: ${nRule}

### Edit

- Edits: ${editsRule}

${sh(nanoEdit)}

### Python (openai SDK)

[\`examples/nano_banana.py\`](examples/nano_banana.py) generates an image, then edits it, saving both as PNGs. It reads the key from \`HARYAI_KEY\`.

${sh(`export HARYAI_KEY=...
pip install openai
python examples/nano_banana.py`)}

### Node 18 (openai npm SDK)

[\`examples/nano-banana.mjs\`](examples/nano-banana.mjs) does the same.

${sh(`export HARYAI_KEY=...
npm install openai
node examples/nano-banana.mjs`)}

## Questions

### How do I call the Nano Banana API with the OpenAI SDK?

Point the OpenAI SDK's base URL at \`https://api.haryai.com/v1\` and your HaryAI key as the API key, then call \`client.images.generate(model="${banana21.id}", prompt=..., size=...)\` or \`client.images.edit(model=..., image=..., prompt=...)\`. Nothing else in your code changes. Tools that only speak curl use the same paths, \`/v1/images/generations\` and \`/v1/images/edits\`.

### How much does the Nano Banana API cost per image?

${models.map((m) => `${m.name}: ${Object.entries(m.tiers).map(([size, p]) => `${size} ${usd(p.oursStr)}`).join(", ")} (official ${Object.entries(m.tiers).map(([size, p]) => `${size} ${usd(p.officialStr)}`).join(", ")}).`).join(" ")} That is ${off}% off Google's official price.

### Do I need a Google Cloud or Gemini account?

No. Your HaryAI key is enough, and you pay as you go from your HaryAI balance.

### Can I edit images?

Yes, with \`POST /v1/images/edits\`, multipart, the same as OpenAI's own edit endpoint. Send one or more \`image\` files and a \`prompt\` describing the change. There is no mask: say what to change in words instead.

### Do I get a link back, or the image itself?

The image itself, as \`b64_json\`. Nano Banana never returns a URL, so decode and save the bytes yourself; there is nothing that expires.

### How many images can I get per request?

One. \`n\` is always 1. For more, send several requests at once.

### Which tools work with this?

Any tool that lets you set an OpenAI base URL and type a model name yourself can use it: for example the OpenAI Python and Node SDKs. A tool that only offers its own fixed list of OpenAI models, with no base URL field, can't reach Nano Banana.

### Nano Banana 2.1 vs Nano Banana 2: which should I use?

Nano Banana 2.1 for new work. Google made it the replacement for Nano Banana 2, and it is better at design, editing and keeping faces consistent. It is also cheaper: ${ratioSentenceEn}. Nano Banana 2 stays for anyone already using it.

### Is a failed request charged?

No. A request that the model's content moderation turns down, or that fails for any other reason, is not charged.

### How do I use it from Claude Code or Codex?

Put your key in \`HARYAI_KEY\`, then paste this to the agent with what you want in the last line. It writes a short script, calls the API and saves the PNG to the current folder.

\`\`\`text
${promptEn}
\`\`\`

Guide: [Nano Banana 2.1](${page("/en/nano-banana-2-1")}).

### Does Gemini's own format work too?

Yes, on the same key and the same balance. ${geminiNote}

${sh(geminiGenerate)}

### How is billing calculated?

${billingNote} ${refusalNote}

### What do the errors mean?

${errTables[0]}

Details: [docs/image.md](${doc("/docs/image.md")}).

## Links

- [Nano Banana in OpenAI format](${page("/en/nano-banana-openai-api")}), [Nano Banana 2.1](${page("/en/nano-banana-2-1")}), [Nano Banana 2](${page("/en/nano-banana-2")})
- [Pricing](${page("/en/pricing")})
- [Image API reference](${doc("/docs/image.md")}), [llms.txt](${doc("/llms.txt")})
- [seedance-2.5-api](https://github.com/sunsiyuan/seedance-2.5-api): the Seedance 2.5 video API through HaryAI
- [seedance-skill](https://github.com/sunsiyuan/seedance-skill): Seedance 2.5 as a Claude Code and Codex skill
- [seedance-comfyui](https://github.com/sunsiyuan/seedance-comfyui): Seedance 2.5 in ComfyUI (in ComfyUI Manager)
- [n8n-nodes-haryai](https://github.com/sunsiyuan/n8n-nodes-haryai): Seedance 2.5 in n8n (npm \`n8n-nodes-haryai\`)
- [deepseek-codex-claude-code](https://github.com/sunsiyuan/deepseek-codex-claude-code): DeepSeek V4 in Codex and Claude Code

## License

MIT. See [LICENSE](LICENSE).

Prices as of ${today}.

<!-- Generated by build.mjs on ${today} from ${LLMS} (Images section between the price markers), ${IMAGE_MD} and the agent prompt and signup-gift image count on ${SITE}/en/nano-banana-2-1. Edit build.mjs, not this file. -->
`;

// ================================================================ 中文
const zh = `# 通过 HaryAI 调用 Nano Banana API

[English](README.md)

在 [HaryAI](${page("/zh/nano-banana-openai-api")}) 用 Nano Banana 2.1 和 Nano Banana 2，价格是 Google 官方价 ${zhZhe}。不用开 Google Cloud 账号，一个 HaryAI 的 key 就够了。两个模型都支持 OpenAI 的图片接口（\`/v1/images/generations\`、\`/v1/images/edits\`）和 OpenAI 的 SDK：接口地址填 \`https://api.haryai.com/v1\`，模型名换成 Nano Banana 的名字，代码其它地方不用改。两个模型也支持 Gemini 自己的 \`generateContent\` 格式。

这个仓库讲怎么调用：curl 示例、Python 和 Node 的小脚本，还有常见问题的回答。完整接口文档见 [docs/image.md](${doc("/docs/image.md")})。

## 模型

${modelTable(["模型", "模型名", "尺寸", "支持接口"])}

返回的图片都是 \`b64_json\`。\`n\` 只能是 1，一次出一张。编辑不支持蒙版，想改哪里，在提示词里用文字说清楚。

## 每张价格

单位美元，是 Google 官方价的 ${zhZhe}，从 HaryAI 余额扣费。请求失败不扣费。

${priceTable(["模型", "尺寸", "官方价", "HaryAI"])}

Nano Banana 2.1 是 Google 推出的新模型，用来取代 Nano Banana 2。在 HaryAI 上，${ratioSentenceZh}。最新价格见 [价格](${page("/zh/pricing")})。

## 快速开始

1. 在 [haryai.com](${page("/zh/signup")}) 注册。新账号验证邮箱后送 $${gift.toFixed(2)} 余额，够出大约 ${giftImages} 张图。
2. 在账户页复制 API key，设成环境变量：\`export HARYAI_KEY=...\`

图片生成是同步的：一个请求直接返回图片。

### 生成

${sh(nanoGenerate)}

${replyNoteZh}

- \`size\`：${sizeRuleZh}
- \`n\`：${nRuleZh}

### 编辑

- 编辑方式：${editsRuleZh}

${sh(nanoEdit)}

### Python（openai SDK）

[\`examples/nano_banana.py\`](examples/nano_banana.py) 先生成一张图，再编辑它，两张都存成 PNG。key 从环境变量 \`HARYAI_KEY\` 读取。

${sh(`export HARYAI_KEY=...
pip install openai
python examples/nano_banana.py`)}

### Node 18（openai npm SDK）

[\`examples/nano-banana.mjs\`](examples/nano-banana.mjs) 做同样的事。

${sh(`export HARYAI_KEY=...
npm install openai
node examples/nano-banana.mjs`)}

## 常见问题

### Nano Banana API 怎么用 OpenAI SDK 调用？

把 OpenAI SDK 的接口地址填成 \`https://api.haryai.com/v1\`，API key 填 HaryAI 的 key，然后调用 \`client.images.generate(model="${banana21.id}", prompt=..., size=...)\` 或者 \`client.images.edit(model=..., image=..., prompt=...)\`。代码其它地方不用改。只用 curl 的工具也是同样的路径，\`/v1/images/generations\` 和 \`/v1/images/edits\`。

### Nano Banana API 每张图多少钱？

${models.map((m) => `${m.name} ${Object.entries(m.tiers).map(([size, p]) => `${size} ${usd(p.oursStr)}`).join("，")}（官方价 ${Object.entries(m.tiers).map(([size, p]) => `${size} ${usd(p.officialStr)}`).join("，")}）。`).join("")}是 Google 官方价的 ${zhZhe}。

### 需要开 Google Cloud 或 Gemini 账号吗？

不需要。有 HaryAI 的 key 就能用，费用从 HaryAI 余额里按量扣。

### 能编辑图片吗？

能，调用 \`POST /v1/images/edits\`，和 OpenAI 自己的编辑接口一样是 multipart 表单。传一个或多个 \`image\` 文件和一个 \`prompt\` 说明要改什么。不支持蒙版，想改哪里用文字描述。

### 返回的是链接还是图片本身？

是图片本身，格式是 \`b64_json\`。Nano Banana 不会返回链接，自己解码存成文件，没有过期的问题。

### 一次请求能拿几张图？

一张。\`n\` 始终是 1。想要更多张，同时发几个请求。

### 哪些工具能用？

能自己填 OpenAI 接口地址、自己输入模型名的工具都能用，比如 OpenAI 的 Python 和 Node SDK。只给一份固定模型列表、没有接口地址输入框的工具用不了。

### Nano Banana 2.1 和 2 该选哪个？

新项目选 Nano Banana 2.1。Google 推出它来取代 Nano Banana 2，它在设计、改图和人脸一致性上都更好，价格也更低：${ratioSentenceZh}。已经在用 Nano Banana 2 的，可以继续用。

### 生成失败扣钱吗？

不扣。被内容审核拒绝的请求，或者因为别的原因失败的请求，都不收费。

### 在 Claude Code 或 Codex 里怎么用？

先把 key 放进环境变量 \`HARYAI_KEY\`，把下面这段发给 agent，在最后一行写上想要的画面。它会写一个小脚本，调用接口，把图片存到当前文件夹。

\`\`\`text
${promptZh}
\`\`\`

详见 [Nano Banana 2.1](${page("/zh/nano-banana-2-1")})。

### Gemini 自己的格式也能用吗？

能，用同一个 key、同一份余额。接口地址是 \`https://api.haryai.com/v1beta\`，key 放在 \`x-goog-api-key\` 请求头里（也可以用 \`Authorization: Bearer\`）。

${sh(geminiGenerate)}

### 计费怎么算？

${billingNoteZh}${refusalNoteZh}

### 报错是什么意思？

${errTables[0]}

详见 [docs/image.md](${doc("/docs/image.md")})。

## 链接

- [Nano Banana 用 OpenAI 格式调用](${page("/zh/nano-banana-openai-api")})，[Nano Banana 2.1](${page("/zh/nano-banana-2-1")})，[Nano Banana 2](${page("/zh/nano-banana-2")})
- [价格](${page("/zh/pricing")})
- [图片接口文档](${doc("/docs/image.md")})，[llms.txt](${doc("/llms.txt")})
- [seedance-2.5-api](https://github.com/sunsiyuan/seedance-2.5-api)：通过 HaryAI 调用 Seedance 2.5 视频 API
- [seedance-skill](https://github.com/sunsiyuan/seedance-skill)：Claude Code 和 Codex 用的 Seedance 2.5 skill
- [seedance-comfyui](https://github.com/sunsiyuan/seedance-comfyui)：在 ComfyUI 里用 Seedance 2.5（ComfyUI Manager 里能搜到）
- [n8n-nodes-haryai](https://github.com/sunsiyuan/n8n-nodes-haryai)：在 n8n 里用 Seedance 2.5（npm 包 \`n8n-nodes-haryai\`）
- [deepseek-codex-claude-code](https://github.com/sunsiyuan/deepseek-codex-claude-code)：在 Codex 和 Claude Code 里用 DeepSeek V4

## 许可

MIT，见 [LICENSE](LICENSE)。

价格截至 ${today}。

<!-- 由 build.mjs 于 ${today} 生成，数据来自 ${LLMS}（价格标记之间的 Images 一节）、${IMAGE_MD} 和 ${SITE}/zh/nano-banana-2-1 上的 agent 提示词与注册赠送可出图张数。请改 build.mjs，不要直接改本文件。 -->
`;

await writeFile("README.md", en);
await writeFile("README.zh-CN.md", zh);
console.log(`README.md, README.zh-CN.md: ${off}% off, ${models.map((m) => `${m.id} ${JSON.stringify(m.tiers)}`).join("; ")}`);
