import React, { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { ChatCompletionRequestMessage } from "openai"

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
}

export type FinishFormRequest = {
  text: string
  messages: ChatCompletionRequestMessage[]
  workOrder: WorkOrder
}

type WorkOrder = {
  name: string
  address: string
  permissionToEnter: string
  serviceRequest: string
}

const NewRequest = () => {
  const [text, setText] = useState("")
  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([])
  const [isResponding, setIsResponding] = useState(false)
  const [issueCategory, setIssueCategory] = useState("")
  const [workOrder, setWorkOrder] = useState<WorkOrder>({
    name: "",
    address: "",
    permissionToEnter: "",
    serviceRequest: "",
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

    if (workOrder.serviceRequest) {
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
    <div>
      <div
        id="container"
        className="text-center border-solid border-2 border-slate-200 bg-slate-800 rounded w-10/12 mt-12 mx-auto">
        <div id="header" className="text-center">
          <h1 className="text-slate-200 text-3xl my-10">New Service Request</h1>
        </div>
        <div
          id="chatbox"
          style={{ height: "60vh" }}
          className="border-solid border-2 border-slate-400 bg-slate-100 rounded w-8/12 mx-auto overflow-scroll">
          <div id="chatbox-header">
            <p className="text-slate-200 w-3/4 rounded bg-slate-700 mt-6 ml-2 py-2">
              {`Tell us broadly what the issue is about. For example: "Toilet", or "Dishwasher".`}
            </p>
          </div>
          {messages.length &&
            messages.map((message, index) => {
              const isEven = !(index % 2)
              return (
                <div
                  key={`${message.content[0]}-${index}`}
                  className="even:text-right even:mr-2 odd:text-left odd:ml-2 mt-2">
                  <div
                    className={`text-slate-100 w-3/4 rounded ${index % 2 ? "bg-slate-700" : "bg-amber-700"
                      }  text-center p-2 inline-block`}>
                    {workOrder.serviceRequest && !isEven && index === messages.length - 1 && (
                      <div className="text-left ml-3 mb-1 text-slate-300">
                        <h3 className="font-semibold">Service Request: {workOrder.serviceRequest}</h3>
                      </div>
                    )}
                    <p>{message.content}</p>
                  </div>
                </div>
              )
            })}
          {isResponding && (
            <div className="text-left ml-2 mt-2 h-10">
              <div className={`text-slate-100 w-3/4 h-full rounded bg-slate-700 text-center py-3 flex justify-center`}>
                <div className="dot animate-loader"></div>
                <div className="dot animate-loader animation-delay-200"></div>
                <div className="dot animate-loader animation-delay-400"></div>
              </div>
            </div>
          )}
        </div>
        <div id="chatbox-footer" className="p-4">
          <form onSubmit={handleSubmit}>
            <input
              value={text}
              className="p-3 mr-3 w-96"
              type="text"
              placeholder={messages.length ? "" : 'eg. "My toilet is clogged"'}
              onChange={handleChange}
            />
            <button type="submit" className="bg-slate-600 p-3 disabled:opacity-25" disabled={isResponding}>
              Send Response
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default NewRequest
