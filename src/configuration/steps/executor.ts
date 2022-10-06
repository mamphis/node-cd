import { exec } from "child_process";
import { resolve } from "path";
import { promisify } from "util";
import { BuildScriptStep, ConfigurationStep, TestCommandStep, TestScriptStep, TypeScriptBuildStep } from "./step";


type runStep<T> = (step: T & ConfigurationStep) => Promise<ConfigurationStep | undefined>;

const getPackageJsonCommand = async (scriptName: string) => {
    const packageName = resolve('./package.json')
    const packageJson = require(packageName);
    const command = packageJson.scripts[scriptName];

    if (!command) {
        throw new Error(`Script "${scriptName}" does not exist in current package.json`);
    }

    return command;
}

const runCommand = async (command: string) => {
    const { stderr, stdout } = await promisify(exec)(command);
    if (stderr) {
        throw new Error(`Error while executing step: ${stderr}`);
    }

    console.log(stdout);
}

export const runBuildScriptStep: runStep<BuildScriptStep> = async (buildScriptStep) => {
    const scriptName = buildScriptStep.scriptName ?? 'build';
    const command = await getPackageJsonCommand(scriptName).then(cmd => cmd).catch(error => {
        console.warn(`Error while reading package.json in ${buildScriptStep.name}: ${error.message}`);
    });

    if (!command) {
        return buildScriptStep.successor.failure;
    }

    return await runCommand(command).then(_ => buildScriptStep.successor.success).catch(error => {
        console.warn(`Error while executing ${buildScriptStep.name}: ${error.message}`);
        return buildScriptStep.successor.failure;
    });
}

export const runTestStep: runStep<TestCommandStep | TestScriptStep> = async (testStep) => {
    let command = '';
    if ('command' in testStep) {
        command = testStep.command;
    } else {
        command = await getPackageJsonCommand(testStep.scriptName ?? 'test').then(cmd => cmd).catch(error => {
            console.warn(`Error while reading package.json in ${testStep.name}: ${error.message}`);
        });
    }

    if (!command) {
        return testStep.successor.failure;
    }

    return await runCommand(command).then(_ => testStep.successor.success).catch(error => {
        console.warn(`Error while executing ${testStep.name}: ${error.message}`);
        return testStep.successor.failure;
    });
}

export const runTypeScriptBuildStep: runStep<TypeScriptBuildStep> = async (typeScriptBuildStep) => {
    const tsconfig = typeScriptBuildStep.config ?? './tsconfig.json';

    return await runCommand(`tsc -p ${tsconfig}`).then(_ => typeScriptBuildStep.successor.success).catch(error => {
        console.warn(`Error while executing ${typeScriptBuildStep.name}: ${error.message}`);
        return typeScriptBuildStep.successor.failure;
    });
}