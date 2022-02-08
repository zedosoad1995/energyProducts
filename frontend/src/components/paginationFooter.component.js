import {useEffect, forwardRef} from 'react';

function PaginationFooter({goToPage, page, totalPages, hasReceivedData, pageSize, changePageSize}, ref){
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

    useEffect(() => {
        if(page === 1){
            ref.previousPageButton.current.disabled = true;
            ref.firstPageButton.current.disabled = true;
        }else{
            ref.previousPageButton.current.disabled = false;
            ref.firstPageButton.current.disabled = false;
        }
    
        if(page >= totalPages){
            ref.nextPageButton.current.disabled = true;
            ref.lastPageButton.current.disabled = true;
        }else{
            ref.nextPageButton.current.disabled = false;
            ref.lastPageButton.current.disabled = false;
        } 
    }, [page, totalPages])

    return (
        <>
            <div className="pagination" hidden={!hasReceivedData}>
                <button onClick={goToFirstPage} ref={ref.firstPageButton}>
                {'<<'}
                </button>{' '}
                <button onClick={goToPreviousPage} ref={ref.previousPageButton}>
                    {'<'}
                </button>{' '}
                <button onClick={goToNextPage} ref={ref.nextPageButton}>
                {'>'}
                </button>{' '}
                <button onClick={goToLastPage} ref={ref.lastPageButton}>
                {'>>'}
                </button>{' '}
            </div>
            <span>
                Page{' '}
                <strong>
                {page} of {totalPages}
                </strong>{' '}
            </span>
            <span>
            |   Go to page:{' '}
                <input
                    type="number"
                    defaultValue={page}
                    onChange={goToWrittenPage}
                    style={{ width: '100px' }}
                />
            </span>{' '}
            <select
                value={pageSize}
                onChange={changePageSize}
            >
                {[10, 20, 50, 100].map(pageSize => (
                    <option key={pageSize} value={pageSize}>
                    Show {pageSize}
                    </option>
                ))}
            </select>
      </>
    );
}

export default forwardRef(PaginationFooter);