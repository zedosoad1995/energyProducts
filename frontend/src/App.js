import React, { useMemo, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useTable, usePagination } from 'react-table';
import styled from 'styled-components';
import { getProducts } from './services/product.service';

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
`


function Table({ columns, data }) {
  // Use the state and functions returned from useTable to build your UI
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    rows
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0 },
    },
    usePagination
  )

  // Render the UI for your table
  return (
    <>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <th {...column.getHeaderProps()}>{column.render('Header')}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row, i) => {
            prepareRow(row)
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => {
                  return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
    
  )
}

function App() {
  const [products, setProducts] = useState([]);
  const [columns, setColumns] = useState([]);

  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [maxSize, setMaxSize] = useState(0);

  const previousButton = useRef();
  const nextButton = useRef();

  const [hasReceivedData, setHasReceivedData] = useState(true);

  function displayProducts(limit, offset){
    getProducts(limit, offset)
    .then(({products, columns, maxSize}) => {

      setProducts(products);
      setColumns(columns);
      setMaxSize(maxSize);

      if(columns.length > 0){
        setHasReceivedData(false);
      }
    })
    .catch(error => {
      console.log(error);
    });
  }

  useEffect(() => {
    if(offset + limit >= maxSize){
      nextButton.current.disabled = true;
    }else{
      nextButton.current.disabled = false;
    }

  }, [limit, offset, maxSize]);

  useEffect(() => {
    if(offset === 0){
      previousButton.current.disabled = true;
    }else{
      previousButton.current.disabled = false;
    }

    displayProducts(limit, offset, maxSize);
  }, [limit, offset]);

  function nextPage(){
    setOffset(offset + limit);
  }

  function previousPage(){
    setOffset(offset - limit);
  }

  return (
    <Styles>
      <Table columns={columns} data={products} />
      <div className="pagination" hidden={hasReceivedData}>
        <button onClick={() => previousPage()} ref={previousButton}>
            {'<'}
          </button>{' '}
        <button onClick={() => nextPage()} ref={nextButton}>
          {'>'}
        </button>{' '}
      </div>
    </Styles>
  )
}

export default App