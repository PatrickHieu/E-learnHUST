"use client"
import React, { useContext } from 'react'
import Image from 'next/image'
import { useUser } from '@clerk/nextjs'
import { UserDetailContext } from '@/context/UserDetailContext';

function UserStatus() {

    const { user } = useUser();
    const { userDetail } = useContext(UserDetailContext);

    return (
        <div className='p-7 border-4 rounded-2xl'>
            <div className='flex items-center gap-3'>
                <Image src={'/walking.gif'} alt="walking-user" width={100} height={100} />
                <h2 className='font-game text-2xl break-all'>{user?.primaryEmailAddress?.emailAddress}</h2>
            </div>
            <div className='flex gap-3 items-center mt-3'>
                <Image src={'/star.png'} alt="star" width={35} height={35} />
                <div>
                    <h2 className='font-game text-3xl'>{userDetail?.points ?? 0}</h2>
                    <h2 className='font-game text-gray-500 text-xl'>Total Rewards</h2>
                </div>
            </div>
        </div>
    )
}

export default UserStatus
