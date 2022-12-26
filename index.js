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
    const pattern = `(https?:\/\/.*github.*\.com\/${regexPreppedRepository}\/(?:blob\/)?)(.+?)(\/)`;

    return new RegExp(pattern, 'g');
}

async function validateBranch(branch) {

}

async function updateRepoUrlsInFile(file, repoUrlRegex, targetBranch) {
    const data = await fs.promises.readFile(file, 'utf-8');

    const matches = [...data.matchAll(repoUrlRegex)];
    let offset = 0;

    if (matches.length > 0) {
        matches.forEach(match => {
            // Why are JS RegExp groups so janky?
            const sourceBranch = match[2];
            const size = sourceBranch.length;
            const index = match.index + match[1].length + offset;

            data = data.substring(0, index) + targetBranch + data.substring(index + size);

            offset += targetBranch.length - size;
        });

        await fs.promises.writeFile(file, data, 'utf-8');

        return true;
    } else {
        return false;
    }

    // fs.readFile(file, 'utf8', (err, data) => {
    //     if (err) {
    //       console.error(err);
    //       return;
    //     }

    //     const matches = [...data.matchAll(repoUrlRegex)];
    //     let offset = 0;

    //     matches.forEach(match => {
    //         // Why are JS RegExp groups so janky?
    //         const sourceBranch = match[2];
    //         const size = sourceBranch.length;
    //         const index = match.index + match[1].length + offset;

    //         data = data.substring(0, index) + targetBranch + data.substring(index + size);

    //         offset += targetBranch.length - size;
    //     });

    //     fs.writeFile(file, data, 'utf-8');
    // });
}

async function walkFilesAndUpdateRepoBranches(targetBranch, files) {
    const regex = buildRepoUrlRegex(github.context.payload.repository.full_name);

    const updatedFiles = [];
    for (const file of files) {
        const updated = await updateRepoUrlsInFile(file, regex, targetBranch);

        if (updated) {
            updatedFiles.push(file);
        }
    };

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