import { TECHNICIAN_DELIM, findIssueSample } from '@/constants';
import { ChatCompletionRequestMessage } from 'openai';
import { AiJSONResponse, ChatMessage, IssueInformation } from '@/types';
import ksuid from 'ksuid';
import { EntityTypeValues } from '@/database/entities';
import { toast } from 'react-toastify';

export const hasAllIssueInfo = (workOrder: IssueInformation) => {
  return !!workOrder.issueDescription && !!workOrder.issueLocation;
};

export const mergeWorkOrderAndAiResponse = ({
  workOrder,
  aiResponse,
}: {
  workOrder: IssueInformation;
  aiResponse: AiJSONResponse;
}) => {
  const merged: IssueInformation = workOrder;
  for (const workOrderKey of Object.keys(workOrder)) {
    const aiValue = aiResponse?.[workOrderKey as keyof IssueInformation];
    if (aiValue) {
      //@ts-ignore
      merged[workOrderKey as keyof WorkOrder] = aiValue;
    }
  }
  return merged;
};

/** Checks if we have all the info we need to submit the work order */
export const hasAllInfo = (workOrder: IssueInformation) => {
  return Object.values(workOrder).every((value) => !!value); // this works because we need permission to enter to be true.
};

/**
 *
 * @param workOrder relates to the information the Frontend already "knows"
 * @returns An initial prompt which is dynamically generated based on the information we already have.
 * Depending on the information that the program has, the prompt will ask user for either issue information or user information.
 */
export const generatePrompt = (
  workOrder: IssueInformation,
  unitInfo: string,
  streetAddress: string
): ChatCompletionRequestMessage => {
  return {
    role: 'system',
    content: `You're a property management chatbot. The user is a tenant. Think like a property manager who needs to get information from the user and diagnose what their issue is. \
        All of your responses in this chat should be stringified JSON like this: ${JSON.stringify(
          findIssueSample
        )}
        and should contain all of the keys: ${Object.keys(findIssueSample).join(
          ', '
        )}, even if there are no values. \
        Here is the current state of the work order: ${JSON.stringify(workOrder)}. \
        Once you have values for "issueDescription" and "issueLocation", ask the user if they would like to provide any additional details. Let the user know that the "additionalDetails" field is optional. \
        ${
          streetAddress.includes('romar dr') &&
          'The user lives in a townhouse with central AC. If the user mentions an issue with their AC, mark the location as "Central AC".'
        }
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
        If the user mentions an issue involving a leak with their sink or faucet, clarify if the leak is coming from the faucet, the stem/handles, or the pipes under the sink before recording the "issueDescription" \

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
}: {
  response: string;
  workOrderData: IssueInformation;
}): string | null => {
  try {
    let returnValue: string | null = null;
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1) {
      const regex = /&quot;/g;
      const substr = response.substring(jsonStart, jsonEnd + 1);
      const cleanedString = substr
        .replace(regex, '"')
        .replace('True', 'true')
        .replace('False', 'false')
        .replace('undefined', '""');
      let jsonResponse = JSON.parse(cleanedString) as AiJSONResponse;

      const merged = mergeWorkOrderAndAiResponse({
        workOrder: workOrderData,
        aiResponse: jsonResponse,
      });

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

export function toTitleCase(str: string | undefined) {
  if (!str) return '';
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
  if (!key || key.length === 0) return key;
  return key.split('#')[1];
}

/**
 * @returns string[] [Email, Name]
 */
export function deconstructNameEmailString(key: string): string[] {
  if (!key || key.length === 0) return [key];
  return key.split(TECHNICIAN_DELIM);
}

/**
 * @returns Email##NAME##Name
 */
export function constructNameEmailString(email: string, name: string): string {
  return [email, TECHNICIAN_DELIM, name].join('');
}

/**
 * @returns KSUID
 */
export function generateKSUID() {
  return ksuid.randomSync().string;
}

/**
 * @param set List of technician name and emails
 * @returns string of the first item in the set's name and the remaining appended in shorthand, or "Unassigned" if the set is empty
 * Make sure to handle backwards compatibility with old assignedTo string format
 */
export function setToShortenedString(set: Set<string>): string {
  const arr = set ? Array.from(set) : [];
  if (arr.length === 0) return 'Unassigned';
  const firstVal = toTitleCase(
    arr[0].includes(TECHNICIAN_DELIM) ? deconstructNameEmailString(arr[0])[1] : arr[0]
  );
  return arr.length > 1 ? firstVal + ', +' + (arr.length - 1) : firstVal;
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

export function toggleBodyScroll(open: boolean) {
  if (open) {
    document.body.style.overflowY = 'hidden';
    document.body.style.overflowX = 'hidden';
  } else {
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'auto';
  }
}

export function getInviteTenantSendgridEmailBody(
  tenantName: string,
  authLink: string,
  pmName: string
): string {
  const displayPmName = toTitleCase(pmName);
  const displayTenantName = toTitleCase(tenantName);
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <title>The HTML5 Herald</title>
    <style>
      html {
        font-family: arial, sans-serif;
      }

      body, p, h1, h2, h3, li, ol {
        color: black;
      }

      a {
        display: inline-block;
        font-size: 14px;
      }

      p, li {
        font-size: 14px;
      }
    </style>
    <meta name="description" content="The HTML5 Herald">
    <meta name="author" content="SitePoint">
    <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
    <link rel="stylesheet" href="css/styles.css?v=1.0">
  </head>
  
  <body>
    <div class="container" style="margin-left: 20px;margin-right: 20px;">
      <h2>${displayPmName} invited you to manage your work orders in Pillar</h2>
      <p>Dear ${displayTenantName},</p>
      <p>We are launching a new Program called Pillar that let's you convieniently submit your maintenance requests online at any time!</p>
      <p>Here is how to use it:</p>
      <h3>Instructions</h3>
      <ol>
        <li>
          <a href="${authLink}">Click this Link to Pillar</a> and enter your current email address to join.
        </li>
        <li>
          Receive a login link via email and click it to start submitting Work Orders!
        </li>
      </ol>
      
      <p>As always, feel free to call or email me with any questions!</p>
      <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
        Regards,<br> ${displayPmName}
      </p>
    </div>
  </body>
  </html>`;
}

// Handles rendering api error messages to toast when necessary, otherwise uses defaultMesssage
export function renderToastError(e: any, defaultMessage: string) {
  const errorMessage: string = e.response?.data?.userErrorMessage ?? defaultMessage;
  toast.error(errorMessage, {
    position: toast.POSITION.TOP_CENTER,
    draggable: false,
  });
}

// Removes the ksuId field from each entry in an array of ChatMessages
export function convertChatMessagesToOpenAI(messages: ChatMessage[]): ChatCompletionRequestMessage[] {
  return messages.map((message) => {
    const { ksuId, ...rest } = message;
    return rest;
  });
}
