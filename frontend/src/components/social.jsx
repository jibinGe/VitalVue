import React from 'react'
import { FaDiscord, FaTelegramPlane } from "react-icons/fa";
import { FaXTwitter } from 'react-icons/fa6';
import { twitter, telegram, discord } from './PageLinks';


export default function Social({ className }) {
  const socialIcons = [
    {
      name: 'discord',
      icon: <FaDiscord />,
      url: discord
    },
    {
      name: 'twitter',
      icon: <FaXTwitter />,
      url: twitter
    },
    {
      name: 'telegram',
      icon: <FaTelegramPlane />,
      url: telegram
    },
  ];
  return (
    <div className={`flex items-center flex-wrap gap-3 ${className}`}>
      {socialIcons.map((item, index) => (
        <a key={index} href={item.url} target="_blank" className="social-link flex items-center justify-center">
          {item.icon}
        </a>
      ))}
    </div>
  )
}