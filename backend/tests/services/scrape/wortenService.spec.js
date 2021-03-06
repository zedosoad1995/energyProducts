const {getPageProductsInfo, convertProdAttribute} = require('../../../src/services/scrape/worten.service');

const {logger} = require('../../../src/utils/logger.js');

const axios = require('axios');
jest.mock('axios');
jest.mock('../../../src/utils/logger.js');

describe('Function getPageProductsInfo to obtain JSON containing multiple products from one page of Worten.', () => {

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

describe('Function convertProdAttribute to convert attribute from product', () => {

    it('Should convert Sim/Nao to true/false (Boolean attribute type)', () => {
        
        expect(convertProdAttribute('Sim', 'Bool')).toEqual('true');
        expect(convertProdAttribute('N??o', 'Bool')).toEqual('false');
    })

    it('Should throw Error, because it has invalid boolean value (Boolean attribute type)', () => {
        
        expect(() => convertProdAttribute('Nao', 'Bool')).toThrow();
    })

    it('Should convert Sim/Nao to true/false (Boolean attribute type)', () => {
        
        expect(convertProdAttribute('Sim', 'Bool')).toEqual('true');
        expect(convertProdAttribute('N??o', 'Bool')).toEqual('false');
    })

    it('Should return the same value as input, when there is an invalid type', () => {
        
        expect(convertProdAttribute('123', 'RandomType')).toBe('123');
    })

    it('Should return the correct converted output for multiple valid inputs (Number attribute type)', () => {

        const testInputOutputs = [["100 Euros", '100'], ["    100 Euros asdds", '100'], ["100,2 Euros", '100.2'], ["2Euros", '2'], [".2Euros", '0.2'], 
                                ["1/24", ['1', '24']], ["1.1-24.4", ['1.1', '24.4']], ["12??C", '12']];
        
        testInputOutputs.forEach(([input, output]) => {
            expect(convertProdAttribute(input, 'Number')).toEqual(output);
        })
    })

    it('Should throw exception for multiple invalid inputs (Number attribute type)', () => {

        const testInputs = ["2r4","text", "a2"];
        
        testInputs.forEach(input => convertProdAttribute(input, 'Number'));
        expect(logger.warn).toHaveBeenCalledTimes(testInputs.length);
    })
})