import React from 'react'
import { Course } from '../../_components/CourseList'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type Props = {
  loading: boolean,
  courseDetail: Course | undefined
}



function CourseChapter({ loading, courseDetail }: Props) {
  return (
    <div>
      {courseDetail?.chapters?.length == 0 ?
        <div>
          <Skeleton className='w-full h-[100px] rounded=xl' />
          <Skeleton className='w-full h-[100px] mt-5 rounded=xl' />

        </div>
        :
        <div className='p-5 border-4 rounded-2xl'>
          {courseDetail?.chapters?.map((chapter, index) => (
            <Accordion type="single" collapsible key={index}>
              <AccordionItem value="item-1">
                <AccordionTrigger className='p-3 hover:bg-zinc-800 font-game text-4xl'>
                  <div className='flex gap-10'>
                    <h2 className='h-10 w-10 bg-zinc-700 flex items-center justify-center rounded-full'>{index + 1}</h2>
                    {chapter?.name}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className='p-7 bg-zinc-900 rounded-xl'>
                    {chapter?.excercises.map((exc, index) => (
                      <div key={index} className='flex items-center justify-between mb-7'>
                        <div className='flex items-center gap-10 font-game'>
                          <h2 className='text-3xl'>Excercise {index + 1} </h2>
                          <h2 className='text-3xl'>{exc?.name}</h2>
                        </div>
                        {/* <Button variant={'pixel'}>{exc?.xp}xp</Button> */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant={'pixelDisabled'}>???</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className='font-game text-lg'>Please Enroll first</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}
        </div>}
    </div>
  )
}

export default CourseChapter
