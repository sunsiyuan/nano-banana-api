# 通过 HaryAI 调用 Nano Banana API

[English](README.md)

在 [HaryAI](https://haryai.com/zh/nano-banana-2-1?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api) 用 Nano Banana 2.1 和 Nano Banana 2，价格是 Google 官方价 5 折。不用开 Google Cloud 账号，一个 HaryAI 的 key 就够了。两个模型都支持 OpenAI 的图片接口（`/v1/images/generations`、`/v1/images/edits`）和 OpenAI 的 SDK：接口地址填 `https://api.haryai.com/v1`，模型名换成 Nano Banana 的名字，代码其它地方不用改；也支持 Gemini 自己的 `generateContent`。

这个仓库讲怎么调用：curl 示例、Python 和 Node 的小脚本，还有常见问题的回答。完整接口文档见 [docs/image.md](https://haryai.com/docs/image.md)。

## 模型

| 模型 | 模型名 | 尺寸 | 支持接口 |
|---|---|---|---|
| Nano Banana 2.1 | `gemini-nano-banana-2.1` | `1K`, `2K`, `4K` | OpenAI Images, Gemini generateContent, OpenAI Chat Completions |
| Nano Banana 2 | `gemini-3.1-flash-image` | `1K`, `2K`, `4K` | OpenAI Images, Gemini generateContent, OpenAI Chat Completions |

返回的图片都是 `b64_json`，`n` 始终是 1（一次一张），编辑不支持蒙版，想改哪里用文字说清楚。

## 每张价格

单位美元，是 Google 官方价的 5 折，从 HaryAI 余额扣费。生成失败不扣费。

| 模型 | 尺寸 | 官方价 | HaryAI |
|---|---|---|---|
| Nano Banana 2.1 | 1K | $0.0336 | $0.0168 |
| Nano Banana 2.1 | 2K | $0.0504 | $0.0252 |
| Nano Banana 2.1 | 4K | $0.1134 | $0.0567 |
| Nano Banana 2 | 1K | $0.0672 | $0.0336 |
| Nano Banana 2 | 2K | $0.1008 | $0.0504 |
| Nano Banana 2 | 4K | $0.1512 | $0.0756 |

Nano Banana 2.1 是 Google 推出的新模型，用来取代 Nano Banana 2。在 HaryAI 上，1K、2K 的价格是 Nano Banana 2 的一半，4K 的价格是 Nano Banana 2 的 75%。最新价格见 [价格](https://haryai.com/zh/pricing?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api)。

## 快速开始

1. 在 [haryai.com](https://haryai.com/zh/signup?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api) 注册。新账号验证邮箱后送 $0.50 余额，够用 Nano Banana 2.1 的 1K 档出 29 张图（每张 $0.0168）。
2. 在账户页复制 API key，设成环境变量：`export HARYAI_KEY=...`

图片生成是同步的：一个请求直接返回图片。

### 生成

```sh
curl https://api.haryai.com/v1/images/generations \
  -H "Authorization: Bearer $HARYAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gemini-nano-banana-2.1", "prompt": "A cup of green tea on a wooden table by a window, morning light", "size": "1536x1024"}'
```

返回：`{"data": [{"b64_json": "…"}]}`。图片总是 `b64_json`，不会给链接。

- `size`：写成宽x高，会自动匹配最接近的画面比例和档位（`1024x1024` 是 1K 正方形，`1536x1024` 是 2K 3:2）。也可以直接传 `aspect_ratio`（`1:1`、`3:2`、`16:9`、`9:16` 等）和 `image_size`（`1K`、`2K`、`4K`）。什么都不传时：新生成的图是 1K 正方形，编辑则跟输入图片同形状。
- `n`：始终是 1，一次一张。

### 编辑

- 编辑方式：调用 `POST /v1/images/edits`，multipart 表单，带一个或多个 `image` 文件和一个 `prompt`，跟 OpenAI 自己的编辑接口一样。不支持蒙版，想改哪里用文字说清楚。

```sh
curl https://api.haryai.com/v1/images/edits \
  -H "Authorization: Bearer $HARYAI_KEY" \
  -F model=gemini-nano-banana-2.1 \
  -F "prompt=Make the cup bright red, keep everything else the same." \
  -F "image=@photo.png"
```

### Python（openai SDK）

[`examples/nano_banana.py`](examples/nano_banana.py) 先生成一张图，再编辑它，两张都存成 PNG。key 从环境变量 `HARYAI_KEY` 读取。

```sh
export HARYAI_KEY=...
pip install openai
python examples/nano_banana.py
```

### Node 18（openai npm SDK）

[`examples/nano-banana.mjs`](examples/nano-banana.mjs) 做同样的事。

```sh
export HARYAI_KEY=...
npm install openai
node examples/nano-banana.mjs
```

## 常见问题

### Nano Banana API 怎么用 OpenAI SDK 调用？

把 OpenAI SDK 的接口地址填成 `https://api.haryai.com/v1`，API key 填 HaryAI 的 key，然后调用 `client.images.generate(model="gemini-nano-banana-2.1", prompt=..., size=...)` 或者 `client.images.edit(model=..., image=..., prompt=...)`。代码其它地方不用改。只用 curl 的工具也是同样的路径，`/v1/images/generations` 和 `/v1/images/edits`。

### Nano Banana API 每张图多少钱？

Nano Banana 2.1 1K $0.0168，2K $0.0252，4K $0.0567（官方价 1K $0.0336，2K $0.0504，4K $0.1134）。Nano Banana 2 1K $0.0336，2K $0.0504，4K $0.0756（官方价 1K $0.0672，2K $0.1008，4K $0.1512）。是 Google 官方价的 5 折。

### 需要开 Google Cloud 或 Gemini 账号吗？

不需要。有 HaryAI 的 key 就能用，不用开 Google Cloud 项目、不用在那边开计费、也不用申请模型权限。

### 能编辑图片吗？

能，调用 `POST /v1/images/edits`，和 OpenAI 自己的编辑接口一样是 multipart 表单。传一个或多个 `image` 文件和一个 `prompt` 说明要改什么。不支持蒙版，想改哪里用文字描述。

### 返回的是链接还是图片本身？

是图片本身，格式是 `b64_json`。Nano Banana 不会返回链接，自己解码存成文件，没有过期的问题。

### 一次请求能拿几张图？

一张。`n` 始终是 1。想要更多张，同时发几个请求。

### 哪些工具能用？

能自己填 OpenAI 接口地址、自己输入模型名的工具都能用，比如 OpenAI 的 Python 和 Node SDK，以及基于它们搭的工具。只给一份固定模型列表、没有接口地址输入框的工具用不了。

### Nano Banana 2.1 和 2 该选哪个？

Nano Banana 2.1 是 Google 更新的模型，用来取代 Nano Banana 2，在 HaryAI 上也更便宜：1K、2K 的价格是 Nano Banana 2 的一半，4K 的价格是 Nano Banana 2 的 75%。没有必须用旧模型的理由，就选 2.1。

### 生成失败扣钱吗？

不扣。被内容审核拒绝的请求，或者因为别的原因失败的请求，都不收费。

### 在 Claude Code 或 Codex 里怎么用？

先把 key 放进环境变量 `HARYAI_KEY`，把下面这段发给 agent，在最后一行写上想要的画面。它会写一个小脚本，调用接口，把图片存到当前文件夹。

```text
用 HaryAI 的 Nano Banana 2.1 帮我出一张图，接口是 Gemini 的 generateContent。
POST https://api.haryai.com/v1beta/models/gemini-nano-banana-2.1:generateContent
请求头：x-goog-api-key: $HARYAI_KEY
请求体：{"contents": [{"role": "user", "parts": [{"text": "<把我的要求写详细>"}]}], "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "16:9", "imageSize": "2K"}}}
在 candidates[0].content.parts 里找到带 inlineData 的那一项，把 data 解码存成 PNG 放在当前文件夹，然后告诉我文件名。
我想要的画面：
```

Claude Code 照常用你自己的 Claude 订阅，只有图片从 HaryAI 余额扣费。Codex 不用先切换到 DeepSeek。详见 [Nano Banana 2.1](https://haryai.com/zh/nano-banana-2-1?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api)。

### 计费怎么算？

Nano Banana 2.1 和 2 按 token 计费：每张输出图片按尺寸收固定的 token 数（2.1：1K 1,120、2K 1,680、4K 3,780；2：1K 1,120、2K 1,680、4K 2,520），输入的文字和图片按输入 token 计费。Nano Banana 2.1 还会先思考再出图，这部分思考 token 按文字输出计费，大约比一张 2K 图片的量多十分之一。 上游拒绝（字段有问题，或者提示词、图片被模型的内容审核挡下）会带着上游的报错信息返回，不收费。

### 报错是什么意思？

| Status | Code | Meaning |
|---|---|---|
| 401 | (empty) | Missing or invalid key |
| 400 / 503 | `model_not_found` | Model not available to your account / not available now |
| 403 | `insufficient_user_quota` | Balance too low |

详见 [docs/image.md](https://haryai.com/docs/image.md)。

## 链接

- [Nano Banana 用 OpenAI 格式调用](https://haryai.com/zh/nano-banana-openai-api?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api)，[Nano Banana 2.1](https://haryai.com/zh/nano-banana-2-1?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api)，[Nano Banana 2](https://haryai.com/zh/nano-banana-2?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api)
- [价格](https://haryai.com/zh/pricing?utm_source=github&utm_medium=readme&utm_campaign=nano-banana-api)
- [图片接口文档](https://haryai.com/docs/image.md)，[llms.txt](https://haryai.com/llms.txt)
- [seedance-2.5-api](https://github.com/sunsiyuan/seedance-2.5-api)：通过 HaryAI 调用 Seedance 2.5 视频 API
- [seedance-skill](https://github.com/sunsiyuan/seedance-skill)：Claude Code 和 Codex 用的 Seedance 2.5 skill
- [seedance-comfyui](https://github.com/sunsiyuan/seedance-comfyui)：在 ComfyUI 里用 Seedance 2.5（ComfyUI Manager 里能搜到）
- [n8n-nodes-haryai](https://github.com/sunsiyuan/n8n-nodes-haryai)：在 n8n 里用 Seedance 2.5（npm 包 `n8n-nodes-haryai`）
- [deepseek-codex-claude-code](https://github.com/sunsiyuan/deepseek-codex-claude-code)：在 Codex 和 Claude Code 里用 DeepSeek V4

## 许可

MIT，见 [LICENSE](LICENSE)。

价格截至 2026-11-23。

<!-- 由 build.mjs 于 2026-11-23 生成，数据来自 https://haryai.com/llms.txt（价格标记之间的 Images 一节）、https://haryai.com/docs/image.md 和 https://haryai.com/zh/nano-banana-2-1 上的 agent 提示词。请改 build.mjs，不要直接改本文件。 -->
