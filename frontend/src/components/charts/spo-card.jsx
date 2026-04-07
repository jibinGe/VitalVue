import React from 'react'
import OverviewCard from "@/components/overview-card";
import { Spo } from '@/utilities/icons';


export default function SpoCard({ className, title, iconClass = "", titleClass = "", valueClass, subClass, href, }) {
    return (
        <OverviewCard
            href={href}
            className={className}
            data-attr={href}
            icon={<Spo />}
            iconClass={`${iconClass ? iconClass : 'size-9 bg-purple'}`}
            title={title}
            titleClass={`${titleClass ? titleClass : 'text-xs'}`}
            value={'--'}
            valueClass={valueClass ? valueClass : 'text-[28px]'}
            subClass={subClass ? subClass : 'text-xs'}
            children={
                'upcoming'
            }
        />
    )
}