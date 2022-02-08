import { useState, useEffect } from "react";
import { minMaxFilter, listValues } from '../productTableComponents/minMaxFilter';
import _ from 'lodash';

export function Table({ header, data, displayNewColOrder, attributeTypes, setFilter, attributeRanges, filterCheckboxHandler }){
    const [columnOrderObj, setColumnOrderObj] = useState({});
    const [currHeader, setCurrHeader] = useState(header);
  
    function changeColumnOrder(event){
        const key = event.currentTarget.getAttribute('name');
    
        if(!columnOrderObj[key]['isSorted']){
            columnOrderObj[key]['isSorted'] = !columnOrderObj[key]['isSorted'];
    
            displayNewColOrder(key, 'ASC');
    
        }else if(!columnOrderObj[key]['isSortedDesc']){
            columnOrderObj[key]['isSortedDesc'] = !columnOrderObj[key]['isSortedDesc'];
    
            displayNewColOrder(key, 'DESC');
    
        }else{
            columnOrderObj[key]['isSorted'] = false
            columnOrderObj[key]['isSortedDesc'] = false
    
            // Removes order
            displayNewColOrder(key);
        }
    
        setColumnOrderObj(columnOrderObj);
    }
  
    if(!_.isEqual(currHeader, header)){
        setCurrHeader(header);
          
        header.forEach(newCol => {
            if(!(newCol in columnOrderObj)){
                columnOrderObj[newCol] = {isSorted: false, isSortedDesc: false};
            }
        });
    
        Object.keys(columnOrderObj).forEach(prevCol => {
            if(!header.includes(prevCol)){
            delete columnOrderObj[prevCol];
            }
        })
    
        setColumnOrderObj(columnOrderObj);
    }
  
    return (
      <>
        <table>
          <thead>
            <tr key="header">

              {header.map(column => {
                return (
                <th onClick={(event) => changeColumnOrder(event)} key={column} name={column}>
                  {column}      
                  <span>
                    {(column in columnOrderObj && 'isSorted' in columnOrderObj[column] 
                    && columnOrderObj[column]['isSorted'])
                      ? columnOrderObj[column]['isSortedDesc']
                        ? ' 🔽'
                        : ' 🔼'
                      : ''}
                  </span>
                  <div>{ (attributeTypes[column] === 'Number') ? minMaxFilter(setFilter(column), attributeRanges[column]) : 
                                                                listValues(filterCheckboxHandler(column), attributeRanges[column]) }
                    </div>
                </th>
              )})}

            </tr>
          </thead>
          <tbody>
            {data.map((row, rowNum) => {
              return (
                <tr key={`row_${rowNum}`}>
                  {Object.values(row).map((cell, colNum) => {
                    return <td key={`row_${rowNum}_col_${colNum}`}>{cell}</td>
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </>
    )
};