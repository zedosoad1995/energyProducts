function getHeader(obj){
    if(!obj || obj.length === 0 || typeof obj[0] !== 'object' || obj[0] === null) return [];

    return Object.keys(obj[0]);
}

module.exports = {
    getHeader
};