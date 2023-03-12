// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next"
import { ChatCompletionRequestMessage, Configuration, CreateChatCompletionResponse, OpenAIApi } from "openai"
import { client } from "../../sanity-client"
import { AiJSONResponse, ApiRequest } from "../new-request"

type Data = {
  response: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const body = req.body as ApiRequest
  const { text, messages, issueCategory } = body

  const workOrderDocument: Record<string, any> = await client.fetch(`*[_type == "workOrder"]`)
  const { workOrderFields } = workOrderDocument?.[0] ?? []

  const config = new Configuration({
    apiKey: process.env.OPEN_AI_API_KEY,
  })
  const openai = new OpenAIApi(config)

  const sample = {
    issueCategory: "Toilet",
    subCategory: "Leaking from Base",
    aiMessage: "Ok thank you for reporting the issue... ",
    issueFound: false,
  } as AiJSONResponse

  const issueCategoryToTypes = {
    "Toilet": ["Leaking from Base", "Leaking from Tank", "Not flushing", "Clogged"],
    "Faucet": ["Leaking", "Won't turn on"],
    "Fridge": ["Fridge not running", "Freezer not running", "Fridge leaking", "Freezer leaking"],
    "Dishwasher": ["Won't run", "overflowing"],
    "Stove": ["Burner won't turn on", "Burner not getting hot", "Oven won't turn on", "Oven not getting hot"],
    "General Leak": ["Leak from ceiling", "Leak in basement"],
    "Electrical Problem": ["Light bulb out", "Heating not working, AC not working"],
    "Other": [""],
  } as any

  const prompt: ChatCompletionRequestMessage = {
    role: "system",
    content: `You're a property management chatbot. The user is a tenant.
    All of your responses in this chat should be stringified JSON like this: ${JSON.stringify(sample)}, and should contain all keys, \
    even if there are no values. Here is an example structure: ${sample}. issueCategory should be one of: ${Object.keys(issueCategoryToTypes)}.
    If the user's response seems unrelated to a service request or you can't understand their issue, cheerfully ask them to try again.
    ${issueCategory && issueCategory !== "Other" && `When you find the "issueCategory", ask the user to clarify the root issue. \
    The root issue will ALWAYS be one of ${issueCategoryToTypes[issueCategory]}`}
    ${issueCategory && issueCategory === "Other" && `Ask the user to clarify the root issue. Record their root issue as the "subCategory" \
    Once you have found their root issue, mark "issueFound" as true.`}  
    The conversational message responses you generate should ALWAYS set the value for the the "aiMessage" key and "issueFound" key.
    Your job is to guide the user to the root issue in detail. 
    When you have identified the value for keys "issueCategory" and "subCategory", mark the value for the key "issueFound" as "true".
    `}

  const response = await openai.createChatCompletion({
    max_tokens: 128,
    model: "gpt-3.5-turbo",
    messages: [prompt, ...messages, { role: "user", content: text }],
    temperature: 0,
  })

  const aiResponse = response.data.choices[0].message?.content

  let newResponse: any = null
  if (aiResponse && !aiResponse?.startsWith("{")) {
    newResponse = await openai.createChatCompletion({
      max_tokens: 128,
      model: "gpt-3.5-turbo",
      messages: [
        prompt,
        ...messages,
        { role: "user", content: text },
        { role: "assistant", content: aiResponse },
        {
          role: "system",
          content: `PLEASE Return ONLY a stringified JSON formatted like this: ${JSON.stringify(
            sample
          )}, with no additional text`,
        },
      ],
      temperature: 0,
    })
  }
  
  let newAiResponse = newResponse?.data?.choices?.[0].message?.content

    //The second response may still contain some extraneous text; get the json from it to prevent error
  if (newResponse && newAiResponse) {
    const jsonStart = newAiResponse.indexOf("{")
    const jsonEnd = newAiResponse.lastIndexOf("}")
    let jsonResponse = JSON.parse(newAiResponse.substring(jsonStart, jsonEnd + 1)) as AiJSONResponse
    // Solves an issue where the aiMessage could be blank
    if(!jsonResponse.aiMessage || jsonResponse.aiMessage === ''){
        jsonResponse.aiMessage = aiResponse ?? 'Sorry, please clarify your issue one more time.' //Never seen it go to the second string here; added to solve typescript issue
    }
    newAiResponse = JSON.stringify(jsonResponse)
  }

    const finalResponse = processAiResponse(newAiResponse ?? aiResponse)  

  if (!aiResponse) {
    return res.status(400).json({ response: "Error getting message from chatbot" })
  } else {
    return res.json({ response: finalResponse })
  }
}

const processAiResponse = (response: string): string => {
    let parsedResponse = JSON.parse(response) as AiJSONResponse

    let message = parsedResponse.issueFound ? 'I am sorry you are dealing with this, we will try and help you as soon as possible. \
    To finalize your service request, please give us your name, address, and whether or not we have permission to enter(y/n)' 
    : parsedResponse.aiMessage
    parsedResponse.aiMessage = message

    return JSON.stringify(parsedResponse)
}
