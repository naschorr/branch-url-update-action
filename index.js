const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob')

async function findCandidateFiles(whitelist, blacklist) {
    const whitelistGlobber = await glob.create(whitelist.join('\n'));
    const whitelistedFiles = await whitelistGlobber.glob();

    const blacklistGlobber = await glob.create(blacklist.join('\n'));
    const blacklistedFiles = await blacklistGlobber.glob();

    return whitelistedFiles.filter(whitelistPath => {
        return !(blacklistedFiles.some(blacklistPath => whitelistPath == blacklistPath));
    });
}

(async () => {
    try {
        const fileWhitelist = JSON.parse(core.getInput('file-whitelist') || '[]');
        const fileBlacklist = JSON.parse(core.getInput('file-blacklist') || '[]');
    
        console.log(fileWhitelist)
        console.log(fileBlacklist)

        const files = await findCandidateFiles(fileWhitelist, fileBlacklist);
    
        console.log(files)
    
        core.setOutput('updated-files', files);
    
        // Get the JSON webhook payload for the event that triggered the workflow
        const payload = JSON.stringify(github.context.payload, undefined, 2)
        console.log(`The event payload: ${payload}`);
    } catch (error) {
        core.setFailed(error.message);
    }
})();