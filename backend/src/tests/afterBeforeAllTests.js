const {truncateAll} = require('../db/dbModels');
const db = require('../db/config');
const {waitForDbConnection} = require('../db/utils/connection');

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