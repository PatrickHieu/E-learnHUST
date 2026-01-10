"use client"
import React from 'react'
import Image from 'next/image'
import { useUser } from '@clerk/nextjs'

function UserStatus() {

    const { user } = useUser();

    return (
        <div className='p-7 border-4 rounded-2xl'>
            <div className='flex items-center gap-3'>
                <Image src={'/walking.gif'} alt="walking-user" width={100} height={100} />
                <h2 className='font-game text-2xl'>{user?.primaryEmailAddress?.emailAddress}</h2>
            </div>
            <div className='grid grid-cols-2 gap-5'>
                <div className='flex gap-3 items-center'>
                    <Image src={'/star.png'} alt="star" width={35} height={35} />
                    <div>
                        <h2 className='font-game text-3xl'>20</h2>
                        <h2 className='font-game text-gray-500 text-xl'>Total Rewards</h2>
                    </div>
                </div>
                <div className='flex gap-3 items-center'>
                    <Image src={'/badge.png'} alt="star" width={35} height={35} />
                    <div>
                        <h2 className='font-game text-3xl'>3</h2>
                        <h2 className='font-game text-gray-500 text-xl'>Badge</h2>
                    </div>
                </div>
                <div className='flex gap-3 items-center'>
                    <Image src={'/fire.png'} alt="star" width={35} height={35} />
                    <div>
                        <h2 className='font-game text-3xl'>7</h2>
                        <h2 className='font-game text-gray-500 text-xl'>Daily Streak</h2>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default UserStatus
