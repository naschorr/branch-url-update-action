const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob');
const fs = require('fs');

async function findCandidateFiles(whitelist, blacklist) {
    const whitelistGlobber = await glob.create(whitelist.join('\n'));
    const whitelistedFiles = await whitelistGlobber.glob();

    const blacklistGlobber = await glob.create(blacklist.join('\n'));
    const blacklistedFiles = await blacklistGlobber.glob();

    return whitelistedFiles.filter(whitelistPath => {
        return !(blacklistedFiles.some(blacklistPath => whitelistPath == blacklistPath));
    });
}

/**
 * Builds a RegExp to handle finding repository URLs
 * @param {string} repository The owner/repository name string (ex: torvalds/linux)
 * @returns RegExp for finding repo URLs
 */
function buildRepoUrlRegex(repository) {
    const regexPreppedRepository = repository.replace('/', '\/');
    const pattern = `https?:\/\/.*github.*\.com\/${regexPreppedRepository}\/(?:blob\/)?(.+?)\/`;

    return new RegExp(pattern, 'g');
}

async function validateBranch(branch) {

}

function updateRepoUrlsInFile(file, repoUrlRegex, targetBranch) {
    fs.readFile(file, 'utf8', (err, data) => {
        console.log(`Reading ${data}`);

        if (err) {
          console.error(err);
          return;
        }

        const matches = [...data.matchAll(repoUrlRegex)];
        let offset = 0;

        matches.forEach(match => {
            const sourceBranch = match[1];  // first (and only) match group
            const index = match.index + offset;
            const size = len(sourceBranch);

            data = data.substring(0, index) + targetBranch + data.substring(index + size);

            offset += len(targetBranch) - size;
        });

        console.log(`Writing ${data}`);
    });
}

async function walkFilesAndUpdateRepoBranches(targetBranch, files) {
    const regex = buildRepoUrlRegex(github.context.payload.repository.full_name);

    const updatedFiles = [];
    files.forEach(file => {
        const updated = updateRepoUrlsInFile(file, regex, targetBranch);

        if (updated) {
            updatedFiles.push(file);
        }
    });

    return updatedFiles;
}

(async () => {
    try {
        // Get the JSON webhook payload for the event that triggered the workflow
        const payload = github.context.payload;
        console.log(`The event payload: ${JSON.stringify(payload, undefined, 2)}`);

        const fileWhitelist = JSON.parse(core.getInput('file-whitelist') || '[]');
        const fileBlacklist = JSON.parse(core.getInput('file-blacklist') || '[]');
    
        console.log(`Whitelist: ${fileWhitelist}`);
        console.log(`Blacklist: ${fileBlacklist}`);

        const branch = core.getInput('target-branch');
        const files = await findCandidateFiles(fileWhitelist, fileBlacklist);
    
        console.log(`Branch: ${branch}`)
        console.log(`Evaluated files: ${files}`);
    
        const updatedFiles = await walkFilesAndUpdateRepoBranches(branch, files);

        core.setOutput('updated-files', updatedFiles);
    } catch (error) {
        core.setFailed(error.message);
    }
})();