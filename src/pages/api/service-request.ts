// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { findIssueSample } from "@/constants"
import { generateAdditionalUserContext, generatePrompt, processAiResponse } from "@/utils"
import type { NextApiRequest, NextApiResponse } from "next"
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai"
import { AiJSONResponse, ApiRequest, WorkOrder } from "@/types"

const config = new Configuration({
  apiKey: process.env.OPEN_AI_API_KEY,
})
const openai = new OpenAIApi(config)

type Data = {
  response: string
  flow: string
}

/**
 * Handles back and forth communication between openAI API and the user messages.
 * We have two flows we need to handle: gather issue info, then gather user info.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const body = req.body as ApiRequest
  const { userMessage, messages, flow, ...workOrderData } = body
  try {


    console.log("\n 1 =============\n", { userMessage })
    const prompt: ChatCompletionRequestMessage = generatePrompt(workOrderData)
    const additionalUserContext = generateAdditionalUserContext(workOrderData)
    console.log({ additionalUserContext })

    const response = await openai.createChatCompletion({
      max_tokens: 1000,
      model: "gpt-3.5-turbo",
      messages: [
        prompt,
        ...messages,
        {
          role: "user",
          content: additionalUserContext + userMessage
        },
      ],
      temperature: 0,
    })


    const aiResponse = response.data.choices[0].message?.content ?? ""
    console.log("\n 2 ======= Initial Response ======\n", { aiResponse })

    let processedResponse: { returnValue: string | null, flow: string } = processAiResponse({ response: aiResponse, workOrderData: workOrderData, flow })
    console.log("\n 2.5 ======= Processed Response ======\n", { processedResponse: processedResponse.returnValue })

    if (!processedResponse.returnValue) {
      console.log("\n 3 ======= Is Refetching... ======\n",)
      const newResponse = await openai.createChatCompletion({
        max_tokens: 1000,
        model: "gpt-3.5-turbo",
        messages: [
          prompt,
          ...messages,
          { role: "user", content: additionalUserContext + userMessage },
          { role: "assistant", content: aiResponse },
          {
            role: "system",
            content: `Your answer should only be JSON formatted like this: ${JSON.stringify(findIssueSample)}, with no additional text.`,
          }
        ],
        temperature: 0,
      })
      const newAiResponse = newResponse.data.choices[0].message?.content ?? ""
      console.log("\n 4 ======= New Response... ======\n", { newAiResponse })
      processedResponse = processAiResponse({ response: newAiResponse, workOrderData: workOrderData, flow })

      //If it still doesn't work, return the original aiMessage with other WO data taken from request body
      if (!processedResponse.returnValue) {
        let incompleteResponse: AiJSONResponse = {
          issueCategory: workOrderData.issueCategory ?? "",
          issueSubCategory: workOrderData.issueSubCategory ?? "",
          issueLocation: workOrderData.issueLocation ?? "",
          aiMessage: aiResponse
        }
        processedResponse.returnValue = JSON.stringify(incompleteResponse)
      }
    }


    if (!processedResponse) {
      return res.status(400).json({ response: "Error getting message from chatbot", flow: flow })
    } else {
      return res.status(200).json({ response: processedResponse.returnValue ?? "", flow: processedResponse.flow })
    }
  } catch (err) {
    return res.status(400).json({ response: 'service-request error', flow: flow })
  }
}


