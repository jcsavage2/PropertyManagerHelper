import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { hasAllIssueInfo, renderToastError, toTitleCase } from '@/utils';
import {
  AddressOption,
  AiJSONResponse,
  ChatbotRequest,
  CreateWorkOrder,
  IssueInformation,
  PTE_Type,
} from '@/types';
import Select, { SingleValue } from 'react-select';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useDevice } from '@/hooks/use-window-size';
import { LoadingSpinner } from '@/components/loading-spinner/loading-spinner';
import { USER_TYPE } from '@/database/entities/user';
import { AI_MESSAGE_START, API_STATUS, PTE } from '@/constants';
import { v4 as uuidv4 } from 'uuid';
import { ChatCompletionRequestMessage } from 'openai';
import Modal from 'react-modal';
import * as amplitude from '@amplitude/analytics-browser';
import {
  ChatbotRequestSchema,
  CreateWorkOrderSchema,
  UpdateUserSchema,
} from '@/types/customschemas';

export default function WorkOrderChatbot() {
  const [userMessage, setUserMessage] = useState('');
  const { user, sessionStatus, accessToken } = useSessionUser();
  const { isMobile } = useDevice();

  const [platform, setPlatform] = useState<'Desktop' | 'iOS' | 'Android'>();

  const [selectedAddress, setSelectedAddress] = useState<AddressOption | null>(null);

  const [permissionToEnter, setPermissionToEnter] = useState<PTE_Type>(PTE.YES);
  const [issueDescription, setIssueDescription] = useState('');
  const [issueLocation, setIssueLocation] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');

  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [aiMessageEnded, setAiMessageEnded] = useState(false); // Tracks if the ai message portion of the streaming has finished
  const [submitAnywaysSkip, setSubmitAnywaysSkip] = useState(false); // Allows the user to finish and submit the work order using a form
  const [errorCount, setErrorCount] = useState(0); // Tracks the number of errors for the openAI endpoint
  const [submittingWorkOrderLoading, setSubmittingWorkOrderLoading] = useState(false);
  const [addressHasBeenSelected, setAddressHasBeenSelected] = useState(true);

  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [woId, setWoId] = useState(uuidv4());
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [downloadModalIsOpen, setDownloadModalIsOpen] = useState(false);

  const lastSystemMessageIndex = messages.length - (isResponding ? 2 : 1);

  const workOrder: IssueInformation = {
    issueDescription,
    issueLocation,
    additionalDetails,
  };

  const addressesOptions: AddressOption[] = useMemo(() => {
    if (!user?.addresses) return [];
    return (
      Object.values(user?.addresses)?.map(
        (address: any) =>
          ({
            label: `${toTitleCase(address?.address)} ${
              address?.unit ? toTitleCase(address?.unit) : ''
            }`.trim(),
            value: address,
          }) as AddressOption
      ) ?? []
    );
  }, [user?.addresses]);

  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);
  if (isBrowser && document.querySelector('#chatbot')) {
    Modal.setAppElement('#chatbot');
  }

  useEffect(() => {
    if (isBrowser) {
      const isDesktop = window.innerWidth >= 800;
      setPlatform(
        isDesktop
          ? 'Desktop'
          : window.navigator.userAgent.toLowerCase().includes('android')
          ? 'Android'
          : 'iOS'
      );
    }
  }, [isBrowser]);

  useEffect(() => {
    const hasSeenDownloadModal = localStorage.getItem('Pillar::HAS_SEEN');
    if (
      (platform === 'iOS' || platform === 'Android') &&
      user &&
      !user?.hasSeenDownloadPrompt &&
      !hasSeenDownloadModal
    ) {
      async function updateUserHasSeenDownloadPrompt() {
        const params = UpdateUserSchema.parse({
          pk: user?.pk,
          sk: user?.sk,
          hasSeenDownloadPrompt: true,
        });
        await axios.post('/api/update-user', params);
        localStorage.setItem('Pillar::HAS_SEEN', 'true');
      }
      try {
        setDownloadModalIsOpen(true);
        updateUserHasSeenDownloadPrompt();
      } catch (err: any) {
        console.log({ err });
      }
    }
  }, [platform, user]);

  //If the user has only one address, select it automatically
  useEffect(() => {
    if (!addressesOptions || selectedAddress) return;
    if (addressesOptions.length === 1) {
      setSelectedAddress(addressesOptions[0]);
      setAddressHasBeenSelected(true);
    } else {
      setSelectedAddress(addressesOptions[0]);
      setAddressHasBeenSelected(false);
    }
  }, [addressesOptions, selectedAddress]);

  // Scroll to bottom when new message added
  useEffect(() => {
    var element = document.getElementById('chatbox');
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, permissionToEnter, submitAnywaysSkip, selectedAddress, isTyping]);

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      setUserMessage(e.currentTarget.value);
    },
    [setUserMessage]
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

  const handleSubmitWorkOrder: React.MouseEventHandler<HTMLButtonElement> = async () => {
    setSubmittingWorkOrderLoading(true);
    try {
      amplitude.track('Submit Work Order', {
        status: 'attempt',
        messages: messages.length,
        issueDescription,
        issueLocation,
        additionalDetails,
        createdByType: USER_TYPE.TENANT,
        organization: user?.organization ?? 'None',
        permissionToEnter,
        workOrderId: woId,
      });
      if (!user || !user.organization || !user.pmEmail || !user.email) {
        alert(
          'Your user account is not set up properly, please contact your property manager for assistance.'
        );
        return;
      }

      const parsedAddress = selectedAddress?.value;
      const params: CreateWorkOrder = CreateWorkOrderSchema.parse({
        issueDescription,
        issueLocation,
        additionalDetails,
        messages,
        createdByType: USER_TYPE.TENANT,
        creatorEmail: user.email,
        creatorName: user.name,
        permissionToEnter,
        pmEmail: user.pmEmail,
        pmName: user.pmName,
        organization: user.organization,
        property: {
          address: parsedAddress.address,
          state: parsedAddress.state,
          city: parsedAddress.city,
          unit: parsedAddress.unit,
          postalCode: parsedAddress.postalCode,
        },
        images: uploadedFiles,
        woId,
      });

      const res = await axios.post('/api/create-work-order', params);
      amplitude.track('Submit Work Order', {
        status: 'success',
        issueDescription,
        issueLocation,
        messages: messages.length,
        additionalDetails,
        createdByType: USER_TYPE.TENANT,
        organization: user?.organization ?? 'None',
        permissionToEnter,
        workOrderId: woId,
      });
      toast.success(
        'Successfully Submitted Work Order. An email has been sent to you as confirmation',
        {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        }
      );
    } catch (error: any) {
      console.log({ error });
      amplitude.track('Submit Work Order', {
        status: 'failure',
        issueDescription,
        issueLocation,
        messages: messages.length,
        additionalDetails,
        createdByType: USER_TYPE.TENANT,
        organization: user?.organization ?? 'None',
        permissionToEnter,
        workOrderId: woId,
      });
      renderToastError(error, 'Error Submitting Work Order');
    }

    setMessages([]);
    setUserMessage('');
    setIssueDescription('');
    setIssueLocation('');
    setAdditionalDetails('');
    setWoId(uuidv4());
    setSubmitAnywaysSkip(false);

    setSubmittingWorkOrderLoading(false);
    setErrorCount(0);
    return;
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    async (e) => {
      e.preventDefault();
      setUploadingFiles(true);
      const selectedFs = e.target.files ?? [];
      const formData = new FormData();

      // Append all selected files to the FormData
      for (const imageFile of selectedFs) {
        formData.append('image', imageFile);
      }
      formData.append('uuid', woId);

      try {
        const response = await axios.post('/api/upload-images', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.status === 200) {
          setUploadedFiles(response?.data?.files ?? []);
          toast.success('Images uploaded successfully!', {
            position: toast.POSITION.TOP_CENTER,
            draggable: false,
          });
          setUploadingFiles(false);
        } else {
          toast.error('Images upload failed', {
            position: toast.POSITION.TOP_CENTER,
            draggable: false,
          });
          setUploadingFiles(false);
        }
      } catch (error) {
        toast.error('Images upload failed', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
        setUploadingFiles(false);
      }
    },
    [woId]
  );

  const handleSubmitText: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setIsResponding(true);
    setAiMessageEnded(false);
    const lastUserMessage = userMessage;
    try {
      amplitude.track('Form Action', {
        name: 'Submit Text',
        message: userMessage,
        issueDescription,
        issueLocation,
      });
      if (!selectedAddress || !process.env.NEXT_PUBLIC_CHAT_URL) {
        throw new Error('Missing required parameters');
      }

      setMessages([...messages, { role: 'user', content: userMessage }]);
      setUserMessage('');

      const parsedAddress = selectedAddress.value;
      const body: ChatbotRequest = ChatbotRequestSchema.parse({
        userMessage,
        messages,
        ...workOrder,
        unitInfo:
          parsedAddress.numBeds && parsedAddress.numBaths
            ? `${parsedAddress.numBeds} bedrooms and ${parsedAddress.numBaths} bathrooms`
            : '',
        streetAddress: parsedAddress.address.toLowerCase(),
      });
      
      const res = await fetch(process.env.NEXT_PUBLIC_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${encodeURIComponent(accessToken)}`,
        },
        body: JSON.stringify(body),
      });
      if (res.status !== API_STATUS.SUCCESS) {
        throw new Error('Error fetching chatbot response');
      }

      const reader = res.body?.getReader();
      let buffer = '';
      while (reader) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.includes('}')) {
            const parsed: AiJSONResponse = JSON.parse(buffer);
            if (parsed.issueLocation) {
              setIssueLocation(parsed.issueLocation);
            }
            if (parsed.issueDescription) {
              setIssueDescription(parsed.issueDescription);
            }
            if (parsed.additionalDetails) {
              setAdditionalDetails(parsed.additionalDetails);
            }
          }
          break;
        }

        //Turn chunk into complete content
        buffer += Buffer.from(value).toString('utf-8');

        if (buffer.length > 0) {
          //Type out the aiResponse without showing the user other json data
          if (buffer.includes(AI_MESSAGE_START) && !aiMessageEnded) {
            //Once we have data, switch from waiting for a response to typing the result
            setIsTyping(true);
            setIsResponding(false);

            buffer = buffer.replace(/\n/g, '\\\n');
            const aiMessageStart = buffer.lastIndexOf(AI_MESSAGE_START) + AI_MESSAGE_START.length;
            let aiMessageEnd: number;

            //Reached the end of aiMessageResponse
            if (buffer.includes('\\n')) {
              aiMessageEnd = buffer.indexOf('\\n');
              setAiMessageEnded(true);
            } else {
              aiMessageEnd = buffer.length;
            }

            const aiMessage = buffer.substring(aiMessageStart, aiMessageEnd);
            if (aiMessage.length > 0) {
              setMessages([
                ...messages,
                { role: 'user', content: userMessage },
                { role: 'assistant', content: aiMessage },
              ]);
            }
          }
        }
      }
    } catch (err: any) {
      let assistantMessage = 'Sorry - I had a hiccup on my end. Could you please try again?';
      console.log({ err });

      if (errorCount >= 1) {
        assistantMessage =
          'Sorry - Looks like I am having some connection issues right now. Feel free to try again later, or use the button below to submit your work order.';
      }
      setErrorCount((prev) => prev + 1);

      //Manually set assistant message and reset user message to their last input
      setMessages([
        ...messages,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantMessage },
      ]);
      setUserMessage(lastUserMessage);
    }
    setIsResponding(false);
    setAiMessageEnded(false);
    setIsTyping(false);
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
            onChange={(v: SingleValue<AddressOption>) => {
              if (!v) return;
              setSelectedAddress(v);
            }}
            value={{
              label: selectedAddress?.label ?? 'No addresses available',
              value: selectedAddress,
            }}
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

  if (!user?.roles?.includes(USER_TYPE.TENANT)) {
    return (
      <p className="p-4">
        User must have the tenant Role assigned to them by a property manager or Owner.
      </p>
    );
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
            Instructions to Save Pillar App to Your Home Screen
          </h2>

          <div className="space-y-2">
            {platform === 'iOS' ? (
              <>
                <p>
                  1. Tap the share icon (square with an arrow pointing out of it) at the bottom of
                  the screen.
                </p>
                <p>{'2. Scroll down and tap "Add to Home Screen".'}</p>
                <p>{'3. Name it as you wish and then tap "Add" on the top-right.'}</p>
              </>
            ) : platform === 'Android' ? (
              <>
                <p>{'1. Tap the menu button (three dots) on the top-right of the screen.'}</p>
                <p>{'2. Tap "Add to Home screen".'}</p>
              </>
            ) : (
              <p>
                Your device is not recognized. Please refer to its documentation for instructions.
              </p>
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
            <div
              id="container"
              style={{ margin: '1dvh auto 0 auto ' }}
              className="w-11/12 lg:w-6/12 md:w-7/12 sm:w-9/12 mx-auto"
            >
              <div className="shadow-xl rounded-lg">
                <div
                  id="chatbox-header"
                  style={{ padding: '0.5dvh 0' }}
                  className="text-left bg-blue-200 rounded-t-lg"
                >
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
                      <div
                        key={`${message.content?.[0] ?? index}-${index}`}
                        className="mb-3 break-all"
                      >
                        <div
                          className={`text-gray-800 w-11/12 rounded-md py-2 px-4 inline-block ${
                            !!(index % 2) ? 'bg-gray-200 text-left' : 'bg-blue-100 text-right'
                          }`}
                        >
                          {workOrder.issueDescription &&
                            index === lastSystemMessageIndex &&
                            !submitAnywaysSkip && (
                              <div className="text-left mb-1 text-gray-700">
                                <h3 className="text-left font-semibold">
                                  Issue:{' '}
                                  <span className="font-normal">{`${workOrder.issueDescription}`}</span>
                                </h3>
                              </div>
                            )}
                          {workOrder.issueLocation &&
                            index === lastSystemMessageIndex &&
                            !submitAnywaysSkip && (
                              <div className="text-left mb-1 text-gray-700">
                                <h3 className="text-left font-semibold">
                                  Issue Location:{' '}
                                  <span className="font-normal">{workOrder.issueLocation}</span>
                                </h3>
                              </div>
                            )}
                          <div
                            data-testid={`response-${index}`}
                            className="whitespace-pre-line break-keep"
                          >
                            <p>{message.content}</p>{' '}
                            {message.role === 'assistant' &&
                              index === lastSystemMessageIndex &&
                              isTyping &&
                              aiMessageEnded && (
                                <LoadingSpinner
                                  containerClass="mt-2"
                                  spinnerClass="spinner-small"
                                />
                              )}
                          </div>
                          {index === lastSystemMessageIndex &&
                            (hasAllIssueInfo(workOrder) || submitAnywaysSkip) && (
                              <>
                                <div
                                  data-testid="final-response"
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr',
                                    rowGap: '0rem',
                                    marginTop: '1rem',
                                  }}
                                >
                                  {submitAnywaysSkip && (
                                    <>
                                      <label htmlFor="issueDescription">
                                        {isMobile ? 'Issue*' : 'Issue Details*'}
                                      </label>
                                      <input
                                        className="rounded px-1"
                                        id="issueDescription"
                                        type={'text'}
                                        value={issueDescription}
                                        onChange={handleIssueDescriptionChange}
                                      />
                                      <label htmlFor="issueLocation">
                                        {isMobile ? 'Location*' : 'Issue Location*'}
                                      </label>
                                      <input
                                        className="rounded px-1"
                                        id="issueLocation"
                                        type={'text'}
                                        value={issueLocation}
                                        onChange={handleIssueLocationChange}
                                      />
                                    </>
                                  )}
                                  <label htmlFor="additionalDetails">
                                    {isMobile ? 'Details' : 'Additional Details'}
                                  </label>
                                  <input
                                    className="rounded px-1"
                                    id="additionalDetails"
                                    type={'text'}
                                    value={additionalDetails}
                                    onChange={handleAdditionalDetailsChange}
                                  />
                                </div>
                                <form className="mt-2" onSubmit={() => {}}>
                                  <input
                                    type="file"
                                    multiple
                                    name="image"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                  />
                                </form>
                                <p className="mt-2">
                                  Permission To Enter{' '}
                                  {selectedAddress
                                    ? toTitleCase(selectedAddress.label)
                                    : 'Property'}
                                  *{' '}
                                </p>
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
                  {!isResponding &&
                    !isTyping &&
                    !submitAnywaysSkip &&
                    !hasAllIssueInfo(workOrder) &&
                    (issueDescription.length > 0 || errorCount > 0) && (
                      <button
                        onClick={() => {
                          setSubmitAnywaysSkip(true);
                          setMessages((prev) => {
                            prev[prev.length - 1] = {
                              role: 'assistant',
                              content:
                                'Please complete the form below. When complete, press submit to send your work order!',
                            };
                            return prev;
                          });
                          if (issueDescription.length === 0) {
                            setIssueDescription(userMessage);
                          }
                        }}
                        className="text-white bg-blue-500 px-3 py-2 font-bold hover:bg-blue-900 rounded disabled:text-gray-200 disabled:bg-gray-400 disabled:hover:bg-gray-400"
                      >
                        {'Submit Anyways?'}
                      </button>
                    )}
                </div>
                <div
                  id="chatbox-footer"
                  className="p-3 bg-slate-100 rounded-b-lg flex items-center justify-center"
                  style={{ height: '12dvh' }}
                >
                  {(hasAllIssueInfo(workOrder) || submitAnywaysSkip) && messages.length > 1 ? (
                    <button
                      onClick={handleSubmitWorkOrder}
                      disabled={
                        issueDescription.length === 0 ||
                        submittingWorkOrderLoading ||
                        uploadingFiles
                      }
                      className="text-white bg-blue-500 px-3 py-2 font-bold hover:bg-blue-900 rounded disabled:text-gray-200 disabled:bg-gray-400 disabled:hover:bg-gray-400"
                    >
                      {submittingWorkOrderLoading ? (
                        <LoadingSpinner />
                      ) : uploadingFiles ? (
                        'Files Uploading...'
                      ) : (
                        'Submit Work Order'
                      )}
                    </button>
                  ) : (
                    <form
                      onSubmit={handleSubmitText}
                      style={{ display: 'grid', gridTemplateColumns: '9fr 1fr' }}
                      onKeyDown={(e) => {
                        //Users can press enter to submit the form, enter + shift to add a new line
                        if (
                          e.key === 'Enter' &&
                          !e.shiftKey &&
                          !isResponding &&
                          addressHasBeenSelected
                        ) {
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
                              ? ''
                              : ''
                            : 'Tell us about your issue.'
                        }
                        onChange={handleChange}
                      />
                      <button
                        data-testid="send"
                        type="submit"
                        className="text-blue-500 px-1 ml-2 font-bold hover:text-blue-900 rounded disabled:text-gray-400 "
                        disabled={
                          isResponding ||
                          isTyping ||
                          !userMessage ||
                          userMessage.length === 0 ||
                          !addressHasBeenSelected
                        }
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
