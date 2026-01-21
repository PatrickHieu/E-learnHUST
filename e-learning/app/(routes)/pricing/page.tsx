import React from 'react'
import { PricingTable } from '@clerk/nextjs'

function Pricing() {
    return (
        <div className='mt-28 flex flex-col items-center justify-center w-full px-80'>
            <h2 className='text-4xl text-center font-game'>Pricing</h2>
            <h2 className='text-xl text-center font-game'>Join For unlimited access to all features</h2>
            <PricingTable />
        </div>
    )
}

export default Pricing
