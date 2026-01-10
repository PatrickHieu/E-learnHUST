import React from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'


function InviteFriend() {
  return (
    <div className='mt-8 p-4 flex flex-col items-center border rounded-xl bg-zinc-900'>
      <Image src="/mail.png" alt="mail" width={80} height={80}></Image>
      <h2 className='font-game text-3xl'>Invite Friend</h2>
      <p className='font-game'>Having Fun? Share the courses with a friend! Enter an email and we will send them a personal invite.</p>
      <div className='flex gap-2 items-center mt-5'>
        <Input placeholder='Enter Invitee Email' className='min-w-sm'/>
        <Button className='font-game' size={'lg'} variant={'pixel'}>Invite</Button>
      </div>
    </div>
  )
}

export default InviteFriend
