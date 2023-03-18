// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next"
import { ChatCompletionRequestMessage, Configuration, CreateChatCompletionResponse, OpenAIApi } from "openai"
import { client } from "../../sanity-client"
import { AiJSONResponse, ApiRequest } from "../index"

type Data = {
  response: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const body = req.body as ApiRequest
    const { text, messages, issueCategory } = body

    const config = new Configuration({
      apiKey: process.env.OPEN_AI_API_KEY,
    })
    const openai = new OpenAIApi(config)


    const sample = {
      issueCategory: "Toilet",
      subCategory: "Leaking from Base",
      aiMessage: "Ok thank you for reporting the issue... ",
      issueRoom: "First bedroom on the right on 2nd floor",
      issueFound: false,
    } as AiJSONResponse

    const issueCategoryToTypes = {
      "Toilet": ["Leaking from Base", "Leaking from Tank", "Not flushing", "Clogged", "Does not Fill", "Cracked", "Weak Flush"],
      "Faucet": ["Leaking", "Won't turn on", "Drain Clogged", "Low Pressure", "Rusty"],
      "Fridge": ["Fridge not running", "Freezer not running", "Fridge leaking", "Freezer leaking", "Light Is Broken", "Filter Needs Replacement"],
      "Dishwasher": ["Won't Run", "Overflowing", "Not Cleaning The Dishes"],
      "Stove": ["Won't Turn On", "Not Getting Hot"],
      "TV": ["Won't Turn On", "Nothing Displays When On", "Can't Connect to Internet"],
      "Oven": ["Oven won't turn on", "Not Getting Hot"],
      "Leak": ["Ceiling", "Basement", "Walls", "Floor"],
      "Electrical": ["Light bulb out", "Heating not working", "AC not working"],
      "Lawn": ["Needs To Be Cut", "Needs To Be Sprayed", "Has "],
      "Pests": ["Mice/Rats", "Termites", "Roaches", "Ants", "Fruit Flies"],
      "Roof": ["Dilapidated", "Missing Sections", "Crack", "Snow Pile-up"],
      "Hazard": ["Mold", "Asbestos", "Gas Leak", "Fire", "Flood"]
    } as any

    const prompt: ChatCompletionRequestMessage = {
      role: "system",
      content: `You're a property management chatbot. The user is a tenant. Think like a property manager who needs to get information from the user and diagnose what their issue is.
      All of your responses in this chat should be stringified JSON like this: ${JSON.stringify(sample)}
      and should contain all of the keys: ${Object.keys(sample)}, even if there are no values. Here is an example structure: ${sample}. 
      The "issueCategory" value will always be one of: ${Object.keys(issueCategoryToTypes)}.
      You must identify the "issueRoom", which is the room or rooms where the issue is occuring. \
      If the user doesn't provide an "issueRoom", set the value of "issueRoom" to "".
      The user may specify multiple rooms, in which case you should record all of them in the "issueRoom" value. The user may also specify\
      that the issue is general to their entire apartment, in which case you should record "All Rooms" as the "issueRoom" value.
      Once you have identified the "issueRoom", don't ask the user about the "issueRoom" again.
      If the user's response seems unrelated to a service request or you can't understand their issue, cheerfully ask them to try again.
      ${issueCategory && issueCategory !== "Other" && `When you find the "issueCategory", ask the user to clarify the root issue. \
      The root issue will ALWAYS be one of ${issueCategoryToTypes[issueCategory]} and this value will be the "subCategory". If their root\
      issue doesn't match one of: ${issueCategoryToTypes[issueCategory]}, then record what they tell you as their "subCategory"\
      Once you have found their "subCategory", mark "issueFound" as true.`}
      ${issueCategory && issueCategory === "Other" && `Ask the user to clarify the root issue. Record their root issue as the "subCategory" \
      Once you have found their root issue, mark "issueFound" as true.`}  
      The conversational message responses you generate should ALWAYS set the value for the the "aiMessage" key and "issueFound" key.
      When you have identified the value for keys "issueCategory" and "subCategory", mark the value for the key "issueFound" as "true".
    `}

    const response = await openai.createChatCompletion({
      max_tokens: 500,
      model: "gpt-3.5-turbo",
      messages: [prompt, ...messages, { role: "user", content: text + `Please respond to my messages in this format: ${JSON.stringify(sample)} and include no additional text.`  }],
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
          { role: "user", content: text },
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
    console.log({ finalResponse })

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

  let message = parsedResponse.issueFound && parsedResponse.issueRoom ? 'I am sorry you are dealing with this, we will try and help you as soon as possible. \
    To finalize your service request, please give us your name, address, and whether or not we have permission to enter(y/n)'
    : parsedResponse.aiMessage
  parsedResponse.aiMessage = message

  return JSON.stringify(parsedResponse)
}
