import Head from 'next/head'
import { Inter } from 'next/font/google'
import { useSession } from 'next-auth/react'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const { data: session } = useSession()
  console.log({ session })
  return (
    <>
      <Head>
        <title>Property Manager Helper</title>
        <meta name="description" content="App to help property managers deal with service requests" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className='text-center'>
        <div>
          <h1 className='text-slate-200 text-3xl mt-12'>Demo</h1>
          <h3 className='text-slate-400 text-xl mt-6'>Welcome, {session?.user?.name}</h3>
        </div>
      </main>
    </>
  )
}
