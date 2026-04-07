import { useState, useEffect, useRef } from 'react'
import { Angle } from '../../utilities/icons';
import { AnimatePresence, motion } from 'framer-motion'

export default function Dropdown({ className = "", label, labelClass = "text-sm lg:text-base", required, items = [], placeholder, btnClass = "min-h-11 md:min-h-12", dropdownClass = "left-0 w-full", dropdownPosition = "bottom", onSelect }) {
  const [defaultItem, setDefaultItem] = useState('')

  useEffect(() => {
    setDefaultItem(typeof placeholder === 'string' ? { name: placeholder } : placeholder || { name: 'Select' })
  }, [placeholder])

  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev)
  }
  const selectItem = (item) => {
    setDefaultItem(item);
    setIsOpen(false);
    if (onSelect) {
      onSelect(item);
    }
  }
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <div ref={dropdownRef} className={`flex flex-col ${className}`}>
      {label &&
        <label htmlFor="" className={`mb-3 block text-white ${labelClass}`}>
          {label}
          {required && '*'}
        </label>
      }
      <div className="relative">
        <button onClick={toggleDropdown} className={`w-full px-3 md:px-4 flex items-center gap-1 justify-between font-medium text-sm bg-white/10 text-para rounded-2xl border border-[#CAD5E2]/20 ${btnClass}`}>
          <span className="flex items-center gap-2">
            {defaultItem.icon &&
              <span className='size-5.5 rounded-full overflow-hidden'>
                {defaultItem.code ?
                  <span className='bg-[#7281F0] size-full flex items-center justify-center text-sm text-white'>{defaultItem.icon}</span>
                  :
                  <img src={defaultItem.icon} className=' w-full h-full object-cover' alt="" />
                }
              </span>
            }
            <span className='line-clamp-1 text-left'>
              {defaultItem.name}
            </span>
          </span>
          <span className={`flex-none ${isOpen ? '-scale-y-100' : 'scale-y-100'}`}>
            <Angle className='size-5 rotate-90' />
          </span>
        </button>

        <AnimatePresence>
          {isOpen &&
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: .2, delay: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              className={`absolute ${dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-[#222225] min-w-full border border-solid border-white/16 shadow-[15px_25px_150px_0_rgba(0,0,0,0.50)] px-2 py-2 rounded-lg max-h-50 overflow-y-auto z-1 ${dropdownClass}`}>
              {items.map((item, index) => (
                <button onClick={() => selectItem(item)} className={`flex items-center w-full gap-2 py-2 px-2 rounded text-sm hover:bg-white/10 font-medium ${item.name === defaultItem.name ? 'text-white' : 'text-para'}`} key={index}>
                  {item.icon &&
                    <span className='size-5.5 rounded-full overflow-hidden'>
                      {item.code ?
                        <span className='bg-[#7281F0] size-full flex items-center justify-center text-sm text-white'>{item.icon}</span>
                        :
                        <img src={item.icon} className=' w-full h-full object-cover' alt="" />
                      }
                    </span>
                  }
                  <span className='line-clamp-1'>{item.name}</span>
                </button>
              ))}
            </motion.div>
          }
        </AnimatePresence>
      </div>
    </div>
  )
}
