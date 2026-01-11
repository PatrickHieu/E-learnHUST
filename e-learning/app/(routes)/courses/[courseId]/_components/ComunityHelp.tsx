import React from 'react'
import { Button } from '@/components/ui/button'

function ComunityHelp() {
  return (
    <div className='font-game p-4 border-4 rounded-2xl mt-7 flex items-center flex-col'>
          <h2 className='text-3xl '>Need Help?</h2>
          <p className='text-2xl'>Ask question in our community?</p>
          <Button className='text-2xl mt-3' variant={'pixel'} size={'lg'}>Go To Community</Button>
    </div>
  )
}

export default ComunityHelp
