import React, { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { ChatCompletionRequestMessage } from "openai"

type ApiRequest = {
  text: string
  messages: ChatCompletionRequestMessage[]
}

type AiJSONResponse = {
  issueCategory: string,
  subCategory: string,
  locationOfIssue: string,
  additionalInfo: string,
  aiMessage: string
  issueFound: boolean
}


const NewRequest = () => {
  const [text, setText] = useState("")
  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([])
  const [issue, setIssue] = useState("")
  const [subIssue, setSubIssue] = useState("")
  const [isResponding, setIsResponding] = useState(false)

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setText(e.currentTarget.value)
  }, [setText])

  // Scroll to bottom when new message added
  useEffect(() => {
    var element = document.getElementById("chatbox");

    if (element) {
        element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    if(text.length === 0){
        return
    }
    setMessages([...messages, { role: "user", content: text }])
    setIsResponding(true)
    setText("")
    const body: ApiRequest = { text, messages }
    const res = await axios.post("/api/service-request", body)
    const jsonResponse = res?.data.response
    const parsed = JSON.parse(jsonResponse) as AiJSONResponse

    setIsResponding(false)
    setMessages([...messages, { role: "user", content: text }, { role: "assistant", content: parsed.aiMessage }])
    setIssue(parsed.issueCategory ?? "")
    setSubIssue(parsed.subCategory ?? "")
  }

  return (
    <div className="">
      <div id="container" className="text-center border-solid border-2 border-slate-200 bg-slate-800 rounded w-10/12 mt-12 mx-auto" >
        <div id="header" className="text-center">
          <h1 className='text-slate-200 text-3xl my-10'>New Service Request</h1>
        </div>
        <div id="chatbox" style={{ height: "60vh" }} className="border-solid border-2 border-slate-400 bg-slate-100 rounded w-8/12 mx-auto overflow-scroll">

          <div id="chatbox-header">
            <p className="text-slate-200 w-3/4 rounded bg-slate-700 mt-6 ml-2 py-2">Tell us your issue below so we can assist you.</p>

          </div>
          {messages.length && messages.map((message, index) => {
            const isEven = !(index % 2)
            return (
              <div key={`${message.content[0]}-${index}`} className="even:text-right even:mr-2 odd:text-left odd:ml-2 mt-2">

                <div className={`text-slate-100 w-3/4 rounded ${index % 2 ? "bg-slate-700" : "bg-amber-700"}  text-center py-2 inline-block`}>
                  {issue && subIssue && !isEven && (
                    <>
                      <h3>{issue}</h3>
                      <h5>{subIssue}</h5>
                    </>)}
                  <p>{message.content}</p>
                </div>
              </div>
            )
          })}
          {isResponding && <svg className="animate-spin h-5 w-5 mr-3 ..." viewBox="0 0 24 24" />}
        </div>
        <div id="chatbox-footer" className="p-4">
          <form onSubmit={handleSubmit}>
            <input value={text} className="p-3 mr-3 w-96" type="text" placeholder='eg. "My toilet is clogged"' onChange={handleChange} />
            <button type="submit" className="bg-slate-600 p-3 disabled:opacity-25" disabled={isResponding}>Send Response</button>
          </form>
        </div>
      </div>
    </div >
  )
}

export default NewRequest
