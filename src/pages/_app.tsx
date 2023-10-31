import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider, SessionProviderProps, useSession } from "next-auth/react";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Head from 'next/head';
import React from 'react';
import { UserContextProvider } from '@/context/user';
import { NavLinks } from '@/components/nav-links';



export default function App({ Component, pageProps, session }: AppProps & { session: SessionProviderProps["session"]; }) {

  return (
    <SessionProvider
      session={session}
      refetchInterval={60 * 60} // refresh session every hour
    >
      <UserContextProvider>
        <Head>
          <title>Pillar</title>
          <link rel="icon" href="/3.png" />
          <meta name="description" content="App to help property managers deal with Work Orders" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <NavLinks />
        <ToastContainer />
        <Component {...pageProps} />
      </UserContextProvider>
    </SessionProvider >
  );
}
