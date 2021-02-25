const core = require('@actions/core');
const github = require('@actions/github');

let client = null;


const getLatestCommit = async (branchName) => {
  console.log("getting latest commit");
  
  const result = await client.git.getRef({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: `heads/${branchName}`,
  });

  return result.data.object.sha;
}

const getCommitTree = async (commitHash) => {
  console.log("getting latest working tree");
  
  const result = await client.git.getCommit({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    commit_sha: commitHash,
  });

  return result.data.tree.sha;
}


const createBlob = async (data) => {
  console.log("creating new blob");

  const result = await client.git.createBlob({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    content: data,
    encoding: 'base64',
  });

  return result.data.sha;
}


const createTree = async (filePath, fileHash, treeHash) => {
  console.log("creating new tree");
  
  const result = await client.git.createTree({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    tree: [{
      path: filePath,
      mode: '100644',
      type: 'blob',
      sha: fileHash,
    }],
    base_tree: treeHash
  });

  return result.data.sha;
}

const createCommit = async (rootSha, parentCommitHash, fileName) => {
  console.log("committing new tree");
  
  const result = await client.git.createCommit({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    tree: rootSha,
    message: `create file '${fileName}'`,
    parents: [parentCommitHash],
  });

  return result.data.sha;
}

const updateRef = async (branchName, commitHash) => {
  console.log("updating branch ref");
  let retries = 0;
  
  while (retries < 15) {
    try {
      await client.git.updateRef({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        ref: `heads/${branchName}`,
        sha: commitHash,
      });
      return;
    } catch (err) {
      console.log(err);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    retries += 1;
    console.log("...");
  }
  throw new Error("timed out waiting for commit");
}

const waitForCommit = async (commitHash) => {
  console.log("waiting for commit to become visible...");
  
  while (true) {
    try {
      await getCommitTree(commitHash);
      break;
    } catch (err) {
      console.log(err);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    console.log("...");
  }
}

const addAndCommit = async () => {
  try {  
    const token = core.getInput('github-token', {required: true});
    const branchName = core.getInput('branch-name', {required: true});
    const filePath = core.getInput('file-path', {required: true});
    const fileData = core.getInput('file-data', {required: true});

    client = github.getOctokit(token, {});
    
    const commitHash = await getLatestCommit(branchName);
    console.log("latest commit is "+commitHash);
    
    const treeHash = await getCommitTree(commitHash);
    console.log("latest tree is "+treeHash);
    
    const fileHash = await createBlob(fileData);
    console.log("new blob is "+fileHash);

    const newTreeHash = await createTree(filePath, fileHash, treeHash);
    console.log("new tree is "+newTreeHash);

    const newCommitHash = await createCommit(newTreeHash, commitHash, filePath);
    console.log("new commit is "+newCommitHash);

    await waitForCommit(newCommitHash);
    await updateRef(branchName, newCommitHash);
    
    console.log(`Added new file '${filePath}'.`);
  } catch (error) {
    console.log(error.toString());
    core.setFailed(error.message);
  }
}

/* await */ addAndCommit();