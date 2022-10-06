import git, {} from 'simple-git';

export class Watcher {
    private interval: NodeJS.Timer;
    private sleep: number;

    constructor(interval: number) {
        this.sleep = interval;
        this.interval = setTimeout(this.watch.bind(this), interval);
    }

    private async watch() {
        const repo = git();
        
        if (!await repo.checkIsRepo()) {
            console.warn('Current directory is not a git repository.');
            this.interval = setTimeout(this.watch.bind(this), this.sleep);
            return;
        }

        const remotes = await repo.getRemotes(true);
        if (remotes.length === 0) {
            console.warn('No remotes for the current git repository defined.');
            this.interval = setTimeout(this.watch.bind(this), this.sleep);
            return;
        }

        const firstRemote = remotes.find(_ => true);
        const stat = await repo.status();
        
    }
}