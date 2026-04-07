import React from 'react'

export default function MainBody({ className = "", children }) {
    return (
        <div className={`p-4 md:p-5 lg:p-6 ${className}`}>{children}</div>
    )
}
