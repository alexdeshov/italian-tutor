import type { ReactNode } from 'react'
import AppHeader from './app-header'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <main>{children}</main>
    </>
  )
}
