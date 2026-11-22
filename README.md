# Nano Banana API through HaryAI

[中文](README.zh-CN.md)

Use Nano Banana 2.1 and Nano Banana 2 through [HaryAI](https://haryai.com/en/nano-banana-openai-api?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api) at 50% off Google's official price. No Google Cloud account needed: one HaryAI key is enough. Both work with OpenAI's images API (`/v1/images/generations`, `/v1/images/edits`) and the OpenAI SDKs: point the base URL at `https://api.haryai.com/v1`, pass a Nano Banana model name, and nothing else in your code changes. Both also work with Gemini's own `generateContent`.

This repo shows how to call it: curl, short Python and Node scripts, and answers to common questions. The full reference is [docs/image.md](https://haryai.com/docs/image.md).

## Models

| Model | Model id | Sizes | Works with |
|---|---|---|---|
| Nano Banana 2.1 | `gemini-nano-banana-2.1` | `1K`, `2K`, `4K` | OpenAI Images, Gemini generateContent, OpenAI Chat Completions |
| Nano Banana 2 | `gemini-3.1-flash-image` | `1K`, `2K`, `4K` | OpenAI Images, Gemini generateContent, OpenAI Chat Completions |

Replies are always `b64_json`. `n` is always 1, one image per request. There is no mask for edits: describe the change in the prompt instead.

## Price per image

US dollars. 50% off Google's official price, paid from your HaryAI balance. A request that fails is not charged.

| Model | Size | Official | HaryAI |
|---|---|---|---|
| Nano Banana 2.1 | 1K | $0.0336 | $0.0168 |
| Nano Banana 2.1 | 2K | $0.0504 | $0.0252 |
| Nano Banana 2.1 | 4K | $0.1134 | $0.0567 |
| Nano Banana 2 | 1K | $0.0672 | $0.0336 |
| Nano Banana 2 | 2K | $0.1008 | $0.0504 |
| Nano Banana 2 | 4K | $0.1512 | $0.0756 |

Nano Banana 2.1 is Google's replacement for Nano Banana 2. On HaryAI, at 1K and 2K it costs half as much as Nano Banana 2; at 4K it costs 75% as much as Nano Banana 2. Current prices: [Pricing](https://haryai.com/en/pricing?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api).

## Quick start

1. Sign up at [haryai.com](https://haryai.com/en/signup?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api). A verified new account gets $0.50 of balance, enough for about 20 images.
2. Copy your API key from the account page and set it: `export HARYAI_KEY=...`

Image generation is synchronous: one request returns the image.

### Generate

```sh
curl https://api.haryai.com/v1/images/generations \
  -H "Authorization: Bearer $HARYAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gemini-nano-banana-2.1", "prompt": "A cup of green tea on a wooden table by a window, morning light", "size": "1536x1024"}'
```

Reply: `{"data": [{"b64_json": "…"}]}`. The image always comes back as `b64_json`, never as a URL.

- `size`: `WIDTHxHEIGHT` picks the nearest aspect ratio and tier (`1024x1024` is 1K square, `1536x1024` is 2K 3:2). Or send `aspect_ratio` (`1:1`, `3:2`, `16:9`, `9:16`, …) and `image_size` (`1K`, `2K`, `4K`) directly. Without any of them: 1K, square for a new image, the shape of the input image for an edit.
- `n`: 1 only.

### Edit

- Edits: `POST /v1/images/edits`, multipart with `image` (one or more files) and `prompt`, as with OpenAI. Masks are not supported; describe the change in the prompt.

```sh
curl https://api.haryai.com/v1/images/edits \
  -H "Authorization: Bearer $HARYAI_KEY" \
  -F model=gemini-nano-banana-2.1 \
  -F "prompt=Make the cup bright red, keep everything else the same." \
  -F "image=@photo.png"
```

### Python (openai SDK)

[`examples/nano_banana.py`](examples/nano_banana.py) generates an image, then edits it, saving both as PNGs. It reads the key from `HARYAI_KEY`.

```sh
export HARYAI_KEY=...
pip install openai
python examples/nano_banana.py
```

### Node 18 (openai npm SDK)

[`examples/nano-banana.mjs`](examples/nano-banana.mjs) does the same.

```sh
export HARYAI_KEY=...
npm install openai
node examples/nano-banana.mjs
```

## Questions

### How do I call the Nano Banana API with the OpenAI SDK?

Point the OpenAI SDK's base URL at `https://api.haryai.com/v1` and your HaryAI key as the API key, then call `client.images.generate(model="gemini-nano-banana-2.1", prompt=..., size=...)` or `client.images.edit(model=..., image=..., prompt=...)`. Nothing else in your code changes. Tools that only speak curl use the same paths, `/v1/images/generations` and `/v1/images/edits`.

### How much does the Nano Banana API cost per image?

Nano Banana 2.1: 1K $0.0168, 2K $0.0252, 4K $0.0567 (official 1K $0.0336, 2K $0.0504, 4K $0.1134). Nano Banana 2: 1K $0.0336, 2K $0.0504, 4K $0.0756 (official 1K $0.0672, 2K $0.1008, 4K $0.1512). That is 50% off Google's official price.

### Do I need a Google Cloud or Gemini account?

No. Your HaryAI key is enough, and you pay as you go from your HaryAI balance.

### Can I edit images?

Yes, with `POST /v1/images/edits`, multipart, the same as OpenAI's own edit endpoint. Send one or more `image` files and a `prompt` describing the change. There is no mask: say what to change in words instead.

### Do I get a link back, or the image itself?

The image itself, as `b64_json`. Nano Banana never returns a URL, so decode and save the bytes yourself; there is nothing that expires.

### How many images can I get per request?

One. `n` is always 1. For more, send several requests at once.

### Which tools work with this?

Any tool that lets you set an OpenAI base URL and type a model name yourself can use it: for example the OpenAI Python and Node SDKs. A tool that only offers its own fixed list of OpenAI models, with no base URL field, can't reach Nano Banana.

### Nano Banana 2.1 vs Nano Banana 2: which should I use?

Nano Banana 2.1 for new work. Google made it the replacement for Nano Banana 2, and it is better at design, editing and keeping faces consistent. It is also cheaper: at 1K and 2K it costs half as much as Nano Banana 2; at 4K it costs 75% as much as Nano Banana 2. Nano Banana 2 stays for anyone already using it.

### Is a failed request charged?

No. A request that the model's content moderation turns down, or that fails for any other reason, is not charged.

### How do I use it from Claude Code or Codex?

Put your key in `HARYAI_KEY`, then paste this to the agent with what you want in the last line. It writes a short script, calls the API and saves the PNG to the current folder.

```text
Make an image with Nano Banana 2.1 through HaryAI. Use Gemini's generateContent:
POST https://api.haryai.com/v1beta/models/gemini-nano-banana-2.1:generateContent
Header: x-goog-api-key: $HARYAI_KEY
Body: {"contents": [{"role": "user", "parts": [{"text": "<my request in detail>"}]}], "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "16:9", "imageSize": "2K"}}}
Find the part with inlineData in candidates[0].content.parts, decode its data and save it as a PNG in this folder, then tell me the file name.
What I want:
```

Guide: [Nano Banana 2.1](https://haryai.com/en/nano-banana-2-1?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api).

### Does Gemini's own format work too?

Yes, on the same key and the same balance. Base URL: `https://api.haryai.com/v1beta`. The key goes in `x-goog-api-key` (or `Authorization: Bearer`).

```sh
curl https://api.haryai.com/v1beta/models/gemini-nano-banana-2.1:generateContent \
  -H "x-goog-api-key: $HARYAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"role": "user", "parts": [{"text": "A cup of green tea on a wooden table by a window, morning light"}]}],
    "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "16:9", "imageSize": "2K"}}
  }'
```

### How is billing calculated?

Nano Banana 2.1 and 2: per token. An output image is a fixed number of tokens per size (2.1: 1K 1,120, 2K 1,680, 4K 3,780; 2: 1K 1,120, 2K 1,680, 4K 2,520); input text and images are billed as input tokens. Nano Banana 2.1 thinks before it draws; those tokens are billed as text output (about a tenth on top of a 2K image). Upstream refusals (a bad field, a prompt or image the model's content moderation blocks) come back with the upstream message and are not charged.

### What do the errors mean?

| Status | Code | Meaning |
|---|---|---|
| 401 | (empty) | Missing or invalid key |
| 400 / 503 | `model_not_found` | Model not available to your account / not available now |
| 403 | `insufficient_user_quota` | Balance too low |

Details: [docs/image.md](https://haryai.com/docs/image.md).

## Links

- [Nano Banana in OpenAI format](https://haryai.com/en/nano-banana-openai-api?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api), [Nano Banana 2.1](https://haryai.com/en/nano-banana-2-1?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api), [Nano Banana 2](https://haryai.com/en/nano-banana-2?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api)
- [Pricing](https://haryai.com/en/pricing?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api)
- [Image API reference](https://haryai.com/docs/image.md), [llms.txt](https://haryai.com/llms.txt)
- [seedance-2.5-api](https://github.com/sunsiyuan/seedance-2.5-api): the Seedance 2.5 video API through HaryAI
- [seedance-skill](https://github.com/sunsiyuan/seedance-skill): Seedance 2.5 as a Claude Code and Codex skill
- [seedance-comfyui](https://github.com/sunsiyuan/seedance-comfyui): Seedance 2.5 in ComfyUI (in ComfyUI Manager)
- [n8n-nodes-haryai](https://github.com/sunsiyuan/n8n-nodes-haryai): Seedance 2.5 in n8n (npm `n8n-nodes-haryai`)
- [deepseek-codex-claude-code](https://github.com/sunsiyuan/deepseek-codex-claude-code): DeepSeek V4 in Codex and Claude Code

## License

MIT. See [LICENSE](LICENSE).

Prices as of 2026-11-23.

<!-- Generated by build.mjs on 2026-11-23 from https://haryai.com/llms.txt (Images section between the price markers), https://haryai.com/docs/image.md and the agent prompt and signup-gift image count on https://haryai.com/en/nano-banana-2-1. Edit build.mjs, not this file. -->
