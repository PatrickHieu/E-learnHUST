"use client"
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Always-on Pro upgrade prompt. Used to read Clerk's billing plan via
// useAuth().has({ plan: 'pro' }); after the Auth.js migration we
// don't have a managed billing flag yet, so this just always shows
// until a subscription system replaces it.
function Upgrade() {
  return (
    <div className='flex items-center flex-col p-5 border-4 rounded-2xl mt-8'>
      <Image src={'/upgrade.png'} alt="upgrade-banner" width={100} height={100} />
      <h2 className='text-3xl font-game'>Update to Pro</h2>
      <p className='font-game text-gray-500 text-xl'>Join Pro Membership and Get All course access</p>
      <Link href="/pricing">
        <Button className='font-game text-2xl' variant={'pixel'} size={'lg'}>Upgrade</Button>
      </Link>
    </div>
  )
}

export default Upgrade
