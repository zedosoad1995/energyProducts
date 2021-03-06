const {truncateAll} = require('../src/db/dbModels');
const db = require('../src/db/config');
const {waitForDbConnection} = require('../src/db/utils/connection');

beforeAll(async () => {
    await waitForDbConnection();
    await truncateAll();
});

afterAll(async () => {
    await db.end(err => {
        if(err)
            console.log(err);
    });
});