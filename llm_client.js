function preprocess_reply(reply) {
  return reply.trim().replace(`'`, ``).replace(`"`, "");
}

export class OpenAIClient {
  constructor() {}

  async get_response(system_prompt, prompt) {
    // console.log(`sending request ${prompt}...`);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer ...",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: system_prompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    }).then((response) => response.json());
    // console.log(`got reply ${response.choices[0].message.content}`);
    return preprocess_reply(response.choices[0].message.content);
  }
}

// const client = new OpenAIClient();
// console.log(await client.get_response("you're a helpful assistant", "say hi!"));
