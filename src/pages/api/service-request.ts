// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai'

type Data = {
  response: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const body = req.body as { text: string, messages: ChatCompletionRequestMessage[] }
  const { text, messages } = body


  const config = new Configuration({
    apiKey: process.env.OPEN_AI_API_KEY
  })
  const openai = new OpenAIApi(config)

  const issueType = "Toilet, Faucet, Fridge, Dishwasher, Stove, Leak, Electrical Problem, Other"
  const issueCategory = "Broken, Leaking, Cracked, Smelly"

  const initialMessage: ChatCompletionRequestMessage =
  {
    role: "system",
    content: `You're a helpful property management chatbot, the user is a tenant requesting a service for their property. \
        Your goal is to clarify service requests, and ultimately return a standardized request form. Use this step-by-step process: \
        1) If a request isn't related to a service request, cheerfully instruct them to try again. \
        2) Classify their service request into ONE of these Issue Type: ${issueType} and one Issue Category: ${issueCategory}. \
        3) Indicate your chosen issue category classification in your response. For example 'Issue Category: Toilet<br>'. \
        4) Clarify with the user what the root problem is. For example, if the user reports 'my toilet broke', \
        determine if the toilet is clogged, leaking, or not flushing. The goal is to identify the root problem \
        and generate a standardized report. \
        5) Summarize and include that root problem in your response like so: 'Issue Type: clogged toilet<br>'.Your responses \
        should be understandable by a 5th grade student. Once you have clarified the root problem, end the conversation by \
        including 'Resquest Complete' in your response and tell the user you will report this issue to maintenance team`
  }


  const response = await openai.createChatCompletion({
    max_tokens: 128,
    model: "gpt-3.5-turbo",
    messages: [initialMessage, ...messages, { "role": "user", "content": text }],
    temperature: 0,
    // user: user.id
  })

  const aiResponse = response.data.choices[0].message?.content

  if (!aiResponse) {
    return res.status(400).json({ response: "Error getting message from chatbot" })
  } else {
    return res.json({ response: aiResponse })
  }
}
