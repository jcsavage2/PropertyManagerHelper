// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next"
import { ChatCompletionRequestMessage, Configuration, CreateChatCompletionResponse, OpenAIApi } from "openai"
import { FinishFormRequest } from "../"

type Data = {
  response: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const body = req.body as FinishFormRequest
  const { userMessage, messages, ...workOrder } = body

  const config = new Configuration({
    apiKey: process.env.OPEN_AI_API_KEY,
  })
  const openai = new OpenAIApi(config)

  const prompt: ChatCompletionRequestMessage = {
    "role": "system", "content": `CONTEXT: examine this JSON: ${JSON.stringify(workOrder)}
  As a property management chatbot provided with an issue from the user, your job is to update the JSON fields based on the users \
  input and RETURN the updated JSON back in a readable form. For example, User: "Dylan apt12c. Yes." \
  You: "Name: Dylan, Address: Apt 12c, Permission to enter(y/n): Yes, Service Request: Toilet; Clogged." If the user's input is totally \
  unrelated to a service request, cheerfully instruct them to try again. The user does not understand what JSON is, so refer to the JSON as \
  "the form".`}

  const response = await openai.createChatCompletion({
    max_tokens: 128,
    model: "gpt-3.5-turbo",
    messages: [prompt, ...messages, { role: "user", content: userMessage }],
    temperature: 0,
  })

  const aiResponse = response.data.choices[0].message?.content;

  if (!aiResponse) {
    return res.status(400).json({ response: "Error getting message from chatbot" })
  } else {
    return res.json({ response: aiResponse })
  }
}
