import React, { useState, useRef, useEffect } from 'react';
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

  .pagination {
    padding: 0.5rem;
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

  const [pageSize, setPageSize] = useState(10);
  const [offset, setOffset] = useState(0);
  const [maxSize, setMaxSize] = useState(0);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const firstPageButton = useRef();
  const previousPageButton = useRef();
  const nextPageButton = useRef();
  const lastPageButton = useRef();

  const [hasReceivedData, setHasReceivedData] = useState(true);

  function displayProducts(page, pageSize){

    const offsetVal = (page - 1)*pageSize;
    setOffset(offsetVal);

    getProducts(pageSize, offsetVal)
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
    displayProducts(page, pageSize);
  }, [page, pageSize]);

  useEffect(() => {
    const totalPages = (maxSize > 0) ? Math.ceil(maxSize/pageSize) : 0;
    setTotalPages(totalPages);
  }, [pageSize, maxSize]);

  useEffect(() => {
    if(page >= totalPages){
      nextPageButton.current.disabled = true;
      lastPageButton.current.disabled = true;
    }else{
      nextPageButton.current.disabled = false;
      lastPageButton.current.disabled = false;
    }

  }, [page, totalPages]);

  useEffect(() => {
    if(page === 1){
      previousPageButton.current.disabled = true;
      firstPageButton.current.disabled = true;
    }else{
      previousPageButton.current.disabled = false;
      firstPageButton.current.disabled = false;
    }

  }, [page]);

  function goToPage(page){
    if(!page || page < 1){
      page = 1;
    }else if(page > totalPages){
      page = totalPages
    };

    setPage(page);
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
            setPage(Math.floor(offset/Number(e.target.value)) + 1);
            setPageSize(Number(e.target.value))
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