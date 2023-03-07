import Head from 'next/head'
import { Inter } from 'next/font/google'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const { data: session } = useSession()
  const router = useRouter()


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
          <h1 className='text-slate-200 text-3xl mt-12'>Property Manager Helper</h1>
          {session?.user?.name ? (
            <>
              <h3 className='text-slate-400 text-2xl mt-6 mb-12'>Welcome, {session?.user?.name}</h3>
              <button onClick={() => router.push("/new-request")} className="border-1 text-xl hover:bg-orange-600 bg-orange-500 rounded-sm py-6 px-12">
                New Request
              </button>
            </>
          ) : (
            <>
              <h3 className='text-slate-400 text-2xl mt-6 mb-12'>Welcome</h3>
              <button onClick={() => router.push("/login")} className="border-1 border-solid border-slate-500 hover:border-slate-100 bg-orange-500 rounded-sm p-4">
                Sign In/Sign Up
              </button>
            </>
          )}

        </div>
      </main>
    </>
  )
}
