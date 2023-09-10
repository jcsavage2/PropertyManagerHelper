import { findIssueSample } from '@/constants';
import { ChatCompletionRequestMessage } from 'openai';
import { AiJSONResponse, UserInfo, WorkOrder } from '@/types';
import ksuid from 'ksuid';
import { EntityTypeValues } from '@/database/entities';

export const hasAllIssueInfo = (workOrder: WorkOrder, isUsingAI: boolean) => {
  if (!isUsingAI) {
    return !!workOrder.issueDescription;
  }
  return !!workOrder.issueDescription && !!workOrder.issueLocation;
};

export const mergeWorkOrderAndAiResponse = ({ workOrder, aiResponse }: { workOrder: WorkOrder; aiResponse: AiJSONResponse }) => {
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
  return Object.values(workOrder).every((value) => !!value); // this works because we need permission to enter to be true.
};

export const hasAllUserInfo = (userInfo: UserInfo) => {
  const { address, state, city, postalCode, tenantEmail, tenantName, permissionToEnter } = userInfo;
  return !!address && !!state && !!city && !!postalCode && !!tenantEmail && !!tenantName && !!permissionToEnter;
};

/**
 *
 * @param workOrder relates to the information the Frontend already "knows"
 * @returns An initial prompt which is dynamically generated based on the information we already have.
 * Depending on the information that the program has, the prompt will ask user for either issue information or user information.
 */
export const generatePrompt = (workOrder: WorkOrder, unitInfo: string): ChatCompletionRequestMessage => {
  return {
    role: 'system',
    content: `You're a property management chatbot. The user is a tenant. Think like a property manager who needs to get information from the user and diagnose what their issue is. \
        All of your responses in this chat should be stringified JSON like this: ${JSON.stringify(findIssueSample)}
        and should contain all of the keys: ${Object.keys(findIssueSample).join(', ')}, even if there are no values. \
        Here is the current state of the work order: ${JSON.stringify(workOrder)}. \
        Once you have values for "issueDescription" and "issueLocation", ask the user if they would like to provide any additional details. Let the user know that the "additionalDetails" field is optional. \
        ${
          unitInfo.length > 0 &&
          `The user has an apartment with ${unitInfo}. Use this information to finish the work order by asking as few questions as possible.`
        }

        The value of "issueDescription" is the issue or request for service the user tells you. \
        If the user doesn't provide enough details, i.e. they say something in their apartment is broken("my toilet is broken" for example) prompt them with several options of what could be wrong and ask them to clarify the exact issue. \
        The "issueDescription" should provide enough information such that a service worker can understand what the issue is and what they need to do to fix it. \
        Do not fill in a value for "issueDescription" if the user has not provided one with sufficient details. \
        If the user doesn't know the specific issue, then simply record what they tell you and move on.\
        If the user describes multiple issues, kindly instruct them to submit a separate work order for each issue, and ask them to let you know which issue they would like to submit first. \

        ${
          !workOrder.issueLocation &&
          `If the "issueDescription" already contains the "issueLocation" or if the "issueLocation" can be inferred from the "issueDescription", then simply fill out "issueLocation" with the location and don't ask the user for the location. \
        When asking for the issue location, remind the user "This information will help the service worker locate the issue."
        The user may specify multiple rooms, in which case you should record all of them in the "issueLocation" value. The user may also specify \
        that the issue is general to their entire apartment, in which case you should record "All Rooms" as the "issueLocation" value.
        ${
          unitInfo.length > 0 &&
          `Use the users bed/bath number to construct your questions about "issueLocation". \
        For example, if the user states there is an issue with their toilet and they live in a 2 bathroom apartment, you could ask "Which bathroom is the issue in?". \
        But if they have an issue with their toilet and they only have one bathroom then simply record the "issueLocation" as "bathroom" and you can avoid asking followup questions about "issueLocation". \
        This logic can be used for the number of bedrooms as well if the user specifies an issue with their bedroom, with other locations make sure to ask the user what the location is, but you could prompt them with several options about where the issue could be occuring based on context.`
        }
        If the user won't provide a value for "issueLocation" then set the value for the key to "None provided" and move on.`
        }
        If there is already a value for the key "issueLocation", do not ask the user about the issue location again. \
        
        If the user provides additional details, record as the value for the "additionalDetails" key. If the user doesn't provide additional details, set the value of "additionalDetails" to "". \
       
        The conversational message responses you generate should ALWAYS set the value for the the "aiMessage" key. \
        If the user's response seems unrelated to a service request or you can't understand their issue, cheerfully ask them to try again. \
        Your responses to the user should always ask a single question or prompt them to provide more information about one thing.
        Always leave aiMessageDate empty`,
  };
};

/**
 *
 * @param response string response from GPT; no format requirements
 * @returns A stringified JSON object ready to be sent to the frontend; or a null value if response was not in the correct format.
 */
export const processAiResponse = ({
  response,
  workOrderData,
  aiMessageDate,
}: {
  response: string;
  workOrderData: WorkOrder;
  aiMessageDate: string;
}): string | null => {
  try {
    let returnValue: string | null = null;
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1) {
      const regex = /&quot;/g;
      const substr = response.substring(jsonStart, jsonEnd + 1);
      const cleanedString = substr.replace(regex, '"').replace('True', 'true').replace('False', 'false').replace('undefined', '""');
      let jsonResponse = JSON.parse(cleanedString) as AiJSONResponse;
      jsonResponse.aiMessageDate = aiMessageDate;

      const merged = mergeWorkOrderAndAiResponse({ workOrder: workOrderData, aiResponse: jsonResponse });

      if (hasAllInfo(merged)) {
        jsonResponse.aiMessage = `Please select the correct address and provide permission for the technician to enter your apartment. Then, click the "submit" button to send your Service Request and we will handle the rest!`;
      }

      returnValue = JSON.stringify(jsonResponse);
    }

    return returnValue;
  } catch (err) {
    console.log({ err });
    return null;
  }
};

export function generateAddressKey({ unit, address }: { unit?: string; address: string }) {
  const unitString = unit ? `- ${unit?.toLowerCase()}` : '';
  return `${address?.toLowerCase()} ${unitString}`;
}

export function toTitleCase(str: string) {
  return str
    ?.toLowerCase()
    ?.split(' ')
    ?.map(function (word) {
      return word.charAt(0)?.toUpperCase() + word?.slice(1);
    })
    ?.join(' ');
}

/**
 * @returns A key for use in DDB tables; {firstIdentifier}#{secondIdentifier}
 */
export function generateKey(entityIdentifier: EntityTypeValues | string, secondIdentifier: string) {
  return [entityIdentifier, secondIdentifier].join('#');
}

/**
 * @returns The second identifier for a key; the part after the #
 */
export function deconstructKey(key: string): string {
  if(!key || key.length === 0) return key;
  return key.split('#')[1];
}

/**
 * @returns KSUID
 */
export function generateKSUID() {
  return ksuid.randomSync().string;
}

/**
 * @param set List of technician name and emails
 * @returns string of the first item in the set and the remaining appended in shorthand, or "Unassigned" if the set is empty
 */
export function setToShortenedString(set: Set<string>): string {
  const arr = set ? Array.from(set) : [];
  return arr.length ? (arr.length > 1 ? arr[0] + ', +' + (arr.length - 1) : arr[0]) : 'Unassigned';
}

/**
 * @param created string of the date and time the work order was created
 * @returns list of formatted date in index 0 and formatted time in index 1
 */
export function createdToFormattedDateTime(created: string) {
  const date = new Date(created);
  const formattedDate = [date.getMonth() + 1, date.getDate(), date.getFullYear()].join('/');
  let hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
  const minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
  const AM_PM = date.getHours() >= 12 ? 'PM' : 'AM';
  hours = hours < 10 ? 0 + hours : hours;
  const formattedTime = hours + ':' + minutes + ' ' + AM_PM;

  return [formattedDate, formattedTime];
}

export function generateAddress({
  propertyUUId,
  address,
  country,
  city,
  state,
  postalCode,
  unit,
  isPrimary,
  numBeds,
  numBaths,
}: {
  propertyUUId: string;
  address: string;
  country: string;
  city: string;
  state: string;
  postalCode: string;
  isPrimary: boolean;
  unit?: string;
  numBeds?: number;
  numBaths?: number;
}) {
  const key = `${propertyUUId}`;
  return {
    [key]: { address, unit, city, state, postalCode, country, isPrimary, numBeds, numBaths },
  };
}

export function getPageLayout(isMobile: boolean) {
  return isMobile ? {} : { display: 'grid', gridTemplateColumns: '2fr 9fr', columnGap: '2rem' };
}
