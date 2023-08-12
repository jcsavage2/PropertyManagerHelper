import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ChatCompletionRequestMessage } from "openai";
import { toast } from "react-toastify";
import { hasAllIssueInfo } from "@/utils";
import { AiJSONResponse, ApiRequest, SendEmailApiRequest, WorkOrder } from "@/types";
import Select from "react-select";
import { LoadingSpinner } from "@/components/loading-spinner/loading-spinner";
import { useDevice } from '@/hooks/use-window-size';
import { useSessionUser } from "@/hooks/auth/use-session-user";
import { userRoles } from "@/database/entities/user";

export default function WorkOrderChatbot() {
  const [userMessage, setUserMessage] = useState("");
  const [lastUserMessage, setLastUserMessage] = useState("");
  const { user, sessionStatus } = useSessionUser();
  const { isMobile } = useDevice();


  const addressesOptions = useMemo(
    () => {
      if (!user?.addresses) {
        return [];
      }
      return Object.values(user?.addresses)?.map((address: any) => ({
        label: `${address?.address} ${address?.unit}`.trim(),
        value: JSON.stringify(address),
      })) ?? [];
    },
    [user?.addresses]
  );

  const [isUsingAI, _setIsUsingAI] = useState(true);

  const [pmEmail, setPmEmail] = useState(user?.pmEmail ?? "");
  const [tenantName, setTenantName] = useState(user?.tenantName);
  const [tenantEmail, setTenantEmail] = useState(user?.tenantEmail);
  const [selectedAddress, setSelectedAddress] = useState<string>(addressesOptions?.[0]?.value ?? "");

  const [permissionToEnter, setPermissionToEnter] = useState<"yes" | "no">("yes");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueLocation, setIssueLocation] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");

  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [hasConnectionWithGPT, setHasConnectionWithGPT] = useState(true);
  const [submitAnywaysSkip, setSubmitAnywaysSkip] = useState(false);
  const [submittingWorkOrderLoading, setSubmittingWorkOrderLoading] = useState(false);

  console.log({ user });
  useEffect(() => {
    user?.pmEmail && setPmEmail(user.pmEmail);
    user?.tenantName && setTenantName(user.tenantName);
    user?.tenantEmail && setTenantEmail(user.tenantEmail);
    addressesOptions?.length > 0 && setSelectedAddress(JSON.stringify(addressesOptions?.[0]?.value ?? ""));
  }, [user, addressesOptions]);

  // Scroll to bottom when new message added
  useEffect(() => {
    var element = document.getElementById("chatbox");
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, permissionToEnter]);

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      if (isUsingAI) {
        setUserMessage(e.currentTarget.value);
      } else {
        setIssueDescription(e.currentTarget.value);
      }
    },
    [setUserMessage, setIssueDescription, isUsingAI]
  );

  const handleIssueDescriptionChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setIssueDescription(e.currentTarget.value);
    },
    [setIssueDescription]
  );
  const handleIssueLocationChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setIssueLocation(e.currentTarget.value);
    },
    [setIssueLocation]
  );
  const handleAdditionalDetailsChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setAdditionalDetails(e.currentTarget.value);
    },
    [setAdditionalDetails]
  );
  const handlePermissionChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setPermissionToEnter(e.currentTarget.value as "yes" | "no");
    },
    [setPermissionToEnter]
  );

  const handleSubmitWorkOrder: React.MouseEventHandler<HTMLButtonElement> = async () => {
    setSubmittingWorkOrderLoading(true);
    const parsedAddress = JSON.parse(JSON.parse(selectedAddress));
    if (!tenantEmail || !tenantName) {
      return;
    }
    const body: SendEmailApiRequest = {
      issueDescription,
      issueLocation,
      additionalDetails,
      messages,
      pmEmail,
      tenantEmail,
      tenantName,
      permissionToEnter,
      address: parsedAddress.address,
      state: parsedAddress.state,
      city: parsedAddress.city,
      postalCode: parsedAddress.postalCode,
    };
    const res = await axios.post("/api/send-work-order-email", body);
    if (res.status === 200) {
      toast.success("Successfully Submitted Work Order!", {
        position: toast.POSITION.TOP_CENTER,
      });
    } else {
      toast.error("Error Submitting Work Order. Please Try Again", {
        position: toast.POSITION.TOP_CENTER,
      });
      setSubmittingWorkOrderLoading(false);
      return;
    }
    setMessages([]);
    setIssueDescription("");
    setIssueLocation("");
    setAdditionalDetails("");
    setSubmitAnywaysSkip(false);
    setSubmittingWorkOrderLoading(false);
    return;
  };

  const handleAddressSelectChange = (value: string) => {
    setSelectedAddress(value);
  };

  const handleSubmitText: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    try {
      if (!isUsingAI) {
        setMessages([
          ...messages,
          { role: "user", content: issueDescription },
          { role: "assistant", content: "Please complete the form below. When complete, and you have given permission to enter, click the 'submit' button to send your Service Request." },
        ]);
      }

      if (userMessage === "") return;
      setMessages([...messages, { role: "user", content: userMessage }]);
      setIsResponding(true);
      setLastUserMessage(userMessage);
      setUserMessage("");

      const body: ApiRequest = { userMessage, messages, ...workOrder };
      const res = await axios.post("/api/service-request", body);
      const jsonResponse = res?.data.response;
      const parsed = JSON.parse(jsonResponse) as AiJSONResponse;

      parsed.issueDescription && setIssueDescription(parsed.issueDescription);
      parsed.issueLocation && setIssueLocation(parsed.issueLocation);
      parsed.additionalDetails && setAdditionalDetails(parsed.additionalDetails);

      const newMessage = parsed.aiMessage;
      setIsResponding(false);
      setMessages([...messages, { role: "user", content: userMessage }, { role: "assistant", content: newMessage }]);
    } catch (err: any) {
      let assistantMessage = "Sorry - I had a hiccup on my end. Could you please try again?";

      if (err.response.status === 500) {
        setHasConnectionWithGPT(false);
        assistantMessage = "Sorry - I am having trouble connecting to my server. Please complete this form manually or try again later.";
      }

      setIsResponding(false);
      setMessages([...messages, { role: "user", content: userMessage }, { role: "assistant", content: assistantMessage }]);
      setUserMessage(lastUserMessage);
    }
  };

  const lastSystemMessageIndex = messages.length - (isResponding ? 2 : 1);

  const workOrder: WorkOrder = {
    issueDescription,
    issueLocation,
    additionalDetails,
  };

  if (sessionStatus === "loading") {
    return <LoadingSpinner containerClass={"mt-4"} />;
  }

  if (!user?.roles?.includes(userRoles.TENANT)) {
    return (<p className="p-4">User Must have the tenant Role assigned to them by a property manager or Owner.</p>);
  }

  return (
    <>
      <main style={{ height: "92dvh" }} className="text-center">
        <div>
          <div>
            <div id="container" style={{ margin: "1dvh auto 0 auto " }} className="w-11/12 lg:w-6/12 md:w-7/12 sm:w-9/12 mx-auto">
              <div className="shadow-xl rounded-lg">
                <div id="chatbox-header" style={{ padding: "0.5dvh 0" }} className="text-left bg-blue-200 rounded-t-lg">
                  <h3 className="text-xl my-auto text-gray-600 text-center">PILLAR Chat</h3>
                </div>
                <div
                  id="chatbox"
                  style={{
                    height: "73dvh",
                    boxSizing: "border-box",
                  }}
                  className="shadow-gray-400 md:filter-none m-0 p-3 overflow-scroll"
                >
                  <p className="mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-4 mb-3 py-2 px-4 text-left">
                    {`Tell me about the issue you are experiencing and I'll generate a work order.`}
                    <br />
                    <br />
                    {` For example: "Toilet is leaking from the tank, and the toilet is located in the upstairs bathroom on the right."`}
                  </p>
                  {!!messages?.length &&
                    messages.map((message, index) => (
                      <div key={`${message.content?.[0] ?? index}-${index}`} className="mb-3 break-all">
                        <div className={`text-gray-800 w-11/12 rounded-md py-2 px-4 inline-block ${!!(index % 2) ? "bg-gray-200 text-left" : "bg-blue-100 text-right"}`}>
                          {workOrder.issueDescription && index === lastSystemMessageIndex && !submitAnywaysSkip && (
                            <div className="text-left mb-1 text-gray-700">
                              <h3 className="text-left font-semibold">
                                Issue: <span className="font-normal">{`${workOrder.issueDescription}`}</span>
                              </h3>
                            </div>
                          )}
                          {workOrder.issueLocation && index === lastSystemMessageIndex && !submitAnywaysSkip && (
                            <div className="text-left mb-1 text-gray-700">
                              <h3 className="text-left font-semibold">
                                Issue Location: <span className="font-normal">{workOrder.issueLocation}</span>
                              </h3>
                            </div>
                          )}
                          <p data-testid={`response-${index}`} className="whitespace-pre-line break-keep">
                            {message.content}
                          </p>
                          {index === lastSystemMessageIndex && (hasAllIssueInfo(workOrder, isUsingAI) || submitAnywaysSkip || !hasConnectionWithGPT) && (
                            <>
                              <div data-testid="final-response" style={{ display: "grid", gridTemplateColumns: "1fr", rowGap: "0rem", marginTop: "1rem" }}>
                                {!hasConnectionWithGPT ||
                                  (submitAnywaysSkip && (
                                    <>
                                      <label htmlFor="issueDescription">{isMobile ? "Issue*" : "Issue Details*"}</label>
                                      <input className="rounded px-1" id="issueDescription" type={"text"} value={issueDescription} onChange={handleIssueDescriptionChange} />
                                      <label htmlFor="issueLocation">{isMobile ? "Location*" : "Issue Location*"}</label>
                                      <input className="rounded px-1" id="issueLocation" type={"text"} value={issueLocation} onChange={handleIssueLocationChange} />
                                    </>
                                  ))}
                                <label htmlFor="additionalDetails">{isMobile ? "Details" : "Additional Details"}</label>
                                <input className="rounded px-1" id="additionalDetails" type={"text"} value={additionalDetails} onChange={handleAdditionalDetailsChange} />
                                <label htmlFor="address" className="flex items-center">Address* </label>
                                <Select
                                  onChange={(v) => {
                                    //@ts-ignore
                                    handleAddressSelectChange(v.value);
                                  }}
                                  value={{ label: addressesOptions?.[0]?.label, value: addressesOptions?.[0]?.value }}
                                  options={addressesOptions}
                                />
                              </div>
                              <p className="mt-2">Permission To Enter Property* </p>
                              <div>
                                <input
                                  className="rounded px-1"
                                  id="permission-yes"
                                  name={"permission"}
                                  type={"radio"}
                                  value={"yes"}
                                  checked={permissionToEnter === "yes"}
                                  onChange={handlePermissionChange}
                                />
                                <label htmlFor="permission-yes">{"Yes"}</label>
                                <input
                                  className="rounded px-1 ml-4"
                                  id="permission-no"
                                  name={"permission"}
                                  type={"radio"}
                                  value={"no"}
                                  checked={permissionToEnter === "no"}
                                  onChange={handlePermissionChange}
                                />
                                <label htmlFor="permission-no">{"No"}</label>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  {isResponding && (
                    <div className="flex mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-3 py-3 px-4 text-left">
                      <div className="dot animate-loader"></div>
                      <div className="dot animate-loader animation-delay-200"></div>
                      <div className="dot animate-loader animation-delay-400"></div>
                    </div>
                  )}
                  {!isResponding && issueDescription.length > 0 && !submitAnywaysSkip && !hasAllIssueInfo(workOrder, isUsingAI) && (
                    <button
                      onClick={() => setSubmitAnywaysSkip(true)}
                      className="text-white bg-blue-500 px-3 py-2 font-bold hover:bg-blue-900 rounded disabled:text-gray-200 disabled:bg-gray-400 disabled:hover:bg-gray-400"
                    >
                      {"Submit Anyways?"}
                    </button>
                  )}
                </div>
                <div id="chatbox-footer" className="p-3 bg-slate-100 rounded-b-lg flex items-center justify-center" style={{ height: "12dvh" }}>
                  {((hasAllIssueInfo(workOrder, isUsingAI) || submitAnywaysSkip) && messages.length > 1) || !hasConnectionWithGPT ? (
                    <button
                      onClick={handleSubmitWorkOrder}
                      disabled={permissionToEnter === "no" || issueDescription.length === 0 || submittingWorkOrderLoading}
                      className="text-white bg-blue-500 px-3 py-2 font-bold hover:bg-blue-900 rounded disabled:text-gray-200 disabled:bg-gray-400 disabled:hover:bg-gray-400"
                    >
                      {submittingWorkOrderLoading ? <LoadingSpinner containerClass={null} /> : permissionToEnter === "yes" ? "Submit Work Order" : "Need Permission To Enter"}
                    </button>
                  ) : (
                    <form
                      onSubmit={handleSubmitText}
                      style={{ display: "grid", gridTemplateColumns: "9fr 1fr" }}
                      onKeyDown={(e) => {
                        //Users can press enter to submit the form, enter + shift to add a new line
                        if (e.key === "Enter" && !e.shiftKey && !isResponding) {
                          e.preventDefault();
                          handleSubmitText(e);
                        }
                      }}
                    >
                      <textarea
                        value={isUsingAI ? userMessage : issueDescription}
                        data-testid="userMessageInput"
                        className={`p-2 w-full border-solid border-2 border-gray-200 rounded-md resize-none`}
                        placeholder={messages.length ? (hasAllIssueInfo(workOrder, isUsingAI) ? "" : "") : "Tell us about your issue."}
                        onChange={handleChange}
                      />
                      <button
                        data-testid="send"
                        type="submit"
                        className="text-blue-500 px-1 ml-2 font-bold hover:text-blue-900 rounded disabled:text-gray-400 "
                        disabled={isResponding || (isUsingAI ? !userMessage : !issueDescription)}
                      >
                        Send
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main >
    </>
  );
}
