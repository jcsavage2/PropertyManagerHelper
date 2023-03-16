import Head from 'next/head'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { ChatCompletionRequestMessage } from 'openai'


export type ApiRequest = {
  text: string
  messages: ChatCompletionRequestMessage[]
  issueCategory?: string
}

export type AiJSONResponse = {
  issueCategory: string
  subCategory: string
  aiMessage: string
  additionalDetails: string
  issueFound: boolean
  issueLocation: string
}

export type FinishFormRequest = {
  text: string
  messages: ChatCompletionRequestMessage[]
  workOrder: WorkOrder
}

type WorkOrder = {
  name: string | null
  address: string | null
  permissionToEnter: string | null
  serviceRequest: string | null
  issueLocation: string | null
}
export default function Home() {
  const { data: session } = useSession()
  const [text, setText] = useState("")
  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([])
  const [isResponding, setIsResponding] = useState(false)
  const [issueCategory, setIssueCategory] = useState("")
  const [workOrder, setWorkOrder] = useState<WorkOrder>({
    name: null,
    address: null,
    permissionToEnter: null,
    serviceRequest: null,
    issueLocation: null
  })

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setText(e.currentTarget.value)
  }, [setText])

  // Scroll to bottom when new message added
  useEffect(() => {
    var element = document.getElementById("chatbox")

    if (element) {
      element.scrollTop = element.scrollHeight
    }
  }, [messages])

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    if (text.length === 0) {
      return
    }
    setMessages([...messages, { role: "user", content: text }])
    setIsResponding(true)
    setText("")

    let newMessage: string = ""

    if (workOrder.serviceRequest && workOrder.issueLocation) {
      const body: FinishFormRequest = { text, messages, workOrder }
      const res = await axios.post("/api/finish-form", body)
      const aiResponse = res?.data.response
      const jsonStart = aiResponse.indexOf("{")
      const jsonEnd = aiResponse.lastIndexOf("}")
      //   If the json is included in the output then we have the complete work order, else we want to retry to get remaining fields
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonResponse = JSON.parse(aiResponse.substring(jsonStart, jsonEnd + 1)) as WorkOrder
        setWorkOrder({
          ...workOrder,
          name: jsonResponse.name ?? "",
          address: jsonResponse.address ?? "",
          permissionToEnter: jsonResponse.permissionToEnter ?? "",
        })
      }

      newMessage = aiResponse
    } else {
      const body: ApiRequest = { text, messages, issueCategory }
      const res = await axios.post("/api/service-request", body)
      const jsonResponse = res?.data.response
      const parsed = JSON.parse(jsonResponse) as AiJSONResponse
      setWorkOrder({
        ...workOrder,
        serviceRequest: parsed.issueFound ? parsed.issueCategory + "; " + parsed.subCategory : "",
      })
      setIssueCategory(parsed.issueCategory ?? '')
      newMessage = parsed.aiMessage
    }

    setIsResponding(false)
    setMessages([...messages, { role: "user", content: text }, { role: "assistant", content: newMessage }])
  }


  return (
    <>
      <Head>
        <title>Pillar</title>
        <meta name="description" content="App to help property managers deal with Work Orders" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className='text-center'>
        <div>
          <div>
            <div
              id="container"
              className="w-11/12 md:w-6/12  mt-4 mx-auto lg:w-1/3">
              <div id="header" className="text-center">
                <h1 className='text-left pl-0 text-2xl lg:text-5xl'>Submitting Work Orders...</h1>
                <h3 className='text-right my-3 pr-0 text-2xl lg:text-3xl text-gray-400'>...Now as easy as texting</h3>
              </div>
              <div className='shadow-xl rounded'>
                <div id="chatbox-header" className='text-left h-16 bg-blue-200 rounded'>
                  <h3 className='my-auto text-xl pl-4 py-5 text-gray-500'>PILLAR Chat</h3>
                </div>
                <div
                  id="chatbox"
                  className="shadow-gray-400 md:filter-none w-11/12 mx-auto overflow-scroll h-80 lg:h-96"
                >
                  <p className="mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-6 mb-3 py-2 px-4 text-left">
                    {`Tell us briefly about the issue you are experiencing.`}
                  </p>
                  {!!messages?.length &&
                    messages.map((message, index) => (
                      <div
                        key={`${message.content[0]}-${index}`}
                        className="mb-3">
                        <div
                          className={`text-gray-800 w-11/12 rounded-md py-2 px-4 inline-block ${!!(index % 2) ? "bg-gray-200 text-left" : "bg-blue-100 text-right"}`}
                        >
                          {workOrder.serviceRequest && !!(index % 2) && index === messages.length - 1 && (
                            <div className="text-left mb-1 text-gray-700">
                              <h3 className="text-left font-semibold">Service Request: {" "}
                                <span className="font-normal">
                                  {workOrder.serviceRequest}
                                </span>
                              </h3>
                            </div>
                          )}
                          <p>{message.content}</p>
                        </div>
                      </div>
                    )
                    )}
                  {isResponding && (
                    <div className="flex mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-2 mb-3 py-2 px-4 text-left">
                      <div className="dot animate-loader"></div>
                      <div className="dot animate-loader animation-delay-200"></div>
                      <div className="dot animate-loader animation-delay-400"></div>
                    </div>
                  )}
                </div>
                <div id="chatbox-footer" className="py-4 bg-gray-100">
                  <form onSubmit={handleSubmit}>
                    <input
                      value={text}
                      className="p-3 mr-3 w-11/12 border-solid border-2 border-gray-200 rounded"
                      type="text"
                      placeholder={messages.length ? "" : 'eg. "My toilet is clogged"'}
                      onChange={handleChange}
                    />
                    <button
                      type="submit"
                      className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 mt-2 rounded disabled:opacity-25" disabled={isResponding}
                    >
                      Send Response
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
