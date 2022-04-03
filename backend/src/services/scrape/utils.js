const categoriesDict = require('../data/categoriesTranslation.json');
const attrTypes = require('../data/attributesTypes.json');

// TODO: Adicionar em 'convertProductAttribute', e usar 'convertProductAttribute' em todos os scrapers
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

function convertProductAttribute(key, value, distributor){
    const conversionFunctions = {
        'Consumo de Gás (Gj/annum)': convConsumoGas,
        'Potência (kW)': convPotencia
    };

    if(key in conversionFunctions){
        value = conversionFunctions[key](value, distributor);
    }
    
    // General conversion
    if(attrTypes['Numbers'].includes(key)){
        value = value.split(' ')[0].replace(/[^0-9.]/g, '');
    }else if(attrTypes['Booleans'].includes(key)){
        value = value.split(' ')[0].toLowerCase();

        if(['sim', 'automático', 'automatico'].includes(value)){
            value = true;
        }else if(['não'].includes(value)){
            value = false;
        }else{
            throw new Error(`Invalid value to convert to boolean: ${value}.`);
        }
    }

    return value;
}

// 'Consumo de Gás (Gj/annum)'
function convConsumoGas(value, distributor){
    if(distributor === 'Auchan'){
        value = String((Number(value.replace(/[^0-9]/g, ''))/277.778).toFixed(4));
    }
    return value
}

// 'Potência (kW)'
// TODO: parece que as vezes ha espacos brancos em vez do '.' decimal (Nao só na potência)
function convPotencia(value, distributor){
    if(distributor === 'Auchan'){
        let numericValue = value.split(' ')[0];
        const integralPart = numericValue.split('.')[0];

        if(value.includes('W') || integralPart.length > 3){
            numericValue = String(Number(numericValue)/1000);
        }

        value = numericValue;
    }
    return value
}

module.exports = {
    preprocessScrapedData,
    convertProductAttribute
}