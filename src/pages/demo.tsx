import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { ChatCompletionRequestMessage } from 'openai';
import { toast } from 'react-toastify';
import { hasAllIssueInfo, hasAllUserInfo } from '@/utils';
import { AiJSONResponse, ApiRequest, SendEmailApiRequest, UserInfo, WorkOrder } from '@/types';
import { useUserContext } from '@/context/user';
import { issueCategoryToTypes } from '@/constants';

export default function Demo() {
  const [userMessage, setUserMessage] = useState('');
  const [lastUserMessage, setLastUserMessage] = useState('');
  const { user } = useUserContext();

  if (user.userType !== "TENANT") {
    throw new Error("User Must be a Tenant.");
  }

  const [pmEmail, setPmEmail] = useState(user.pmEmail ?? "");
  const [tenantName, setTenantName] = useState(user.tenantName);
  const [tenantEmail, setTenantEmail] = useState(user.tenantEmail);
  const [address, setAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [permissionToEnter, setPermissionToEnter] = useState<"yes" | "no">("yes");
  const [issueCategory, setIssueCategory] = useState("");
  const [issueSubCategory, setIssueSubCategory] = useState("");
  const [issueLocation, setIssueLocation] = useState("");

  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [hasConnectionWithGPT, setHasConnectionWithGPT] = useState(true);

  // Scroll to bottom when new message added
  useEffect(() => {
    var element = document.getElementById('chatbox');
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, address, permissionToEnter]);

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = useCallback((e) => {
    setUserMessage(e.currentTarget.value);
  }, [setUserMessage]);

  const handleIssueCategoryChange: React.ChangeEventHandler<HTMLSelectElement> = useCallback((e) => {
    setIssueCategory(e.currentTarget.value);
  }, [setIssueCategory]);
  const handleIssueSubCategoryChange: React.ChangeEventHandler<HTMLSelectElement> = useCallback((e) => {
    setIssueSubCategory(e.currentTarget.value);
  }, [setIssueSubCategory]);
  const handleIssueLocationChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setIssueLocation(e.currentTarget.value);
  }, [setIssueLocation]);

  const handlePmEmailChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setPmEmail(e.currentTarget.value);
  }, [setPmEmail]);
  const handleTenantNameChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setTenantName(e.currentTarget.value);
  }, [setTenantName]);
  const handleTenantEmailChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setTenantEmail(e.currentTarget.value);
  }, [setTenantEmail]);
  const handleAddressChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setAddress(e.currentTarget.value);
  }, [setAddress]);
  const handleUnitChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setUnit(e.currentTarget.value);
  }, [setUnit]);
  const handleStateChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setState(e.currentTarget.value);
  }, [setState]);
  const handleCityChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setCity(e.currentTarget.value);
  }, [setCity]);
  const handleZipChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setZip(e.currentTarget.value);
  }, [setZip]);
  const handlePermissionChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setPermissionToEnter(e.currentTarget.value as "yes" | "no");
  }, [setPermissionToEnter]);


  const handleSubmitWorkOrder: React.MouseEventHandler<HTMLButtonElement> = async () => {
    const body: SendEmailApiRequest = {
      ...workOrder,
      messages,
      pmEmail,
      tenantEmail,
      tenantName,
      permissionToEnter,
      address,
      state,
      city,
      zip
    };
    const res = await axios.post('/api/send-work-order-email', body);
    if (res.status === 200) {
      toast.success('Successfully Submitted Work Order!', {
        position: toast.POSITION.TOP_CENTER,
      });
    } else {
      toast.error('Error Submitting Work Order. Please Try Again', {
        position: toast.POSITION.TOP_CENTER,
      });
      return;
    }
    setMessages([]);
    setIssueCategory("");
    setIssueSubCategory("");
    setIssueLocation("");
    return;
  };

  const handleSubmitText: React.FormEventHandler<HTMLFormElement> = async (e) => {
    try {
      e.preventDefault();
      if (userMessage === '') return;
      setMessages([...messages, { role: 'user', content: userMessage }]);
      setIsResponding(true);
      setLastUserMessage(userMessage);
      setUserMessage('');

      const body: ApiRequest = { userMessage, messages, ...workOrder };
      const res = await axios.post('/api/service-request', body);
      const jsonResponse = res?.data.response;
      const parsed = JSON.parse(jsonResponse) as AiJSONResponse;

      parsed.issueCategory && setIssueCategory(parsed.issueCategory);
      parsed.issueSubCategory && setIssueSubCategory(parsed.issueSubCategory);
      parsed.issueLocation && setIssueLocation(parsed.issueLocation);

      const newMessage = parsed.aiMessage;
      setIsResponding(false);
      setMessages([...messages, { role: 'user', content: userMessage }, { role: 'assistant', content: newMessage }]);
    } catch (err: any) {
      let assistantMessage = "Sorry - I had a hiccup on my end. Could you please try again?";

      if (err.response.status === 500) {
        setHasConnectionWithGPT(false);
        assistantMessage = "Sorry - I am having trouble connecting to my server. Please complete this form manually or try again later.";
      }

      setIsResponding(false);
      setMessages([...messages, { role: 'user', content: userMessage }, { role: 'assistant', content: assistantMessage }]);
      setUserMessage(lastUserMessage);
    }
  };

  const lastSystemMessageIndex = messages.length - (isResponding ? 2 : 1);
  const userInfo: UserInfo = {
    tenantName: user.tenantName,
    tenantEmail: user.tenantEmail,
    address,
    unit,
    city,
    state,
    zip,
    permissionToEnter
  };
  const workOrder: WorkOrder = {
    issueCategory,
    issueSubCategory,
    issueLocation
  };

  return (
    <>
      <main
        style={{ height: "92dvh" }}
        className="text-center">
        <div>
          <div>
            <div
              id="container"
              style={{ margin: "1dvh auto 0 auto " }}
              className="w-11/12 sm:w-6/12 mx-auto">
              <div
                className="shadow-xl rounded-lg">
                <div id="chatbox-header"
                  style={{ padding: "0.5dvh 0" }}
                  className="text-left bg-blue-200 rounded-t-lg">
                  <h3 className="text-xl my-auto text-gray-600 text-center">PILLAR Chat</h3>
                </div>
                <div
                  id="chatbox"
                  style={{
                    height: "73dvh",
                    boxSizing: "border-box"
                  }}
                  className="shadow-gray-400 md:filter-none m-0 p-3 overflow-scroll">
                  <p className="mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-4 mb-3 py-2 px-4 text-left">
                    {`Tell me about the issue you are experiencing and I'll generate a work order.`}
                    <br />
                    <br />
                    {` For example: "Toilet is leaking from the tank, and the toilet is located in the upstairs bathroom on the right."`}
                  </p>
                  {!!messages?.length &&
                    messages.map((message, index) => (
                      <div key={`${message.content?.[0] ?? index}-${index}`} className="mb-3 break-all">
                        <div
                          className={`text-gray-800 w-11/12 rounded-md py-2 px-4 inline-block ${!!(index % 2)
                            ? 'bg-gray-200 text-left'
                            : 'bg-blue-100 text-right'
                            }`}>
                          {workOrder.issueCategory && index === lastSystemMessageIndex && (
                            <div className="text-left mb-1 text-gray-700">
                              <h3 className="text-left font-semibold">
                                Issue:{' '}
                                <span className="font-normal">
                                  {`${workOrder.issueCategory}` + `; ${workOrder.issueSubCategory ?? ""}`}
                                </span>
                              </h3>
                            </div>
                          )}
                          {workOrder.issueLocation && index === lastSystemMessageIndex && (
                            <div className="text-left mb-4 text-gray-700">
                              <h3 className="text-left font-semibold">
                                Issue Location:{' '}
                                <span className="font-normal">
                                  {workOrder.issueLocation}
                                </span>
                              </h3>
                            </div>
                          )}
                          <p data-testid={`response-${index}`} className='whitespace-pre-line break-keep'>{message.content}</p>
                          {index === lastSystemMessageIndex && (hasAllIssueInfo(workOrder) || !hasConnectionWithGPT) && (
                            <>
                              <div data-testid="final-response" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", rowGap: "0.3rem", marginTop: "1rem" }}>
                                {
                                  !hasConnectionWithGPT && (
                                    <>
                                      <label htmlFor='issueCategory'>Issue* </label>
                                      <select
                                        className='rounded px-1'
                                        id="issueCategory"
                                        onChange={handleIssueCategoryChange}
                                        value={issueCategory ?? ''}
                                      >
                                        <option value=''>Please select an issue category</option>
                                        {Object.keys(issueCategoryToTypes).map((issueCategory, index) => { return <option key={index}>{issueCategory}</option>; })}
                                      </select>
                                      <label htmlFor='issueSubCategory'>Issue Details* </label>
                                      <select
                                        className='rounded px-1'
                                        id="issueSubCategory"
                                        onChange={handleIssueSubCategoryChange}
                                        value={issueSubCategory ?? ''}
                                        disabled={!issueCategory}
                                      >
                                        <option value=''>Please specify the details of your issue</option>
                                        {issueCategory && issueCategoryToTypes[issueCategory].map((issueCategory, index) => { return <option key={index} value={issueCategory}>{issueCategory}</option>; }
                                        )}
                                      </select>
                                      <label htmlFor='issueLocation'>Issue Location* </label>
                                      <input
                                        className='rounded px-1'
                                        id="issueLocation"
                                        type={"text"}
                                        value={issueLocation}
                                        onChange={handleIssueLocationChange}
                                      />
                                    </>
                                  )
                                }
                                <label htmlFor='pmEmail'>Property Manager Email* </label>
                                <input
                                  className='rounded px-1'
                                  id="pmEmail"
                                  placeholder='pm@gmail.com'
                                  type={"text"}
                                  value={pmEmail}
                                  onChange={handlePmEmailChange}
                                />
                                <label htmlFor='tenantName'>Name* </label>
                                <input
                                  className='rounded px-1'
                                  id="tenantName"
                                  placeholder='John Doe'
                                  type={"text"}
                                  value={tenantName}
                                  onChange={handleTenantNameChange}
                                />
                                <label htmlFor='tenantEmail'>Email* </label>
                                <input
                                  className='rounded px-1'
                                  id="tenantEmail"
                                  placeholder='my.email@gmail.com'
                                  type={"text"}
                                  value={tenantEmail}
                                  onChange={handleTenantEmailChange}
                                />
                                <label htmlFor='address'>Address* </label>
                                <input
                                  className='rounded px-1'
                                  id="address"
                                  placeholder='123 Test Street'
                                  type={"text"}
                                  value={address}
                                  onChange={handleAddressChange}
                                />
                                <label htmlFor='unit'>Unit </label>
                                <input
                                  className='rounded px-1'
                                  id="unit"
                                  placeholder='Unit No.'
                                  type={"text"}
                                  value={unit}
                                  onChange={handleUnitChange}
                                />
                                <label htmlFor='state'>State* </label>
                                <input
                                  className='rounded px-1'
                                  id="state"
                                  placeholder='FL'
                                  type={"text"}
                                  value={state}
                                  onChange={handleStateChange}
                                />
                                <label htmlFor='city'>City* </label>
                                <input
                                  className='rounded px-1'
                                  id="city"
                                  placeholder='Miami'
                                  type={"text"}
                                  value={city}
                                  onChange={handleCityChange}
                                />
                                <label htmlFor='zip'>Zip* </label>
                                <input
                                  className='rounded px-1'
                                  id="zip"
                                  placeholder='33131'
                                  type={"text"}
                                  value={zip}
                                  onChange={handleZipChange}
                                />
                              </div >
                              <p className='mt-2'>Permission To Enter Property* </p>
                              <div>
                                <input
                                  className='rounded px-1'
                                  id="permission-yes"
                                  name={"permission"}
                                  type={"radio"}
                                  value={"yes"}
                                  checked={permissionToEnter === "yes"}
                                  onChange={handlePermissionChange}
                                />
                                <label htmlFor='permission-yes'>{"Yes"}</label>
                                <input
                                  className='rounded px-1 ml-4'
                                  id="permission-no"
                                  name={"permission"}
                                  type={"radio"}
                                  value={"no"}
                                  checked={permissionToEnter === "no"}
                                  onChange={handlePermissionChange}
                                />
                                <label htmlFor='permission-no'>{"No"}</label>
                              </div>
                            </>
                          )
                          }
                        </div >
                      </div >
                    ))}
                  {
                    isResponding && (
                      <div className="flex mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-3 py-3 px-4 text-left">
                        <div className="dot animate-loader"></div>
                        <div className="dot animate-loader animation-delay-200"></div>
                        <div className="dot animate-loader animation-delay-400"></div>
                      </div>
                    )
                  }
                </div >
                <div
                  id="chatbox-footer"
                  className="p-3 bg-slate-100 rounded-b-lg flex items-center justify-center"
                  style={{ "height": "12dvh" }}
                >
                  {hasAllIssueInfo(workOrder) || !hasConnectionWithGPT ? (
                    <button
                      disabled={permissionToEnter === "no" || !hasAllUserInfo({
                        tenantEmail, tenantName, address, state, city, zip, permissionToEnter
                      })}
                      onClick={handleSubmitWorkOrder}
                      className='text-white bg-blue-500 px-3 py-2 font-bold hover:bg-blue-900 rounded disabled:text-gray-200 disabled:bg-gray-400 disabled:hover:bg-gray-400'>
                      {permissionToEnter ? "Submit Work Order" : "Need Permission To Enter"}
                    </button>
                  ) : (
                    <form onSubmit={handleSubmitText}
                      style={{ display: "grid", gridTemplateColumns: "9fr 1fr" }}
                      onKeyDown={(e) => {
                        //Users can press enter to submit the form, enter + shift to add a new line
                        if (e.key === 'Enter' && !e.shiftKey && !isResponding) {
                          e.preventDefault();
                          handleSubmitText(e);
                        }
                      }}
                    >
                      <textarea
                        value={userMessage}
                        data-testid="userMessageInput"
                        className={`p-2 w-full border-solid border-2 border-gray-200 rounded-md resize-none`}
                        placeholder={
                          messages.length
                            ? hasAllIssueInfo(workOrder)
                              ? 'John; 123 St Apt 1400, Boca, FL; yes'
                              : ''
                            : 'The toilet in the master bathroom is clogged - it\'s upstairs at the end of the hall to the right.'
                        }
                        onChange={handleChange}
                      />
                      <button
                        data-testid="send"
                        type="submit"
                        className="text-blue-500 px-1 ml-2 font-bold hover:text-blue-900 rounded disabled:text-gray-400 "
                        disabled={isResponding || !userMessage}>
                        Send
                      </button>
                    </form>
                  )}
                </div>
              </div >
            </div >
          </div >
        </div >
      </main >
    </>
  );
}
