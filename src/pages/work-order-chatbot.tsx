import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { convertChatMessagesToOpenAI, generateKSUID, hasAllIssueInfo, renderToastError, renderToastSuccess, toTitleCase } from '@/utils';
import { AddressOption, AiJSONResponse, ChatMessage, ChatbotRequest, CreateWorkOrder, IssueInformation, PTE_Type } from '@/types';
import Select, { SingleValue } from 'react-select';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useDevice } from '@/hooks/use-window-size';
import { LoadingSpinner } from '@/components/loading-spinner';
import { USER_TYPE } from '@/database/entities/user';
import { AI_MESSAGE_START, API_STATUS, PTE } from '@/constants';
import { v4 as uuidv4 } from 'uuid';
import * as amplitude from '@amplitude/analytics-browser';
import { ChatbotRequestSchema, CreateWorkOrderSchema, UpdateUserSchema } from '@/types/customschemas';
import * as Sentry from '@sentry/react';
import MobileCard from '@/components/mobile-card';
import Modal from '@/components/modals/modal';
import { useDocument } from '@/hooks/use-document';

export default function WorkOrderChatbot() {
  const [userMessage, setUserMessage] = useState('');
  const { user, sessionStatus, accessToken } = useSessionUser();
  const { isMobile } = useDevice();
  const { clientDocument } = useDocument();

  const [platform, setPlatform] = useState<'Desktop' | 'iOS' | 'Android'>();

  const [selectedAddress, setSelectedAddress] = useState<AddressOption | null>(null);

  const [permissionToEnter, setPermissionToEnter] = useState<PTE_Type>(PTE.YES);
  const [issueDescription, setIssueDescription] = useState('');
  const [issueLocation, setIssueLocation] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
            label: `${toTitleCase(address?.address)} ${address?.unit ? toTitleCase(address?.unit) : ''}`.trim(),
            value: address,
          }) as AddressOption
      ) ?? []
    );
  }, [user?.addresses]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDesktop = window.innerWidth >= 800;
    setPlatform(isDesktop ? 'Desktop' : window.navigator.userAgent.toLowerCase().includes('android') ? 'Android' : 'iOS');
  }, [typeof window]);

  useEffect(() => {
    //TODO: test me again
    const hasSeenDownloadModal = localStorage.getItem('Pillar::HAS_SEEN');
    if ((platform === 'iOS' || platform === 'Android') && user && !user?.hasSeenDownloadPrompt && !hasSeenDownloadModal) {
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
      setAddressHasBeenSelected(true);
    } else {
      setAddressHasBeenSelected(false);
    }
    setSelectedAddress(addressesOptions[0]);
  }, [addressesOptions, selectedAddress]);

  // Scroll to bottom when new message added
  useEffect(() => {
    var element = clientDocument?.getElementById('chatbox');
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, permissionToEnter, submitAnywaysSkip, selectedAddress, isTyping, clientDocument]);

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
        alert('Your user account is not set up properly, please contact your property manager for assistance.');
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
      renderToastSuccess('Successfully Submitted Work Order! An email has been sent to you as confirmation');
    } catch (error: any) {
      console.log({ error });
      Sentry.captureException(error);
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
          renderToastSuccess('Images uploaded successfully!');
          setUploadingFiles(false);
        } else {
          renderToastError(undefined, 'Images upload failed');
          setUploadingFiles(false);
        }
      } catch (error) {
        renderToastError(error, 'Images upload failed');
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
    const sentTimestamp = generateKSUID();
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

      setMessages([...messages, { role: 'user', content: userMessage, ksuId: sentTimestamp }]);
      setUserMessage('');

      const parsedAddress = selectedAddress.value;
      const body: ChatbotRequest = ChatbotRequestSchema.parse({
        userMessage,
        messages: convertChatMessagesToOpenAI(messages),
        ...workOrder,
        unitInfo: parsedAddress.numBeds && parsedAddress.numBaths ? `${parsedAddress.numBeds} bedrooms and ${parsedAddress.numBaths} bathrooms` : '',
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
              setMessages([...messages, { role: 'user', content: userMessage, ksuId: sentTimestamp }, { role: 'assistant', content: aiMessage }]);
            }
          }
        }
      }
      // Set assistant timestamp after the response has been received
      setMessages((prev) => {
        prev[prev.length - 1].ksuId = generateKSUID();
        return prev;
      });
    } catch (err: any) {
      let assistantMessage = 'Sorry - I had a hiccup on my end. Could you please try again?';
      console.log({ err });
      Sentry.captureException(err);

      if (errorCount >= 1) {
        assistantMessage = 'Sorry - Looks like I am having some connection issues right now. Feel free to try again later, or use the button below to submit your work order.';
      }
      setErrorCount((prev) => prev + 1);

      //Manually set assistant message and reset user message to their last input
      setMessages([...messages, { role: 'user', content: userMessage, ksuId: sentTimestamp }, { role: 'assistant', content: assistantMessage, ksuId: generateKSUID() }]);
      setUserMessage(lastUserMessage);
    }
    setIsResponding(false);
    setAiMessageEnded(false);
    setIsTyping(false);
  };

  const renderChatHeader = () => {
    if (addressHasBeenSelected) {
      return (
        <div className="w-11/12 rounded-md text-primary-content py-2 px-6 shadow-md text-left bg-base-300 mb-4 ">
          <p className="mb-4 ">Tell me about the issue you are experiencing and I'll generate a work order.</p>
          <p className="">For example: "Toilet is leaking from the tank, and the toilet is located in the upstairs bathroom on the right."</p>
        </div>
      );
    } else {
      return (
        <MobileCard shadow="shadow-md">
          <p className="mb-4 text-left">Please select the address you would like to create a service request for.</p>
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
            <button onClick={() => setAddressHasBeenSelected(true)} className="btn btn-primary mx-auto">
              {'Confirm Address'}
            </button>
          </div>
        </MobileCard>
      );
    }
  };

  if (sessionStatus === 'loading') {
    return <LoadingSpinner containerClass={'mt-4'} />;
  }

  if (!user?.roles?.includes(USER_TYPE.TENANT)) {
    return <p className="p-4">User must have the tenant Role assigned to them by a property manager or Owner.</p>;
  }

  function closeModal() {
    setDownloadModalIsOpen(false);
  }

  return (
    <div id="chatbot">
      <Modal id="download-instructions-modal" isOpen={downloadModalIsOpen} onClose={closeModal}>
        <div className="p-6">
          <h2 className="text-center text-2xl font-bold mb-4">Instructions to Save Pillar App to Your Home Screen</h2>

          <div className="space-y-2">
            {platform === 'iOS' ? (
              <>
                <p>1. Tap the share icon (square with an arrow pointing out of it) at the bottom of the screen.</p>
                <p>{'2. Scroll down and tap "Add to Home Screen".'}</p>
                <p>{'3. Name it as you wish and then tap "Add" on the top-right.'}</p>
              </>
            ) : platform === 'Android' ? (
              <>
                <p>{'1. Tap the menu button (three dots) on the top-right of the screen.'}</p>
                <p>{'2. Tap "Add to Home screen".'}</p>
              </>
            ) : (
              <p>Your device is not recognized. Please refer to its clientDocumentation for instructions.</p>
            )}
          </div>

          <button onClick={closeModal} className="mt-4 btn btn-primary">
            Close
          </button>
        </div>
      </Modal>
      <main className="text-center">
        <div className="w-11/12 lg:w-6/12 md:w-7/12 sm:w-9/12 mx-auto shadow-xl rounded-lg">
          <div id="chatbox-header" className="text-left bg-primary rounded-t-lg py-2 shadow-sm">
            <h3 className="text-xl my-auto text-primary-content text-center">PILLAR Chat</h3>
          </div>
          <div
            id="chatbox"
            style={{
              height: '73dvh',
              boxSizing: 'border-box',
            }}
            className="md:filter-none m-0 p-3 bg-gray-100 overflow-y-scroll overflow-x-hidden"
          >
            {renderChatHeader()}
            {!!messages?.length &&
              messages.map((message, index) => (
                <div key={`${message.content?.[0] ?? index}-${index}`} className={`mb-3 break-all text-primary-content ${!!(index % 2) ? 'text-left' : 'text-right'}`}>
                  <div className={`w-11/12 rounded-md py-2 px-6 inline-block shadow-md ${!!(index % 2) ? 'bg-base-300 text-left' : 'bg-secondary text-right'}`}>
                    {workOrder.issueDescription && !isResponding && !isTyping && index === lastSystemMessageIndex && !submitAnywaysSkip && (
                      <div className="text-left mb-1 ">
                        <h3 className="text-left font-semibold">
                          Issue: <span className="font-normal">{`${workOrder.issueDescription}`}</span>
                        </h3>
                      </div>
                    )}
                    {workOrder.issueLocation && !isResponding && !isTyping && index === lastSystemMessageIndex && !submitAnywaysSkip && (
                      <div className="text-left mb-1 ">
                        <h3 className="text-left font-semibold">
                          Issue Location: <span className="font-normal">{workOrder.issueLocation}</span>
                        </h3>
                      </div>
                    )}
                    <div data-testid={`response-${index}`} className="whitespace-pre-line break-keep">
                      <p>{message.content}</p>{' '}
                      {message.role === 'assistant' && index === lastSystemMessageIndex && isTyping && aiMessageEnded && (
                        <LoadingSpinner containerClass="mt-2" spinnerClass="spinner-small" />
                      )}
                    </div>
                    {index === lastSystemMessageIndex && (hasAllIssueInfo(workOrder) || submitAnywaysSkip) && (
                      <div className="py-2">
                        <div data-testid="final-response" className="text-secondary-content w-full">
                          {submitAnywaysSkip && (
                            <div className="child:w-11/12">
                              <div className="label">
                                <span className="label-text text-secondary-content">{isMobile ? 'Issue*' : 'Issue Details*'}</span>
                              </div>
                              <input
                                className="input input-sm input-bordered"
                                id="issueDescription"
                                type={'text'}
                                value={issueDescription}
                                onChange={handleIssueDescriptionChange}
                              />
                              <div className="label">
                                <span className="label-text text-secondary-content">{isMobile ? 'Location*' : 'Issue Location*'}</span>
                              </div>
                              <input className="input input-sm input-bordered" id="issueLocation" type={'text'} value={issueLocation} onChange={handleIssueLocationChange} />
                            </div>
                          )}
                          <div className="label">
                            <span className="label-text text-secondary-content">{isMobile ? 'Details' : 'Additional Details'}</span>
                          </div>
                          <input
                            className="input input-sm input-bordered w-11/12"
                            id="additionalDetails"
                            type={'text'}
                            value={additionalDetails}
                            onChange={handleAdditionalDetailsChange}
                          />
                        </div>
                        <form className="mt-4" onSubmit={() => {}}>
                          <input type="file" multiple name="image" accept="image/*" onChange={handleFileChange} />
                        </form>
                        <div className="label">
                          <span className="label-text text-secondary-content mt-2 flex flex-row">
                            Permission To Enter: <p className="ml-2">{selectedAddress ? toTitleCase(selectedAddress.label) : 'Property'}* </p>
                          </span>
                        </div>

                        <div className="flex flex-row -mt-3">
                          <label className="label cursor-pointer">
                            <span className="label-text text-secondary-content">Yes</span>
                            <input className="radio ml-3 bg-base-100" type={'radio'} checked={permissionToEnter === PTE.YES} value={PTE.YES} onChange={handlePermissionChange} />
                          </label>
                          <label className="label cursor-pointer ml-4">
                            <span className="label-text text-secondary-content">No</span>
                            <input className="radio ml-3 bg-base-100" type={'radio'} checked={permissionToEnter === PTE.NO} value={PTE.NO} onChange={handlePermissionChange} />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

            {isResponding && (
              <div className="text-left bg-base-300 w-1/6 rounded-md py-2 px-6 shadow-md">
                <div className="flex flex-row">
                  <div className="dot animate-loader"></div>
                  <div className="dot animate-loader animation-delay-200"></div>
                  <div className="dot animate-loader animation-delay-400"></div>
                </div>
              </div>
            )}

            {!isResponding && !isTyping && !submitAnywaysSkip && !hasAllIssueInfo(workOrder) && (issueDescription.length > 0 || errorCount > 0) && (
              <button
                onClick={() => {
                  setSubmitAnywaysSkip(true);
                  setMessages((prev) => {
                    prev[prev.length - 1] = {
                      role: 'assistant',
                      content: 'Please complete the form below. When complete, press submit to send your work order!',
                      ksuId: generateKSUID(),
                    };
                    return prev;
                  });
                  if (issueDescription.length === 0) {
                    setIssueDescription(userMessage);
                  }
                }}
                className="btn btn-primary"
              >
                {'Submit Anyways?'}
              </button>
            )}
          </div>
          <div id="chatbox-footer" className="p-3 rounded-b-lg border-t border-base-300 flex items-center justify-center h-24">
            {(hasAllIssueInfo(workOrder) || submitAnywaysSkip) && messages.length > 1 ? (
              <button onClick={handleSubmitWorkOrder} disabled={issueDescription.length === 0 || submittingWorkOrderLoading || uploadingFiles} className="btn btn-primary">
                {submittingWorkOrderLoading ? <LoadingSpinner /> : uploadingFiles ? 'Files Uploading...' : 'Submit Work Order'}
              </button>
            ) : (
              <form
                onSubmit={handleSubmitText}
                className="w-full flex flex-row items-center justify-center"
                onKeyDown={(e) => {
                  //Users can press enter to submit the form, enter + shift to add a new line
                  if (e.key === 'Enter' && !e.shiftKey && !isResponding && addressHasBeenSelected) {
                    e.preventDefault();
                    handleSubmitText(e);
                  }
                }}
              >
                <textarea
                  value={userMessage}
                  data-testid="userMessageInput"
                  className={`p-2 textarea textarea-bordered resize-none w-5/6`}
                  placeholder={messages.length ? (hasAllIssueInfo(workOrder) ? '' : '') : 'Tell us about your issue.'}
                  onChange={handleChange}
                />
                <button
                  data-testid="send"
                  type="submit"
                  className="ml-2 btn btn-primary my-auto w-1/6"
                  disabled={isResponding || isTyping || !userMessage || userMessage.length === 0 || !addressHasBeenSelected}
                >
                  Send
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
