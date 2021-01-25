const core = require('@actions/core');
const github = require('@actions/github');

let client = null;


const doesRefExist = async (branchName) => {
  try {
    await client.git.getRef({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      ref: `refs/heads/${branchName}`,
    });
    return true;
  } catch (error) {
    if (error.toString().includes('Not Found')) {
      return false;
    }
    throw error;
  }
}

const createTree = async (branchName) => {
  const readme = `# ${branchName}\nThis file exists because it has to.\n`
  
  const result = await client.git.createTree({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    tree: [{
      path: 'README.md',
      mode: '100644',
      type: 'blob',
      content: readme,
    }]
  });

  return result.sha;
}

const createCommit = async (rootSha) => {
  await client.git.createCommit({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    tree: rootSha,
    message: "create bare branch",
  });
}

const createRef = async (branchName, rootSha) => {
  await client.git.createRef({
    owner: context.repo.owner,
    repo: context.repo.repo,
    ref: `refs/heads/${branchName}`,
    sha: rootSha,
  });
}

const createBareBranch = async () => {
  try {  
    const token = core.getInput('github-token', {required: true});
    const branchName = core.getInput('name', {required: true});
    client = github.getOctokit(token, {});

    // check for existing branch
    const refExists = await doesRefExist(branchName);

    if (refExists) {
      core.setFailed(`branch ${branchName} exists already`);
      return;
    }

    const rootSha = await createTree(branchName);
    await createCommit(rootSha);
    await createRef(branchName, rootSha);

    console.log(`Created branch '${branchName}'.`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

/* await */ createBareBranch();