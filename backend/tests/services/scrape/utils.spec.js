const {preprocessScrapedData} = require('../../../src/services/scrape/utils')

it(`Translates category`, () => {
    const inputData = [
        {
            category: 'Esquentadores',
        },
        {
            category: 'Termoacumuladores',
        }
    ];

    const expectedOutput = [
        {
            category: 'Esquentador',
        },
        {
            category: 'Termoacumulador',
        }
    ];

    const preprocessedData = preprocessScrapedData(inputData);

    expect(preprocessedData).toStrictEqual(expectedOutput);
});

it(`Removes inexistent category`, () => {
    const inputData = [
        {
            category: 'blablabla',
        }
    ];

    const preprocessedData = preprocessScrapedData(inputData);

    expect(preprocessedData).toStrictEqual([]);
});

it(`Removes inexistent category`, () => {
    const inputData = [
        {
            category: 'blablabla',
        }
    ];

    const preprocessedData = preprocessScrapedData(inputData);

    expect(preprocessedData).toStrictEqual([]);
});