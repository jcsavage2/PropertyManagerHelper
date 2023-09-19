import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { hasAllIssueInfo } from '@/utils';
import { AddressOptionType, AiJSONResponse, ApiRequest, PTE_Type, SendEmailApiRequest, WorkOrder } from '@/types';
import Select, { SingleValue } from 'react-select';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useDevice } from '@/hooks/use-window-size';
import { LoadingSpinner } from '@/components/loading-spinner/loading-spinner';
import { userRoles } from '@/database/entities/user';
import { PTE } from '@/constants';
import { v4 as uuidv4 } from 'uuid';
import { ENTITIES } from '@/database/entities';
import { ChatCompletionRequestMessage } from 'openai';
import Modal from 'react-modal';

export default function WorkOrderChatbot() {
  const [userMessage, setUserMessage] = useState('');
  const [lastUserMessage, setLastUserMessage] = useState('');
  const { user, sessionStatus } = useSessionUser();
  const { isMobile } = useDevice();

  const [platform, setPlatform] = useState<"Desktop" | "iOS" | "Android">();

  const [isUsingAI, _setIsUsingAI] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<AddressOptionType | null>(null);

  const [permissionToEnter, setPermissionToEnter] = useState<PTE_Type>(PTE.YES);
  const [issueDescription, setIssueDescription] = useState('');
  const [issueLocation, setIssueLocation] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');

  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [hasConnectionWithGPT, setHasConnectionWithGPT] = useState(true);
  const [submitAnywaysSkip, setSubmitAnywaysSkip] = useState(false);
  const [submittingWorkOrderLoading, setSubmittingWorkOrderLoading] = useState(false);
  const [addressHasBeenSelected, setAddressHasBeenSelected] = useState(true);

  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [woId, _setWoId] = useState(uuidv4());
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [isBrowser, setIsBrowser] = useState(false);
  const [downloadModalIsOpen, setDownloadModalIsOpen] = useState(false);

  const addressesOptions: AddressOptionType[] = useMemo(() => {
    if (!user?.addresses) return [];
    return (
      Object.values(user?.addresses)?.map(
        (address: any) =>
        ({
          label: `${address?.address} ${address?.unit ? address?.unit : ''}`.trim(),
          value: address,
        } as AddressOptionType)
      ) ?? []
    );
  }, [user?.addresses]);

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  useEffect(() => {
    if (isBrowser) {
      const isDesktop = window.innerWidth >= 800;
      setPlatform(isDesktop ? "Desktop" : window.navigator.userAgent.toLowerCase().includes("android") ? "Android" : "iOS");
    }
  }, [isBrowser]);

  useEffect(() => {
    if (platform === "iOS" || platform === "Android") {
      setDownloadModalIsOpen(true);
    }
  }, [platform]);

  //If the user has only one address, select it automatically
  useEffect(() => {
    if (addressesOptions && addressesOptions.length === 1) {
      setSelectedAddress(addressesOptions[0]);
      setAddressHasBeenSelected(true);
    } else {
      setAddressHasBeenSelected(false);
    }
  }, [addressesOptions]);



  if (isBrowser && document.querySelector("#chatbot")) {
    Modal.setAppElement('#chatbot');
  }


  // Scroll to bottom when new message added
  useEffect(() => {
    var element = document.getElementById('chatbox');
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
      setPermissionToEnter(e.currentTarget.value as PTE_Type);
    },
    [setPermissionToEnter]
  );
  const handleAddressSelectChange = (value: AddressOptionType) => {
    setSelectedAddress(value);
  };

  const handleSubmitWorkOrder: React.MouseEventHandler<HTMLButtonElement> = async () => {
    setSubmittingWorkOrderLoading(true);
    if (!user || !user.organization || !user.pmEmail || !user.email) {
      alert('Your user account is not set up properly, please contact your property manager for assistance.');
      return;
    }
    if (!selectedAddress) {
      toast.error('Error Submitting Work Order. Please Try Again', {
        position: toast.POSITION.TOP_CENTER,
        draggable: false,
      });
      setSubmittingWorkOrderLoading(false);
      return;
    }

    const parsedAddress = selectedAddress.value;
    const body: SendEmailApiRequest = {
      issueDescription,
      issueLocation,
      additionalDetails,
      messages,
      createdByType: ENTITIES.TENANT,
      creatorEmail: user.email,
      creatorName: user.name,
      permissionToEnter,
      pmEmail: user.pmEmail,
      organization: user.organization,
      address: parsedAddress.address,
      state: parsedAddress.state,
      city: parsedAddress.city,
      unit: parsedAddress.unit,
      postalCode: parsedAddress.postalCode,
      images: uploadedFiles,
      woId
    };

    const res = await axios.post('/api/create-work-order', body);
    if (res.status === 200) {
      toast.success("Successfully Submitted Work Order. An email has been sent to you as confirmation", {
        position: toast.POSITION.TOP_CENTER,
        draggable: false,
      });
    } else {
      toast.error('Error Submitting Work Order. Please Try Again', {
        position: toast.POSITION.TOP_CENTER,
        draggable: false,
      });
      setSubmittingWorkOrderLoading(false);
      return;
    }
    setMessages([]);
    setIssueDescription('');
    setIssueLocation('');
    setAdditionalDetails('');
    setSubmitAnywaysSkip(false);
    setSubmittingWorkOrderLoading(false);
    return;
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(async (e) => {
    e.preventDefault();
    setUploadingFiles(true);
    const selectedFs = e.target.files ?? [];
    const formData = new FormData();

    // Append all selected files to the FormData
    for (const imageFile of selectedFs) {
      formData.append('image', imageFile);
    }
    formData.append("uuid", woId);

    try {
      const response = await axios.post('/api/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.status === 200) {
        setUploadedFiles(response?.data?.files ?? []);
        toast.success('Images uploaded successfully!', { position: toast.POSITION.TOP_CENTER });
        setUploadingFiles(false);
      } else {
        toast.error('Images upload failed', { position: toast.POSITION.TOP_CENTER });
        setUploadingFiles(false);
      }
    } catch (error) {
      toast.error('Images upload failed', { position: toast.POSITION.TOP_CENTER });
      setUploadingFiles(false);
    }
  }, [woId]);

  const handleSubmitText: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    try {
      if (!isUsingAI) {
        setMessages([
          ...messages,
          { role: 'user', content: issueDescription },
          {
            role: 'assistant',
            content:
              "Please complete the form below. When complete, and you have given permission to enter, click the 'submit' button to send your Service Request.",
          },
        ]);
      }

      if (userMessage === '' || !selectedAddress) return;
      setMessages([...messages, { role: 'user', content: userMessage }]);
      setIsResponding(true);
      setLastUserMessage(userMessage);
      setUserMessage('');

      const parsedAddress = selectedAddress.value;
      const body: ApiRequest = {
        userMessage,
        messages,
        ...workOrder,
        unitInfo: parsedAddress.numBeds && parsedAddress.numBaths ? `${parsedAddress.numBeds} bedrooms and ${parsedAddress.numBaths} bathrooms` : '',
      };
      const res = await axios.post('/api/service-request', body);
      const jsonResponse = res?.data.response;
      const parsed = JSON.parse(jsonResponse) as AiJSONResponse;

      parsed.issueDescription && setIssueDescription(parsed.issueDescription);
      parsed.issueLocation && setIssueLocation(parsed.issueLocation);
      parsed.additionalDetails && setAdditionalDetails(parsed.additionalDetails);

      const newMessage = parsed.aiMessage;
      setIsResponding(false);
      setMessages([
        ...messages,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: newMessage },
      ]);
    } catch (err: any) {
      let assistantMessage = 'Sorry - I had a hiccup on my end. Could you please try again?';

      if (err.response.status === 500) {
        setHasConnectionWithGPT(false);
        assistantMessage = 'Sorry - I am having trouble connecting to my server. Please complete this form manually or try again later.';
      }

      setIsResponding(false);
      setMessages([
        ...messages,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantMessage },
      ]);
      setUserMessage(lastUserMessage);
    }
  };

  const lastSystemMessageIndex = messages.length - (isResponding ? 2 : 1);

  const workOrder: WorkOrder = {
    issueDescription,
    issueLocation,
    additionalDetails,
  };

  const renderChatHeader = () => {
    if (addressHasBeenSelected) {
      return (
        <p className="mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-4 mb-3 py-2 px-4 text-left">
          {`Tell me about the issue you are experiencing and I'll generate a work order.`}
          <br />
          <br />
          {` For example: "Toilet is leaking from the tank, and the toilet is located in the upstairs bathroom on the right."`}
        </p>
      );
    } else {
      return (
        <div className="mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-4 mb-3 py-2 px-4 text-left">
          {`Please select the address you would like to create a service request for.`}
          <br />
          <br />
          <Select
            onChange={(v: SingleValue<{ label: string; value: any; }>) => {
              //@ts-ignore
              handleAddressSelectChange(v);
            }}
            value={{ label: addressesOptions?.[0]?.label, value: addressesOptions?.[0]?.value }}
            options={addressesOptions}
          />
          <div className="w-full flex flex-row items-center mt-4 mb-2">
            <button
              onClick={() => setAddressHasBeenSelected(true)}
              className="text-white text-sm mx-auto bg-blue-500 px-3 py-2 font-bold hover:bg-blue-900 rounded disabled:text-gray-200 disabled:bg-gray-400 disabled:hover:bg-gray-400"
            >
              {'Confirm Address'}
            </button>
          </div>
        </div>
      );
    }
  };

  if (sessionStatus === 'loading') {
    return <LoadingSpinner containerClass={'mt-4'} />;
  }

  if (!user?.roles?.includes(userRoles.TENANT)) {
    return <p className="p-4">User must have the tenant Role assigned to them by a property manager or Owner.</p>;
  }
  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      width: isMobile ? '95%' : '50%',
      backgroundColor: 'rgba(255, 255, 255)',
    },
    overLay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(25, 255, 255, 0.75)',
    },
  };

  function closeModal() {
    setDownloadModalIsOpen(!downloadModalIsOpen);
  }

  return (
    <div id="chatbot">
      <Modal
        isOpen={downloadModalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Add Comment Modal"
        ariaHideApp={false}
        style={customStyles}
      >
        <div className="p-6">
          <h2 className="text-center text-2xl font-bold mb-4">
            Save Pillar App to Your Home Screen
          </h2>

          <div className="space-y-2">
            {platform === "iOS" ? (
              <>
                <p>1. Tap the share icon (square with an arrow pointing out of it) at the bottom of the screen.</p>
                <p>{'2. Scroll down and tap "Add to Home Screen".'}</p>
                <p>{'3. Name it as you wish and then tap "Add" on the top-right.'}</p>
              </>
            ) : platform === "Android" ? (
              <>
                <p>{'1. Tap the menu button (three dots) on the top-right of the screen.'}</p>
                <p>{'2. Tap "Add to Home screen".'}</p>
              </>
            ) : (
              <p>Your device is not recognized. Please refer to its documentation for instructions.</p>
            )}
          </div>

          <button
            onClick={closeModal}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </Modal>
      <main style={{ height: '92dvh' }} className="text-center">
        <div>
          <div>
            <div id="container" style={{ margin: '1dvh auto 0 auto ' }} className="w-11/12 lg:w-6/12 md:w-7/12 sm:w-9/12 mx-auto">
              <div className="shadow-xl rounded-lg">
                <div id="chatbox-header" style={{ padding: '0.5dvh 0' }} className="text-left bg-blue-200 rounded-t-lg">
                  <h3 className="text-xl my-auto text-gray-600 text-center">PILLAR Chat</h3>
                </div>
                <div
                  id="chatbox"
                  style={{
                    height: '73dvh',
                    boxSizing: 'border-box',
                  }}
                  className="shadow-gray-400 md:filter-none m-0 p-3 overflow-scroll"
                >
                  {renderChatHeader()}
                  {!!messages?.length &&
                    messages.map((message, index) => (
                      <div key={`${message.content?.[0] ?? index}-${index}`} className="mb-3 break-all">
                        <div
                          className={`text-gray-800 w-11/12 rounded-md py-2 px-4 inline-block ${!!(index % 2) ? 'bg-gray-200 text-left' : 'bg-blue-100 text-right'
                            }`}
                        >
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
                          {index === lastSystemMessageIndex &&
                            (hasAllIssueInfo(workOrder, isUsingAI) || submitAnywaysSkip || !hasConnectionWithGPT) && (
                              <>
                                <div
                                  data-testid="final-response"
                                  style={{ display: 'grid', gridTemplateColumns: '1fr', rowGap: '0rem', marginTop: '1rem' }}
                                >
                                  {!hasConnectionWithGPT ||
                                    (submitAnywaysSkip && (
                                      <>
                                        <label htmlFor="issueDescription">{isMobile ? 'Issue*' : 'Issue Details*'}</label>
                                        <input
                                          className="rounded px-1"
                                          id="issueDescription"
                                          type={'text'}
                                          value={issueDescription}
                                          onChange={handleIssueDescriptionChange}
                                        />
                                        <label htmlFor="issueLocation">{isMobile ? 'Location*' : 'Issue Location*'}</label>
                                        <input
                                          className="rounded px-1"
                                          id="issueLocation"
                                          type={'text'}
                                          value={issueLocation}
                                          onChange={handleIssueLocationChange}
                                        />
                                      </>
                                    ))}
                                  <label htmlFor="additionalDetails">{isMobile ? 'Details' : 'Additional Details'}</label>
                                  <input
                                    className="rounded px-1"
                                    id="additionalDetails"
                                    type={'text'}
                                    value={additionalDetails}
                                    onChange={handleAdditionalDetailsChange}
                                  />
                                </div>
                                <form className='mt-2' onSubmit={() => { }}>
                                  <input
                                    type="file"
                                    multiple name="image"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                  />
                                </form>
                                <p className="mt-2">Permission To Enter {selectedAddress ? selectedAddress.label : 'Property'}* </p>
                                <div>
                                  <input
                                    className="rounded px-1"
                                    id="permission-yes"
                                    name={'permission'}
                                    type={'radio'}
                                    value={PTE.YES}
                                    checked={permissionToEnter === PTE.YES}
                                    onChange={handlePermissionChange}
                                  />
                                  <label htmlFor="permission-yes">{PTE.YES}</label>
                                  <input
                                    className="rounded px-1 ml-4"
                                    id="permission-no"
                                    name={'permission'}
                                    type={'radio'}
                                    value={PTE.NO}
                                    checked={permissionToEnter === PTE.NO}
                                    onChange={handlePermissionChange}
                                  />
                                  <label htmlFor="permission-no">{PTE.NO}</label>
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
                      {'Submit Anyways?'}
                    </button>
                  )}
                </div>
                <div id="chatbox-footer" className="p-3 bg-slate-100 rounded-b-lg flex items-center justify-center" style={{ height: '12dvh' }}>
                  {((hasAllIssueInfo(workOrder, isUsingAI) || submitAnywaysSkip) && messages.length > 1) || !hasConnectionWithGPT ? (
                    <button
                      onClick={handleSubmitWorkOrder}
                      disabled={issueDescription.length === 0 || submittingWorkOrderLoading || uploadingFiles}
                      className="text-white bg-blue-500 px-3 py-2 font-bold hover:bg-blue-900 rounded disabled:text-gray-200 disabled:bg-gray-400 disabled:hover:bg-gray-400"
                    >
                      {submittingWorkOrderLoading ? <LoadingSpinner /> : uploadingFiles ? "Files Uploading..." : 'Submit Work Order'}
                    </button>
                  ) : (
                    <form
                      onSubmit={handleSubmitText}
                      style={{ display: 'grid', gridTemplateColumns: '9fr 1fr' }}
                      onKeyDown={(e) => {
                        //Users can press enter to submit the form, enter + shift to add a new line
                        if (e.key === 'Enter' && !e.shiftKey && !isResponding && addressHasBeenSelected) {
                          e.preventDefault();
                          handleSubmitText(e);
                        }
                      }}
                    >
                      <textarea
                        value={isUsingAI ? userMessage : issueDescription}
                        data-testid="userMessageInput"
                        className={`p-2 w-full border-solid border-2 border-gray-200 rounded-md resize-none`}
                        placeholder={messages.length ? (hasAllIssueInfo(workOrder, isUsingAI) ? '' : '') : 'Tell us about your issue.'}
                        onChange={handleChange}
                      />
                      <button
                        data-testid="send"
                        type="submit"
                        className="text-blue-500 px-1 ml-2 font-bold hover:text-blue-900 rounded disabled:text-gray-400 "
                        disabled={isResponding || (isUsingAI ? !userMessage : !issueDescription) || !addressHasBeenSelected}
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
      </main>
    </div>
  );
}
