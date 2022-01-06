const db = require('../db/config');

function waitFor(conditionFunction) {
    const poll = resolve => {
        if(conditionFunction()) resolve();
        else setTimeout(_ => poll(resolve), 400);
    }
  
    return new Promise(poll);
}

beforeAll(async () => {
    await waitFor(() => db.state === 'authenticated');
});

afterAll(async () => {
    await db.end(err => {
        if(err)
            console.log(err);
    });
});