import { CheckboxList } from "../components/checkboxList.component";

export function minMaxFilter(rangeFilter, attributeRanges){
    if(!(attributeRanges && 'min' in attributeRanges && 'max' in attributeRanges)) return null;

    return (
        <>
        <div
            style={{
                display: 'flex',
            }}
        >
        <input
            type="number"
            onChange={e => {
                const val = (e.target.value) ? Number(e.target.value) : null;
                rangeFilter(val, 'min');
            }}
            placeholder={`${attributeRanges['min']}`}
            style={{
                width: '70px',
                marginRight: '0.5rem',
            }}
        />
        to
        <input
            type="number"
            onChange={e => {
                const val = (e.target.value) ? Number(e.target.value) : null;
                rangeFilter(val, 'max');
            }}
            placeholder={`${attributeRanges['max']}`}
            style={{
                width: '70px',
                marginLeft: '0.5rem',
            }}
        />
        </div>
        </>
    )
}

export function listValues(itemCheckboxHandler, attributeRanges){
    if(!(attributeRanges && 'values' in attributeRanges)) return null;

    return (
        <CheckboxList items={attributeRanges['values']} handleCheckboxChange={itemCheckboxHandler}/>
    )
}

export function nullFilter(nullHandler){
    
    return (
        <div>
            <input 
                type="checkbox" 
                id="hasNull" 
                onChange={e => {
                    nullHandler(e.target.checked);
                }}
            />
            <label htmlFor="hasNull"> null</label>
        </div>
    )
}