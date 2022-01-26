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

  const [pageNum, setPageNum] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const firstPageButton = useRef();
  const previousPageButton = useRef();
  const nextPageButton = useRef();
  const lastPageButton = useRef();

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
    setPageNum(Math.floor((limit - 1 + offset)/limit) + 1);

  }, [limit, offset]);

  useEffect(() => {
    setTotalPages((maxSize > 0) ? Math.floor((maxSize-1)/limit) + 1 : 0);

  }, [limit, maxSize]);

  useEffect(() => {
    if(offset + limit >= maxSize){
      nextPageButton.current.disabled = true;
      lastPageButton.current.disabled = true;
    }else{
      nextPageButton.current.disabled = false;
      lastPageButton.current.disabled = false;
    }

  }, [limit, offset, maxSize]);

  useEffect(() => {
    if(offset === 0){
      previousPageButton.current.disabled = true;
      firstPageButton.current.disabled = true;
    }else{
      previousPageButton.current.disabled = false;
      firstPageButton.current.disabled = false;
    }

    displayProducts(limit, offset, maxSize);
  }, [limit, offset]);

  function goToPage(page){
    let offset = (page - 1)*limit;

    if(!page || page <= 0){
      offset = 0;
    }else if(page > totalPages){
      offset = (totalPages - 1)*limit
    };

    setOffset(offset);
  }

  function goToFirstPage(){
    goToPage(1);
  }

  function goToLastPage(){
    goToPage(totalPages);
  }

  function goToNextPage(){
    goToPage(pageNum + 1);
  }

  function goToPreviousPage(){
    goToPage(pageNum - 1);
  }

  function goToWrittenPage(event){
    const page = event.target.value;

    goToPage(page);
  }

  return (
    <Styles>
      <Table columns={columns} data={products} />
      <div className="pagination" hidden={hasReceivedData}>
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
            {pageNum} of {totalPages}
          </strong>{' '}
        </span>
        <span>
          | Go to page:{' '}
          <input
            type="number"
            defaultValue={pageNum}
            onChange={goToWrittenPage}
            style={{ width: '100px' }}
          />
        </span>{' '}
        {/*<select
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value))
          }}
        >
          {[10, 20, 30, 40, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
          </select>*/}
        {/*<select
        <span>
          | Go to page:{' '}
          <input
            type="number"
            defaultValue={pageIndex + 1}
            onChange={e => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0
              gotoPage(page)
            }}
            style={{ width: '100px' }}
          />
        </span>{' '}
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value))
          }}
        >
          {[10, 20, 30, 40, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
          </select>*/}
      </div>
    </Styles>
  )
}

export default App