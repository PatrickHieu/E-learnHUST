import React from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

function Upgrade() {
  return (
    <div className='flex items-center flex-col p-5 border-4 rounded-2xl mt-8'>
          <Image src={'/upgrade.png'} alt="upgrade-banner" width={100} height={100} />
          <h2 className='text-3xl font-game'>Update to Pro</h2>
          <p className='font-game text-gray-500 text-xl'>Join Pro Membership and Get All course access</p>
          <Button className='font-game' variant={'pixel'} size={'lg'}>Upgrade</Button>
    </div>
  )
}

export default Upgrade
