const request = require('supertest');
const util = require('util');

//const app = require('../app');
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

describe('Function getPageProductsInfo to obtain JSON containing multiple products from one page of Worten.', () => {

    beforeAll(async () => {
        await waitFor(() => db.state === 'authenticated');
        await truncateAll();
        await seed();
    });

    afterAll(async () => {
        await dbEnd()
        .catch(err => console.log(err));
    });

    it('Should return Worten Products JSON Info Page', () => {
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
                            'products': ''
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

        axios.get.mockResolvedValueOnce(retJson);

        getPageProductsInfo().then(res => {
            expect(res.products).toBeDefined();
        });
    });

    it('Should throw error, because no key \'products\' in return JSON.', () => {
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

        axios.get.mockResolvedValueOnce(retJson);

        expect(getPageProductsInfo()).rejects.toThrow('No \'products\' key in modules > model.');
    });

    it('Should throw an error, because no key \'product_list\' in JSON.', () => {
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
                            'template': 'val1.2',
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

        axios.get.mockResolvedValueOnce(retJson);

        expect(getPageProductsInfo()).rejects.toThrow('No \'product_list\' key in modules > model.');
    });

    it('Should return products JSON, even with some incorrect field names on other objects', () => {
        const retJson = {
            'data': {
                'modules': [
                    {
                        'mode': {
                            'template': 'val1'
                        }
                    },
                    {
                        'model': {
                            'template': 'product_list',
                            'products': ''
                        }
                    },
                    {
                        'model': {
                            'templat': 'val2'
                        }
                    },
                ]
            }
        };

        axios.get.mockResolvedValueOnce(retJson);

        getPageProductsInfo().then(res => {
            expect(res.products).toBeDefined();
        });
    });

    it('Should throw Error for bad JSON format', () => {
        const retJson = {
            'data': {
                'badName': [
                    {
                        'model': {
                            'template': 'val1'
                        }
                    },
                    {
                        'model': {
                            'template': 'val1.2',
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

        axios.get.mockResolvedValueOnce(retJson);

        expect(getPageProductsInfo()).rejects.toThrow();
    });

})