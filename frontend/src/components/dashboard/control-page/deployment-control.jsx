import { Shield, Upload } from 'lucide-react'
import React from 'react'
import Alert from '../../ui/alert'

export default function DeploymentControl() {
    const items = [
        {
            title: 'Enable / Disable Regions',
            list: [
                {
                    title: 'North America',
                    title_info: null,
                    des: 'Account Manager: Sarah Chen',
                    status: {
                        name: 'Enabled',
                        variant: 'success'
                    },
                },
                {
                    title: 'Europe',
                    title_info: null,
                    des: 'Account Manager: Marcus Weber',
                    status: {
                        name: 'Enabled',
                        variant: 'success'
                    },
                },
                {
                    title: 'Asia Pacific',
                    title_info: null,
                    des: 'Account Manager: Yuki Tanaka',
                    status: {
                        name: 'Enabled',
                        variant: 'success'
                    },
                },
                {
                    title: 'Middle East',
                    title_info: null,
                    des: 'Account Manager: Marcus Weber',
                    status: {
                        name: 'Disabled',
                    },
                },
            ]
        },
        {
            title: 'Assign Account Managers',
            list: [
                {
                    title: 'North America',
                    title_info: null,
                    des: 'Account Manager: Sarah Chen',
                    status: {
                        name: 'Enabled',
                        variant: 'success'
                    },
                },
                {
                    title: 'Europe',
                    title_info: null,
                    des: 'Account Manager: Marcus Weber',
                    status: {
                        name: 'Enabled',
                        variant: 'success'
                    },
                },
                {
                    title: 'Asia Pacific',
                    title_info: null,
                    des: 'Account Manager: Yuki Tanaka',
                    status: {
                        name: 'Enabled',
                        variant: 'success'
                    },
                },
                {
                    title: 'Middle East',
                    title_info: null,
                    des: 'Account Manager: Marcus Weber',
                    status: {
                        name: 'Disabled',
                    },
                },
            ]
        },
        {
            title: 'Hospital Onboarding',
            upload: true,
            list: [
                {
                    title: `St. Mary's Hospital (UK)`,
                    title_info: null,
                    des: 'North America • 450 beds',
                    status: {
                        name: 'Live',
                        variant: 'success'
                    },
                },

                {
                    title: 'Europe',
                    title_info: null,
                    des: 'Account Manager: Marcus Weber',
                    status: {
                        name: 'Approve',
                        variant: 'success'
                    },
                },
                {
                    title: 'Asia Pacific',
                    title_info: null,
                    des: 'Account Manager: Yuki Tanaka',
                    status: {
                        name: 'Validation Failed',
                        variant: 'danger'
                    },
                },
                {
                    title: 'Middle East',
                    title_info: null,
                    des: 'Account Manager: Marcus Weber',
                    status: {
                        name: 'Request Info',
                    },
                },
            ]
        },
        {
            title: 'Feature Flags (Global)',
            list: [
                {
                    title: 'Advanced Analytics Dashboard',
                    title_info: {
                        name: 'global',
                        variant: 'global',
                    },
                    des: null,
                    status: {
                        name: 'Enabled',
                        variant: 'success'
                    },
                },
                {
                    title: 'Real-time Alert Notifications',
                    title_info: {
                        name: 'global',
                        variant: 'global',
                    },
                    des: null,
                    status: {
                        name: 'Enabled',
                        variant: 'success'
                    },
                },
                {
                    title: 'Multi-language Support',
                    title_info: {
                        name: 'Regional: Europe',
                        variant: 'pink',
                    },
                    des: null,
                    status: {
                        name: 'Enabled',
                        variant: 'success'
                    },
                },
                {
                    title: 'Beta Features Access',
                    title_info: {
                        name: 'global',
                        variant: 'global',
                    },
                    des: null,
                    status: {
                        name: 'Disabled',
                    },
                },
            ]
        },
    ]
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
            {items.map((card, index) => (
                <div className="bg-[#2F2F31] rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col gap-y-4 md:gap-y-5 lg:gap-y-6" key={index}>
                    <div className="mb-0">
                        <h4 className='text-lg font-normal flex items-center gap-1.5'>
                            {!card.upload &&
                                <Shield className='size-5 -mt-0.5' />
                            }
                            {card.title}
                            {card.upload &&
                                <button className='size-10 flex items-center justify-center rounded-full bg-[#E5E7EB]/5 hover:bg-primary/15 ml-auto'><Upload className='size-5' /></button>
                            }
                        </h4>
                        <div className="h-px w-full mt-4 md:mt-5 lg:mt-6 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0)_100%)]" />
                    </div>
                    <div className="flex flex-col gap-y-0">
                        {card.list.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 md:p-4 relative min-h-15 md:min-h-18">
                                <div className="h-px w-full absolute top-full left-0 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0)_100%)]" />
                                <div className="flex flex-col gap-y-1">
                                    <strong className='flex items-center gap-1.5 text-sm font-medium text-white'>
                                        {item.title}
                                        {item.title_info &&
                                            <Alert text={item.title_info.name} variant={item.title_info.variant} />
                                        }
                                    </strong>
                                    <span className='text-xs text-para'>{item.des}</span>
                                </div>
                                <Alert text={item.status.name} variant={item.status.variant} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
