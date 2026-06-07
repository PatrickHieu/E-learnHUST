import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { formatVnd } from '@/lib/course-access'

// Static pricing page that replaces Clerk's hosted PricingTable.
// Two tiers — free + pro. Pro tier links to /sign-up for now; a
// real subscription flow can hook in later via the paywall infra.
const TIERS: Array<{
  name: string;
  priceLabel: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
}> = [
  {
    name: "Free",
    priceLabel: "0₫",
    features: [
      "Access every beginner course",
      "Earn stars for every lesson completed",
      "Unlock intermediate courses with stars",
      "Build your portfolio of certificates",
    ],
    cta: "Start learning",
    href: "/sign-up",
  },
  {
    name: "Pro",
    priceLabel: `${formatVnd(199_000)} / month`,
    features: [
      "Everything in Free",
      "All advanced (paid) courses included",
      "Priority support",
      "Early access to new courses",
    ],
    cta: "Coming soon",
    href: "/sign-up",
    highlight: true,
  },
];

function Pricing() {
  return (
    <div className='mt-28 flex flex-col items-center justify-center w-full px-10 md:px-20 lg:px-40'>
      <h2 className='text-4xl text-center font-game'>Pricing</h2>
      <p className='text-xl text-center font-game text-zinc-400 mt-2'>
        Join for unlimited access to all features.
      </p>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 max-w-3xl w-full'>
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`p-6 border-4 rounded-2xl flex flex-col gap-4 ${
              tier.highlight ? 'border-yellow-400 bg-yellow-400/5' : 'border-zinc-700'
            }`}
          >
            <h3 className='font-game text-3xl'>{tier.name}</h3>
            <p className='font-game text-2xl text-yellow-300'>{tier.priceLabel}</p>
            <ul className='flex flex-col gap-2 font-game text-lg text-zinc-300 flex-1'>
              {tier.features.map((f) => (
                <li key={f} className='flex items-start gap-2'>
                  <Check className='w-5 h-5 text-green-400 shrink-0 mt-0.5' />
                  {f}
                </li>
              ))}
            </ul>
            <Link href={tier.href}>
              <Button variant={'pixel'} size='lg' className='font-game text-xl w-full'>
                {tier.cta}
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Pricing
