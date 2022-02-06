import { CheckboxList } from "../components/checkboxList.component";

export function minMaxFilter(setFilter, attributeRanges){
    if(!(attributeRanges && 'min' in attributeRanges && 'max' in attributeRanges)) return null;

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
                setFilter(Number(e.target.value), 'max');
            }}
            placeholder={`${attributeRanges['max']}`}
            style={{
                width: '70px',
                marginLeft: '0.5rem',
            }}
        />
        </div>
    )
}

export function listValues(itemCheckboxHandler, attributeRanges){
    if(!(attributeRanges && 'values' in attributeRanges)) return null;

    return (
        <CheckboxList items={attributeRanges['values']} handleCheckboxChange={itemCheckboxHandler}/>
    )
}