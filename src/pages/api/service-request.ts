// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next"
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai"
import { AiJSONResponse, ApiRequest, IssueInformation } from "../index"

const config = new Configuration({
  apiKey: process.env.OPEN_AI_API_KEY,
})
const openai = new OpenAIApi(config)

type Data = {
  response: string
}

const sample = {
  aiMessage: "Ok thank you for reporting the issue... ",
  issueCategory: "Toilet",
  issueFound: false,
  issueLocation: "First bedroom on the right on 2nd floor",
  issueSubCategory: "Leaking from Base",
} as AiJSONResponse

const issueCategoryToTypes = {
  "Chandalier": ["Fallen", "Won't Turn On"],
  "Dishwasher": ["Won't Run", "Overflowing", "Not Cleaning The Dishes"],
  "Electrical": ["Light bulb out", "Heating not working", "AC not working"],
  "Faucet": ["Leaking", "Won't turn on", "Drain Clogged", "Low Pressure", "Rusty"],
  "Fridge": ["Fridge not running", "Freezer not running", "Fridge leaking", "Freezer leaking", "Light Is Broken", "Filter Needs Replacement"],
  "Hazard": ["Mold", "Asbestos", "Gas Leak", "Fire", "Flood"],
  "Lawn": ["Needs To Be Cut", "Needs To Be Sprayed", "Has "],
  "Leak": ["Ceiling", "Basement", "Walls", "Floor"],
  "Microwave": ["Won't Turn On"],
  "Oven": ["Oven won't turn on", "Not Getting Hot"],
  "Pests": ["Mice/Rats", "Termites", "Roaches", "Ants", "Fruit Flies"],
  "Roof": ["Dilapidated", "Missing Sections", "Crack", "Snow Pile-up"],
  "Shower": ["Drain Clogged", "Won't turn on", "Low Pressure", "Rusty"],
  "Stove": ["Won't Turn On", "Not Getting Hot"],
  "Toilet": ["Leaking from Base", "Leaking from Tank", "Not flushing", "Clogged", "Does not Fill", "Cracked", "Weak Flush"],
  "TV": ["Won't Turn On", "Nothing Displays When On", "Can't Connect to Internet"]
} as Record<string, string[]>

/**
 * Handles back and forth communication between openAI API and the user messages.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const body = req.body as ApiRequest
    const { userMessage, messages, ...workOrderData } = body

    const prompt: ChatCompletionRequestMessage = generatePrompt(workOrderData)

    const response = await openai.createChatCompletion({
      max_tokens: 500,
      model: "gpt-3.5-turbo",
      messages: [prompt, ...messages, { role: "user", content: userMessage + `\nPlease respond to my messages in this format: ${JSON.stringify(sample)} and include no additional text.` }],
      temperature: 0,
    })

    const aiResponse = response.data.choices[0].message?.content

    let newResponse: any = null
    if (aiResponse && !aiResponse?.startsWith("{")) {
      newResponse = await openai.createChatCompletion({
        max_tokens: 500,
        model: "gpt-3.5-turbo",
        messages: [
          prompt,
          ...messages,
          { role: "user", content: userMessage },
          { role: "assistant", content: aiResponse },
          {
            role: "system",
            content: `Your answer should only be JSON formatted like this: ${JSON.stringify(sample)}, with no additional text.`,
          },
        ],
        temperature: 0,
      })
    }

    newResponse = newResponse?.data?.choices?.[0].message?.content

    //The second response may still contain some extraneous text; get the json from it to prevent error
    if (newResponse) {
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
  } catch (err) {
    return res.status(400).json({ response: JSON.stringify(err) ?? "Error returning message..." })
  }
}

const processAiResponse = (response: string): string => {
  let parsedResponse = JSON.parse(response) as AiJSONResponse
  let message = parsedResponse.issueFound && parsedResponse.issueLocation ? 'I am sorry you are dealing with this, we will try and help you as soon as possible. \
    To finalize your service request, please give us the following information:\n\n Name: \n Address: \n Permission to Enter: \n\n \
    Once you provide this information, we will be able to schedule a service request for you.'
    : parsedResponse.aiMessage
  parsedResponse.aiMessage = message

  return JSON.stringify(parsedResponse)
}

/**
 * 
 * @param issueInfo relates to the information the Frontend already "knows"
 * @returns An initial prompt which is dynamically generated based on the information we already have.
 */
const generatePrompt = (issueInfo: IssueInformation): ChatCompletionRequestMessage => {
  console.log({ issueInfo })
  return {
    role: "system",
    content: `You're a property management chatbot. The user is a tenant. Work with them to diagnose what their issue is and how to locate their issue. \
    You should only respond in JSON.
    All of your responses should be stringified JSON like this: ${JSON.stringify(sample)}.
    and should contain all of the keys: ${Object.keys(sample)} even if there are no values.
    The "issueCategory" value will always be one of: ${Object.keys(issueCategoryToTypes)}.

    ${!issueInfo.issueLocation && 'You must work with the user to identify the "issueLocation", which are the instructions to locate the issue. \
    Attempt to identify the location based on the users message. \
    When asking for the "issueLocation" tell the user that this information will help the service worker locate the issue.'}\

    If the user doesn't provide "issueLocation", set the value of "issueLocation" to "".
    The user may specify multiple rooms, in which case you should record all of them in the "issueLocation" value.The user may also specify\
    that the issue is general to their entire apartment, in which case you should record "All Rooms" as the "issueLocation" value.
    
    ${issueInfo.issueLocation && `Don't ask the user about the "issueLocation" again.`}

    If the user's response seems unrelated to a service request or you can't understand their issue, cheerfully ask them to try again.
    
    ${issueInfo.issueCategory && issueInfo.issueCategory !== "Other" && `When you find the "issueCategory", ask the user to clarify the root issue. \
    The root issue will most likely be one of ${issueCategoryToTypes[issueInfo.issueCategory].join(", ")} and this value will be the "issueSubCategory". If their root\
    issue doesn't match one of: ${issueCategoryToTypes[issueInfo.issueCategory]}, then record what they tell you as their "issueSubCategory".\
    Once you have found their "issueSubCategory", mark "issueFound" as true.`}

    ${issueInfo.issueCategory && issueInfo.issueCategory === "Other" && 'Ask the user to clarify the root issue. Record their root issue as the "issueSubCategory".'}

    ${issueInfo.issueCategory && issueInfo.issueSubcategory && issueInfo.issueLocation && 'mark "issueFound" as true.'} 
    The conversational message responses you generate should ALWAYS set the value for the the "aiMessage" key and "issueFound" key.
    When you have identified the value for keys "issueCategory" and "issueSubCategory", mark the value for the key "issueFound" as "true".
  `}
}
