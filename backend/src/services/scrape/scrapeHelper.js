const categoriesDict = require('../data/categoriesTranslation.json');
const attrTypes = require('../data/attributesTypes.json');
const prodAttributesTranslations = require('../data/prodAttributesTranslations.json');
const {isObject} = require('../../utils/index')
const {logger} = require('../../utils/logger')

function translateCategory(value){
    valueLower = value.toLowerCase()
    if(valueLower in categoriesDict) value = categoriesDict[valueLower];

    return value
}

function translateAttributeName(key){
    if(key in prodAttributesTranslations) key = prodAttributesTranslations[key];
    
    return key
}

function convertAttributeValue(key, value, distributor, url){
    const conversionFunctions = {
        'Consumo de Gás (Gj/annum)': convConsumoGas,
        'Potência (kW)': convPotencia,
        'Potência (W)': convPotenciaWatt,
        'Dimensões LxAxP': convDimensions,
        'Tubo de Exaustão (mm)': convTuboExaustao,
    };

    convertedKey = translateAttributeName(key)

    if(key in conversionFunctions || convertedKey in conversionFunctions){
        if(key in conversionFunctions){
            value = conversionFunctions[key](value, distributor);
        }else{
            value = conversionFunctions[convertedKey](value, distributor);
        }

        if(isObject(value)){
            return value;
        }
    }

    key = convertedKey
    
    // General conversions
    if(attrTypes['Numbers'].includes(key)){
        value = convGeneralNumber(value, distributor, key, url);
    }else if(attrTypes['Booleans'].includes(key)){
        value = convGeneralBoolean(value, key, url)
    }

    const retValue = {}
    retValue[key] = value;

    return retValue;
}

function convGeneralNumber(value, distributor, key, url){
    if(distributor === 'Worten'){
        convValue = value.trim()
                    .split(' ')[0]
                    .replace(/[^\d.,]/g, ' ')
                    .replace(/[.,]+/g, ".");

        convValue = String(Number(convValue))
    }else if(distributor === 'Auchan'){
        convValue = value.split(' ')[0].replace(/[^0-9.]/g, '');
    }
    
    if(convValue.trim().length === 0 || isNaN(convValue)){
        logger.warn(`Invalid format for attribute type Number. Value received: '${value}' for attribute '${key}' in '${url}'`)
    }

    return convValue;
}

function convGeneralBoolean(value, key, url){
    value = value.split(' ')[0].toLowerCase();

    if(['sim', 'automático', 'automatico'].includes(value)){
        value = true;
    }else if(['não'].includes(value)){
        value = false;
    }else{
        logger.warn(`Invalid Boolean value to convert. Value received: '${value}' for attribute '${key}' in '${url}'`)
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

// 'Potência (W)'
function convPotenciaWatt(value, distributor){
    value = convPotencia(value, distributor)

    return String(Number(value)/1000)
}

// 'Potência (kW)'
// TODO: parece que as vezes ha espacos brancos em vez do '.' decimal (Nao só na potência)
function convPotencia(value, distributor){
    if(distributor === 'Worten'){
        value = value.split(/[-\/]/g);
        if(value.length > 1){
            value = {
                'Potência (kW) Min.': value[0],
                'Potência (kW) Max.': value[1],
            }
        }else{
            value = value[0];
        }
    }else if(distributor === 'Auchan'){
        let numericValue = value.split(' ')[0];
        const integralPart = numericValue.split('.')[0];

        if(value.includes('W') || integralPart.length > 3){
            numericValue = String(Number(numericValue)/1000);
        }

        value = numericValue;
    }

    return value
}

convTuboExaustao
function convTuboExaustao(value, distributor){
    if(distributor === 'Worten'){
        value = value.split(/[-\/]/g);
        if(value.length > 1){
            value = {
                'Tubo de Exaustão (mm) Min.': value[0],
                'Tubo de Exaustão (mm) Max.': value[1],
            }
        }else{
            value = value[0];
        }
    }

    return value
}

function convDimensions(value, distributor){
    if(distributor === 'Auchan'){
        [largura, altura, profundidade] = value.replace(/[\sm]/g, '').split(/[xX]+/);

        largura = largura ? String(Number(largura)/10) : null
        altura = altura ? String(Number(altura)/10) : null
        profundidade = profundidade ? String(Number(profundidade)/10) : null

        value = {
            'Largura': largura,
            'Altura': altura,
            'Profundidade': profundidade
        }
    }

    return value
}

module.exports = {
    convertAttributeValue,
    translateAttributeName,
    translateCategory
}