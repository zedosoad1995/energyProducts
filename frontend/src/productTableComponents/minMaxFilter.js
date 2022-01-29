export function minMaxFilter(setFilter){
    return (
        <div
            style={{
                display: 'flex',
            }}
        >
        <input
            type="number"
            onChange={e => {
                setFilter(Number(e.target.value), 'min');
            }}
            placeholder={`Min ()`}
            style={{
                width: '70px',
                marginRight: '0.5rem',
            }}
        />
        to
        <input
            type="number"
            onChange={e => {
                setFilter(Number(e.target.value), 'max');
            }}
            placeholder={`Max ()`}
            style={{
                width: '70px',
                marginLeft: '0.5rem',
            }}
        />
        </div>
    )
}