const core = require('@actions/core');


const countSteps = () => {
  try {  
    const steps = JSON.parse(core.getInput('steps', {required: true}));
    console.log(steps);

    const outcomes = {
      success: 0,
      failure: 0,
      cancelled: 0,
      skipped: 0,
    };
    const conclusions = {
      success: 0,
      failure: 0,
      cancelled: 0,
      skipped: 0,
    };
    
    for (const step of steps) {
      outcomes[step.outcome] += 1;
      conclusions[step.conclusion] += 1;
    }
    
    return {
      outcomes,
      conclusions,
      total: steps.length,
    }
  } catch (error) {
    console.log(error.toString());
    core.setFailed(error.message);
  }
}

countSteps();