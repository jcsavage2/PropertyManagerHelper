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
  "Basement": ["Leaking", "Humid"],
  "Ceiling": ["Leaking", "Cracked"],
  "Chandalier": ["Fallen", "Won't Turn On"],
  "Dishwasher": ["Won't Run", "Overflowing", "Not Cleaning The Dishes"],
  "Door": ["Off the Rail", "Won't Open/Close", "Won't Lock", "Can't get in"],
  "Dryer": ["Doesn't Dry", "Takes Multiple Runs", "Won't Start"],
  "Electrical": ["Light bulb out", "Heating not working", "AC not working"],
  "Faucet": ["Leaking", "Won't turn on", "Drain Clogged", "Low Pressure", "Rusty", "No Hot Water"],
  "Floor": ["Needs Cleaning", "Missing"],
  "Fridge": ["Fridge not running", "Freezer not running", "Fridge leaking", "Freezer leaking", "Light Is Out", "Filter Needs Replacement"],
  "Hazard": ["Mold", "Asbestos", "Gas Leak", "Fire", "Flood"],
  "Lawn": ["Needs To Be Cut", "Needs To Be Sprayed", "Has "],
  "Microwave": ["Won't Turn On"],
  "Oven": ["Oven won't turn on", "Not Getting Hot"],
  "Pests": ["Mice/Rats", "Termites", "Roaches/Cockroaches", "Ants", "Fruit Flies"],
  "Roof": ["Dilapidated", "Missing Sections", "Crack", "Snow Pile-up"],
  "Shower": ["Drain Clogged", "Won't turn on", "Low Pressure", "Rusty", "No Hot Water"],
  "Sliding Door/Screen": ["Off the Track", "Ripped"],
  "Stove": ["Won't Turn On", "Not Getting Hot"],
  "Toilet": ["Leaking from Base", "Leaking from Tank", "Not flushing", "Clogged", "Does not Fill", "Cracked", "Weak Flush"],
  "Transition Strip": ["Broken"],
  "TV": ["Won't Turn On", "Nothing Displays When On", "Can't Connect to Internet"],
  "Walls": ["Leaking", "Hole"],
  "Washer": ["No Water", "No Hot Water", "Won't Start"],
  "Window": ["Shattered", "Cracked", "Won't Open", "Won't Close"],
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
      messages: [
        prompt,
        ...messages,
        {
          role: "user",
          content: userMessage + `\n
          Please respond to my messages in this format: ${JSON.stringify(sample)} and include no additional text. \
          Don't make me to confirm info I've already told you.
          If I say something is "broken", "not working", or anything vague, ask me for more details until you identify an issueSubCategory.`
        }
      ],
      temperature: 0,
    })

    const aiResponse = response.data.choices[0].message?.content ?? ""
    let processedResponse: string | null = processAiResponse(aiResponse)

    if (!processedResponse) {
      const newResponse = await openai.createChatCompletion({
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
          }
        ],
        temperature: 0,
      })

      const newAiResponse = newResponse.data.choices[0].message?.content ?? ""
      processedResponse = processAiResponse(newAiResponse)

      //If it still doesn't work, return the original aiMessage with other WO data taken from request body
      if (!processedResponse) {
        let incompleteResponse: AiJSONResponse = {
          issueCategory: workOrderData.issueCategory ?? "",
          issueSubCategory: workOrderData.issueSubCategory ?? "",
          issueLocation: workOrderData.issueLocation ?? "",
          issueFound: workOrderData.issueCategory && workOrderData.issueSubCategory && workOrderData.issueLocation ? true : false,
          aiMessage: aiResponse
        }

        processedResponse = JSON.stringify(incompleteResponse)
      }
    }

    if (!aiResponse) {
      return res.status(400).json({ response: "Error getting message from chatbot" })
    } else {
      return res.json({ response: processedResponse })
    }
  } catch (err) {
    return res.status(400).json({ response: JSON.stringify(err) ?? "Error returning message..." })
  }
}

/**
 * 
 * @param response string response from GPT; no format requirements
 * @returns A stringified JSON object ready to be sent to the frontend; or a null value if response was not in the correct format.
 */
const processAiResponse = (response: string): string | null => {
  let returnString = null
  const jsonStart = response.indexOf("{")
  const jsonEnd = response.lastIndexOf("}")

  if ((jsonStart !== -1 && jsonEnd !== -1)) {
    const regex = /&quot;/g
    const substr = response.substring(jsonStart, jsonEnd + 1)
    const cleanedString = substr.replace(regex, '"').replace("True", "true").replace("False", "false").replace("undefined", '""')
    let jsonResponse = JSON.parse(cleanedString) as AiJSONResponse

    jsonResponse.aiMessage = jsonResponse.issueFound && jsonResponse.issueLocation ? 'I am sorry you are dealing with this, we will try and help you as soon as possible. \
    To finalize your service request, please give us the following information:\n\n Name: \n Address: \n Permission to Enter: \n\n \
    Once you provide this information, we will be able to schedule a service request for you.'
      : jsonResponse.aiMessage

    returnString = JSON.stringify(jsonResponse)
  }

  return returnString
}

/**
 * 
 * @param issueInfo relates to the information the Frontend already "knows"
 * @returns An initial prompt which is dynamically generated based on the information we already have.
 */
const generatePrompt = (issueInfo: IssueInformation): ChatCompletionRequestMessage => {
  return {
    role: "system",
    content: `You're a property management chatbot. The user is a tenant. Think like a property manager who needs to get information from the user and diagnose what their issue is.
    All of your responses in this chat should be stringified JSON like this: ${JSON.stringify(sample)}
    and should contain all of the keys: ${Object.keys(sample)}, even if there are no values. Here is an example structure: ${sample}. 
    The "issueCategory" value will always be one of: ${Object.keys(issueCategoryToTypes)}.
    You must identify the "issueLocation", which is the room or rooms where the issue is occuring. \
    If the user doesn't provide an "issueLocation", set the value of "issueLocation" to "".
    The user may specify multiple rooms, in which case you should record all of them in the "issueLocation" value. The user may also specify\
    that the issue is general to their entire apartment, in which case you should record "All Rooms" as the "issueLocation" value.
    Once you have identified the "issueLocation", don't ask the user about the "issueLocation" again.
    If the user's response seems unrelated to a service request or you can't understand their issue, cheerfully ask them to try again.
    ${issueInfo.issueCategory && issueInfo.issueCategory !== "Other" && `When you find the "issueCategory", ask the user to clarify the root issue. \
    The root issue will ALWAYS be one of ${issueCategoryToTypes[issueInfo.issueCategory]} and this value will be the "issueSubCategory". If their root\
    issue doesn't match one of: ${issueCategoryToTypes[issueInfo.issueCategory]}, then record what they tell you as their "issueSubCategory".\
    Once you have found their "issueSubCategory", mark "issueFound" as true.`}

    ${issueInfo.issueCategory && issueInfo.issueCategory === "Other" && 'Ask the user to clarify the root issue. Record their root issue as the "issueSubCategory".'}

    ${issueInfo.issueCategory && issueInfo.issueSubCategory && issueInfo.issueLocation && 'mark "issueFound" as true.'} 
    The conversational message responses you generate should ALWAYS set the value for the the "aiMessage" key and "issueFound" key.
    When you have identified the value for keys "issueCategory" and "subCategory", mark the value for the key "issueFound" as "true".`
  }
}
