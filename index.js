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

function buildRepoUrlRegex() {
    // https://raw.githubusercontent.com/naschorr/hawking/master/resources/hawking-avatar.png
    // https://github.com/naschorr/hawking/blob/master/resources/hawking-avatar.png

    const pattern = `https?:\/\/.*github.*\.com\/${repository}\/(?:blob\/)?(\S+?)\/`;
}

// async function findRepoUrls(url) {

// }

(async () => {
    try {
        console.log(github)
        console.log(core)

        // Get the JSON webhook payload for the event that triggered the workflow
        const payload = github.context.payload;
        console.log(`The event payload: ${JSON.stringify(payload, undefined, 2)}`);

        const fileWhitelist = JSON.parse(core.getInput('file-whitelist') || '[]');
        const fileBlacklist = JSON.parse(core.getInput('file-blacklist') || '[]');
    
        console.log(`Whitelist: ${fileWhitelist}`);
        console.log(`Blacklist: ${fileBlacklist}`);

        const files = await findCandidateFiles(fileWhitelist, fileBlacklist);
    
        console.log(`Evaluated files: ${files}`);
    


        core.setOutput('updated-files', files);
    } catch (error) {
        core.setFailed(error.message);
    }
})();