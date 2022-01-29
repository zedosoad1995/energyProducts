export function minMaxFilter(){
    return (
        <div
            style={{
                display: 'flex',
            }}
        >
        <input
            value={''}
            type="number"
            onChange={e => {
            }}
            placeholder={`Min ()`}
            style={{
                width: '70px',
                marginRight: '0.5rem',
            }}
        />
        to
        <input
            value={''}
            type="number"
            onChange={e => {
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