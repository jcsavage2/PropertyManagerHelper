import { findIssueSample, findUserInfoSample, issueCategoryToTypes } from "@/constants"
import { AiJSONResponse, WorkOrder } from "@/pages"
import { ChatCompletionRequestMessage } from "openai"

export const hasAllIssueInfo = (workOrder: WorkOrder) => {
  return !!workOrder.issueCategory && !!workOrder.issueSubCategory && !!workOrder.issueLocation
}

/** Checks if we have all the info we need to submit the work order */
export const hasAllInfo = (workOrder: WorkOrder) => {
  return Object.values(workOrder).every(value => !!value) // this works because we need permission to enter to be true.
}

/**
 * 
 * @param workOrder relates to the information the Frontend already "knows"
 * @returns string
 * OpenAI's api responds strongly to user input. By appending instructions to the user's message, we can get more consistent responses.
 * This function determines what kind of context and rules we want to append to the user's message.
 */
export const generateAdditionalUserContext = (workOrder: WorkOrder) => {
  switch (hasAllIssueInfo(workOrder)) {
    case false:
      return `\n \
        Don't make me to confirm info I've already told you.
        If I say something is "broken", "not working", or anything vague, ask me for more details until you identify an issueSubCategory.
        Please always respond to my messages in this JSON format: ${JSON.stringify(findIssueSample)} and include no additional text. `
    case true:
      return `\n Please respond to my messages in this format: ${JSON.stringify(findUserInfoSample)} and include no additional text.
      Don't make me to confirm info I've already told you.
      Keep asking me questions based on Data that is missing in ${JSON.stringify(workOrder)} until you have all values filled.
      Only ask for values from the user in plain text, not JSON, and store your conversational question in "aiMessage".

      `
  }
}

/**
 * 
 * @param workOrder relates to the information the Frontend already "knows"
 * @returns An initial prompt which is dynamically generated based on the information we already have.
 * Depending on the information that the program has, the prompt will ask user for either issue information or user information.
 */
export const generatePrompt = (workOrder: WorkOrder): ChatCompletionRequestMessage => {
  switch (hasAllIssueInfo(workOrder)) {
    case false:
      return {
        role: "system",
        content: `You're a property management chatbot. The user is a tenant. Think like a property manager who needs to get information from the user and diagnose what their issue is.
        All of your responses in this chat should be stringified JSON like this: ${JSON.stringify(findIssueSample)}
        and should contain all of the keys: ${Object.keys(findIssueSample)}, even if there are no values. Here is an example structure: ${findIssueSample}. 
        The "issueCategory" value will always be one of: ${Object.keys(issueCategoryToTypes)}.
        You must identify the "issueLocation", which is the room or rooms where the issue is occuring. \
        If the user doesn't provide an "issueLocation", set the value of "issueLocation" to "".
        The user may specify multiple rooms, in which case you should record all of them in the "issueLocation" value. The user may also specify\
        that the issue is general to their entire apartment, in which case you should record "All Rooms" as the "issueLocation" value.
        Once you have identified the "issueLocation", don't ask the user about the "issueLocation" again.
        If the user's response seems unrelated to a service request or you can't understand their issue, cheerfully ask them to try again.
        ${workOrder.issueCategory && workOrder.issueCategory !== "Other" && `When you find the "issueCategory", ask the user to clarify the root issue. \
        The root issue will probably be one of ${issueCategoryToTypes[workOrder.issueCategory].join(", ")} and this value will be the "issueSubCategory". If their root\
        issue doesn't match one of: ${issueCategoryToTypes[workOrder.issueCategory].join(", ")}, then record what they tell you as their "issueSubCategory".`}
    
        ${workOrder.issueCategory === "Other" && 'Ask the user to clarify the root issue. Record their root issue as the "issueSubCategory".'}
  
        The conversational message responses you generate should ALWAYS set the value for the the "aiMessage" key`
      }
    case true:
      return {
        role: "system",
        content: `CONTEXT: examine this JSON: ${JSON.stringify(findUserInfoSample)}
        As a property management chatbot provided with an issue from the user, your job is to update the JSON fields based on the users \
        input. All of your messages should be in JSON. You should ask the user for any missing information.
        The current state of the work order is ${JSON.stringify(workOrder)}, and the user has sent new text.
        If the user's input is totally unrelated to a service request, cheerfully instruct them to try again. 
        The user does not understand what JSON is, so refer to the JSON as "the form".
        If the user has given you all of the information, end the message with: \
        "Please confirm the above looks correct and click below to submit the work order. 
        You and your Property Manager will receive an email with the details."
        While your response will only ever be JSON, your conversational response should go in a key called "aiMessage".
      `}
  }
}


/**
 * 
 * @param response string response from GPT; no format requirements
 * @returns A stringified JSON object ready to be sent to the frontend; or a null value if response was not in the correct format.
 */
export const processAiResponse = (response: string, workOrderData: WorkOrder): string | null => {
  let returnValue: string | null = null
  const jsonStart = response.indexOf("{")
  const jsonEnd = response.lastIndexOf("}")

  if ((jsonStart !== -1 && jsonEnd !== -1)) {
    const regex = /&quot;/g
    const substr = response.substring(jsonStart, jsonEnd + 1)
    const cleanedString = substr.replace(regex, '"').replace("True", "true").replace("False", "false").replace("undefined", '""')
    let jsonResponse = JSON.parse(cleanedString) as AiJSONResponse

    jsonResponse.aiMessage = jsonResponse.issueCategory && jsonResponse.issueSubCategory && jsonResponse.issueLocation ? `I am sorry you are dealing with this, we will try and help you as soon as possible. \
      To finalize your service request, please tell me the following information so I can finalize your work order:\n \
      ${!workOrderData.name && !jsonResponse.name ? `\n Name: ` : ""} \
      ${!workOrderData.address && !jsonResponse.address ? `\n Address: ` : ""} \
      ${!workOrderData.permissionToEnter && !jsonResponse.permissionToEnter ? `\n Permission to Enter: ` : ""} \
      ${!workOrderData.properyManagerEmail && !jsonResponse.properyManagerEmail ? `\n Property Manager Email: ` : ""}`
      : jsonResponse.aiMessage

    returnValue = JSON.stringify(jsonResponse)
  }

  return returnValue
}
