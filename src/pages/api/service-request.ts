// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { ChatCompletionRequestMessage, Configuration, CreateChatCompletionResponse, OpenAIApi } from 'openai'
import { client } from "../../sanity-client"

type Data = {
  response: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const body = req.body as { text: string, messages: ChatCompletionRequestMessage[] }
  const { text, messages } = body

  const workOrderDocument: Record<string, any> = await client.fetch(`*[_type == "workOrder"]`)
  const { workOrderFields } = workOrderDocument?.[0] ?? []

  const config = new Configuration({
    apiKey: process.env.OPEN_AI_API_KEY
  })
  const openai = new OpenAIApi(config)

  const sample = {
    issueCategory: "toilet",
    subCategory: "leaking",
    locationOfIssue: "east bedroom",
    additionalInfo: "leaking from the bottom, toilet in the master bathroom",
    aiMessage: "Ok thank you for reporting the issue... ",
    issueFound: true
  }

  const prompt: ChatCompletionRequestMessage = {
    role: "system", content: `You're a property management chatbot. The user is a tenant requesting a service for their property.
    All of your responses in this chat should be stringified JSON only like this: ${JSON.stringify(sample)}, and should follow this structure: ${sample}.
    If you stray from this pattern, I will remind to you only return JSON. 
    The conversationa message responses you generate should ALWAYS set the value for the the "aiMessage" key.
    Your job is to guide the user to the root issue in detail. 
    When you have identified the issue, subCategory, and any additional info, mark issueFound as true.
    `}


  const response = await openai.createChatCompletion({
    max_tokens: 128,
    model: "gpt-3.5-turbo",
    messages: [prompt, ...messages, { "role": "user", "content": text }],
    temperature: 0,
  })


  const aiResponse = response.data.choices[0].message?.content

  let newResponse: any = null
  if (aiResponse && !aiResponse?.startsWith("{")) {

    newResponse = await openai.createChatCompletion({
      max_tokens: 128,
      model: "gpt-3.5-turbo",
      messages: [prompt, ...messages, { "role": "user", "content": text }, { "role": "system", content: aiResponse }, { role: "user", content: "PLEASE Return ONLY THE JSON FORMAT we requested, no additional text" }],
      temperature: 0,
    })
  }
  const newAiResponse = newResponse?.data?.choices?.[0].message?.content

  if (!aiResponse) {
    return res.status(400).json({ response: "Error getting message from chatbot" })
  } else {
    return res.json({ response: newAiResponse ?? aiResponse })
  }
}