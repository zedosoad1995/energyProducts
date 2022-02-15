import { CheckboxList } from "../components/checkboxList.component";

export function minMaxFilter(setFilter, attributeRanges){
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
                setFilter(val, 'min');
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
                setFilter(val, 'max');
            }}
            placeholder={`${attributeRanges['max']}`}
            style={{
                width: '70px',
                marginLeft: '0.5rem',
            }}
        />
        </div>
        <div>
            <input type="checkbox" id="hasNull"/>
            <label for="hasNull"> null</label>
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