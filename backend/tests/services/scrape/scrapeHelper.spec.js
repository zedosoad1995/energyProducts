const {convertAttributeValue} = require('../../../src/services/scrape/scrapeHelper');
const examples = require('./scrapeHelperExamples.json')

it('Should return the correct converted output for multiple valid inputs (Number attribute type)', () => {

    const testValues = examples['convertAttributeValue']
    
    testValues.forEach(({input, output}) => {

        expect(convertAttributeValue(input['key'], input['value'], input['distributor'])).toStrictEqual(output);
    })
})