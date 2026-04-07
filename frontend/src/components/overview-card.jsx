import React from 'react'
import { Link } from 'react-router-dom'

export default function OverviewCard({ className = '', icon, iconClass = "bg-green-500", headerClass = "mb-3", title, titleClass = '', sub, subClass = "", value, valueClass = "text-[28px]", children, childrenClass = "mt-4", href = "/dashboard/overview" }) {
    return (
        <Link to={href} className={className}>
            <div className={`flex items-center gap-2 ${headerClass}`}>
                {icon &&
                    <div className={`flex items-center justify-center rounded-full ${iconClass}`}>
                        {icon}
                    </div>
                }
                {title &&
                    <span className={`text-white font-medium ${titleClass}`}>{title}</span>
                }
            </div>
            <div className="flex items-baseline gap-1.5">
                {value &&
                    <span className={`font-medium text-white ${valueClass}`} style={{ textShadow: '1px 1px 5px rgba(255,0,0,0.16), -1px -1px 5px rgba(0,170,255,0.16)' }}>
                        {value}
                    </span>
                }
                {sub &&
                    <span className={`text-para ${subClass}`}>{sub}</span>
                }
            </div>
            <div className={childrenClass}>
                {children}
            </div>
        </Link>
    )
}
