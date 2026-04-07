import React from 'react'

export default function Col({ children, className = "", xs, md, lg, xl, xxl, xxxl, ...props }) {
    let sm = "";

    if (xs === 1) {
        sm = 'w-1/12'
    } else if (xs === 2) {
        sm = 'w-2/12'
    } else if (xs === 3) {
        sm = 'w-3/12'
    } else if (xs === 4) {
        sm = 'w-4/12'
    } else if (xs === 5) {
        sm = 'w-5/12'
    } else if (xs === 6) {
        sm = 'w-6/12'
    } else if (xs === 7) {
        sm = 'w-7/12'
    } else if (xs === 8) {
        sm = 'w-8/12'
    } else if (xs === 9) {
        sm = 'w-9/12'
    } else if (xs === 10) {
        sm = 'w-10/12'
    } else if (xs === 11) {
        sm = 'w-11/12'
    } else if (xs === 12) {
        sm = 'w-full'
    }

    let medium = ''
    if (md === 1) {
        medium = 'md:w-1/12'
    } else if (md === 2) {
        medium = 'md:w-2/12'
    } else if (md === 3) {
        medium = 'md:w-3/12'
    } else if (md === 4) {
        medium = 'md:w-4/12'
    } else if (md === 5) {
        medium = 'md:w-5/12'
    } else if (md === 6) {
        medium = 'md:w-6/12'
    } else if (md === 7) {
        medium = 'md:w-7/12'
    } else if (md === 8) {
        medium = 'md:w-8/12'
    } else if (md === 9) {
        medium = 'md:w-9/12'
    } else if (md === 10) {
        medium = 'md:w-10/12'
    } else if (md === 11) {
        medium = 'md:w-11/12'
    } else if (md === 12) {
        medium = 'md:w-full'
    }

    let large = ''
    if (lg === 1) {
        large = 'lg:w-1/12'
    } else if (lg === 2) {
        large = 'lg:w-2/12'
    } else if (lg === 3) {
        large = 'lg:w-3/12'
    } else if (lg === 4) {
        large = 'lg:w-4/12'
    } else if (lg === 5) {
        large = 'lg:w-5/12'
    } else if (lg === 6) {
        large = 'lg:w-6/12'
    } else if (lg === 7) {
        large = 'lg:w-7/12'
    } else if (lg === 8) {
        large = 'lg:w-8/12'
    } else if (lg === 9) {
        large = 'lg:w-9/12'
    } else if (lg === 10) {
        large = 'lg:w-10/12'
    } else if (lg === 11) {
        large = 'lg:w-11/12'
    } else if (lg === 12) {
        large = 'lg:w-full'
    }


    let xLarge = ''
    if (xl === 1) {
        xLarge = 'xl:w-1/12'
    } else if (xl === 2) {
        xLarge = 'xl:w-2/12'
    } else if (xl === 3) {
        xLarge = 'xl:w-3/12'
    } else if (xl === 4) {
        xLarge = 'xl:w-4/12'
    } else if (xl === 5) {
        xLarge = 'xl:w-5/12'
    } else if (xl === 6) {
        xLarge = 'xl:w-6/12'
    } else if (xl === 7) {
        xLarge = 'xl:w-7/12'
    } else if (xl === 8) {
        xLarge = 'xl:w-8/12'
    } else if (xl === 9) {
        xLarge = 'xl:w-9/12'
    } else if (xl === 10) {
        xLarge = 'xl:w-10/12'
    } else if (xl === 11) {
        xLarge = 'xl:w-11/12'
    } else if (xl === 12) {
        xLarge = 'xl:w-full'
    }



    let xxLarge = ''
    if (xxl === 1) {
        xxLarge = '2xl:w-1/12'
    } else if (xxl === 2) {
        xxLarge = '2xl:w-2/12'
    } else if (xxl === 3) {
        xxLarge = '2xl:w-3/12'
    } else if (xxl === 4) {
        xxLarge = '2xl:w-4/12'
    } else if (xxl === 5) {
        xxLarge = '2xl:w-5/12'
    } else if (xxl === 6) {
        xxLarge = '2xl:w-6/12'
    } else if (xxl === 7) {
        xxLarge = '2xl:w-7/12'
    } else if (xxl === 8) {
        xxLarge = '2xl:w-8/12'
    } else if (xxl === 9) {
        xxLarge = '2xl:w-9/12'
    } else if (xxl === 10) {
        xxLarge = '2xl:w-10/12'
    } else if (xxl === 11) {
        xxLarge = '2xl:w-11/12'
    } else if (xxl === 12) {
        xxLarge = '2xl:w-full'
    }

    let xxxLarge = ''
    if (xxxl === 1) {
        xxxLarge = '3xl:w-1/12'
    } else if (xxxl === 2) {
        xxxLarge = '3xl:w-2/12'
    } else if (xxxl === 3) {
        xxxLarge = '3xl:w-3/12'
    } else if (xxxl === 4) {
        xxxLarge = '3xl:w-4/12'
    } else if (xxxl === 5) {
        xxxLarge = '3xl:w-5/12'
    } else if (xxxl === 6) {
        xxxLarge = '3xl:w-6/12'
    } else if (xxxl === 7) {
        xxxLarge = '3xl:w-7/12'
    } else if (xxxl === 8) {
        xxxLarge = '3xl:w-8/12'
    } else if (xxxl === 9) {
        xxxLarge = '3xl:w-9/12'
    } else if (xxxl === 10) {
        xxxLarge = '3xl:w-10/12'
    } else if (xxxl === 11) {
        xxxLarge = '3xl:w-11/12'
    } else if (xxxl === 12) {
        xxxLarge = '3xl:w-full'
    }
    return (
        <div className={`px-4 ${sm} ${medium} ${large} ${xLarge} ${xxLarge} ${xxxLarge} ${className}`} {...props}>
            {children}
        </div>
    );
}
