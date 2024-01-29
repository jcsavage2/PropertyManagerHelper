import { NO_EMAIL_PREFIX, TECHNICIAN_DELIM } from '@/constants';
import { ChatMessage, IssueInformation, Property } from '@/types';
import ksuid from 'ksuid';
import { EntityTypeValues } from '@/database/entities';
import { toast } from 'react-toastify';
import { ChatCompletionRequestMessage } from 'openai';
import { USER_TYPE, UserType } from '@/database/entities/user';
import { IProperty } from '@/database/entities/property';

export const hasAllIssueInfo = (workOrder: IssueInformation) => {
  return !!workOrder.issueDescription && !!workOrder.issueLocation;
};

/** Checks if we have all the info we need to submit the work order */
export const hasAllInfo = (workOrder: IssueInformation) => {
  return Object.values(workOrder).every((value) => !!value); // this works because we need permission to enter to be true.
};

export function generateAddressKey({ unit, address }: { unit?: string; address: string }) {
  const unitString = unit ? `- ${unit}` : '';
  return `${address} ${unitString}`;
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
export function deconstructKey(key: string | undefined): string {
  if (!key || key.length === 0) return '';
  return key.split('#')[1];
}

/**
 * @returns Splits a key into its n parts; [firstIdentifier, secondIdentifier, ...]
 */
export function deconstructAllKeyValues(key: string | undefined): string[] {
  if (!key || key.length === 0) return [];
  return key.split('#');
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
export function setToShortenedString(set: Set<string> | string[]): string {
  const arr = set ? Array.from(set) : [];
  if (arr.length === 0) return 'Unassigned';
  //TODO: need to handle for the no email tenants
  let firstVal = toTitleCase(getTenantDisplayEmail(arr[0].includes(TECHNICIAN_DELIM) ? deconstructNameEmailString(arr[0])[1] : arr[0], 'No email tenant'));
  return arr.length > 1 ? firstVal + ', +' + (arr.length - 1) : firstVal;
}

//Turn a property object into a displayable string with that property information
export function createPropertyDisplayString(property: Property, includeBedBath: boolean = true) {
  if (!property) return '';
  const baseString = `${toTitleCase(property.address)} ${property.unit ? ' ' + toTitleCase(property.unit) : ''}, ${toTitleCase(
    property.city
  )}, ${property.state.toUpperCase()} ${property.postalCode}`;
  return includeBedBath ? baseString + ` ${property.numBeds} Bed ${property.numBaths} Bath` : baseString;
}

//Create a uuid##apartment_size key for property selector
export function createPropertySelectKey(property: IProperty) {
  if (!property) return '';
  return `${deconstructKey(property.pk)}#${property.numBeds} Bed, ${property.numBaths} Bath`;
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

export function getInviteTenantSendgridEmailBody(tenantName: string, authLink: string, pmName: string): string {
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

// Handles rendering api error messages with containerId to toast when necessary, otherwise uses defaultMesssage
export function renderToastError(e: any, defaultMessage: string, containerId?: string) {
  const errorMessage: string = e?.response?.data?.userErrorMessage ?? defaultMessage;
  toast.error(errorMessage, {
    position: toast.POSITION.TOP_CENTER,
    draggable: false,
    containerId,
  });
}

// Handles rendering toast success message to a containerId
export function renderToastSuccess(successMessage: string, containerId?: string) {
  toast.success(successMessage, {
    position: toast.POSITION.TOP_CENTER,
    draggable: false,
    containerId,
  });
}

// Removes the ksuId field from each entry in an array of ChatMessages
export function convertChatMessagesToOpenAI(messages: ChatMessage[]): ChatCompletionRequestMessage[] {
  return messages.map((message) => {
    const { ksuId, ...rest } = message;
    return rest;
  });
}

//Tenants created without an email will have a email constructed with a uuid. We don't want to display this to the user.
//Instead show "No email" or the replacement string if provided
export function getTenantDisplayEmail(email: string | undefined | null, replacementString: string = 'No email') {
  if (!email) return '';
  return email.startsWith(NO_EMAIL_PREFIX) ? replacementString : email;
}

export function getWorkOrdersName(userType: UserType | null, isPlural: boolean = false, isCaps: boolean = true): string {
  if (!userType) return isPlural ? 'work orders' : 'work order';
  let str = undefined
  if (userType === USER_TYPE.TENANT) {
    str = isPlural ? 'work orders' : 'work order';
  } else {
    str = isPlural ? 'task' : 'tasks';
  }
  return isCaps ? toTitleCase(str) : str;
}
