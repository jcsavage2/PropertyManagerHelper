// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { API_STATUS, findIssueSample } from "@/constants";
import {  generatePrompt, processAiResponse } from "@/utils";
import type { NextApiRequest, NextApiResponse } from "next";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { AiJSONResponse, ChatbotRequest } from "@/types";
import chalk from "chalk";
import { getServerSession } from "next-auth";
import { options } from "./auth/[...nextauth]";
import { ApiResponse } from "./_types";
import { ChatbotRequestSchema } from "@/types/customschemas";
import { errorToResponse } from "./_utils";

const config = new Configuration({
  apiKey: process.env.NEXT_PUBLIC_OPEN_AI_API_KEY,
});
const openai = new OpenAIApi(config);
const gpt_model = 'gpt-4-0613';

/**
 * Handles back and forth communication between openAI API and the user messages.
 * We have two flows we need to handle: gather issue info, then gather user info.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {

  const session = await getServerSession(req, res, options);
  if (!session) {
    res.status(API_STATUS.UNAUTHORIZED);
    return;
  }

  const body: ChatbotRequest = ChatbotRequestSchema.parse(req.body)
  const { userMessage, messages, unitInfo, streetAddress, ...workOrderData } = body;
  try {
    const prompt: ChatCompletionRequestMessage = generatePrompt(workOrderData, unitInfo, streetAddress);
    const response = await openai.createChatCompletion({
      max_tokens: 1000,
      model: gpt_model,
      messages: [
        prompt,
        ...messages,
        {
          role: "user",
          content: userMessage
        },
        {
          role: "system",
          content: `Reformat your response into JSON formatted like this: ${JSON.stringify(findIssueSample)}, with no additional text.`,
        }
      ],
      temperature: 0,
    }, { headers: { "Content-Type": "application/json" } });


    const aiResponse = response.data.choices[0].message?.content ?? "";
    console.log(chalk.yellow("\n Initial Response=============\n"));
    console.log(aiResponse);

    let processedResponse: string | null = processAiResponse({ response: aiResponse, workOrderData: workOrderData });
    console.log(chalk.yellow("\n Processed Response =============\n"), { processedResponse: processedResponse });

    if (!processedResponse) {
      console.log(chalk.red("\n Is Refetching...  =============\n"));
      const newResponse = await openai.createChatCompletion({
        max_tokens: 1000,
        model: gpt_model,
        messages: [
          prompt,
          ...messages,
          { role: "user", content: userMessage },
          { role: "assistant", content: aiResponse },
          {
            role: "system",
            content: `Reformat your response into JSON formatted like this: ${JSON.stringify(findIssueSample)}, with no additional text.`,
          }
        ],
        temperature: 0,
      }, { headers: { "Content-Type": "application/json" } });
      const newAiResponse = newResponse.data.choices[0].message?.content ?? "";

      console.log("\n New Response... =============\n", newAiResponse);
      processedResponse = processAiResponse({ response: newAiResponse, workOrderData: workOrderData });

      //If it still doesn't work, return the original aiMessage with other WO data taken from request body
      if (!processedResponse) {
        let incompleteResponse: AiJSONResponse = {
          issueDescription: workOrderData.issueDescription ?? "",
          issueLocation: workOrderData.issueLocation ?? "",
          aiMessage: aiResponse,
          additionalDetails: workOrderData.additionalDetails ?? "",
        };
        processedResponse = JSON.stringify(incompleteResponse);
      }
    }


    if (!processedResponse) {
      return res.status(API_STATUS.BAD_REQUEST).json({ response: "Error getting message from chatbot" });
    } else {
      return res.status(API_STATUS.SUCCESS).json({ response: processedResponse });
    }
  } catch (err: any) {
    const isOpenAIError = !!err?.response?.status
    return res.status(isOpenAIError ? err.response.status : err?.statusCode ?? API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(err));
  }
}


