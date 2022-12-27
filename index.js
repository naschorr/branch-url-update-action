const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob');
const fs = require('fs');
const octokit = require('@octokit/action');
const octokitAuth = require('@octokit/auth-action');

// const auth = createActionAuth();
// const authentication = await auth();
const OCTOKIT = new octokit.Octokit();
const OWNER = 'naschorr';
const REPOSITORY = 'current-branch-text-updater-action';

/**
 * Process the provided whitelist and blacklist to find files to be updated. The blacklist will override the whitelist.
 * @param {string[]} whitelist List of glob strings of files and/or file extensions to check
 * @param {string[]} blacklist List of glob strings to files and/or file extensions to ignore
 * @returns {string[]} List of files that can be updated
 */
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

    // Global regex to get all matches at once
    return new RegExp(pattern, 'g');
}

async function validateBranch(branchName) {
    const branches = await OCTOKIT.request('GET /repos/{owner}/{repo}/branches{?protected,per_page,page}', {
        owner: OWNER,
        repo: REPOSITORY
    });

    console.log(`Branches: ${branches}`);

    return true;
}

/**
 * Process a given file to update any potential repository URLs to use the provided target branch name.
 * @param {string} file Path to the file to check 
 * @param {RegExp} repoUrlRegex Regex to match repository URLs 
 * @param {string} targetBranch Name of the branch to replace the others with
 * @returns {boolean} True if the file was updated (at least once), false if not
 */
async function updateRepoUrlsInFile(file, repoUrlRegex, targetBranch) {
    // Read the file's contents
    let data = await fs.promises.readFile(file, 'utf-8');

    // Perform the regex
    const matches = [...data.matchAll(repoUrlRegex)];

    let updates = 0;
    let offset = 0;
    for (const match of matches) {
        // Why are JS RegExp groups so janky?
        const sourceBranch = match[2];
        const size = sourceBranch.length;
        const index = match.index + match[1].length + offset;

        // Was the old match a valid branch? Some false positives will crop up (ex: wikis)
        if (!(await validateBranch(sourceBranch))) {
            continue;
        }

        // Perform the branch name substitution
        data = data.substring(0, index) + targetBranch + data.substring(index + size);
        updates += 1;

        /*
            Keep track of the new offset after the substitution has happened, otherwise branch names won't be
            inserted into the correct spot.
        */
        offset += targetBranch.length - size;
    };

    // Save our changes
    if (updates > 0) {
        console.log(`Updated ${file} ${updates} times.`)
        await fs.promises.writeFile(file, data, 'utf-8');
    }

    // Return status of updates
    return updates > 0;
}

/**
 * Walk the provided list of files, and attempt to update repository URLs to use the provided branch
 * @param {string} targetBranch Name of the branch to replace the others with
 * @param {string[]} files The list of files to look through 
 * @returns {string[]} List of paths to files that've been updated
 */
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

        // Load the variables and perform validation if needed
        const fileWhitelist = JSON.parse(core.getInput('file-whitelist') || '[]');
        const fileBlacklist = JSON.parse(core.getInput('file-blacklist') || '[]');
        // const githubToken = core.getInput('github-token');

        const branch = core.getInput('target-branch');
        if (!(await validateBranch(branch))) {
            console.log(`Target branch "${branch}" isn't a valid branch.`);
            return;
        }

        console.log(`Whitelist: ${fileWhitelist}`);
        console.log(`Blacklist: ${fileBlacklist}`);
        console.log(`Target branch: ${branch}`);
        // console.log(`GITHUB_TOKEN: ${githubToken}`);

        // Find potential candidate files for updating
        const files = await findCandidateFiles(fileWhitelist, fileBlacklist);
        console.log(`Evaluated files: ${files}`);
    
        // Perform the updates on the files
        const updatedFiles = await walkFilesAndUpdateRepoBranches(branch, files);
        console.log(`Updated files: ${updatedFiles}`)

        // Expose the list of updated files for other steps/actions to use
        core.setOutput('updated-files', updatedFiles);
    } catch (error) {
        core.setFailed(error.message);
    }
})();