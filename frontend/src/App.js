import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { useTable, usePagination, useSortBy } from 'react-table';
import styled from 'styled-components';
import { getProducts, getAttrNames } from './services/product.service';
import _ from 'lodash';

import { CheckboxList } from './components/checkboxList.component';

import { getColumnNames, removeAttributeEffects } from "./utils";

import { minMaxFilter, listValues } from './productTableComponents/minMaxFilter';

const Styles = styled.div`
  padding: 1rem;
  table {
    border-spacing: 0;
    border: 1px solid black;
    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
    }
    th,
    td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      border-right: 1px solid black;
      :last-child {
        border-right: 0;
      }
    }
  }

  .pagination {
    padding: 0.5rem;
  }

  .checkbox {
    display: inline-block;
  }
`


const Table = ({ header, data, changeOrder, attributeTypes, setFilter, attributeRanges, itemCheckboxHandler }) => {
  // Use the state and functions returned from useTable to build your UI
  const [orderCols, setOrderCols] = useState({});

  const [headerState, setHeaderState] = useState(header);

  function changeColumnOrder(event){
    const key = event.currentTarget.getAttribute('name');

    let currOrder = {...orderCols};
    if(!currOrder[key]['isSorted']){
      currOrder[key]['isSorted'] = !currOrder[key]['isSorted'];

      changeOrder(key, 'ASC');

    }else if(!currOrder[key]['isSortedDesc']){
      currOrder[key]['isSortedDesc'] = !currOrder[key]['isSortedDesc'];

      changeOrder(key, 'DESC');

    }else{
      currOrder[key]['isSorted'] = false
      currOrder[key]['isSortedDesc'] = false

      changeOrder(key);
    }

    setOrderCols(currOrder);
  }

  useEffect(() => {
    const columnNames = header;
    
    let updatedOrderCols = {...orderCols};

    columnNames.forEach(newCol => {
      if(!(newCol in updatedOrderCols)){
        updatedOrderCols[newCol] = {isSorted: false, isSortedDesc: false};
      }
    });

    Object.keys(orderCols).forEach(prevCol => {
      if(!columnNames.includes(prevCol)){
        delete updatedOrderCols[prevCol];
      }
    })

    setOrderCols(updatedOrderCols);
  }, [headerState]);

  useEffect(() => {
    if(!_.isEqual(headerState, header)){
      setHeaderState(header);
    }
  });

  // Render the UI for your table
  return (
    <>
      {/*
      <div>
        {headerState.map((column, i) => (
          <div className="checkbox" key={i}>
            <label>
              <input type="checkbox" {...column.getToggleHiddenProps()} />{' '}
              {column.id}
            </label>
          </div>
        ))}
        <br />
      </div>
      */}
      <table>
        <thead>
          <tr key="header">
            {header.map((column, i) => {
              return (
              <th onClick={(event) => changeColumnOrder(event)} idx={i} key={column} name={column}>
                {column}      
                <span>
                  {(column in orderCols && 'isSorted' in orderCols[column] 
                  && orderCols[column]['isSorted'])
                    ? orderCols[column]['isSortedDesc']
                      ? ' 🔽'
                      : ' 🔼'
                    : ''}
                </span>
                <div>{ (attributeTypes[column] === 'Number') ? minMaxFilter(setFilter(column), attributeRanges[column]) : 
                                                                        listValues(itemCheckboxHandler(column), attributeRanges[column]) }</div>
              </th>
            )})}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            return (
              <tr key={`row_${i}`}>
                {Object.values(row).map((cell, col) => {
                  return <td key={`row_${i}_col_${col}`}>{cell}</td>
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
    
  )
};

function App(){
  const [attrNames, setAttrNames] = useState([]);

  const [request, setRequest] = useState({
    // TODO: does not accept names with a ".". Find a way to make that work
    attributesToDisplay: ['Name', 'Distributor', 'Category', 'Altura', 'Rating', 'Num Reviews', 'Peso'],
    attributesToSort: [],
    order: [],
    filters: []
  });

  const [products, setProducts] = useState([]);
  const [header, setHeader] = useState([]);
  const [attributeTypes, setAttributeTypes] = useState([]);
  const [attributeRanges, setAttributeRanges] = useState({});

  const [pageSize, setPageSize] = useState(10);
  const [offset, setOffset] = useState(0);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const firstPageButton = useRef();
  const previousPageButton = useRef();
  const nextPageButton = useRef();
  const lastPageButton = useRef();

  const [hasReceivedData, setHasReceivedData] = useState(false);

  const itemCheckboxHandler = (attr) => (val) => {
    let newRequest = request;

    val = val.currentTarget.getAttribute('data-value');

    if(!('attributesToDisplay' in request)) return;

    const idx = newRequest['filters'].findIndex(filter => filter[1] === attr);

    if(idx === -1){
      newRequest['filters'].push(['includes', attr, [val]]);
    }else{
      newRequest['filters'].push(['includes', attr, newRequest['filters'][idx][2].concat(val)]);
    }

    setRequest(newRequest);
    displayProducts(newRequest, page, pageSize);
  }

  const setFilter = (attr) => (val, valType) => {
    let newRequest = request;

    const idx = newRequest['filters'].findIndex(filter => filter[1] === attr);
    if(idx === -1){
      if(valType === 'min'){
        newRequest['filters'].push(['between', attr, val, 99999999]);
      }else if(valType === 'max'){
        newRequest['filters'].push(['between', attr, -9999999999, val]);
      }
    }else{
      if(valType === 'min'){
        newRequest['filters'][idx][2] = val;
      }else if(valType === 'max'){
        newRequest['filters'][idx][3] = val;
      }
    }

    setRequest(newRequest);
    displayProducts(newRequest, page, pageSize);
  }

  function changeOrder(attr, order){
    let newRequest = request;

    if(order === 'ASC'){
      newRequest.attributesToSort.push(attr);
      newRequest.order.push('ASC');

    }else if(order === 'DESC'){
      const idx = newRequest.attributesToSort.indexOf(attr);
      newRequest.order[idx] = 'DESC';

    }else{
      const idx = newRequest.attributesToSort.indexOf(attr);
      newRequest.attributesToSort.splice(idx, 1);
      newRequest.order.splice(idx, 1);
    }

    setRequest(newRequest);
    displayProducts(newRequest, page, pageSize);
  }

  function displayProducts(request, page, pageSize){

    const offsetVal = (page - 1)*pageSize;
    setOffset(offsetVal);

    getProducts(request, pageSize, offsetVal)
    .then(({products, header, maxSize, attributeTypes, attributeRanges}) => {

      setProducts(products);
      setHeader(header);
      setAttributeTypes(attributeTypes);
      setAttributeRanges(attributeRanges);

      if(header.length > 0){
        setHasReceivedData(true);
      }

      const totalPages = (maxSize > 0) ? Math.ceil(maxSize/pageSize) : 0;

      setPageSize(pageSize);
      setPage(page);
      setTotalPages(totalPages);
    })
    .catch(error => {
      console.log(error);
    });
  }

  useEffect(() => {
    if(page === 1){
      previousPageButton.current.disabled = true;
      firstPageButton.current.disabled = true;
    }else{
      previousPageButton.current.disabled = false;
      firstPageButton.current.disabled = false;
    }

    if(page >= totalPages){
      nextPageButton.current.disabled = true;
      lastPageButton.current.disabled = true;
    }else{
      nextPageButton.current.disabled = false;
      lastPageButton.current.disabled = false;
    } 
  }, [page, totalPages])

  useEffect(() => {
    displayProducts(request, page, pageSize);
    getAttrNames()
    .then(names => {
      setAttrNames(names.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToPage(newPage){
    if(!newPage || newPage < 1){
      newPage = 1;
    }else if(newPage > totalPages){
      newPage = totalPages
    };

    if(newPage !== page){
      displayProducts(request, newPage, pageSize);
    }
  }

  function goToFirstPage(){
    goToPage(1);
  }

  function goToLastPage(){
    goToPage(totalPages);
  }

  function goToNextPage(){
    goToPage(page + 1);
  }

  function goToPreviousPage(){
    goToPage(page - 1);
  }

  function goToWrittenPage(event){
    const page = event.target.value;

    goToPage(Number(page));
  }

  function handleCheckboxChange(event){
    if(!('attributesToDisplay' in request)) return;

    const selectedAttr = event.currentTarget.getAttribute('data-value');

    if(event.target.checked){
      if(!(selectedAttr in request['attributesToDisplay'])){
        request['attributesToDisplay'].push(selectedAttr);
        setRequest(request);
        displayProducts(request, page, pageSize);
      }
    }else{
      removeAttributeEffects(request, selectedAttr);
      setRequest(request);
      displayProducts(request, page, pageSize);
    }
  }

  return (
    <Styles>
      <CheckboxList handleCheckboxChange={handleCheckboxChange} items={attrNames} />
      <Table header={header} data={products} changeOrder={changeOrder} attributeTypes={attributeTypes} 
        setFilter={setFilter} attributeRanges={attributeRanges} itemCheckboxHandler={itemCheckboxHandler} />
      <div className="pagination" hidden={!hasReceivedData}>
        <button onClick={goToFirstPage} ref={firstPageButton}>
          {'<<'}
        </button>{' '}
        <button onClick={goToPreviousPage} ref={previousPageButton}>
            {'<'}
          </button>{' '}
        <button onClick={goToNextPage} ref={nextPageButton}>
          {'>'}
        </button>{' '}
        <button onClick={goToLastPage} ref={lastPageButton}>
          {'>>'}
        </button>{' '}
        <span>
          Page{' '}
          <strong>
            {page} of {totalPages}
          </strong>{' '}
        </span>
        <span>
          | Go to page:{' '}
          <input
            type="number"
            defaultValue={page}
            onChange={goToWrittenPage}
            style={{ width: '100px' }}
          />
        </span>{' '}
        <select
          value={pageSize}
          onChange={e => {
            const page = Math.floor(offset/Number(e.target.value)) + 1;
            const pageSize = Number(e.target.value);  
            displayProducts(request, page, pageSize);
          }}
        >
          {[10, 20, 50, 100].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
          </select>
      </div>
    </Styles>
  )
}

export default App