const categoriesDict = require('../data/categoriesTranslation.json')

function preprocessScrapedData(data){
    return data.reduce((obj, item) => {
            if(item['category'] in categoriesDict){
                // Translate category name
                item['category'] = categoriesDict[item['category']];
                obj.push(item);
            }

            return obj
        }, []);
}

module.exports = {
    preprocessScrapedData
}