import React, { useState, useRef, useEffect, forwardRef } from 'react';
import styled from 'styled-components';
import { getProducts, getAttrNames } from './services/product.service';
import _ from 'lodash';

import { CheckboxList } from './components/checkboxList.component';
import { Table } from './components/table.component';
import PaginationFooter from './components/paginationFooter.component';

import { removeAttributeEffects } from "./utils";

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
`;

function App(){
  const [attrNames, setAttrNames] = useState([]);

  const [request, setRequest] = useState({
    attributesToDisplay: ['Name', 'Distributor', 'Category', 'Altura', 'Rating', 'Num. Reviews', 'Peso'],
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

  const [totalResults, setTotalResults] = useState(0);

  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const firstPageButton = useRef();
  const previousPageButton = useRef();
  const nextPageButton = useRef();
  const lastPageButton = useRef();

  const paginationRefs = {
    firstPageButton,
    previousPageButton,
    nextPageButton,
    lastPageButton
  };

  const [hasReceivedData, setHasReceivedData] = useState(false);

  const filterCheckboxHandler = (attr) => (event) => {
    const isChecked = event.target.checked;

    const value = event.currentTarget.getAttribute('data-value');

    if(!('attributesToDisplay' in request)) return;

    const idxFilter = request['filters'].findIndex(filter => filter[1] === attr && filter[0] === 'includes');

    if(isChecked){
      if(idxFilter === -1){
        request['filters'].push(['includes', attr, [value]]);
      }else{
        request['filters'][idxFilter][2].push(value);
      }
    }else{
      if(idxFilter > -1){
        const idxValue = request['filters'][idxFilter][2].findIndex(val => val === value);
        if(idxValue > -1){
          request['filters'][idxFilter][2].splice(idxValue, 1);
          
          if(request['filters'][idxFilter][2].length === 0){
            request['filters'].splice(idxFilter, 1);
          }
        }
      }
    }

    setRequest(request);
    displayProducts(request, page, pageSize);
  }

  const filterMinMaxHandler = (attr) => (val, valType) => {
    let newRequest = request;

    const idx = newRequest['filters'].findIndex(filter => filter[1] === attr);
    if(idx === -1){
      if(valType === 'min'){
        newRequest['filters'].push(['between', attr, val, null]);
      }else if(valType === 'max'){
        newRequest['filters'].push(['between', attr, null, val]);
      }

      const lastIdx = newRequest['filters'].length - 1;
      if(newRequest['filters'][lastIdx][2] === null && newRequest['filters'][lastIdx][3] === null){
        newRequest['filters'].splice(lastIdx, 1);
      }
    }else{
      if(valType === 'min'){
        newRequest['filters'][idx][2] = val;
      }else if(valType === 'max'){
        newRequest['filters'][idx][3] = val;
      }

      if(newRequest['filters'][idx][2] === null && newRequest['filters'][idx][3] === null){
        newRequest['filters'].splice(idx, 1);
      }
    }

    setRequest(newRequest);
    displayProducts(newRequest, page, pageSize);
  }

  function displayNewColOrder(attr, order){
    if(order === 'ASC'){
      request.attributesToSort.push(attr);
      request.order.push('ASC');

    }else if(order === 'DESC'){
      const idx = request.attributesToSort.indexOf(attr);
      if(idx > -1)
        request.order[idx] = 'DESC';

    }else{
      // Remove order
      const idx = request.attributesToSort.indexOf(attr);
      if(idx > -1){
        request.attributesToSort.splice(idx, 1);
        request.order.splice(idx, 1);
      }
    }

    setRequest(request);
    displayProducts(request, page, pageSize);
  }

  function displayProducts(request, page, pageSize){
    const offsetVal = (page - 1)*pageSize;
    setOffset(offsetVal);

    setLoading(true);

    getProducts(request, pageSize, offsetVal)
    .then(({products, header, maxSize, attributeTypes, attributeRanges}) => {
      setLoading(false);

      setProducts(products);
      setHeader(header);
      setAttributeTypes(attributeTypes);
      setAttributeRanges(attributeRanges);

      setTotalResults(maxSize);

      if(header.length > 0){
        setHasReceivedData(true);
      }

      const totalPages = (maxSize > 0) ? Math.ceil(maxSize/pageSize) : 0;
      setTotalPages(totalPages);

      setPageSize(pageSize);
      setPage(page);
    })
    .catch(error => {
      console.log(error);
    });
  }

  useEffect(() => {
    displayProducts(request, page, pageSize);

    getAttrNames(request['attributesToDisplay'])
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

  function attributesCheckboxHandler(event){
    if(!('attributesToDisplay' in request)) return;

    const selectedAttr = event.currentTarget.getAttribute('data-value');

    if(event.target.checked){
      if(!request['attributesToDisplay'].includes(selectedAttr)){
        request['attributesToDisplay'].push(selectedAttr);
        setRequest(request);
        displayProducts(request, page, pageSize);
      }
    }else{
      if(request['attributesToDisplay'].includes(selectedAttr)){
        console.log(selectedAttr, request['attributesToDisplay']);
        removeAttributeEffects(request, selectedAttr);
        setRequest(request);
        displayProducts(request, page, pageSize);
      }
    }
  }

  function changePageSize(event){
    const page = Math.floor(offset/Number(event.target.value)) + 1;
    const pageSize = Number(event.target.value);  
    displayProducts(request, page, pageSize);
  }

  return (
    <Styles>
      <CheckboxList handleCheckboxChange={attributesCheckboxHandler} items={attrNames} selectedItems={header} orderByName={true} />
      <Table header={header} data={products} attrToSort={request.attributesToSort} displayNewColOrder={displayNewColOrder} 
        attributeTypes={attributeTypes} filterMinMaxHandler={filterMinMaxHandler} attributeRanges={attributeRanges} 
        filterCheckboxHandler={filterCheckboxHandler} totalResults={totalResults} loading={loading} />
      <PaginationFooter goToPage={goToPage} page={page} totalPages={totalPages} hasReceivedData={hasReceivedData} 
        pageSize={pageSize} changePageSize={changePageSize} ref={paginationRefs} />
    </Styles>
  )
}

export default App