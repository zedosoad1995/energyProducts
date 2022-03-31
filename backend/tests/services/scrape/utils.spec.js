const {preprocessScrapedData} = require('../../../src/services/scrape/utils')

it(`Translates category`, () => {
    const inputData = [
        {
            categories: 'Esquentadores',
        },
        {
            categories: 'Termoacumuladores',
        }
    ];

    const expectedOutput = [
        {
            categories: 'Esquentador',
        },
        {
            categories: 'Termoacumulador',
        }
    ];

    const preprocessedData = preprocessScrapedData(inputData);

    expect(preprocessedData).toStrictEqual(expectedOutput);
});

it(`Removes inexistent category`, () => {
    const inputData = [
        {
            categories: 'blablabla',
        }
    ];

    const preprocessedData = preprocessScrapedData(inputData);

    expect(preprocessedData).toStrictEqual([]);
});

it(`Removes inexistent category`, () => {
    const inputData = [
        {
            categories: 'blablabla',
        }
    ];

    const preprocessedData = preprocessScrapedData(inputData);

    expect(preprocessedData).toStrictEqual([]);
});