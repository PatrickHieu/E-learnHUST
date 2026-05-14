import React from 'react'
import {
    SandpackProvider,
    SandpackLayout,
    SandpackCodeEditor,
    SandpackPreview,
    useSandpack,
} from "@codesandbox/sandpack-react";
import SplitterLayout from 'react-splitter-layout';
import 'react-splitter-layout/lib/index.css';
import { Button } from '@/components/ui/button';
import { nightOwl } from "@codesandbox/sandpack-themes";
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import type { ExerciseLessonContent } from '@/config/schema';


type LessonExercise = {
    id: number,
    title: string,
    content: ExerciseLessonContent,
};

type Props = {
    lesson: LessonExercise,
    editorType?: string | null,
    isCompleted: boolean,
    refreshData?: () => void,
}

type ValidTemplate = 'react' | 'vue' | 'svelte' | 'vanilla';

const getValidTemplate = (editorType?: string | null): ValidTemplate => {
    const validTemplates: ValidTemplate[] = ['react', 'vue', 'svelte', 'vanilla'];
    if (editorType && validTemplates.includes(editorType as ValidTemplate)) {
        return editorType as ValidTemplate;
    }
    return 'react';
}

const CodeEditorChildren = ({ onCompleteExercise, isCompleted }: { onCompleteExercise: () => void; isCompleted: boolean }) => {

    const { sandpack } = useSandpack();

    return (
        <div className='font-game absolute bottom-40 flex gap-5 right-5 z-50'>
            <Button variant={'pixel'} size={'lg'}
                className='text-xl z-5'
                onClick={() => sandpack.runSandpack()}>
                Run Code</Button>
            <Button variant={'pixel'}
                disabled={isCompleted}
                className="bg-[#a3e534] text-xl z-5" size={'lg'}
                onClick={() => onCompleteExercise()}
            >
                {isCompleted ? 'Already Completed !' : 'Mark Completed!'}</Button>
        </div>
    )
}

function CodeEditor({ lesson, editorType, isCompleted, refreshData }: Props) {

    const router = useRouter();

    const onCompleteExercise = async () => {
        try {
            await axios.post('/api/lesson/complete', { lessonId: lesson.id });
            toast.success('Lesson marked as completed!');

            if (refreshData) {
                await refreshData();
            }
            router.refresh();
        } catch (error) {
            console.error('Error marking lesson complete:', error);
            toast.error('Failed to mark lesson as completed');
        }
    }

    return (
        <div>
            <SandpackProvider template={getValidTemplate(editorType)}
                theme={nightOwl}
                style={{
                    height: '100vh'
                }}
                files={lesson.content.starterCode}
                options={{
                    autorun: false,
                    autoReload: false
                }}
            >
                <SandpackLayout style={{ height: '100%' }}>
                    <SplitterLayout
                        percentage
                        primaryMinSize={30}
                        secondaryMinSize={30}
                        secondaryInitialSize={50}
                    >
                        <div className='relative h-full '>
                            <SandpackCodeEditor
                                showTabs
                                showRunButton={false}
                                style={{ height: '100%' }} />
                            <CodeEditorChildren onCompleteExercise={onCompleteExercise} isCompleted={isCompleted} />
                        </div>
                        <SandpackPreview
                            showNavigator={true}
                            showOpenInCodeSandbox={false}
                            showOpenNewtab={true}
                            style={{ height: '100%' }} />
                    </SplitterLayout>
                </SandpackLayout>
            </SandpackProvider>
        </div>
    )
}

export default CodeEditor
