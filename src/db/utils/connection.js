const db = require('../config');

function waitFor(conditionFunction) {
    const poll = resolve => {
        if(conditionFunction()) resolve();
        else setTimeout(_ => poll(resolve), 400);
    }

    return new Promise(poll);
}

async function waitForDbConnection(){
    return await waitFor(() => db.state === 'authenticated');
}

module.exports = {
    waitForDbConnection
}