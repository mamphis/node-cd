import { PipelineConfiguration } from "./configuration/pipelineConfiguration";

const start = async () => {
    const config = await PipelineConfiguration.findConfiguration();

    await config.run();
}

start();
