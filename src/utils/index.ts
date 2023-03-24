import { findIssueSample, findUserInfoSample, issueCategoryToTypes } from "@/constants"
import { ChatCompletionRequestMessage } from "openai"
import { AiJSONResponse, WorkOrder } from "@/types"

export const hasAllIssueInfo = (workOrder: WorkOrder) => {
  return !!workOrder.issueCategory && !!workOrder.issueSubCategory && !!workOrder.issueLocation
}

export const hasNoFinishFormInfo = (workOrder: WorkOrder) => {
  return !workOrder.address && !workOrder.email && !workOrder.name && !workOrder.permissionToEnter && !workOrder.propertyManagerEmail
}

export const mergeWorkOrderAndAiResponse = ({ workOrder, aiResponse }: { workOrder: WorkOrder, aiResponse: AiJSONResponse }) => {
  const merged: WorkOrder = workOrder
  for (const workOrderKey of Object.keys(workOrder)) {
    const aiValue = aiResponse?.[workOrderKey as keyof WorkOrder]
    if (aiValue) {
      //@ts-ignore
      merged[workOrderKey as keyof WorkOrder] = aiValue
    }
  }
  return merged
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
        Don't make me confirm information I've already told you.
        If I say something is "broken", "not working", or anything vague, ask me for more details until you identify an issueSubCategory.
        If you have an issueSubCategory with details about the issue, store it in "issueSubCategory".
        Assume the user will only ever see the value of the "aiMessage" field. Don't reference the other fields. 
        Please respond in JSON format like this: ${JSON.stringify(findIssueSample)}.`
    case true:
      return `\n 
      Don't make me confirm information I've already told you.
      Keep asking me for missing information until all of the missing information in this work order is filled out: ${JSON.stringify(workOrder)}.
      If I tell you my email, store that under "email" in your JSON response.
      If I tell you my name, store that under "name" in your JSON response.
      If I tell you the address of the property, store it under "address" in your JSON response.
      If I give you permission to enter, store it under "permissionToEnter" in your response.
      Assume I will only see the value of the "aiMessage" field. Don't reference the other fields. 
      Keep asking me questions until you have all of the information you need.
      Please respond to all of my messages in this format: ${JSON.stringify(findUserInfoSample)} and include no additional text.
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
        You must identify the "issueLocation", which is the directions to the room or rooms where the issue is occuring. \
        When you ask the user for the issueLocation, remind them this will help the service worker find the issue. 
        If the user doesn't provide an "issueLocation", set the value of "issueLocation" to "".
        The user may specify multiple rooms, in which case you should record all of them in the "issueLocation" value. The user may also specify\
        that the issue is general to their entire apartment, in which case you should record "All Rooms" as the "issueLocation" value.
        Once you have identified the "issueLocation", don't ask the user about the "issueLocation" again.
        If the user's response seems unrelated to a service request or you can't understand their issue, cheerfully ask them to try again.
        
        ${workOrder.issueCategory && workOrder.issueCategory !== "Other" && `When you find the "issueCategory", ask the user to clarify the root issue. \
        The root issue will probably be one of ${issueCategoryToTypes[workOrder.issueCategory].join(", ")} and this value will be the "issueSubCategory". If their root\
        issue doesn't match one of: ${issueCategoryToTypes[workOrder.issueCategory].join(", ")}, then record what they tell you as their "issueSubCategory".`}
    
        ${workOrder.issueCategory === "Other" && 'Ask the user to clarify the root issue. Record their root issue as the "issueSubCategory".'}
  
        The conversational message responses you generate should ALWAYS set the value for the the "aiMessage" key.`
      }
    case true:
      return {
        role: "system",
        content: `CONTEXT: examine this JSON: ${JSON.stringify(findUserInfoSample)}.
        As a property management chatbot provided with an issue from the user, your job is to update the JSON fields based on the users \
        input. All of your messages should be in JSON. You should ask the user for any missing information.
        The current state of the work order is ${JSON.stringify(workOrder)}, and the user will send you a new message with more information.
        If the user's input is totally unrelated to a service request, cheerfully instruct them to try again. 
        
        All of your responses in this chat should be stringified JSON like this: ${JSON.stringify(findUserInfoSample)}
        The conversational message responses you generate should ALWAYS set the value for the the "aiMessage" key.
      `}
  }
}


/**
 * 
 * @param response string response from GPT; no format requirements
 * @returns A stringified JSON object ready to be sent to the frontend; or a null value if response was not in the correct format.
 */
export const processAiResponse = ({ response, workOrderData, flow }: { response: string, workOrderData: WorkOrder, flow: string }): { returnValue: string | null, flow: string } => {
  let returnValue: string | null = null
  let updatedFlow = flow
  const jsonStart = response.indexOf("{")
  const jsonEnd = response.lastIndexOf("}")


  if ((jsonStart !== -1 && jsonEnd !== -1)) {
    const regex = /&quot;/g
    const substr = response.substring(jsonStart, jsonEnd + 1)
    const cleanedString = substr.replace(regex, '"').replace("True", "true").replace("False", "false").replace("undefined", '""')
    let jsonResponse = JSON.parse(cleanedString) as AiJSONResponse

    // WORK IN PROGRESS
    const merged = mergeWorkOrderAndAiResponse({ workOrder: workOrderData, aiResponse: jsonResponse })
    console.log({ merged })

    //Error: This will continue to be called while hasAllIssueInfo is true and we will always replace the aiMessage
    if (hasAllInfo(merged)) {
      jsonResponse.aiMessage = `Please click the button below to submit your Service Request.`
    } else if (hasAllIssueInfo(merged) && flow === "issueFlow") {
      jsonResponse.aiMessage = `To finalize your service request, please tell me the following information so I can finalize your work order:`
      updatedFlow = "userFlow"
    }

    returnValue = JSON.stringify(jsonResponse)
  }
  return { returnValue: returnValue, flow: updatedFlow }
}
