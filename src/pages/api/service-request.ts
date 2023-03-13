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

  const config = new Configuration({
    apiKey: process.env.OPEN_AI_API_KEY,
  })
  const openai = new OpenAIApi(config)
  const workOrderDocument: Record<string, any> = await client.fetch(`*[_type == "workOrder"]`)
  const { workOrderFields } = workOrderDocument?.[0] ?? []


  const sample = {
    issueCategory: "Toilet",
    subCategory: "Leaking from Base",
    aiMessage: "Ok thank you for reporting the issue... ",
    additionalDetails: "The toilet in the bedroom has been leaking for weeks",
    issueFound: false,
  } as AiJSONResponse

  const issueCategoryToTypes = {
    "Toilet": ["Leaking from Base", "Leaking from Tank", "Not flushing", "Clogged", "Does not Fill", "Cracked", "Weak Flush"],
    "Faucet": ["Leaking", "Won't turn on", "Drain Clogged", "Low Pressure", "Rusty"],
    "Fridge": ["Fridge not running", "Freezer not running", "Fridge leaking", "Freezer leaking", "Light Is Broken", "Filter Needs Replacement"],
    "Dishwasher": ["Won't Run", "Overflowing", "Not Cleaning The Dishes"],
    "Stove": ["Won't Turn On", "Not Getting Hot"],
    "Oven": ["Oven won't turn on", "Not Getting Hot"],
    "General Leak": ["Leak from ceiling", "Leak in basement"],
    "Electrical Problem": ["Light bulb out", "Heating not working", "AC not working"],
    "Lawn": ["Needs To Be Cut", "Needs To Be Sprayed", "Has "],
    "Pests": ["Mice/Rats", "Termites", "Roaches", "Ants", "Fruit Flies"],
    "Other": [""],
  } as any

  const initialPrompt: ChatCompletionRequestMessage = {
    role: "system",
    content: `You're a property management chatbot. The user is a tenant requesting a work order for their property. Think like a property manager who needs to get information from the user and diagnose what their issue is.
      They will tell you broadly what the issue is their having.
      Your responsibility is to categorize their issue into one of these categories: ${Object.keys(issueCategoryToTypes)}. If you cannot match their issue to any of these, respond with "other".
      Your answer to this question should only be the category, no additional text.`
  }

  const prompt: ChatCompletionRequestMessage = {
    role: "system",
    content: `You're a property management chatbot. The user is a tenant. Think like a property manager who needs to get information from the user and diagnose what their issue is.
    All of your responses in this chat should be stringified JSON like this: ${JSON.stringify(sample)}, and should contain all keys, \
    even if there are no values. Here is an example structure: ${sample}. "issueCategory" will always be one of: ${Object.keys(issueCategoryToTypes)}.
    If the user's response seems unrelated to a service request or you can't understand their issue, cheerfully ask them to try again.
    ${issueCategory && issueCategory !== "Other" && `When you find the "issueCategory", ask the user to clarify the root issue. \
    The root issue will ALWAYS be one of ${issueCategoryToTypes[issueCategory]} and this value will be the "subCategory". If their root\
    issue doesn't match one of: ${issueCategoryToTypes[issueCategory]}, then record what they tell you as their "subCategory"\
    Once you have found their "subCategory", mark "issueFound" as true.`}
    ${issueCategory && issueCategory === "Other" && `Ask the user to clarify the root issue. Record their root issue as the "subCategory" \
    Once you have found their root issue, mark "issueFound" as true.`}  
    The conversational message responses you generate should ALWAYS set the value for the the "aiMessage" key and "issueFound" key.
    Your job is to guide the user to the root issue in detail and record any additional information about the duration, location, or specifics\
    of the issue under: "additionalDetails".
    When you have identified the value for keys "issueCategory" and "subCategory", mark the value for the key "issueFound" as "true".
    Also, don't apologize.
  `}

  const response = await openai.createChatCompletion({
    max_tokens: 500,
    model: "gpt-3.5-turbo",
    messages: [messages.length > 1 ? prompt : initialPrompt, ...messages, { role: "user", content: text }],
    temperature: 0,
  })

  const aiResponse = response.data.choices[0].message?.content
  console.log({ aiResponse })
  let newResponse: any = null
  if (aiResponse && !aiResponse?.startsWith("{")) {
    newResponse = await openai.createChatCompletion({
      max_tokens: 500,
      model: "gpt-3.5-turbo",
      messages: [
        prompt,
        ...messages,
        { role: "user", content: text },
        { role: "assistant", content: aiResponse },
        {
          role: "system",
          content: `Your answer should only be JSON formatted like this: ${JSON.stringify(sample)}, with no additional text`,
        },
      ],
      temperature: 0,
    })
  }

  newResponse = newResponse?.data?.choices?.[0].message?.content

  //The second response may still contain some extraneous text; get the json from it to prevent error
  if (newResponse) {
    console.log({ newResponse })
    const regex = /&quot;/g
    const jsonStart = newResponse.indexOf("{")
    const jsonEnd = newResponse.lastIndexOf("}")
    const substr = newResponse.substring(jsonStart, jsonEnd + 1)
    const cleanedString = substr.replace(regex, '"').replace("True", "true").replace("False", "false").replace("undefined", '""')
    let jsonResponse = JSON.parse(cleanedString) as AiJSONResponse

    // Solves an issue where the aiMessage could be blank
    if (!jsonResponse.aiMessage || jsonResponse.aiMessage === '') {
      jsonResponse.aiMessage = aiResponse ?? 'Sorry, please clarify your issue one more time.' //Never seen it go to the second string here; added to solve typescript issue
    }
    newResponse = JSON.stringify(jsonResponse)
  }

  const finalResponse = processAiResponse(newResponse ?? aiResponse)

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
