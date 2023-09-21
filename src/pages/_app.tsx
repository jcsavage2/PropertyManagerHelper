import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider, SessionProviderProps } from "next-auth/react";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Head from 'next/head';
import React, { useEffect } from 'react';
import { UserContextProvider } from '@/context/user';
import { NavLinks } from '@/components/nav-links';
import * as Fullstory from "@fullstory/browser";


export default function App({ Component, pageProps, session }: AppProps & { session: SessionProviderProps["session"]; }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_IS_LOCAL) {
      return;
    } else {
      Fullstory.init({ orgId: 'o-1PYDZB-na1' });
    }
  }, []);
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
