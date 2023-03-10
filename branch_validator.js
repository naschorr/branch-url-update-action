const octokit = require('@octokit/action');

class BranchValidator {
    constructor(repository) {
        this.octokit = new octokit.Octokit();
        this.repository = repository;

        this._branches = [];
    }

    // Properties

    get branches() {
        return this._branches;
    }

    // Methods

    async getBranchNames() {
        // Get repo's branches and handle invalid responses
        const response = await this.octokit.request('GET /repos/{owner}/{repo}/branches{?protected,per_page,page}', {
            owner: this.repository.owner_name,
            repo: this.repository.repository_name
        });

        if (!response || response.status < 200 || response.status >= 300) {
            console.error(`Unable to validate branches, status code: ${response.status}`);
        }

        // Map the branch data to only deal with branch names
        const branches = (response.data || []).map(element => element.name);

        return branches;
    }

    async isValidBranchName(branchName) {
        if (this.branches.length == 0) {
            this._branches = await this.getBranchNames();
        }

        return this.branches.includes(branchName);
    }
}

module.exports = BranchValidator;