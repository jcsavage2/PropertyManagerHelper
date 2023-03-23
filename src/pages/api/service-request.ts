// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { findIssueSample } from "@/constants"
import { generateAdditionalUserContext, generatePrompt, processAiResponse } from "@/utils"
import type { NextApiRequest, NextApiResponse } from "next"
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai"
import { AiJSONResponse, ApiRequest, WorkOrder } from "../index"

const config = new Configuration({
  apiKey: process.env.OPEN_AI_API_KEY,
})
const openai = new OpenAIApi(config)

type Data = {
  response: string
}

/**
 * Handles back and forth communication between openAI API and the user messages.
 * We have two flows we need to handle: gather issue info, then gather user info.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const body = req.body as ApiRequest
    const { userMessage, messages, ...workOrderData } = body

    console.log({ userMessage })
    const prompt: ChatCompletionRequestMessage = generatePrompt(workOrderData)
    const additionalUserContext = generateAdditionalUserContext(workOrderData)

    console.log("Initial Request...")
    const response = await openai.createChatCompletion({
      max_tokens: 1000,
      model: "gpt-3.5-turbo",
      messages: [
        prompt,
        ...messages,
        {
          role: "user",
          content: userMessage + additionalUserContext
        }
      ],
      temperature: 0,
    })
    console.log("Finished Initial Request...")

    const aiResponse = response.data.choices[0].message?.content ?? ""
    console.log({ aiResponse })
    let processedResponse: string | null = processAiResponse(aiResponse, workOrderData)

    if (!processedResponse) {
      console.log("Making Second Request...")
      const newResponse = await openai.createChatCompletion({
        max_tokens: 1000,
        model: "gpt-3.5-turbo",
        messages: [
          prompt,
          ...messages,
          { role: "user", content: userMessage },
          { role: "assistant", content: aiResponse },
          {
            role: "system",
            content: `Your answer should only be JSON formatted like this: ${JSON.stringify(findIssueSample)}, with no additional text.`,
          }
        ],
        temperature: 0,
      })
      const newAiResponse = newResponse.data.choices[0].message?.content ?? ""

      processedResponse = processAiResponse(newAiResponse, workOrderData)

      //If it still doesn't work, return the original aiMessage with other WO data taken from request body
      if (!processedResponse) {
        let incompleteResponse: AiJSONResponse = {
          issueCategory: workOrderData.issueCategory ?? "",
          issueSubCategory: workOrderData.issueSubCategory ?? "",
          issueLocation: workOrderData.issueLocation ?? "",
          aiMessage: aiResponse
        }
        processedResponse = JSON.stringify(incompleteResponse)
      }
    }


    if (!processedResponse) {
      return res.status(400).json({ response: "Error getting message from chatbot" })
    } else {
      console.log({ processedResponse })
      return res.status(200).json({ response: processedResponse })
    }
  } catch (err) {
    return res.status(400).json({ response: JSON.stringify(err) ?? "Error returning message..." })
  }
}


