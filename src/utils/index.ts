import { findIssueSample, findUserInfoSample, issueCategoryToTypes } from "@/constants"
import { ChatCompletionRequestMessage } from "openai"
import { AiJSONResponse, UserInfo, WorkOrder } from "@/types"

export const hasAllIssueInfo = (workOrder: WorkOrder) => {
  return !!workOrder.issueCategory && !!workOrder.issueSubCategory && !!workOrder.issueLocation
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

export const hasAllUserInfo = (userInfo: UserInfo) => {
  return Object.values(userInfo).every(value => !!value) // this works because we need permission to enter to be true.
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
      Please respond to my messages in this format: ${JSON.stringify(findIssueSample)} and include no additional text. \
      Don't ask me to confirm info I've already told you.
      If my issue is vague, eg I say something is "broken", ask for more details.
      If you can derive an issue and a root cause, set the root cause to the "issueSubCategory" field.
      `
    case true:
      return `\n 
      Please respond to all of my messages in this format: ${JSON.stringify(findUserInfoSample)} and include no additional text.
      The conversational message responses you generate should ALWAYS set the value for the the "aiMessage" key.
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
        See if you can categorize the root issue be one of ${issueCategoryToTypes[workOrder.issueCategory]} and this value will be the "issueSubCategory". If their root\
        issue doesn't match one of: ${issueCategoryToTypes[workOrder.issueCategory]}, then record what they tell you as their "issueSubCategory".\
        Once you have found their "issueSubCategory", mark "issueFound" as true.`}
        ${workOrder.issueCategory && workOrder.issueCategory === "Other" && 'Ask the user to clarify the root issue. Record their root issue as the "issueSubCategory".'}
        ${workOrder.issueCategory && workOrder.issueSubCategory && workOrder.issueLocation && 'mark "issueFound" as true.'} 
        The conversational message responses you generate should ALWAYS set the value for the the "aiMessage" key and "issueFound" key.
        When you have identified the value for keys "issueCategory" and "subCategory", mark the value for the key "issueFound" as "true".`
      }
    case true:
      return {
        role: "system",
        content: `You're a property management chatbot. The user is a tenant. 
        You know what their issue is, but need some more information to complete a work order form.
        CONTEXT: examine this JSON: ${JSON.stringify(findUserInfoSample)}.
        Your job is to ask the user questions and update the form based on the users input.
        All of your responses should be in JSON like this: ${JSON.stringify(findUserInfoSample)}. 
        You should ask the user for any missing information, and store their response in the appropriate key/value.
        If the user tells you their email, store it under the "email" key in your response.
        If the user tells you their name, store it under "name" in your JSON response.
        If the user tells you their address of the property, store it under "address" in your JSON response.
        If I give you permission to enter, store it under "permissionToEnter" in your response.
        All of your responses should be stringified JSON like this: ${JSON.stringify(findUserInfoSample)}
        If the user's input is totally unrelated to a service request, cheerfully instruct them to try again.   
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
  try {
    let returnValue: string | null = null
    let updatedFlow = flow
    const jsonStart = response.indexOf("{")
    const jsonEnd = response.lastIndexOf("}")


    if ((jsonStart !== -1 && jsonEnd !== -1)) {
      const regex = /&quot;/g
      const substr = response.substring(jsonStart, jsonEnd + 1)
      const cleanedString = substr.replace(regex, '"').replace("True", "true").replace("False", "false").replace("undefined", '""')
      let jsonResponse = JSON.parse(cleanedString) as AiJSONResponse

      const merged = mergeWorkOrderAndAiResponse({ workOrder: workOrderData, aiResponse: jsonResponse })

      if (hasAllInfo(merged)) {
        jsonResponse.aiMessage = `Please complete the form below. When complete, and you have given permission to enter, click the "submit" button to send your Service Request.`
        updatedFlow = "userFlow"
      }

      returnValue = JSON.stringify(jsonResponse)
    }

    return { returnValue: returnValue, flow: updatedFlow }
  } catch (err) {
    console.log({ err })
    return { returnValue: null, flow: flow }
  }
}