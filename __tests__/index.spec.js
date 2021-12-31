const request = require('supertest');
const util = require('util');

const app = require('../app');
const db = require('../db/config');
const {truncateAll} = require('../db/truncateTables');
const {seed} = require('../db/seed');

const {getPageProductsInfo} = require('../services/wortenService');

const axios = require('axios');
jest.mock('axios');

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

    it('Returns correct Worten Products JSON Info Page', () => {
        const retJson = {
            'data': {
                'modules': [
                    {
                        'model': {
                            'template': 'val1'
                        }
                    },
                    {
                        'model': {
                            'template': 'product_list',
                            'success': ''
                        }
                    },
                    {
                        'model': {
                            'template': 'val2'
                        }
                    },
                ]
            }
        };

        axios.get.mockResolvedValue(retJson);

        getPageProductsInfo().then(res => {
            expect(res.success).toBeDefined();
        });
    });

})