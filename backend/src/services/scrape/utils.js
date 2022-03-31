const categoriesDict = require('../data/categoriesTranslation.json')

function preprocessScrapedData(data){
    return data.reduce((obj, item) => {
            if(item['categories'] in categoriesDict){
                // Translate category name
                item['categories'] = categoriesDict[item['categories']];
                obj.push(item);
            }

            return obj
        }, []);
}

module.exports = {
    preprocessScrapedData
}