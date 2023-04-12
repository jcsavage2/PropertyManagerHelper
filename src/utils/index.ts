import { findIssueSample, issueCategoryToTypes } from "@/constants";
import { ChatCompletionRequestMessage } from "openai";
import { AiJSONResponse, UserInfo, WorkOrder } from "@/types";

export const hasAllIssueInfo = (workOrder: WorkOrder) => {
  return !!workOrder.issueDescription && !!workOrder.issueLocation;
};

export const mergeWorkOrderAndAiResponse = ({ workOrder, aiResponse }: { workOrder: WorkOrder, aiResponse: AiJSONResponse; }) => {
  const merged: WorkOrder = workOrder;
  for (const workOrderKey of Object.keys(workOrder)) {
    const aiValue = aiResponse?.[workOrderKey as keyof WorkOrder];
    if (aiValue) {
      //@ts-ignore
      merged[workOrderKey as keyof WorkOrder] = aiValue;
    }
  }
  return merged;
};

/** Checks if we have all the info we need to submit the work order */
export const hasAllInfo = (workOrder: WorkOrder) => {
  return Object.values(workOrder).every(value => !!value); // this works because we need permission to enter to be true.
};

export const hasAllUserInfo = (userInfo: UserInfo) => {
  const {
    address,
    state,
    city,
    postalCode,
    tenantEmail,
    tenantName,
    permissionToEnter
  } = userInfo;
  return !!address && !!state && !!city && !!postalCode && !!tenantEmail && !!tenantName && !!permissionToEnter;
};

/**
 * 
 * @param workOrder relates to the information the Frontend already "knows"
 * @returns string
 * OpenAI's api responds strongly to user input. By appending instructions to the user's message, we can get more consistent responses.
 * This function determines what kind of context and rules we want to append to the user's message.
 */
export const generateAdditionalUserContext = (workOrder: WorkOrder) => {
  return `\n \
      Don't ask me to confirm info I've already told you.
      If my issue is vague, eg I say something is "broken", ask for more details - and use the examples from above.`;

};

/**
 * 
 * @param workOrder relates to the information the Frontend already "knows"
 * @returns An initial prompt which is dynamically generated based on the information we already have.
 * Depending on the information that the program has, the prompt will ask user for either issue information or user information.
 */
export const generatePrompt = (workOrder: WorkOrder): ChatCompletionRequestMessage => {
  return {
    role: "system",
    content: `You're a property management chatbot. The user is a tenant. Think like a property manager who needs to get information from the user and diagnose what their issue is.
        All of your responses in this chat should be stringified JSON like this: ${JSON.stringify(findIssueSample)}
        and should contain all of the keys: ${Object.keys(findIssueSample).join(", ")}, even if there are no values. 
        The value of "issueDescription" is the issue or request for service the user tells you.
        ${workOrder.issueDescription && `Don't assume the "issueDescription" - only fill a value for "issueDescription" if one is explicitly given. If one is not given, ask the user to "Clarify what they need help with".`}

        ${!workOrder.issueLocation && `You must identify the "issueLocation", which is the instructions for the service worker locate the issue. \
        When asking for the issue location, remind the user "This information will help the service worker locate the issue."
        If the user doesn't provide an "issueLocation", set the value of "issueLocation" to "".
        If the user just gives you a room like "bathroom" ask them for instructions on how to find the room.
        The user may specify multiple rooms, in which case you should record all of them in the "issueLocation" value. The user may also specify \
        that the issue is general to their entire apartment, in which case you should record "All Rooms" as the "issueLocation" value.
        If you have found the "issueLocation" do not ask the user about the "issueLocation" again.`}
        If there is already an "issueLocation" value in ${JSON.stringify(workOrder)}, do not ask the user about the issue location.
       
        The conversational message responses you generate should ALWAYS set the value for the the "aiMessage" key.
        If the user's response seems unrelated to a service request or you can't understand their issue, cheerfully ask them to try again.`
  };
};




/**
 * 
 * @param response string response from GPT; no format requirements
 * @returns A stringified JSON object ready to be sent to the frontend; or a null value if response was not in the correct format.
 */
export const processAiResponse = ({ response, workOrderData }: { response: string, workOrderData: WorkOrder; }): string | null => {
  try {
    let returnValue: string | null = null;
    const jsonStart = response.indexOf("{");
    const jsonEnd = response.lastIndexOf("}");


    if ((jsonStart !== -1 && jsonEnd !== -1)) {
      const regex = /&quot;/g;
      const substr = response.substring(jsonStart, jsonEnd + 1);
      const cleanedString = substr.replace(regex, '"').replace("True", "true").replace("False", "false").replace("undefined", '""');
      let jsonResponse = JSON.parse(cleanedString) as AiJSONResponse;

      const merged = mergeWorkOrderAndAiResponse({ workOrder: workOrderData, aiResponse: jsonResponse });

      if (hasAllInfo(merged)) {
        jsonResponse.aiMessage = `Please complete the form below. When complete, and you have given permission to enter, click the "submit" button to send your Service Request.`;
      }

      returnValue = JSON.stringify(jsonResponse);
    }

    return returnValue;
  } catch (err) {
    console.log({ err });
    return null;
  }
};

export function generateAddressKey({ unit, address }: { unit?: string; address: string; }) {
  const unitString = unit ? `- ${unit?.toLowerCase()}` : "";
  return `${address?.toLowerCase()} ${unitString}`;
}

export function toTitleCase(str: string) {
  return str.toLowerCase().split(' ').map(function (word) {
    return (word.charAt(0).toUpperCase() + word.slice(1));
  }).join(' ');
}