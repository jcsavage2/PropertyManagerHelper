import React, { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { ChatCompletionRequestMessage } from "openai"

type ApiRequest = {
  text: string
  messages: ChatCompletionRequestMessage[]
}


const NewRequest = () => {
  const [text, setText] = useState("")
  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([])
  const [isResponding, setIsResponding] = useState(false)

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setText(e.currentTarget.value)
  }, [setText])

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setMessages([...messages, { role: "user", content: text }])
    setIsResponding(true)
    setText("")
    const body: ApiRequest = { text, messages }
    const res = await axios.post("/api/service-request", body)
    const aiResposne = res?.data.response as string
    setIsResponding(false)
    setMessages([...messages, { role: "user", content: text }, { role: "assistant", content: aiResposne }])
  }

  return (
    <div className="">
      <div id="container" className="text-center border-solid border-2 border-slate-200 bg-slate-800 rounded w-10/12 mt-12 mx-auto" >
        <div id="header" className="text-center">
          <h1 className='text-slate-200 text-3xl my-10'>New Service Request</h1>
        </div>
        <div id="chatbox" style={{ height: "60vh" }} className="border-solid border-2 border-slate-400 bg-slate-100 rounded w-8/12 mx-auto">

          <div id="chatbox-header">
            <p className="text-slate-200 w-3/4 rounded bg-slate-700 mt-6 ml-2 py-2">Tell us your issue below so we can assist you.</p>

          </div>
          {messages.length && messages.map((message, index) => {
            return (
              <div key={`${message.content[0]}-${index}`} className="even:text-right even:mr-2 odd:text-left odd:ml-2 mt-2">
                <p className={`text-slate-100 w-3/4 rounded ${index % 2 ? "bg-slate-700" : "bg-amber-700"}  text-center py-2 inline-block`}>
                  {message.content}
                </p>
              </div>
            )
          })}
          {isResponding && <svg className="animate-spin h-5 w-5 mr-3 ..." viewBox="0 0 24 24" />}
        </div>
        <div id="chatbox-footer" className="p-4">
          <form onSubmit={handleSubmit}>
            <input value={text} className="p-3 mr-3 w-96" type="text" placeholder='eg. "My toilet is clogged"' onChange={handleChange} />
            <button type="submit" className="bg-slate-600 p-3" >Send Response</button>
          </form>
        </div>
      </div>
    </div >
  )
}

export default NewRequest
