class Repository {
    constructor(repository_full_name) {
        const repository_full_name_split = repository_full_name.split('/');
        
        if (repository_full_name_split.length != 2) {
            throw new RangeError(`Repository name wasn't split into 2 parts (owner/repository).`);
        }

        this.owner_name = repository_full_name_split[0];
        this.repository_name = repository_full_name_split[1];
    }
}

module.exports = Repository;