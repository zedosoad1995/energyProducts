function getAllIndexes(arr, searchVals) {
    let foundIndexes = [];
    let notFoundIndexes = [];

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