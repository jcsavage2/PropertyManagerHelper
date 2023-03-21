import Head from 'next/head'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { ChatCompletionRequestMessage } from 'openai'
import { toast } from 'react-toastify'


export type ApiRequest = WorkOrder & {
  userMessage: string;
  messages: ChatCompletionRequestMessage[];
};

export type AiJSONResponse = {
  aiMessage: string;
  issueCategory: string;
  issueSubCategory: string;
  issueRoom: string;
  issueFound: boolean;
};

export type FinishFormRequest = IssueInformation & {
  userMessage: string;
  messages: ChatCompletionRequestMessage[];
};

type UserInfo = {
  address: string | null;
  email: string | null;
  name: string | null;
  permissionToEnter: string | null;
  properyManagerEmail: string | null;
}

export type IssueInformation = {
  issueRoom: string | null;
  issueCategory: string | null;
  issueSubCategory: string | null;
}

type WorkOrder = UserInfo & IssueInformation

export default function Home() {
  const { data: session } = useSession();
  const [userMessage, setUserMessage] = useState('');

  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [workOrder, setWorkOrder] = useState<WorkOrder>({
    address: null,
    email: null,
    issueCategory: null,
    issueRoom: null,
    issueSubCategory: null,
    name: null,
    permissionToEnter: null,
    properyManagerEmail: null,
  });

  console.log({ workOrder })

  // Update the user when the session is populated
  useEffect(() => {
    if (session?.user) {
      setWorkOrder({ ...workOrder, name: session.user.name ?? '', email: session.user.email ?? "" });
    }
  }, [session]);

  // Scroll to bottom when new message added
  useEffect(() => {
    var element = document.getElementById('chatbox');

    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = useCallback((e) => {
      setUserMessage(e.currentTarget.value);
    },[setUserMessage]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    if(userMessage === '') return

    if (workOrder.name && workOrder.email && workOrder.address && workOrder.properyManagerEmail) {
      /**
       * Send email.
       * Clear everything.
       * Tell the customer to confirm their email.
       */
      toast.success('Successfully Submitted!', {
        position: toast.POSITION.TOP_CENTER,
      });
      return;
    }

    setMessages([...messages, { role: 'user', content: userMessage }]);
    setIsResponding(true);
    setUserMessage('');

    let newMessage: string = '';

    if (workOrder.issueCategory && workOrder.issueSubCategory && workOrder.issueRoom) {
      const body: FinishFormRequest = {
        userMessage,
        messages,
        issueCategory: workOrder.issueCategory,
        issueSubCategory: workOrder.issueSubCategory,
        issueRoom: workOrder.issueRoom
      };
      const res = await axios.post('/api/finish-form', body);
      const aiResponse = res?.data.response;
      const jsonStart = aiResponse.indexOf('{');
      const jsonEnd = aiResponse.lastIndexOf('}');
      //   If the json is included in the output then we have the complete work order, else we want to retry to get remaining fields
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonResponse = JSON.parse(aiResponse.substring(jsonStart, jsonEnd + 1)) as WorkOrder;
        setWorkOrder({
          ...workOrder,
          name: jsonResponse.name ?? '',
          address: jsonResponse.address ?? '',
          permissionToEnter: jsonResponse.permissionToEnter ?? '',
        });
      }

      newMessage = aiResponse;
    } else {
      const body: ApiRequest = { userMessage, messages, ...workOrder };
      const res = await axios.post('/api/service-request', body);
      const jsonResponse = res?.data.response;
      const parsed = JSON.parse(jsonResponse) as AiJSONResponse;
      setWorkOrder({
        ...workOrder,
        issueCategory: parsed.issueCategory,
        issueSubCategory: parsed.issueSubCategory,
        issueRoom: parsed.issueRoom,
      });
      newMessage = parsed.aiMessage;
    }

    setIsResponding(false);
    setMessages([...messages, { role: 'user', content: userMessage }, { role: 'assistant', content: newMessage }]);
  };

  const readyToSubmitUserInfo = workOrder.issueCategory && workOrder.issueSubCategory && workOrder.issueRoom;

  return (
    <>
      <Head>
        <title>Pillar</title>
        <meta name="description" content="App to help property managers deal with Work Orders" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
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
                  <h3 className="text-xl my-auto text-gray-500 text-center">PILLAR Chat</h3>
                </div>
                <div
                  id="chatbox"
                  style={{
                    height: "73dvh",
                    boxSizing: "border-box"
                  }}
                  className="shadow-gray-400 md:filter-none m-0 p-3 overflow-scroll">
                  <p className="mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-4 mb-3 py-2 px-4 text-left">
                    {`Tell us about the issue you are experiencing.`}
                  </p>
                  {!!messages?.length &&
                    messages.map((message, index) => (
                      <div key={`${message.content[0]}-${index}`} className="mb-3 break-all">
                        <div
                          className={`text-gray-800 w-11/12 rounded-md py-2 px-4 inline-block ${!!(index % 2)
                            ? 'bg-gray-200 text-left'
                            : 'bg-blue-100 text-right'
                            }`}>
                          {workOrder.issueCategory &&
                            !!(index % 2) &&
                            index === messages.length - 1 && (
                              <div className="text-left mb-1 text-gray-700">
                                <h3 className="text-left font-semibold">
                                  Service Request:{' '}
                                  <span className="font-normal">
                                    {`${workOrder.issueCategory}` + `; ${workOrder.issueSubCategory ?? ""}`}
                                  </span>
                                </h3>
                              </div>
                            )}
                          {workOrder.issueRoom &&
                            !!(index % 2) &&
                            index === messages.length - 1 && (
                              <div className="text-left mb-4 text-gray-700">
                                <h3 className="text-left font-semibold">
                                  Issue Location:{' '}
                                  <span className="font-normal">
                                    {workOrder.issueRoom}
                                  </span>
                                </h3>
                              </div>
                            )}
                          <p className='whitespace-pre-line break-keep'>{message.content}</p>
                        </div>
                      </div>
                    ))}
                  {isResponding && (
                    <div className="flex mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-2 mb-3 py-2 px-4 text-left">
                      <div className="dot animate-loader"></div>
                      <div className="dot animate-loader animation-delay-200"></div>
                      <div className="dot animate-loader animation-delay-400"></div>
                    </div>
                  )}
                </div>
                <div
                  id="chatbox-footer"
                  className="p-3 bg-gray-100 rounded-b-lg flex items-center justify-center"
                  style={{ "height": "12dvh" }}
                >
                  <form onSubmit={handleSubmit}
                    style={{ display: "grid", gridTemplateColumns: "9fr 1fr" }}
                    onKeyDown={(e) => {
                        //Users can press enter to submit the form, enter + shift to add a new line
                        if(e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                  >
                    <textarea
                      value={userMessage}
                      className="p-2 w-full border-solid border-2 border-gray-200 rounded-md"
                      placeholder={
                        messages.length
                          ? readyToSubmitUserInfo
                            ? 'John; 123 St Apt 1400, Boca, FL; yes'
                            : ''
                          : 'Toilet in the master bathroom is clogged.'
                      }
                      onChange={handleChange}
                    />
                    <button
                      type="submit"
                      className="text-blue-500 px-1 ml-2 font-bold hover:text-blue-900 rounded disabled:opacity-25 "
                      disabled={isResponding}>
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
