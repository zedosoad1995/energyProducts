function getAllIndexes(arr, searchVals) {
    var foundIndexes = [];
    var notFoundIndexes = [];

    if(!searchVals.isArray()) return [];

    for(var i = 0; i < arr.length; i++){
        if(searchVals.includes(arr[i]))
            foundIndexes.push(i);
        else
            notFoundIndexes.push(i);
    }
    return [foundIndexes, notFoundIndexes];
}

module.exports = {
    getAllIndexes
};