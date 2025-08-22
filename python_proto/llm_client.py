from google import genai
from google.genai import types
from cerebras.cloud.sdk import Cerebras
import os
from abc import ABC, abstractmethod
from typing import Optional


class Client(ABC):
    @abstractmethod
    def __init__(self) -> None:
        pass

    @abstractmethod
    def get_response(self, system_prompt: str, prompt: str) -> str:
        pass


def preprocess_reply(reply: Optional[str]) -> str:
    if reply:
        return reply.strip().strip('"').strip("'")
    else:
        return ""


class GeminiClient(Client):
    def __init__(self) -> None:
        self.client = genai.Client()

    def get_response(self, system_prompt: str, prompt: str) -> str:

        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=[system_prompt],
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )

        if hasattr(response, "text") and response.text:
            return preprocess_reply(response.text)
        else:
            return ""


class CerebrasClient(Client):
    def __init__(self) -> None:
        self.client = Cerebras()

    def get_response(self, system_prompt: str, prompt: str) -> str:

        response = self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            model="llama3.1-8b",
            stream=False,
            max_completion_tokens=100,
            # temperature=1,
            # top_p=1,
            # reasoning_effort="low",
        )
        if hasattr(response, "choices") and response.choices:
            return preprocess_reply(response.choices[0].message.content)
        else:
            return ""


# if __name__ == "__main__":
#     client = CerebrasClient()
#     print(client.get_response("you're a friendly person", "say hi"))
