import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider, SessionProviderProps } from "next-auth/react"
import Link from 'next/link'
import Image from 'next/image'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css';
import Head from 'next/head'

export default function App({ Component, pageProps, session }: AppProps & { session: SessionProviderProps["session"] }) {
  return (
    <SessionProvider session={session}>
      <Head>
        <title>Pillar</title>
        <link rel="icon" href="/3.png" />
        <meta name="description" content="App to help property managers deal with Work Orders" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>  
      <nav
        style={{ height: "7dvh" }}
        className='flex bg-slate-100 border-3 border-solid border-black py-2 sm:py-5 space-x-62'>
        <div className="flex space-x-5 text-center">
          <div className='flex'>
            <p className='pl-4 text-xl my-auto font-sans'>PILLAR</p>
            <Image src="/2.png" alt='1' width={30} height={0}></Image>
          </div>
          <div className='my-auto flex space-x-4'>
            <Link className='hover:text-gray-500 text-lg' href={"/"}>Home</Link>
            <Link className='hover:text-gray-500 text-lg' href={"/about"}>About</Link>
            <Link className='hover:text-gray-500 text-lg' href={"/login"}>Login</Link>
          </div>
        </div>
      </nav>
      <ToastContainer />
      <Component {...pageProps} />
    </SessionProvider >
  )
}
