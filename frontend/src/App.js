import React, { useEffect, useMemo, useState } from 'react';
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
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(20);

  function displayProducts(limit, skip){
    getProducts(limit, skip)
    .then(({products, columns}) => {
      setProducts(products);
      setColumns(columns);
    })
    .catch(error => {
      console.log(error);
    });
  }

  useEffect(() => {
    displayProducts();
  }, []);

  useMemo(() => {
    displayProducts(limit, skip);
  }, [limit, skip])

  function nextPage(){
    setSkip(skip + limit);
  }

  function previousPage(){
    setSkip(skip - limit);
  }

  return (
    <Styles>
      <Table columns={columns} data={products} />
      <div className="pagination">
        <button onClick={() => previousPage()}>
            {'<'}
          </button>{' '}
        <button onClick={() => nextPage()}>
          {'>'}
        </button>{' '}
      </div>
    </Styles>
  )
}

export default App