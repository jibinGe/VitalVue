import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '@/components/dashboard/header'

export default function Layout() {
  const pathName = useLocation();
  useEffect(() => { window.scrollTo(0, 0) }, [pathName])
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}
