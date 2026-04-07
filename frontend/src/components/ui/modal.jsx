import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Close2 } from '../../utilities/icons'

export default function modal({ children, innerClass = "max-w-125", onClick, modalCondition = false, title, titleClass, des }) {
    return (
        <AnimatePresence mode="wait">
            {modalCondition &&
                <div className='fixed w-full h-screen overflow-y-auto left-0 top-0 z-50 flex justify-center p-4 md:p-6 bg-black/75'>
                    {onClick &&
                        <button onClick={onClick} className='size-full fixed inset-0 z-1' />
                    }
                    <motion.div
                        initial={{ scale: .95, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.1, opacity: 0 }}
                        transition={{ duration: .3, delay: 0.2 }}
                        viewport={{ once: true, amount: 0.2 }}
                        className={`overflow-hidden relative z-2 m-auto w-full bg-[#1A1A1A] rounded-[24px] md:rounded-[32px] shadow-[0px_0px_50px_0px_rgba(0,0,0,0.5)] border border-[#ffffff1a] ${innerClass}`}>
                        {title &&
                            <>
                                <div className="flex items-center flex-wrap justify-between gap-1 py-5 px-6">
                                    <div className="flex flex-col">
                                        {title &&
                                            <h4 className={`text-xl md:text-2xl mb-1 ${titleClass}`}>{title}</h4>
                                        }
                                        {des &&
                                            <p className='text-sm text-[#A0A0A0]'>{des}</p>
                                        }
                                    </div>
                                    {onClick &&
                                        <button onClick={onClick} className='flex items-center justify-center'>
                                            <Close2 className='size-6' />
                                        </button>
                                    }
                                </div>
                                <div className="h-px w-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0)_100%)]" />
                            </>
                        }
                        <div className="p-4 md:p-5 lg:p-6">
                            {children}
                        </div>
                    </motion.div>
                </div>
            }
        </AnimatePresence >
    )
}
