type Step = {
    name: string;
    type: string;
    success?: 'end' | string;
    failure?: 'end' | 'continue' | string;
}

export type BuildScriptStep = Step & {
    type: 'BuildScript';
    scriptName?: string;
}

export type TypeScriptBuildStep = Step & {
    type: 'TypeScriptBuild';
    config?: string;
}

type TestStep = Step & {
    type: 'Test';
}

export type TestScriptStep = TestStep & {
    scriptName?: string;
}

export type TestCommandStep = TestStep & {
    command: string;
}

export type EndStep = Step & {
    type: 'End';
    result: boolean;
}

export type Steps = EndStep | BuildScriptStep | TypeScriptBuildStep | TestScriptStep | TestCommandStep;

export type ConfigurationStep = Steps & {
    successor: {
        success?: ConfigurationStep;
        failure?: ConfigurationStep;
    };
    step: number;
}