#!/usr/bin/env python3
"""Nano Banana 2.1 through HaryAI, OpenAI SDK: generate an image, then edit
it. Saves both as PNGs in the current folder. Python 3.8+, one dependency
(openai).

  export HARYAI_KEY=...   # from your HaryAI account page
  pip install openai
  python examples/nano_banana.py

API reference: https://haryai.com/docs/image.md
"""

import base64
import os
import sys

from openai import OpenAI

key = os.environ.get("HARYAI_KEY")
if not key:
    sys.exit("Set HARYAI_KEY to your HaryAI API key.")

client = OpenAI(base_url="https://api.haryai.com/v1", api_key=key)
model = "gemini-nano-banana-2.1"

# 1. Generate. Replies are always b64_json; n is always 1.
image = client.images.generate(
    model=model,
    prompt="A cup of green tea on a wooden table by a window, morning light",
    size="1536x1024",
)
with open("tea.png", "wb") as f:
    f.write(base64.b64decode(image.data[0].b64_json))
print("saved tea.png")

# 2. Edit. Multipart, like OpenAI's own edit endpoint. No masks: say what to
#    change in the prompt.
edit = client.images.edit(
    model=model,
    image=open("tea.png", "rb"),
    prompt="Make the cup bright red, keep everything else the same.",
)
with open("tea-red.png", "wb") as f:
    f.write(base64.b64decode(edit.data[0].b64_json))
print("saved tea-red.png")
