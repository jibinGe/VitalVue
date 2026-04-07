import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '@/components/logo'
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Dropdown from '@/components/ui/dropdown';
import Input from '@/components/ui/input';
import { useAuth } from '../../contexts/AuthContext';

import avater from '@/assets/img/user-profile.png'
import { Search } from '../../utilities/icons';
import Notifactions from './notifactions';
import { LogOut, Settings, User } from 'lucide-react';
import { patientService } from '@/services/patientService';
import { useWard } from '../../contexts/WardContext';

export default function Header() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const profile_ref = useRef(null)
  const [profile_open, setProfileOpen] = useState(false);
  // click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profile_ref.current && !profile_ref.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profile_ref]);

  const notifaction_ref = useRef(null)
  const [notifaction_open, setNotifactionOpen] = useState(false);
  // click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifaction_ref.current && !notifaction_ref.current.contains(event.target)) {
        setNotifactionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifaction_ref]);

  const handleLogout = async () => {
    setProfileOpen(false)
    await logout()
    navigate('/')
  }

  // Fetch wards
  const [wards, setWards] = useState([]);
  const { selectedWard, setSelectedWard } = useWard();

  useEffect(() => {
    const fetchWards = async () => {
      try {
        const response = await patientService.getWards();
        if (response.success) {
          setWards([{ name: "All Wards", id: "all" }, ...response.data]);
          // Set default selected ward if available and not already set
          if (!selectedWard) {
            setSelectedWard({ name: "All Wards", id: "all" });
          }
        }
      } catch (error) {
        console.error("Failed to fetch wards:", error);
      }
    };
    fetchWards();
  }, []);

  const profile_dropdown = [
    {
      name: 'Profile',
      icon: <User />,
      path: '/dashbaord/profile',
      isLink: true,
    },
    {
      name: 'Settings',
      icon: <Settings />,
      path: '/dashboard/control',
      isLink: true,
    },
    {
      name: 'Logout',
      icon: <LogOut className='text-red-400' />,
      onClick: handleLogout,
      isLink: false,
    },
  ]

  return (
    <div className='flex items-center flex-wrap gap-0 sticky top-0 left-0 z-10 w-full bg-[#27272B]'>
      <div className="max-w-(--left-sidebar-width) w-full p-4 md:p-5 border-r border-solid border-[#0F0F0F] flex gap-4 items-center justify-between">
        <Logo />
        <h4 className='text-2xl text-white'>VitalVue</h4>
        {/* <span className='ml-auto inline-flex items-center rounded-full px-3 w-max min-h-6 justify-center bg-white/16 uppercase backdrop-blur-[50px] text-[10px] font-normal pt-px'>system</span> */}
      </div>
      <div className="w-full max-w-[calc(100%-var(--left-sidebar-width))] p-4 md:p-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className='text-2xl text-white'>Dashboard</h2>

        <div className="max-w-100 3xl:max-w-106 w-full rounded-full bg-[#373739] p-1.5 min-h-13 flex items-center gap-4">
          <Dropdown
            btnClass="min-h-10 bg-[#B9B6C9]/16! rounded-full! backdrop-blur-lg text-white! border-none!"
            items={wards.map(ward => ({ name: ward.name, id: ward.id }))}
            placeholder={selectedWard ? selectedWard.name : "Select Ward"}
            onSelect={(item) => setSelectedWard(item)}
          />
          <div className="w-px h-6 bg-white/16 rounded-full"></div>
          <Input
            type="text"
            className="flex-1"
            leftIcon={<Search />}
            leftIconClass="left-0!"
            placeholder="Search patient or ID..."
            inputClass="h-10 border-none! placeholder:text-white! text-white! w-full bg-transparent! ring-0!"
          />
        </div>

        <div className="flex items-center justify-end gap-4 md:gap-5">
          <div ref={notifaction_ref} className="relative">
            <button onClick={() => setNotifactionOpen((prev) => !prev)} className="size-12 relative lg:size-14 flex items-center justify-center text-white bg-[#373739] hover:bg-primary/40 rounded-full">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M12.2449 2.51367C7.81063 2.51367 5.88397 6.52891 5.88397 9.18319C5.88397 11.167 6.17159 10.5832 5.07349 13.0032C3.73254 16.4518 9.12492 17.8613 12.2449 17.8613C15.364 17.8613 20.7564 16.4518 19.4164 13.0032C18.3183 10.5832 18.6059 11.167 18.6059 9.18319C18.6059 6.52891 16.6783 2.51367 12.2449 2.51367Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14.5575 20.5117C13.2632 21.9574 11.2442 21.9746 9.9375 20.5117" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className='size-1 rounded-full bg-[#FF0000] absolute top-5 right-5 outline-2 outline-solid outline-[#373739]'></span>
            </button>
            <AnimatePresence>
              {notifaction_open && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full right-0 mt-5 w-full min-w-114 bg-[#222225] border border-solid border-white/16 shadow-[15px_25px_150px_0_rgba(0,0,0,0.50)] rounded-2xl md:rounded-3xl">
                  <Notifactions />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link to='/dashboard/settings' className="size-12 lg:size-14 flex items-center justify-center text-white bg-[#373739] hover:bg-primary/40 rounded-full">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9.10937V14.8794C3 16.9994 3 16.9994 5 18.3494L10.5 21.5294C11.33 22.0094 12.68 22.0094 13.5 21.5294L19 18.3494C21 16.9994 21 16.9994 21 14.8894V9.10937C21 6.99937 21 6.99937 19 5.64937L13.5 2.46937C12.68 1.98937 11.33 1.98937 10.5 2.46937L5 5.64937C3 6.99937 3 6.99937 3 9.10937Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          <div className="w-px h-6 bg-white/16 rounded-full"></div>

          <div ref={profile_ref} className="relative z-1">
            <button onClick={() => setProfileOpen((prev) => !prev)} className="flex items-center justify-end gap-3">
              <div className="flex flex-col items-end gap-y-1.5 pt-1">
                <span className='text-sm font-light text-white leading-none'>Welcome</span>
                <span className='text-base font-medium text-white leading-none'>{user?.fullName || 'DR. Andrew'}</span>
              </div>
              <div className="size-12 overflow-hidden rounded-full bg-[#2F2F31]">
                <img src={avater} alt="User Profile" className="w-full h-full object-cover" />
              </div>
            </button>
            <AnimatePresence>
              {profile_open && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full right-0 mt-6 w-full min-w-48 bg-[#222225] border border-solid border-white/16 shadow-[15px_25px_150px_0_rgba(0,0,0,0.50)] rounded-lg p-4 flex flex-col gap-y-2">
                  {profile_dropdown.map((item, index) => {
                    if (item.isLink) {
                      return (
                        <Link to={item.path} key={index} className='text-left flex items-center gap-2 py-2 px-3 hover:bg-white/5 text-sm text-para hover:text-white rounded-lg'>
                          <span className='[&>svg]:size-6'>{item.icon}</span>
                          {item.name}
                        </Link>
                      )
                    } else {
                      return (
                        <button
                          onClick={item.onClick}
                          key={index}
                          className='text-left flex items-center gap-2 py-2 px-3 hover:bg-white/5 text-sm text-para hover:text-white rounded-lg w-full'
                        >
                          <span className='[&>svg]:size-6'>{item.icon}</span>
                          {item.name}
                        </button>
                      )
                    }
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  )
}
