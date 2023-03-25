import Head from 'next/head'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { ChatCompletionRequestMessage } from 'openai'
import { toast } from 'react-toastify'
import { hasAllIssueInfo, hasAllUserInfo } from '@/utils'
import { AiJSONResponse, ApiRequest, UserInfo, WorkOrder } from '@/types'


export default function Home() {

  const { data: session } = useSession();
  const [userMessage, setUserMessage] = useState('');
  const [lastUserMessage, setLastUserMessage] = useState('');

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [permissionToEnter, setPermissionToEnter] = useState("yes")


  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const initialWorkOrderState: WorkOrder = {

    /** Issue Information */
    issueCategory: "",
    issueLocation: "",
    issueSubCategory: "",
  }
  const [workOrder, setWorkOrder] = useState<WorkOrder>(initialWorkOrderState);
  const [flow, setFlow] = useState<'issueFlow' | 'userFlow'>('issueFlow')

  // Update the user when the session is populated
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? '')
      setEmail(session.user.email ?? '')
    }
  }, [session]);

  // Scroll to bottom when new message added
  useEffect(() => {
    var element = document.getElementById('chatbox');

    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, name, email, address, permissionToEnter]);

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = useCallback((e) => {
    setUserMessage(e.currentTarget.value);
  }, [setUserMessage]);

  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setName(e.currentTarget.value);
  }, [setName]);
  const handleEmailChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setEmail(e.currentTarget.value)
  }, [setEmail]);
  const handleAddressChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setAddress(e.currentTarget.value);
  }, [setAddress]);
  const handlePermissionChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setPermissionToEnter(e.currentTarget.value);
  }, [setPermissionToEnter]);




  const handleSubitTextWorkOrder: React.MouseEventHandler<HTMLButtonElement> = () => {
    toast.success('Successfully Submitted Work Order!', {
      position: toast.POSITION.TOP_CENTER,
    });
    setMessages([])
    setWorkOrder(initialWorkOrderState)
    return;
  }
  console.log(workOrder)

  const handleSubitText: React.FormEventHandler<HTMLFormElement> = async (e) => {
    try {
      e.preventDefault();
      if (userMessage === '') return
      setMessages([...messages, { role: 'user', content: userMessage }]);
      setIsResponding(true);
      setLastUserMessage(userMessage)
      setUserMessage('');

      const body: ApiRequest = { userMessage, messages, ...workOrder, flow };
      const res = await axios.post('/api/service-request', body);
      const jsonResponse = res?.data.response;
      const flowResponse = res.data.flow
      const parsed = JSON.parse(jsonResponse) as AiJSONResponse;
      setFlow(flowResponse)
      setWorkOrder({
        issueCategory: parsed.issueCategory ? parsed.issueCategory : workOrder.issueCategory,
        issueSubCategory: parsed.issueSubCategory ? parsed.issueSubCategory : workOrder.issueSubCategory,
        issueLocation: parsed.issueLocation ? parsed.issueLocation : workOrder.issueSubCategory,
      });
      const newMessage = parsed.aiMessage;
      setIsResponding(false);
      setMessages([...messages, { role: 'user', content: userMessage }, { role: 'assistant', content: newMessage }]);
    } catch (err) {
      setIsResponding(false)
      setMessages([...messages, { role: 'user', content: userMessage }, { role: 'assistant', content: "Sorry - I had a hiccup on my end. Could you please try again?" }]);
      setUserMessage(lastUserMessage)
    }
  };



  const lastSystemMessageIndex = messages.length - (isResponding ? 2 : 1)

  const userInfo: UserInfo = {
    name,
    email,
    address,
    permissionToEnter
  }

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
                          {hasAllIssueInfo(workOrder) && index === lastSystemMessageIndex && (
                            <>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", rowGap: "0.3rem", marginTop: "1rem" }}>
                                <label htmlFor='name'>Name: </label>
                                <input
                                  className='rounded px-1'
                                  id="name"
                                  type={"text"}
                                  value={userInfo.name}
                                  onChange={handleNameChange}
                                />
                                <label htmlFor='email'>Email: </label>
                                <input
                                  className='rounded px-1'
                                  id="email"
                                  type={"text"}
                                  value={userInfo.email}
                                  onChange={handleEmailChange}
                                />
                                <label htmlFor='address'>Address: </label>
                                <input
                                  className='rounded px-1'
                                  id="address"
                                  type={"text"}
                                  value={userInfo.address}
                                  onChange={handleAddressChange}
                                />
                              </div>
                              <p className='mt-2'>{"Permission To Enter Property: "}</p>
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
                          )}
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
                  {hasAllUserInfo(userInfo) && hasAllIssueInfo(workOrder) && (
                    <button
                      onClick={handleSubitTextWorkOrder}
                      className='text-white bg-blue-500 px-3 py-2 font-bold hover:bg-blue-900 rounded disabled:text-gray-400'>
                      Submit Work Order
                    </button>
                  )}
                </div>
                <div
                  id="chatbox-footer"
                  className="p-3 bg-slate-100 rounded-b-lg flex items-center justify-center"
                  style={{ "height": "12dvh" }}
                >
                  <form onSubmit={handleSubitText}
                    style={{ display: "grid", gridTemplateColumns: "9fr 1fr" }}
                    onKeyDown={(e) => {
                      //Users can press enter to submit the form, enter + shift to add a new line
                      if (e.key === 'Enter' && !e.shiftKey && !isResponding) {
                        e.preventDefault();
                        handleSubitText(e);
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
