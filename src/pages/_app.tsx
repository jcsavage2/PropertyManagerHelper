import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider, SessionProviderProps } from "next-auth/react"
import Link from 'next/link'
import Image from 'next/image'
import Logo from "../static/1.png"

export default function App({ Component, pageProps, session }: AppProps & { session: SessionProviderProps["session"] }) {
  return (
    <SessionProvider session={session}>
      <nav className='flex bg-slate-100 border-3 border-solid border-black py-5 space-x-62'>
        <div className="flex space-x-5 text-center">
          <div className='flex'>
            <p className='pl-4 text-xl my-auto font-sans'>PILLAR</p>
            <Image src="/2.png" alt='1' width={40} height={0}></Image>
          </div>
          <div className='my-auto flex space-x-4'>
            <Link className='hover:text-gray-500 text-lg' href={"/"}>Home</Link>
            <Link className='hover:text-gray-500 text-lg' href={"/about"}>About</Link>
            <Link className='hover:text-gray-500 text-lg' href={"/login"}>Login</Link>
          </div>
        </div>
      </nav>
      <Component {...pageProps} />
    </SessionProvider >
  )
}
