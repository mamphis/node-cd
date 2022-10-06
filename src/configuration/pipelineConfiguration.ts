import { readFile, stat } from "fs/promises";
import { join } from "path";
import { parse } from 'yaml';
import { runBuildScriptStep, runTestStep, runTypeScriptBuildStep } from "./steps/executor";
import { ConfigurationStep, Steps } from "./steps/step";

export class PipelineConfiguration {
    public static readonly CONFIG_FILENAME = 'nodecd.yaml';

    constructor(private readonly configurationStep: ConfigurationStep) {

    }

    public static async findConfiguration(): Promise<PipelineConfiguration> {
        const paths = ['.', './github', './.vscode', './config'];

        for (const path of paths) {
            const filePath = join(path, this.CONFIG_FILENAME);

            const result = await stat(filePath).then(() => true).catch(() => false);
            if (result) {
                return this.readConfiguration(filePath);
            }
        }

        throw new Error('Configuration was not found.');
    }

    private static async readConfiguration(filePath: string): Promise<PipelineConfiguration> {
        const data = (await readFile(filePath)).toString();
        const config = parse(data);

        const { root, steps } = config as { root: string, steps: Array<Steps> };
        if (!root) {
            throw new Error('No root step was configured.');
        }


        const rootStep = steps.find(step => step.name === root);
        if (!rootStep) {
            throw new Error(`Root step "${root}" was not found in your configuration.`);
        }

        let currentStep = 1;
        const rootConfigurationStep = Object.assign({ step: currentStep++, successor: {} }, rootStep);

        const buildTree = (step: ConfigurationStep | undefined) => {
            if (!step) { return };

            if (step.success && step.success.toLowerCase() !== 'end') {
                const nextStep = steps.find(s => s.name === step.success);
                if (!nextStep) {
                    throw new Error(`Error in configuration. Tried to find success step "${step.success}" of step "${step.name}"`);
                }

                const nextConfigurationStep = Object.assign({ step: currentStep++, successor: {} }, nextStep);
                step.successor.success = nextConfigurationStep;

                buildTree(nextConfigurationStep);
            } else {
                step.successor.failure = {
                    type: 'End',
                    step: -1,
                    result: true,
                    successor: {},
                    name: 'Default End',
                }
            }

            if (step.failure && step.failure.toLowerCase() !== 'end') {
                const stepName = step.failure === 'continue' ? step.success : step.failure;
                const nextStep = steps.find(s => s.name === stepName);
                if (!nextStep) {
                    throw new Error(`Error in configuration. Tried to find failure step "${step.failure} (exact name: ${stepName})" of step "${step.name}"`);
                }

                const nextConfigurationStep = Object.assign({ step: currentStep++, successor: {} }, nextStep);
                step.successor.failure = nextConfigurationStep;

                buildTree(nextConfigurationStep);
            } else {
                step.successor.failure = {
                    type: 'End',
                    step: -1,
                    result: false,
                    successor: {},
                    name: 'Default End',
                }
            }
        }

        buildTree(rootConfigurationStep);

        return new PipelineConfiguration(rootConfigurationStep);
    }

    async run() {
        return this.runStep(this.configurationStep).catch(error => {
            console.error(error.message);
        });
    }

    private async runStep(step: ConfigurationStep | undefined) {
        if (!step) {
            return;
        }

        if (step.type !== 'End') {
            console.log(`Executing Step #${step.step}: ${step.name} (${step.type}).`);
        }

        let nextStep;
        switch (step.type) {
            case 'BuildScript':
                nextStep = await runBuildScriptStep(step);
                break;
            case 'Test':
                nextStep = await runTestStep(step);
                break;
            case 'TypeScriptBuild':
                nextStep = await runTypeScriptBuildStep(step);
                break;
            case 'End':
                console.log(`Pipeline has finished running. Result: ` + step.result);
                if (!step.result) {
                    process.exit(1);
                } else {
                    process.exit(0);
                }
                break;
            default:
                console.warn(`Unknow task type: ${(step as ConfigurationStep).type}`);
                nextStep = (step as ConfigurationStep).successor.failure;
                break;
        }


        this.runStep(nextStep);
    }
}