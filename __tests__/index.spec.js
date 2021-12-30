const request = require('supertest');
const util = require('util');

const app = require('../app');
const db = require('../db/config');
const {truncateAll} = require('../db/truncateTables')
const {seed} = require('../db/seed')

const dbEnd = util.promisify(db.end).bind(db);

function waitFor(conditionFunction) {
    const poll = resolve => {
        if(conditionFunction()) resolve();
        else setTimeout(_ => poll(resolve), 400);
    }
  
    return new Promise(poll);
}

describe('blabla', () => {

    beforeAll(async () => {
        await waitFor(() => db.state === 'authenticated');
        await truncateAll();
        await seed();
    });

    afterAll(async () => {
        await dbEnd()
        .catch(err => console.log(err));
    });

    it('lol', () => {
        const response = request(app);
        expect(1).toBe(1);
    });

    it('truncate all test tables', async () => {
        await truncateAll();
        expect(1).toBe(1);
    });
})