import Head from 'next/head'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { ChatCompletionRequestMessage } from 'openai'
import { toast } from 'react-toastify'


export type ApiRequest = {
  text: string;
  messages: ChatCompletionRequestMessage[];
  issueCategory?: string;
};

export type AiJSONResponse = {
  aiMessage: string;
  issueCategory: string;
  issueFound: boolean;
  issueRoom: string;
  subCategory: string;
};

export type FinishFormRequest = {
  text: string;
  messages: ChatCompletionRequestMessage[];
  workOrder: WorkOrder;
};

type WorkOrder = {
  email: string | null;
  name: string | null;
  properyManagerEmail: string | null;
  address: string | null;
  permissionToEnter: string | null;
  serviceRequest: string | null;
  issueRoom: string | null;
};
export default function Home() {
  const { data: session } = useSession();
  const [text, setText] = useState('');

  const [properyManagerEmail, setPropertyManagerEmail] = useState('');

  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [issueCategory, setIssueCategory] = useState('');
  const [workOrder, setWorkOrder] = useState<WorkOrder>({
    properyManagerEmail: null,
    email: null,
    name: null,
    address: null,
    permissionToEnter: null,
    serviceRequest: null,
    issueRoom: null,
  });

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

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      setText(e.currentTarget.value);
    },
    [setText]
  );

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

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

    setMessages([...messages, { role: 'user', content: text }]);
    setIsResponding(true);
    setText('');

    let newMessage: string = '';

    if (workOrder.serviceRequest && workOrder.issueRoom) {
      const body: FinishFormRequest = { text, messages, workOrder };
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
      const body: ApiRequest = { text, messages, issueCategory };
      const res = await axios.post('/api/service-request', body);
      const jsonResponse = res?.data.response;
      const parsed = JSON.parse(jsonResponse) as AiJSONResponse;
      setWorkOrder({
        ...workOrder,
        serviceRequest: parsed.issueFound ? parsed.issueCategory + '; ' + parsed.subCategory : '',
        issueRoom: parsed.issueRoom,
      });
      setIssueCategory(parsed.issueCategory ?? '');
      newMessage = parsed.aiMessage;
    }

    setIsResponding(false);
    setMessages([...messages, { role: 'user', content: text }, { role: 'assistant', content: newMessage }]);
  };

  const readyToSubmitUserInfo = !!workOrder.serviceRequest && workOrder.issueRoom;

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
              className="w-11/12 sm:w-6/12 lg:w-1/3 mx-auto">
              <div
                className="shadow-xl rounded">
                <div id="chatbox-header"
                  style={{ padding: "0.5dvh 0" }}
                  className="text-left bg-blue-200 rounded">
                  <h3 className="text-xl my-auto text-gray-500 text-center">PILLAR Chat</h3>
                </div>
                <div
                  id="chatbox"
                  style={{
                    height: "73dvh",
                    boxSizing: "border-box"
                  }}
                  className="shadow-gray-400 md:filter-none w-11/12 mx-auto overflow-scroll rounded">
                  <p className="mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-6 mb-3 py-2 px-4 text-left">
                    {`Tell us about the issue you are experiencing.`}
                  </p>
                  {!!messages?.length &&
                    messages.map((message, index) => (
                      <div key={`${message.content[0]}-${index}`} className="mb-3">
                        <div
                          className={`text-gray-800 w-11/12 rounded-md py-2 px-4 inline-block ${!!(index % 2)
                            ? 'bg-gray-200 text-left'
                            : 'bg-blue-100 text-right'
                            }`}>
                          {workOrder.serviceRequest &&
                            !!(index % 2) &&
                            index === messages.length - 1 && (
                              <div className="text-left mb-1 text-gray-700">
                                <h3 className="text-left font-semibold">
                                  Service Request:{' '}
                                  <span className="font-normal">
                                    {workOrder.serviceRequest}
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
                          <p>{message.content}</p>
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
                  className="py-3 bg-gray-100"
                  style={{ "height": "12dvh" }}
                >
                  <form onSubmit={handleSubmit}
                    style={{ display: "grid", gridTemplateColumns: "9fr 1fr" }}
                  >
                    <textarea
                      value={text}
                      className="p-2 w-10/12 w-full border-solid border-2 border-gray-200 rounded-md"
                      placeholder={
                        messages.length
                          ? readyToSubmitUserInfo
                            ? 'John; 123 St Apt 1400, Boca, FL; yes'
                            : ''
                          : 'Master bathroom toilet is clogged'
                      }
                      onChange={handleChange}
                    />
                    <button
                      type="submit"
                      className="text-blue-500 px-1 font-bold hover:text-blue-900 rounded disabled:opacity-25"
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
